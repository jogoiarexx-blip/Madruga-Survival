import {SKILLS,MAX_SKILL_LEVEL,skillGoal,perkDescription} from '../gameplay/skills.js';

// Painel isolado da cena 3D: não recria geometria ou DOM a cada frame.
export function createSkillsUI({getState,onClose}){
 const panel=document.getElementById('skills-panel');
 const list=document.getElementById('skills-list');
 const summary=document.getElementById('skills-summary');
 const cards={};
 let visible=false;
 const create=(parent,tag,className)=>{const n=document.createElement(tag);n.className=className;parent.append(n);return n;};
 for(const [id,def] of Object.entries(SKILLS)){
  const card=create(list,'article','skill-card');
  const title=create(card,'div','skill-name');title.textContent=`${def.icon} ${def.name}`;
  const label=create(card,'div','skill-level');
  const track=create(card,'div','skill-track');
  const fill=create(track,'div','skill-fill');
  const detail=create(card,'div','skill-perk');
  const activity=create(card,'div','skill-activity');activity.textContent=`Ganhe XP: ${def.activity}`;
  cards[id]={label,fill,detail};
 }
 document.getElementById('skills-close').addEventListener('click',onClose);
 function update(force=false){
  if(!visible&&!force)return;
  const skills=getState()?.skills;
  if(!skills)return;
  const average=Math.floor(Object.values(skills).reduce((sum,v)=>sum+v.level,0)/Object.keys(SKILLS).length);
  summary.textContent=`8 profissões · Nível médio ${average} · Máximo ${MAX_SKILL_LEVEL} por profissão`;
  for(const [id,dom] of Object.entries(cards)){
   const state=skills[id],done=state.level>=MAX_SKILL_LEVEL;
   const goal=skillGoal(state.level);
   dom.label.textContent=`Nível ${state.level} · ${done?'DOMINADA':`${state.xp}/${goal} XP`}`;
   dom.fill.style.width=`${done?100:Math.min(100,state.xp/goal*100)}%`;
   dom.detail.textContent=`Benefício: ${perkDescription(id,state.level)}`;
  }
 }
 function open(){visible=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update(true);document.getElementById('skills-close').focus();}
 function close(){visible=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');}
 return {open,close,update,get isOpen(){return visible;}};
}
