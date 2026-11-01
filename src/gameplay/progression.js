// Progressão de nível compartilhada por inimigos, caça e missões.
export const MAX_LEVEL=100;
export const MAX_XP=100000;
export const MAX_KILLS=100000;
export const LEVEL_HEALTH_BONUS=12;
export const LEVEL_HEAL=30;
export const xpRequiredFor=level=>4+level*3;
export function applyExperience({level,xp,maxHealth,health},amount){
  let gained=0;
  xp+=Math.max(0,Math.floor(Number(amount)||0));
  while(level<MAX_LEVEL&&xp>=xpRequiredFor(level)){
    xp-=xpRequiredFor(level);level++;gained++;
    maxHealth+=LEVEL_HEALTH_BONUS;
    health=Math.min(maxHealth,health+LEVEL_HEAL);
  }
  if(level>=MAX_LEVEL)xp=Math.min(xp,xpRequiredFor(MAX_LEVEL)-1);
  return {level,xp:Math.min(xp,MAX_XP),maxHealth,health,gained};
}
export function clampProgress({level,xp,kills,maxHealth,health}){
  const safeLevel=Math.max(1,Math.min(MAX_LEVEL,Math.floor(level)||1));
  const safeMax=Math.max(100,Math.min(100+(MAX_LEVEL-1)*LEVEL_HEALTH_BONUS,maxHealth));
  return {
    level:safeLevel,
    xp:Math.max(0,Math.min(MAX_XP,Math.floor(xp)||0)),
    kills:Math.max(0,Math.min(MAX_KILLS,Math.floor(kills)||0)),
    maxHealth:safeMax,
    health:Math.min(safeMax,health)
  };
}
