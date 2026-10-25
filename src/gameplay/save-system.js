import {ZOMBIE_TYPES} from './zombie-variants.js';
import {restoreGuard} from '../characters/villager-guard.js';
// Save v2 separado do save da campanha v1 para não destruir a partida antiga.
import {restoreSurvival} from './survival.js';
import {STRUCTURE_TYPES,MODULAR_TYPES,MAX_STRUCTURES} from '../world/building-rules.js';
import {validChestItems} from './storage.js';
import {maxBuildingHP} from './base-defense.js';
import {restoreRaid} from './raids.js';
import {validCrop} from './farming.js';
import {validWildlife} from '../world/wildlife.js';
import {validExplorationSave} from '../world/exploration.js';
export const SAVE_KEY='madrugacraft.survival.v2';
const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const integer=(n,min,max)=>Number.isInteger(n)&&number(n,min,max);
const point=p=>p&&number(p.x,-109,109)&&number(p.z,-109,109);
const points=(items,max)=>Array.isArray(items)&&items.length<=max&&items.every(point);
const types=new Set(['normal','fast','tank','shaman','boss',...Object.keys(ZOMBIE_TYPES)]);
const maxEnemyHP={normal:2,fast:1,tank:4,shaman:3,boss:24,...Object.fromEntries(Object.entries(ZOMBIE_TYPES).map(([id,v])=>[id,v.hp]))};
export function validateSave(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==2)return null;
 if(!integer(data.seed,0,0xffffffff)||!['low','medium','high'].includes(data.graphicsQuality))return null;
 if(!integer(data.level,1,100)||!integer(data.xp,0,100000)||!integer(data.kills,0,100000)||
  !number(data.health,0.01,1300)||!number(data.maxHealth,100,1300)||data.health>data.maxHealth||
  !integer(data.wave,1,6)||!number(data.elapsed,0,1e7)||!integer(data.currentWeapon,0,2))return null;
 if(!point(data.player)||!number(data.player.yaw,-1e9,1e9))return null;
 const survival=restoreSurvival(data.survival);
 if(!survival)return null;
 if((data.currentWeapon===1&&!survival.crafted.hammer)||
   (data.currentWeapon===2&&!survival.crafted.spear)||
   (survival.crafted.spear&&!survival.crafted.hammer))return null;
 if(!points(data.healthPacks,20)||!points(data.speedBoosts,18))return null;
 if(!Array.isArray(data.enemies)||data.enemies.length>30||
    !data.enemies.every(e=>point(e)&&types.has(e.type)&&integer(e.hp,1,maxEnemyHP[e.type]||0)&&typeof e.enraged==='boolean'))return null;
 if(!Array.isArray(data.resources)||data.resources.length>200||
   !data.resources.every(n=>point(n)&&['wood','stone','berries','fiber','water','iron'].includes(n.type)&&number(n.cooldown,0,120)))return null;
 if(!Array.isArray(data.buildings)||data.buildings.length>MAX_STRUCTURES||
   !data.buildings.every(b=>point(b)&&STRUCTURE_TYPES.includes(b.type)&&
     (!MODULAR_TYPES.includes(b.type)||(Number.isInteger(b.rotation)&&b.rotation>=0&&b.rotation<=3))&&
     (b.type!=='door'||typeof b.open==='boolean')&&
     (b.type!=='chest'||validChestItems(b.items))&&
     (b.type!=='farmPlot'||b.crop===undefined||validCrop(b.crop))&&
     (b.hp===undefined||integer(b.hp,1,maxBuildingHP(b.type)))))return null;
 if(data.wildlife!==undefined&&!validWildlife(data.wildlife))return null;
 if(!validExplorationSave(data.exploration))return null;
 const raid=restoreRaid(data.raid);if(!raid)return null;
 const guard=restoreGuard(data.guard);if(!guard)return null;
 if(data.poisonTimer!==undefined&&!number(data.poisonTimer,0,30))return null;
 return {...data,survival,raid,...(data.guard===undefined?{}:{guard}),...(data.poisonTimer===undefined?{}:{poisonTimer:data.poisonTimer})};
}
export function readSave(storage){try{const raw=storage?.getItem(SAVE_KEY);
 if(!raw||raw.length>60000)return null;
 return validateSave(JSON.parse(raw));}catch(_){return null;}}
export function writeSave(storage,data){try{
 const parsed=validateSave({version:2,...data});if(!parsed||!storage)return false;
 storage.setItem(SAVE_KEY,JSON.stringify(parsed));return true;
 }catch(_){return false;}}
export function clearSave(storage){try{storage?.removeItem(SAVE_KEY);return true;}catch(_){return false;}}
