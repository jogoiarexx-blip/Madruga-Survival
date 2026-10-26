#!/usr/bin/env python3
"""Extend a Mixamo-skinned goblin GLB without changing mesh, rig or 6 source animations.

Requires only the Python standard library. Existing vertices/textures/accessors are
preserved bit-for-bit; new clips use the original 46 node channels and slerped poses.
Usage: python scripts/upgrade-goblin-glb.py goblin.glb assets/models/goblin_animado.glb
"""
import json, math, pathlib, struct, sys

TYPE_N={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
MAGIC=b'glTF'

def read_glb(path):
    raw=pathlib.Path(path).read_bytes()
    if raw[:4]!=MAGIC or struct.unpack_from('<I',raw,4)[0]!=2:
        raise ValueError('GLB v2 inválido')
    off=12; js=None; binary=None
    while off < len(raw):
        length,typ=struct.unpack_from('<II',raw,off);off+=8
        if typ==0x4E4F534A:js=json.loads(raw[off:off+length])
        elif typ==0x004E4942:binary=raw[off:off+length]
        off+=length
    if js is None or binary is None:raise ValueError('GLB incompleto')
    if len(js.get('skins',[]))!=1 or len(js.get('animations',[]))<6:
        raise ValueError('O goblin precisa conter o rig e suas 6 animações originais')
    return js,bytearray(binary)

def floats(g,bin_data,index):
    a=g['accessors'][index]
    if a['componentType']!=5126:raise ValueError('Tipo de acesso incompatível')
    view=g['bufferViews'][a['bufferView']];n=TYPE_N[a['type']]
    offset=view.get('byteOffset',0)+a.get('byteOffset',0)
    stride=view.get('byteStride',4*n)
    return [struct.unpack_from('<'+'f'*n,bin_data,offset+i*stride) for i in range(a['count'])]

def slerp(a,b,t):
    dot=sum(x*y for x,y in zip(a,b))
    if dot<0:b=tuple(-v for v in b);dot=-dot
    if dot>.9995:
        out=[x+(y-x)*t for x,y in zip(a,b)]
    else:
        th=math.acos(max(-1,min(1,dot)));sn=math.sin(th)
        k1=math.sin((1-t)*th)/sn;k2=math.sin(t*th)/sn
        out=[k1*x+k2*y for x,y in zip(a,b)]
    n=math.sqrt(sum(v*v for v in out))
    return tuple(v/n for v in out)

def mult(a,b):
    x,y,z,w=a;X,Y,Z,W=b
    return (w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z)

def qrot(axis,angle):
    h=angle*.5;s=math.sin(h)
    return (axis[0]*s,axis[1]*s,axis[2]*s,math.cos(h))

def interp(samples,time,path):
    times,values=samples
    if time<=times[0]:return values[0]
    if time>=times[-1]:return values[-1]
    lo,hi=0,len(times)-1
    while hi-lo>1:
        k=(lo+hi)//2
        if times[k]<time:lo=k
        else:hi=k
    t=(time-times[lo])/max(1e-6,times[hi]-times[lo])
    return slerp(values[lo],values[hi],t) if path=='rotation' else tuple(a+(b-a)*t for a,b in zip(values[lo],values[hi]))

def smoothstep(a,b,x):
    v=max(0,min(1,(x-a)/max(1e-9,b-a)))
    return v*v*(3-2*v)

def add_clip(g,blob,source,name,duration,sampler_func,impact=None):
    """Sampler receives normalized time, joint id, path, original neutral pose."""
    keys=[i*duration/round(duration*24) for i in range(round(duration*24)+1)]
    view=g['bufferViews'];acc=g['accessors'];channels=[];samplers=[]
    def append(values,kind):
        while len(blob)%4:blob.append(0)
        start=len(blob);n=TYPE_N[kind]
        for val in values:blob.extend(struct.pack('<'+'f'*n,*val))
        idx=len(view);view.append({'buffer':0,'byteOffset':start,'byteLength':len(blob)-start})
        a={'bufferView':idx,'componentType':5126,'count':len(values),'type':kind}
        if kind=='SCALAR':a['min']=[min(v[0] for v in values)];a['max']=[max(v[0] for v in values)]
        acc.append(a)
        return len(acc)-1
    input_acc=append([(k,) for k in keys],'SCALAR')
    for node,path in sorted(source):
        neutral=interp(source[(node,path)],0,path)
        output=[sampler_func(k/duration,node,path,neutral) for k in keys]
        idx=append(output,'VEC4' if path=='rotation' else 'VEC3')
        si=len(samplers);samplers.append({'input':input_acc,'output':idx,'interpolation':'LINEAR'})
        channels.append({'sampler':si,'target':{'node':node,'path':path}})
    extras={'derivedFrom':'Mixamo animation set (user supplied)','durationSeconds':duration}
    if impact is not None:extras['impactAtSeconds']=impact
    g['animations'].append({'name':name,'channels':channels,'samplers':samplers,'extras':extras})

def build(src,dst):
    g,blob=read_glb(src)
    originals={a['name']:a for a in g['animations']}
    required={'Running','Walking','Arise','Dead','Triple_Combo_Attack','Unsteady_Walk'}
    if not required.issubset(originals):raise ValueError('Animações originais incompletas')
    tracks={}
    for name,clip in originals.items():
        frame={}
        for ch in clip['channels']:
            sm=clip['samplers'][ch['sampler']]
            if sm.get('interpolation')!='LINEAR':raise ValueError('Interpolação inesperada')
            frame[(ch['target']['node'],ch['target']['path'])]=(tuple(t[0] for t in floats(g,blob,sm['input'])),floats(g,blob,sm['output']))
        tracks[name]=frame
    base=tracks['Walking'];combo=tracks['Triple_Combo_Attack'];run=tracks['Running']
    unsteady=tracks['Unsteady_Walk'];death=tracks['Dead'];
    # The base stance comes from a real animation of this exact skeleton, never
    # from arbitrary bind transforms (which can deform the skin).
    idlePose={(node,path):interp(s,0.13,path) for (node,path),s in base.items()}
    nodes={n.get('name','').split(':')[-1]:i for i,n in enumerate(g['nodes'])}
    def pose(srcTracks,node,path,t):
        return interp(srcTracks[(node,path)],t,path)
    def blend(neutral,other,path,factor):
        return slerp(neutral,other,max(0,min(1,factor))) if path=='rotation' else tuple(a+(b-a)*max(0,min(1,factor)) for a,b in zip(neutral,other))
    def tweak(value,node,path,angle_axis=None,trans=None):
        name=g['nodes'][node].get('name','').split(':')[-1]
        if angle_axis and path=='rotation' and name in angle_axis:
            axis,angle=angle_axis[name]
            return mult(value,qrot(axis,angle))
        if trans and path=='translation' and name in trans:
            d=trans[name];return tuple(a+b for a,b in zip(value,d))
        return value
    def idle(t,node,path,neutral):
        k=(node,path);v=idlePose[k]
        if path=='rotation':
            wave=math.sin(t*math.tau*2)
            wave2=math.sin(t*math.tau)
            return tweak(v,node,path,{
                'Spine2':((1,0,0),.018*wave),
                'Head':((0,1,0),.042*wave2),
                'LeftArm':((0,0,1),.015*wave),
                'RightArm':((0,0,1),-.015*wave),
            })
        return v
    add_clip(g,blob,base,'Idle',1.8,idle)
    def alert(t,node,path,neutral):
        basePose=idle(t,node,path,neutral)
        lean=math.sin(math.pi*min(1,t))
        return tweak(basePose,node,path,{
            'Spine1':((1,0,0),-.075*lean),
            'RightArm':((1,0,0),-.16*lean),
            'LeftArm':((1,0,0),-.15*lean),
        })
    add_clip(g,blob,base,'Idle_Alert',1.6,alert)
    # Fast combo: first third of source triple combo, settle to idle at end.
    def quick(t,node,path,neutral):
        k=(node,path);orig=pose(combo,node,path,min(4.33,t*1.45))
        return blend(orig,idlePose[k],path,smoothstep(.75,1,t))
    add_clip(g,blob,base,'Attack_Quick',.91,quick,impact=.43)
    # Heavy combo: use the source's middle/finisher section for a longer windup.
    def heavy(t,node,path,neutral):
        k=(node,path);src_time=1.18+min(1,t)*2.10
        value=pose(combo,node,path,src_time)
        value=blend(idlePose[k],value,path,smoothstep(0,.14,t))
        return blend(value,idlePose[k],path,smoothstep(.85,1,t))
    add_clip(g,blob,base,'Attack_Heavy',1.22,heavy,impact=.73)
    def comboFast(t,node,path,neutral):
        k=(node,path);val=pose(combo,node,path,t*4.33)
        return blend(val,idlePose[k],path,smoothstep(.92,1,t))
    add_clip(g,blob,base,'Attack_Combo',2.45,comboFast,impact=1.02)
    def hurt(t,node,path,neutral):
        k=(node,path);baseVal=idlePose[k];kick=math.sin(math.pi*t)**1.5
        # A quick hit-stun: head, chest and shoulders rotate, legs keep support.
        return tweak(baseVal,node,path,{
          'Spine':((1,0,0),.22*kick),
          'Spine2':((0,0,1),.11*kick),
          'Head':((1,0,0),-.17*kick),
          'LeftShoulder':((0,0,1),.2*kick),
          'RightShoulder':((0,0,1),-.2*kick),
        })
    add_clip(g,blob,base,'Hurt',.48,hurt)
    def guard(t,node,path,neutral):
        k=(node,path);amt=smoothstep(0,.23,t)*(1-smoothstep(.75,1,t))
        return tweak(idlePose[k],node,path,{
          'RightArm':((1,0,0),-1.03*amt),
          'LeftArm':((1,0,0),-1.05*amt),
          'RightForeArm':((1,0,0),-.48*amt),
          'LeftForeArm':((1,0,0),-.48*amt),
          'Spine1':((1,0,0),-.09*amt),
        })
    add_clip(g,blob,base,'Guard',.88,guard)
    def dodge(t,node,path,neutral):
        k=(node,path);runPose=pose(run,node,path,t*.63)
        val=blend(idlePose[k],runPose,path,math.sin(t*math.pi))
        return tweak(val,node,path,{'Spine':((0,0,1),.25*math.sin(math.pi*t))})
    add_clip(g,blob,base,'Dodge',.60,dodge)
    def die(t,node,path,neutral):
        k=(node,path);v=pose(death,node,path,t*2.9666)
        return v
    add_clip(g,blob,base,'Death_Quick',1.62,die)
    assert len(g['animations'])==15
    g['buffers'][0]['byteLength']=len(blob)
    g['asset']['generator']='MadrugaCraft Goblin Rig Animator v2.23 (original 6 clips preserved)'
    g.setdefault('extras',{})['goblinEnhancement']={'originalClips':6,'addedClips':9,'skeletonJoints':len(g['skins'][0]['joints']),'animationVersion':1}
    js=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode('utf8')
    js+=b' '*((-len(js))%4)
    blob+=b'\x00'*(-len(blob)%4)
    total=12+8+len(js)+8+len(blob)
    out=bytearray(struct.pack('<4sII',MAGIC,2,total))
    out+=struct.pack('<II',len(js),0x4E4F534A)+js
    out+=struct.pack('<II',len(blob),0x004E4942)+blob
    pathlib.Path(dst).parent.mkdir(parents=True,exist_ok=True)
    pathlib.Path(dst).write_bytes(out)
    print('output',dst,'bytes',len(out),'clips',[(a['name'],round(a.get('extras',{}).get('durationSeconds',0),2)) for a in g['animations']])

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit(__doc__)
    build(sys.argv[1],sys.argv[2])
