// v2.20: seletor radial de construções, somente interface; nunca debita recursos.
import {STRUCTURE_TYPES} from '../world/building-rules.js';
import {RECIPES,RESOURCES} from '../gameplay/survival.js';

export const BUILD_WHEEL_ICONS=Object.freeze({
  campfire:'🔥',shelter:'⛺',floor:'🪵',wall:'🧱',door:'🚪',bed:'🛏️',
  chest:'📦',workbench:'🛠️',roof:'🏠',farmPlot:'🌱'
});
export const BUILD_WHEEL_TYPES=Object.freeze([...STRUCTURE_TYPES]);

export function wheelStep(index,offset,length=BUILD_WHEEL_TYPES.length){
  return ((index+offset)%length+length)%length;
}
export function buildCostText(cost,stock={}){
  return Object.entries(cost||{}).map(([key,amount])=>
    `${RESOURCES[key]?.icon||'▪'} ${stock[key]??0}/${amount}`).join('  ·  ');
}

export function createBuildWheelUI({getAvailability,onSelect,onClose}){
  const root=document.getElementById('build-wheel');
  const ring=document.createElement('div');ring.id='build-wheel-ring';
  ring.setAttribute('role','group');ring.setAttribute('aria-label','Estruturas disponíveis');
  const center=document.createElement('div');center.id='build-wheel-center';
  const title=document.createElement('strong');title.id='build-wheel-title';
  const cost=document.createElement('span');cost.id='build-wheel-cost';
  const status=document.createElement('small');status.id='build-wheel-status';status.setAttribute('aria-live','polite');
  center.append(title,cost,status);ring.append(center);
  const closeButton=document.createElement('button');closeButton.id='build-wheel-close';
  closeButton.type='button';closeButton.textContent='✕ Fechar [Esc]';closeButton.addEventListener('click',onClose);
  const caption=document.createElement('p');caption.id='build-wheel-hint';
  caption.textContent='Clique ou toque numa peça · ← → para navegar · Enter para escolher';
  root.append(ring,caption,closeButton);
  const buttons=[];
  let visible=false,selected=0;
  for(const [index,type] of BUILD_WHEEL_TYPES.entries()){
    const angle=-Math.PI/2+2*Math.PI*index/BUILD_WHEEL_TYPES.length;
    const button=document.createElement('button');button.type='button';
    button.className='build-wheel-option';button.dataset.type=type;
    button.style.left=`${(50+37.3*Math.cos(angle)).toFixed(3)}%`;
    button.style.top=`${(50+37.3*Math.sin(angle)).toFixed(3)}%`;
    button.setAttribute('aria-label',`Construir ${RECIPES[type].label}`);
    const icon=document.createElement('span');icon.className='build-wheel-icon';
    icon.textContent=BUILD_WHEEL_ICONS[type]||'🧱';
    const label=document.createElement('span');label.className='build-wheel-label';label.textContent=RECIPES[type].label;
    button.append(icon,label);ring.append(button);buttons.push(button);
    button.addEventListener('pointerenter',()=>focus(index,false));
    button.addEventListener('focus',()=>focus(index,false));
    button.addEventListener('click',()=>choose(type));
  }
  function availability(type){return getAvailability(type)||{ok:false,reason:'Indisponível',cost:{},stock:{}};}
  function focus(index,focusButton=false){
    selected=wheelStep(index,0);
    const type=BUILD_WHEEL_TYPES[selected],info=availability(type);
    buttons.forEach((b,i)=>b.classList.toggle('selected',i===selected));
    title.textContent=`${BUILD_WHEEL_ICONS[type]} ${RECIPES[type].label}`;
    cost.textContent=buildCostText(info.cost,info.stock);
    status.textContent=info.ok?'✓ Materiais disponíveis':`⚠ ${info.reason||'Materiais insuficientes'}`;
    status.classList.toggle('unavailable',!info.ok);
    if(focusButton)buttons[selected].focus();
  }
  function update(){
    buttons.forEach((b,index)=>{
      const info=availability(BUILD_WHEEL_TYPES[index]);
      b.classList.toggle('unavailable',!info.ok);
      b.dataset.available=String(!!info.ok);
      b.title=`${RECIPES[BUILD_WHEEL_TYPES[index]].label}: ${buildCostText(info.cost,info.stock)}${info.ok?'':` · ${info.reason}`}`;
    });
    focus(selected,false);
  }
  function choose(type){
    if(!BUILD_WHEEL_TYPES.includes(type))return false;
    return onSelect(type)===true;
  }
  function open(){
    visible=true;root.classList.remove('hidden');root.setAttribute('aria-hidden','false');
    selected=BUILD_WHEEL_TYPES.findIndex(type=>availability(type).ok);
    if(selected<0)selected=0;
    update();buttons[selected].focus();
  }
  function close(){visible=false;root.classList.add('hidden');root.setAttribute('aria-hidden','true');}
  function keydown(code){
    if(!visible)return false;
    if(code==='ArrowRight'||code==='ArrowDown'){focus(selected+1,true);return true;}
    if(code==='ArrowLeft'||code==='ArrowUp'){focus(selected-1,true);return true;}
    if(code==='Enter'||code==='Space'){choose(BUILD_WHEEL_TYPES[selected]);return true;}
    return false;
  }
  return {open,close,update,keydown,get isOpen(){return visible}};
}
