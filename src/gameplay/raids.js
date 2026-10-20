import {DAY_SECONDS,isNight} from './survival.js';
export function createRaidState(){return {lastNight:0,waves:0};}
export function restoreRaid(data){
 if(!data)return createRaidState();
 if(!Number.isInteger(data.lastNight)||data.lastNight<0||data.lastNight>100000||
    !Number.isInteger(data.waves)||data.waves<0||data.waves>100000)return null;
 return {lastNight:data.lastNight,waves:data.waves};
}
export function nightNumber(survival){
 const inDay=(survival.time%DAY_SECONDS)/DAY_SECONDS;
 // A madrugada ainda pertence à noite do dia anterior.
 return inDay<.20?survival.days-1:survival.days;
}
export function planRaid(survival,raid,structureCount){
 if(!isNight(survival)||structureCount===0)return null;
 const night=nightNumber(survival);
 if(night<2||night<=raid.lastNight)return null;
 raid.lastNight=night;raid.waves++;
 return {night,count:Math.min(6,2+Math.floor(night/2)),intensity:Math.min(6,1+Math.floor(night/3))};
}
