import {ZOMBIE_TYPES} from './zombie-variants.js';
import {SPIDER_VARIANTS,isSpiderVariant} from './spider-variants.js?v=2.13.0';
import {restoreGuard} from '../characters/villager-guard.js?v=2.41.0-ecosystem';
// Save v2 separado do save da campanha v1 para não destruir a partida antiga.
import {restoreSurvival} from './survival.js';
import {restoreHotbar} from './consumable-hotbar.js';
import {restoreBag} from './inventory-slots.js';
import {STRUCTURE_TYPES,MODULAR_TYPES,MAX_STRUCTURES} from '../world/building-rules.js?v=2.41.0-ecosystem';
import {validChestItems} from './storage.js';
import {maxBuildingHP} from './base-defense.js?v=2.41.0-ecosystem';
import {restoreRaid} from './raids.js';
import {validCrop} from './farming.js';
import {validWildlife} from '../world/wildlife.js';
import {restoreMissionProgress} from './mission-progress.js';
import {validExplorationSave} from '../world/exploration.js?v=2.41.0-ecosystem';
import {validSpiderNestSave} from '../world/spider-nests.js';
import {validCaveSave} from '../world/arachnid-cave.js';
export const SAVE_KEY='madrugacraft.survival.v2';
export const SAVE_BACKUP_KEY=SAVE_KEY+'.backup';
// Salvações longas com construções/baús/NPCs não devem falhar no limite antigo de 60 KB.
// O limite continua finito para impedir leitura de blobs abusivos/corrompidos.
export const SAVE_MAX_BYTES=240000;
const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const integer=(n,min,max)=>Number.isInteger(n)&&number(n,min,max);
const point=p=>p&&number(p.x,-109,109)&&number(p.z,-109,109);
const points=(items,max)=>Array.isArray(items)&&items.length<=max&&items.every(point);
const types=new Set(['normal','fast','tank','shaman','boss','spider',...Object.keys(ZOMBIE_TYPES)]);
const maxEnemyHP={normal:2,fast:1,tank:4,shaman:3,boss:24,spider:Math.max(...Object.values(SPIDER_VARIANTS).map(v=>v.hp)),...Object.fromEntries(Object.entries(ZOMBIE_TYPES).map(([id,v])=>[id,v.hp]))};
export function validateSave(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==2)return null;
 if(!integer(data.seed,0,0xffffffff)||!['low','medium','high'].includes(data.graphicsQuality))return null;
 if(!integer(data.level,1,100)||!integer(data.xp,0,100000)||!integer(data.kills,0,100000)||
  !number(data.health,0.01,1300)||!number(data.maxHealth,100,1300)||data.health>data.maxHealth||
  !integer(data.wave,1,6)||!number(data.elapsed,0,1e7)||!integer(data.currentWeapon,0,2))return null;
 if(!point(data.player)||!number(data.player.yaw,-1e9,1e9))return null;
 const survival=restoreSurvival(data.survival);
 const hotbar=restoreHotbar(data.hotbar);
 if(!survival||!hotbar)return null;
 const inventorySlots=restoreBag(data.inventorySlots,survival.inventory);
 if(!inventorySlots)return null;
 if((data.currentWeapon===1&&!survival.crafted.hammer)||
   (data.currentWeapon===2&&!survival.crafted.spear)||
   (survival.crafted.spear&&!survival.crafted.hammer))return null;
 if(!points(data.healthPacks,20)||!points(data.speedBoosts,18))return null;
 if(!Array.isArray(data.enemies)||data.enemies.length>30||
    !data.enemies.every(e=>point(e)&&types.has(e.type)&&integer(e.hp,1,e.type==='spider'?
     SPIDER_VARIANTS[e.spiderVariant??'shadow']?.hp??0:maxEnemyHP[e.type]||0)&&
     (e.type==='spider'?(e.spiderVariant===undefined||isSpiderVariant(e.spiderVariant)):e.spiderVariant===undefined)&&
     typeof e.enraged==='boolean'))return null;
 if(!Array.isArray(data.resources)||data.resources.length>200||
   !data.resources.every(n=>point(n)&&['wood','stone','berries','fiber','water','iron'].includes(n.type)&&number(n.cooldown,0,120)))return null;
 if(!Array.isArray(data.buildings)||data.buildings.length>MAX_STRUCTURES||
   !data.buildings.every(b=>point(b)&&STRUCTURE_TYPES.includes(b.type)&&
     (!MODULAR_TYPES.includes(b.type)||(Number.isInteger(b.rotation)&&b.rotation>=0&&b.rotation<=3))&&
     (!['door','window'].includes(b.type)||typeof b.open==='boolean')&&
     (b.type!=='chest'||validChestItems(b.items))&&
     (b.type!=='farmPlot'||b.crop===undefined||validCrop(b.crop))&&
     (b.hp===undefined||integer(b.hp,1,maxBuildingHP(b.type)))))return null;
 if(data.wildlife!==undefined&&!validWildlife(data.wildlife))return null;
 const missions=restoreMissionProgress(data.missions);if(!missions)return null;
 if(!validExplorationSave(data.exploration)||!validSpiderNestSave(data.spiderNests)||!validCaveSave(data.arachnidCave))return null;
 const raid=restoreRaid(data.raid);if(!raid)return null;
 const guard=restoreGuard(data.guard);if(!guard)return null;
 if(data.poisonTimer!==undefined&&!number(data.poisonTimer,0,30))return null;
 return {...data,survival,hotbar,inventorySlots,raid,...(data.missions===undefined?{}:{missions}),...(data.guard===undefined?{}:{guard}),...(data.poisonTimer===undefined?{}:{poisonTimer:data.poisonTimer})};
}
function parseCheckpoint(raw){
  if(typeof raw!=='string'||raw.length> SAVE_MAX_BYTES || raw.length===0)return null;
  try{return validateSave(JSON.parse(raw));}catch(_){return null;}
}
// Primário íntegro prevalece; backup é usado apenas quando o primário se perdeu.
// Jamais substituímos a cópia de segurança por um dado ainda não validado.
export function readSave(storage){
  try{
    const current=parseCheckpoint(storage?.getItem(SAVE_KEY));
    return current||parseCheckpoint(storage?.getItem(SAVE_BACKUP_KEY));
  }catch(_){return null;}
}
export function writeSave(storage,data){
  try{
    const parsed=validateSave({version:2,...data});if(!parsed||!storage)return false;
    const serialized=JSON.stringify(parsed);
    if(serialized.length> SAVE_MAX_BYTES)return false;
    const original=storage.getItem(SAVE_KEY);
    if(parseCheckpoint(original)){
      // O localStorage.setItem é atômico por chave; uma falha aqui não elimina o último primário.
      // Sem espaço para backup, ainda tentamos salvar o novo progresso normalmente.
      try{storage.setItem(SAVE_BACKUP_KEY,original);}catch(_){}
    }
    storage.setItem(SAVE_KEY,serialized);
    return true;
  }catch(_){return false;}
}
export function clearSave(storage){
  if(!storage)return false;
  try{storage.removeItem(SAVE_KEY);storage.removeItem(SAVE_BACKUP_KEY);return true;}
  catch(_){return false;}
}
