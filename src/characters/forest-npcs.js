import {createGuardNavigator} from '../gameplay/guard-navigation.js';
// NPCs ambientais: a simulacao e o render permanecem independentes dos saves v2.
// GLBs grandes sao buscados apenas quando o jogador se aproxima; sem RAF/timer extra.
export const FOREST_NPC_SPECS=Object.freeze([
  Object.freeze({
    id:'chiquinha',name:'Chiquinha',url:'./assets/models/chiquinha.glb',
    x:10,z:-8,height:1.40,walkRadius:3.2,speed:.80,loadRadius:42,
    clothes:0xc75470,skin:0xf0b78d,
    dialogue:Object.freeze([
      'Chiquinha: Seu Madruga! Achei um cantinho seguro perto da base.',
      'Chiquinha: Agora posso plantar, regar e colher para o acampamento!',
      'Chiquinha: Cuidado ao sair sozinho. O Chaves pode proteger o acampamento.'
    ])
  }),
  Object.freeze({
    id:'bruxa71',name:'Bruxa do 71',url:'./assets/models/bruxa%20do%2071.glb',
    x:-43,z:-37,height:1.72,walkRadius:2.7,speed:.52,loadRadius:44,
    clothes:0x534374,skin:0xdabca2,
    dialogue:Object.freeze([
      'Bruxa do 71: A floresta guarda segredos, principalmente depois do anoitecer.',
      'Bruxa do 71: Seda de aranha e cristais da caverna podem ser muito uteis.',
      'Bruxa do 71: Minha cabana e os cristais da caverna precisam de sua ajuda.'
    ])
  })
]);
export function npcDistance(a,b){
  return Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
}
export function npcPatrolGoal(spec,t){
  const angle=t*(spec.id==='chiquinha'?.32:.19)+(spec.id==='chiquinha'?.4:2.2);
  const radius=spec.walkRadius*(.55+.20*Math.sin(t*.21));
  return {x:spec.x+Math.cos(angle)*radius,z:spec.z+Math.sin(angle)*radius};
}
// Escolhe uma lateral alcançável do canteiro, evitando fixar um deslocamento
// diagonal que poderia jogar o NPC contra árvores, muros ou outra estrutura.
export function npcFarmApproach(plot,origin,isFree=()=>true){
  if(!plot||!Number.isFinite(plot.x)||!Number.isFinite(plot.z))return null;
  const offsets=[[1.72,0],[-1.72,0],[0,1.72],[0,-1.72]];
  const candidates=offsets.map(([dx,dz])=>({x:plot.x+dx,z:plot.z+dz}));
  const safe=candidates.filter(p=>isFree(p.x,p.z,.35));
  const choices=safe.length?safe:candidates;
  return choices.sort((a,b)=>npcDistance(a,origin)-npcDistance(b,origin))[0];
}
export function chooseNpcClip(names,moving){
  if(!Array.isArray(names)||!names.length)return null;
  const patterns=moving?[/walk|andar|locomot|camin|passeio/i,/run|corr/i]:
    [/idle|parad|wait|stand|respir|breath|relax/i,/walk|andar|locomot/i];
  for(const pattern of patterns){const match=names.find(name=>pattern.test(name));if(match)return match;}
  return names.find(name=>!/attack|hit|death|die|damage|fall|jump|combat|shoot/i.test(name))||null;
}
export function createForestNpcs({THREE,GLTFLoader,scene,getGroundHeight,resolveCollision,
  onBeforeMount=async()=>{},onStatus=()=>{}}){
  const agents=FOREST_NPC_SPECS.map(spec=>{
    const model=new THREE.Group();model.name='npc_'+spec.id;
    const fixed=resolveCollision(spec.x,spec.z,.50);
    model.position.set(fixed.x,getGroundHeight(fixed.x,fixed.z),fixed.z);
    const fallback=new THREE.Group();model.add(fallback);
    // Silhuetas provisórias, baratas e visíveis mesmo quando o download falha.
    const clothes=new THREE.MeshLambertMaterial({color:spec.clothes});
    const skin=new THREE.MeshLambertMaterial({color:spec.skin});
    const dark=new THREE.MeshLambertMaterial({color:0x29222b});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.23,.31,spec.height*.51,7),clothes);
    body.position.y=spec.height*.43;fallback.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(spec.id==='chiquinha'?.21:.19,9,7),skin);
    head.position.y=spec.height*.81;fallback.add(head);
    if(spec.id==='bruxa71'){
      const hat=new THREE.Mesh(new THREE.ConeGeometry(.35,.45,8),dark);
      hat.position.y=spec.height*1.04;fallback.add(hat);
    }else{
      for(const side of [-1,1]){
        const braid=new THREE.Mesh(new THREE.SphereGeometry(.12,7,5),dark);
        braid.position.set(side*.24,spec.height*.83,0);fallback.add(braid);
      }
    }
    fallback.traverse(object=>{if(object.isMesh)object.castShadow=false;});
    scene.add(model);
    const navigator=spec.id==='chiquinha'?createGuardNavigator({
      resolveCollision,getGroundHeight,radius:.35,
      isFree:(x,z,r)=>npcDistance({x,z},resolveCollision(x,z,r))<.025
    }):null;
    return {spec,model,fallback,loaded:false,loading:false,failed:false,
      mixer:null,actions:{},current:null,clock:0,dialogueIndex:0,animationCount:0,
      idleFrozen:false,greetTimer:0,navigator,farmTarget:null,farmSpot:null,activity:'idle'};
  });
  async function load(agent){
    if(agent.loaded||agent.loading||agent.failed||!GLTFLoader)return false;
    agent.loading=true;
    try{
      const gltf=await new GLTFLoader().loadAsync(agent.spec.url);
      const root=gltf.scene;
      if(!root)throw Error('GLB sem cena');
      root.traverse(node=>{
        if(node.isMesh){node.castShadow=true;node.receiveShadow=false;
          if(node.isSkinnedMesh)node.frustumCulled=false;}
      });
      root.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(root);
      const height=bounds.max.y-bounds.min.y;
      if(!Number.isFinite(height)||height<.001)throw Error('Escala do GLB invalida');
      const wrapper=new THREE.Group();wrapper.name='visual_'+agent.spec.id;
      wrapper.scale.setScalar(agent.spec.height/height);
      // Centraliza apenas a transformacao do objeto importado; nao altera ossos/rig.
      root.position.x-=(bounds.min.x+bounds.max.x)/2;
      root.position.y-=bounds.min.y;
      root.position.z-=(bounds.min.z+bounds.max.z)/2;
      wrapper.add(root);
      await onBeforeMount(wrapper,agent.spec.name);
      agent.model.add(wrapper);
      agent.fallback.visible=false;
      const clips=gltf.animations||[];
      agent.mixer=new THREE.AnimationMixer(root);
      agent.actions=Object.fromEntries(clips.map(clip=>[clip.name,agent.mixer.clipAction(clip)]));
      agent.animationCount=clips.length;
      agent.loaded=true;
      onStatus(agent.spec.id,'ready',clips.length);
      return true;
    }catch(error){
      agent.failed=true;
      console.warn('[NPC] GLB nao carregado; mantendo visual provisório:',agent.spec.name,error);
      onStatus(agent.spec.id,'fallback',0);
      return false;
    }finally{agent.loading=false;}
  }
  function animateAgent(agent,moving,dt){
    if(!agent.mixer){
      // Idle discreto apenas no visual provisório, sem alterar a raiz da colisão.
      agent.fallback.position.y=Math.sin(agent.clock*2)*.013;
      return;
    }
    const names=Object.keys(agent.actions);
    const greeting=agent.greetTimer>0&&names.find(n=>/wave|greet|acen/i.test(n));
    const name=greeting||chooseNpcClip(names,moving);
    const action=name&&agent.actions[name];
    if(action&&action!==agent.current){
      if(agent.current){agent.current.paused=false;agent.current.fadeOut(.18);}
      agent.current=action;
      action.reset().setLoop(greeting?THREE.LoopOnce:THREE.LoopRepeat,greeting?1:Infinity).fadeIn(.18).play();
    }
    if(action){
      // Os GLBs atuais nao possuem Idle: quando parado, mantenha a pose da
      // caminhada congelada em vez de fazer os pes deslizar pelo terreno.
      const frozen=!moving&&!greeting&&/walk|andar|locomot|camin/i.test(name)&&
        !names.some(n=>/idle|stand|parad|wait|respir|breath/i.test(n));
      if(frozen&&!agent.idleFrozen){
        if(action.time<.03)action.time=Math.min(action.getClip().duration*.30,.45);
        action.setEffectiveWeight(1);
      }
      action.paused=Boolean(frozen);
      agent.idleFrozen=Boolean(frozen);
    }
    agent.mixer.update(dt);
    agent.greetTimer=Math.max(0,agent.greetTimer-dt);
  }
  function update(dt,playerPosition,{insideCave=false,chiquinhaTarget=null}={}){
    const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    for(const agent of agents){
      const dist=npcDistance(agent.model.position,playerPosition);
      agent.model.visible=!insideCave&&dist<100;
      if(!agent.model.visible)continue;
      if(dist<=agent.spec.loadRadius&&!agent.loaded&&!agent.loading&&!agent.failed)void load(agent);
      if(dist>55)continue; // Nao simula animacoes distantes.
      agent.clock+=step;
      const closeToPlayer=dist<3.2;
      const nearFarm=agent.spec.id==='chiquinha'&&chiquinhaTarget&&
        Number.isFinite(chiquinhaTarget.x)&&Number.isFinite(chiquinhaTarget.z);
      // Um trabalho ativo mantém a lateral escolhida até o canteiro mudar.
      if(agent.navigator){
        if(nearFarm&&agent.farmTarget!==chiquinhaTarget){
          agent.farmTarget=chiquinhaTarget;
          agent.farmSpot=npcFarmApproach(chiquinhaTarget,agent.model.position,
            (x,z,r)=>npcDistance({x,z},resolveCollision(x,z,r))<.025);
          agent.navigator.reset();
        }else if(!nearFarm&&agent.farmTarget){
          agent.farmTarget=null;agent.farmSpot=null;agent.navigator.reset();
        }
      }
      const goal=nearFarm?(agent.farmSpot||npcFarmApproach(chiquinhaTarget,agent.model.position)):
        npcPatrolGoal(agent.spec,agent.clock);
      const dx=goal.x-agent.model.position.x,dz=goal.z-agent.model.position.z;
      const length=Math.hypot(dx,dz);
      const oldX=agent.model.position.x,oldZ=agent.model.position.z;
      if(!closeToPlayer&&length>.36&&step){
        const candidate=agent.navigator&&nearFarm?
          agent.navigator.navigate(agent.model.position,goal,step,agent.spec.speed,{stopAt:.32}):
          resolveCollision(oldX+dx/length*Math.min(length,agent.spec.speed*step),
            oldZ+dz/length*Math.min(length,agent.spec.speed*step),.48);
        // Nunca aceitar um empurrão que teletransporte o NPC.
        if(npcDistance(candidate,agent.model.position)<1){
          agent.model.position.x=candidate.x;agent.model.position.z=candidate.z;
        }
      }
      const moving=Math.hypot(agent.model.position.x-oldX,agent.model.position.z-oldZ)>.0008;
      agent.activity=nearFarm?(moving?'indo_para_horta':'cuidando_horta'):
        closeToPlayer?'conversando':moving?'patrulhando':'parada';
      const face=closeToPlayer?Math.atan2(playerPosition.x-agent.model.position.x,
        playerPosition.z-agent.model.position.z):Math.atan2(dx,dz);
      if(Number.isFinite(face)){
        const delta=Math.atan2(Math.sin(face-agent.model.rotation.y),Math.cos(face-agent.model.rotation.y));
        agent.model.rotation.y+=delta*Math.min(1,step*5);
      }
      agent.model.position.y=getGroundHeight(agent.model.position.x,agent.model.position.z);
      animateAgent(agent,moving,step);
    }
  }
  function nearest(playerPosition,{insideCave=false}={}){
    if(insideCave)return null;
    let best=null,bestDistance=2.8;
    for(const agent of agents){
      const d=npcDistance(agent.model.position,playerPosition);
      if(d<bestDistance){best=agent;bestDistance=d;}
    }
    return best;
  }
  function interact(playerPosition,options={}){
    const agent=nearest(playerPosition,options);
    if(!agent)return null;
    const msg=agent.spec.dialogue[agent.dialogueIndex%agent.spec.dialogue.length];
    agent.dialogueIndex++;
    if(agent.spec.id==='bruxa71')agent.greetTimer=2;
    return msg;
  }
  function reset(){
    for(const agent of agents){
      agent.clock=0;agent.dialogueIndex=0;agent.greetTimer=0;agent.idleFrozen=false;
      agent.navigator?.reset();agent.farmTarget=null;agent.farmSpot=null;agent.activity='idle';
      const p=resolveCollision(agent.spec.x,agent.spec.z,.50);
      agent.model.position.set(p.x,getGroundHeight(p.x,p.z),p.z);
    }
  }
  return {update,nearest,interact,reset,
    preloadNear:playerPosition=>Promise.all(agents.filter(a=>npcDistance(a.model.position,playerPosition)<a.spec.loadRadius).map(load)),
    get agents(){return agents;}};
}
