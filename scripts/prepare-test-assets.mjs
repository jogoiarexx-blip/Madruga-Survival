// Reconstrói GLBs de teste publicados em 17 partes, sem download ou dependências.
// Verifica comprimento e SHA-256 para garantir igualdade bit a bit com os originais.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
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
// Aranha Sombria: pacote gzip em base64 no GitHub Pages; restaura GLB para o QA.
import {gunzipSync} from 'node:zlib';
function materializeSpider(){
  const base=join(root,'assets','models'),folder=join(base,'aranha-parts');
  const manifest=JSON.parse(readFileSync(join(folder,'manifest.json'),'utf8'));
  if(manifest.compression!=='gzip'||!Array.isArray(manifest.parts)||
     manifest.parts.length<1||manifest.parts.length>60)throw Error('Manifesto da aranha inválido');
  const full=join(base,'aranha_sombria_animada.glb');
  const digest=b=>createHash('sha256').update(b).digest('hex');
  if(existsSync(full)){
    const cached=readFileSync(full);
    if(cached.length===manifest.glbByteLength&&digest(cached)===manifest.sha256)return;
  }
  const gz=Buffer.concat(manifest.parts.map(name=>{
    if(!/^part\d{2}\.b64$/.test(name))throw Error('Nome de parte da aranha inválido');
    return Buffer.from(readFileSync(join(folder,name),'utf8').trim(),'base64');
  }));
  if(gz.length!==manifest.byteLength)throw Error('Pacote de aranha incompleto');
  const glb=gunzipSync(gz);
  if(glb.length!==manifest.glbByteLength||glb.toString('ascii',0,4)!=='glTF'||
     digest(glb)!==manifest.sha256)throw Error('Aranha GLB: checksum inválido');
  writeFileSync(full,glb);
  console.log('Aranha Sombria restaurada:',glb.length,'bytes');
}
materializeSpider();
