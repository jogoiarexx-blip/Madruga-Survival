// Evita invalidar layout e leitores de tela ao reatribuir valores idênticos.
export function setTextIfChanged(element,value){
  if(!element)return false;
  const next=String(value);
  if(element.textContent===next)return false;
  element.textContent=next;
  return true;
}
export function setWidthIfChanged(element,value){
  if(!element)return false;
  if(element.style.width===value)return false;
  element.style.width=value;
  return true;
}
