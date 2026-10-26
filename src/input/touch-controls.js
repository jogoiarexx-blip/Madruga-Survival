// Controles de toque progressivos: somente dispositivos de ponteiro grosso.
export function createTouchControls({canvas,enabled,onLook,onKey,onPause,onInventory,onBuild=()=>{}}){
 const layer=document.getElementById('touch-controls');
 if(!enabled){layer.remove();return {release(){},enabled:false};}
 layer.classList.remove('hidden');
 const held=new Set();
 const release=()=>{for(const key of held)onKey(key,false);held.clear();};
 for(const button of layer.querySelectorAll('[data-hold]')){
   const code=button.dataset.hold;
   const down=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);held.add(code);onKey(code,true);};
   const up=e=>{e.preventDefault();held.delete(code);onKey(code,false);};
   button.addEventListener('pointerdown',down);
   button.addEventListener('pointerup',up);
   button.addEventListener('pointercancel',up);
   button.addEventListener('lostpointercapture',up);
 }
 for(const button of layer.querySelectorAll('[data-action]')){
   button.addEventListener('pointerdown',e=>{e.preventDefault();onKey(button.dataset.action,true);
     onKey(button.dataset.action,false);});
 }
 document.getElementById('touch-pause').onclick=onPause;
 document.getElementById('touch-inventory').onclick=onInventory;
 document.getElementById('touch-build').onclick=onBuild;
 let pointer=null,lastX=0,lastY=0;
 canvas.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||pointer!==null)return;
   pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(pointer);
 });
 canvas.addEventListener('pointermove',e=>{
   if(e.pointerId!==pointer)return;
   const dx=Math.max(-70,Math.min(70,e.clientX-lastX));
   const dy=Math.max(-70,Math.min(70,e.clientY-lastY));
   lastX=e.clientX;lastY=e.clientY;onLook(dx,dy);
 });
 const clear=e=>{if(e.pointerId===pointer)pointer=null;};
 canvas.addEventListener('pointerup',clear);canvas.addEventListener('pointercancel',clear);
 window.addEventListener('blur',release);
 return {release,enabled:true};
}
