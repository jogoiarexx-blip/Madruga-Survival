import {RESOURCES,DAY_SECONDS,isNight,clamp} from './survival.js';
export const CHEST_CAPACITY=80;
export function validChestItems(items){
 return !!items&&typeof items==='object'&&!Array.isArray(items)&&Object.entries(items).every(([key,n])=>
   Object.hasOwn(RESOURCES,key)&&Number.isInteger(n)&&n>=0&&n<=CHEST_CAPACITY)&&
   Object.values(items).reduce((a,b)=>a+b,0)<=CHEST_CAPACITY;
}
export function totalStored(items){return Object.values(items||{}).reduce((a,b)=>a+b,0);}
export function transferItem(survival,chest,key,direction,amount=1){
 if(!Object.hasOwn(RESOURCES,key)||!['store','take'].includes(direction)||!Number.isInteger(amount)||amount<1||amount>99||!validChestItems(chest.items))return 0;
 const bag=survival.inventory;
 if(!Number.isInteger(bag[key])||bag[key]<0||bag[key]>999)return 0;
 const incoming=direction==='store'?bag:chest.items;
 const outgoing=direction==='store'?chest.items:bag;
 const room=direction==='store'?CHEST_CAPACITY-totalStored(chest.items):999-bag[key];
 const count=Math.min(amount,incoming[key]||0,room);
 if(count<=0)return 0;
 incoming[key]-=count;outgoing[key]=(outgoing[key]||0)+count;
 if(direction==='take'&&incoming[key]===0)delete incoming[key];
 return count;
}
export function sleepInBed(survival){
 if(!isNight(survival))return {ok:false,reason:'A cama pode ser usada à noite.'};
 if(survival.hunger<=15||survival.thirst<=15)return {ok:false,reason:'Coma e beba antes de dormir.'};
 const dayStart=Math.floor(survival.time/DAY_SECONDS)*DAY_SECONDS;
 const normalized=(survival.time-dayStart)/DAY_SECONDS;
 const dawn=dayStart+(normalized>=.76?1.24:.24)*DAY_SECONDS;
 survival.time=dawn;survival.days=1+Math.floor(survival.time/DAY_SECONDS);
 survival.hunger=clamp(survival.hunger-10);survival.thirst=clamp(survival.thirst-13);
 survival.stamina=100;survival.warmth=Math.max(survival.warmth,85);
 return {ok:true,healing:25};
}
