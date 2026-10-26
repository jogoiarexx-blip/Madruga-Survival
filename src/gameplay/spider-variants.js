// Espécies compartilham GLB, esqueleto e cinco clipes; parâmetros e visual são independentes.
export const SPIDER_VARIANTS=Object.freeze({
  shadow:Object.freeze({name:'Aranha Sombria',size:1.55,speed:3.6,hp:6,damage:10,
    tint:0xffffff,glow:0x000000,webSpeed:8,webDamage:3,webSlow:2.7,fanSpread:.23,
    burstChance:.23,jumpChance:.30,webCooldown:5.1,burstCooldown:7.3,jumpCooldown:3.0,biteCooldown:1.55}),
  hunter:Object.freeze({name:'Aranha Caçadora',size:1.18,speed:4.65,hp:4,damage:8,
    tint:0xd7a779,glow:0x604025,webSpeed:9,webDamage:2,webSlow:1.5,fanSpread:.19,
    burstChance:0,jumpChance:.76,webCooldown:7.0,burstCooldown:8.0,jumpCooldown:2.25,biteCooldown:1.20}),
  weaver:Object.freeze({name:'Aranha Tecelã',size:1.94,speed:2.65,hp:12,damage:15,
    tint:0x9ac4e5,glow:0x22577b,webSpeed:7.2,webDamage:4,webSlow:3.6,fanSpread:.28,
    burstChance:.72,jumpChance:.09,webCooldown:3.7,burstCooldown:5.3,jumpCooldown:4.5,biteCooldown:2.0}),
  matriarch:Object.freeze({name:'Rainha das Aranhas',size:2.9,speed:2.6,hp:48,damage:19,
    tint:0xd99ce7,glow:0x602268,webSpeed:9,webDamage:6,webSlow:4.2,fanSpread:.35,
    burstChance:.9,jumpChance:.2,webCooldown:2.9,burstCooldown:4.5,jumpCooldown:3.4,biteCooldown:1.6})
});
export const isSpiderVariant=id=>typeof id==='string'&&Object.hasOwn(SPIDER_VARIANTS,id);
export function getSpiderVariant(id){return SPIDER_VARIANTS[isSpiderVariant(id)?id:'shadow'];}
// Aleatoriedade injetável para tornar distribuição e dificuldade testáveis.
export function chooseSpiderVariant({day=1,night=false,threat=0,roll=.5}={}){
  const r=Math.max(0,Math.min(.999999,Number.isFinite(roll)?roll:.5));
  if(threat>=3)return r<.72?'weaver':'hunter';
  if(day>=4&&(night||threat>=2)&&r<.24)return 'weaver';
  if(day>=2&&r<(day>=4?.61:.35))return 'hunter';
  return 'shadow';
}
