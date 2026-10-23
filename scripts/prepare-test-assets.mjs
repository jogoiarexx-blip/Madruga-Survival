// Reconstrói GLBs de teste publicados em 17 partes, sem download ou dependências.
// Verifica comprimento e SHA-256 para garantir igualdade bit a bit com os originais.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(new URL('../',import.meta.url)));
function materialize(folder,filename){
  const base=join(root,'assets','models'),parts=join(base,folder);
  const manifest=JSON.parse(readFileSync(join(parts,'manifest.json'),'utf8'));
  if(!Number.isInteger(manifest.byteLength)||!Array.isArray(manifest.parts)||manifest.parts.length<1)
    throw Error('Manifesto inválido: '+folder);
  const expected=manifest.sha256;
  const full=join(base,filename);
  const digest=b=>createHash('sha256').update(b).digest('hex');
  if(existsSync(full)){
    const cached=readFileSync(full);
    if(cached.length===manifest.byteLength&&digest(cached)===expected){
      console.log('GLB válido já presente:',filename);return;
    }
  }
  const pieces=manifest.parts.map(name=>{
    if(!/^part\d{2}\.b64$/.test(name))throw Error('Parte inválida: '+name);
    return Buffer.from(readFileSync(join(parts,name),'utf8').replace(/\s+/g,''),'base64');
  });
  const binary=Buffer.concat(pieces);
  if(binary.length!==manifest.byteLength||binary.toString('ascii',0,4)!=='glTF'||digest(binary)!==expected)
    throw Error('GLB inválido: '+filename+' (comprimento/cabeçalho/SHA-256)');
  writeFileSync(full,binary);
  console.log('GLB reconstruído e validado:',filename,binary.length,'bytes');
}
materialize('rev2-parts','zumbi_animado_REV2.glb');
materialize('rev5-parts','Striped_Wanderer_REV5.glb');
