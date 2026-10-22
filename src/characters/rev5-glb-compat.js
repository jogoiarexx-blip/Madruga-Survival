// REV5 exporter omitted extensionsUsed for its KHR_materials_unlit material.
// GLTFLoader r160 therefore never registers getMaterialType(). Repair metadata
// after SHA-256 verification, preserving unchanged BIN, bones and animations.
export function repairRev5GlbMetadata(input) {
  const buffer = input instanceof ArrayBuffer ? input :
    ArrayBuffer.isView(input) ? input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength) : null;
  if (!buffer || buffer.byteLength < 20) return input;
  const view=new DataView(buffer);
  if (view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2 ||
      view.getUint32(8,true)!==buffer.byteLength || view.getUint32(16,true)!==0x4e4f534a) return input;
  const jsonLength=view.getUint32(12,true);
  if (jsonLength<=0 || 20+jsonLength>buffer.byteLength) throw Error('GLB REV5: JSON inválido');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
  const needsUnlit=(json.materials||[]).some(material=>Object.hasOwn(material.extensions||{},'KHR_materials_unlit'));
  if(!needsUnlit || (json.extensionsUsed||[]).includes('KHR_materials_unlit')) return buffer;
  json.extensionsUsed=[...new Set([...(json.extensionsUsed||[]),'KHR_materials_unlit'])];
  const encoded=new TextEncoder().encode(JSON.stringify(json));
  const padded=(encoded.length+3)&~3;
  const restOffset=20+jsonLength;
  const result=new ArrayBuffer(20+padded+buffer.byteLength-restOffset);
  const out=new DataView(result);
  out.setUint32(0,0x46546c67,true);
  out.setUint32(4,2,true);
  out.setUint32(8,result.byteLength,true);
  out.setUint32(12,padded,true);
  out.setUint32(16,0x4e4f534a,true);
  const chunk=new Uint8Array(result,20,padded);
  chunk.fill(0x20);
  chunk.set(encoded);
  new Uint8Array(result,20+padded).set(new Uint8Array(buffer,restOffset));
  return result;
}
