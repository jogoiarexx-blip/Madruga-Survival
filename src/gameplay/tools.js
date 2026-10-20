// Durabilidade e progressão de equipamentos. Funções sem DOM ou Three.js.
export const TOOL_MAX=Object.freeze({pickaxe:80,hammer:100,spear:90});
export const TOOL_REPAIR=Object.freeze({pickaxe:'repairPickaxe',hammer:'repairHammer',spear:'repairSpear'});
export function useTool(survival,type,damage=1){
 if(!Object.hasOwn(TOOL_MAX,type)||!survival.crafted[type]||!Number.isFinite(damage)||damage<=0)return false;
 const n=survival.durability[type];
 if(!Number.isInteger(n)||n<=0)return false;
 survival.durability[type]=Math.max(0,n-Math.floor(damage));return true;
}
export function restoreTool(survival,type){
 if(!Object.hasOwn(TOOL_MAX,type)||!survival.crafted[type])return false;
 if(survival.durability[type]>=TOOL_MAX[type])return false;
 survival.durability[type]=TOOL_MAX[type];return true;
}
export function canUseTool(survival,type){return !!survival.crafted[type]&&(survival.durability[type]||0)>0;}
export function makeTool(survival,type){
 if(!Object.hasOwn(TOOL_MAX,type))return false;
 survival.crafted[type]=true;survival.durability[type]=TOOL_MAX[type];return true;
}
