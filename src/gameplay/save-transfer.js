// Transferência de checkpoints entre navegadores sem alterar o formato interno do save.
import {validateSave,readSave,writeSave,SAVE_MAX_BYTES} from './save-system.js?v=2.41.0-ecosystem';
export const EXPORT_FORMAT='madruga-survival-save';
export const EXPORT_VERSION=1;
export const MAX_IMPORT_BYTES=SAVE_MAX_BYTES+16384;

export function serializePortableSave(data){
  const checked=validateSave({version:2,...data});
  if(!checked)throw new Error('Partida inválida: nada foi exportado.');
  const text=JSON.stringify({format:EXPORT_FORMAT,exportVersion:EXPORT_VERSION,createdAt:new Date().toISOString(),save:checked});
  if(text.length>MAX_IMPORT_BYTES)throw new Error('A partida ultrapassou o tamanho permitido para exportação.');
  return text;
}
export function parsePortableSave(text){
  if(typeof text!=='string'||text.length===0||text.length>MAX_IMPORT_BYTES)
    throw new Error('Arquivo de save vazio ou grande demais.');
  let parsed;
  try{parsed=JSON.parse(text);}catch{throw new Error('Arquivo JSON de save inválido.');}
  if(!parsed||Array.isArray(parsed)||parsed.format!==EXPORT_FORMAT||parsed.exportVersion!==EXPORT_VERSION)
    throw new Error('Arquivo não pertence ao formato de save do Madruga Survival.');
  // Validação completa impede importar dados faltantes ou corrompidos.
  const result=validateSave(parsed.save);
  if(!result)throw new Error('Save incompatível ou corrompido; a partida atual foi preservada.');
  return result;
}
export function exportStoredSave(storage){
  const save=readSave(storage);
  if(!save)throw new Error('Nenhum checkpoint válido disponível.');
  return serializePortableSave(save);
}
export function importPortableSave(storage,text){
  const save=parsePortableSave(text); // sem qualquer gravação antes de validar
  if(!writeSave(storage,save))throw new Error('Falha ao gravar save; verifique espaço e permissões do navegador.');
  return save;
}
