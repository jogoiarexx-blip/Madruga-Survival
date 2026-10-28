// Indicador de pesca isolado do HUD de sobrevivência.
export function createFishingHud(){
 const element=document.createElement('section');element.id='fishing-hud';element.className='hidden';
 element.setAttribute('role','status');element.setAttribute('aria-live','polite');
 element.innerHTML='<div id="fishing-prompt">🎣 Linha lançada</div><div class="fishing-meter"><span id="fishing-meter-fill"></span></div><small id="fishing-instruction">Aguarde a fisgada…</small>';
 const style=document.createElement('style');style.textContent=`#fishing-hud:not(.hidden){display:flex;position:fixed;bottom:22%;left:50%;transform:translateX(-50%);width:min(370px,88vw);flex-direction:column;gap:6px;text-align:center;padding:12px 16px;background:#101c1de8;border:1px solid #8dc2b1;border-radius:12px;z-index:45;pointer-events:none;color:#f6f7ed;font:600 15px system-ui,sans-serif;box-shadow:0 8px 25px #0008}#fishing-hud .fishing-meter{height:9px;border-radius:10px;background:#32494b;overflow:hidden}#fishing-meter-fill{display:block;width:0%;height:100%;background:#9bd582;transition:width .1s}#fishing-instruction{font-size:12px;color:#d9ecdd}`;
 document.head.appendChild(style);document.body.appendChild(element);
 let last='';
 function update(state){
  const visible=state?.phase&&state.phase!=='idle'&&state.phase!=='caught';
  element.classList.toggle('hidden',!visible);
  if(!visible)return;
  const phase=state.phase;
  const title=phase==='waiting'?'🎣 Aguardando fisgada…':phase==='bite'?'❗ PEIXE NA LINHA!':'🐟 Recolhendo '+(state.species?.name||'peixe');
  const info=phase==='waiting'?'Não aperte Y ainda':phase==='bite'?'APERTE Y antes que escape!':`Aperte Y em ritmo · ${state.progress}/${state.species?.tugs||3}`;
  const meter=phase==='waiting'?Math.max(0,Math.min(100,(1-state.seconds/6.6)*100)):phase==='bite'?Math.max(0,state.seconds/1.55*100):phase==='reeling'?Math.max(0,state.seconds/6.6*100):0;
  const signature=title+'|'+info+'|'+Math.round(meter/4);
  if(signature!==last){element.querySelector('#fishing-prompt').textContent=title;element.querySelector('#fishing-instruction').textContent=info;element.querySelector('#fishing-meter-fill').style.width=meter.toFixed(0)+'%';last=signature;}
 }
 return {update,hide(){element.classList.add('hidden');last='';}};
}
