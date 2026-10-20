// Regras independentes da renderização para as variantes de infectados.
export const ZOMBIE_TYPES = Object.freeze({
  zombie: {name:'Zumbi',size:.92,speed:2.45,hp:3,damage:10,skin:0x85b877,shirt:0x4f6650,eyes:0xb9ffd4},
  zombie_runner:{name:'Corredor',size:.78,speed:5.6,hp:2,damage:8,skin:0x96a973,shirt:0x775444,eyes:0xffdd72},
  zombie_toxic:{name:'Zumbi tóxico',size:1.01,speed:2.75,hp:4,damage:9,skin:0x73bd65,shirt:0x355b3b,eyes:0x9dff56,poisonSeconds:6},
  zombie_brute:{name:'Zumbi gigante',size:1.88,speed:1.7,hp:12,damage:23,skin:0x798d76,shirt:0x414e43,eyes:0xffa96b,structureDamage:1.65}
});
export const isZombieType = type => Object.hasOwn(ZOMBIE_TYPES,type);
export function chooseZombieType({night=false,graveyard=false,day=1,roll=.5}={}){
  if (!night&&!graveyard)return 'zombie';
  const r=Math.min(.999999,Math.max(0,Number.isFinite(roll)?roll:.5));
  if(day>=5 && r>.91)return 'zombie_brute';
  if(day>=2 && r>.65)return 'zombie_toxic';
  if(r>.33)return 'zombie_runner';
  return 'zombie';
}
export const CEMETERY_POS = Object.freeze({x:-64,z:-46,radius:15});
export const withinCemetery=(pos,r=CEMETERY_POS.radius)=>!!pos&&Math.hypot(pos.x-CEMETERY_POS.x,pos.z-CEMETERY_POS.z)<r;
