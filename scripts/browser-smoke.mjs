// Smoke test real com Chromium headless (sem dependências NPM).
// O navegador precisa estar instalado; se os imports externos Three.js estiverem
// bloqueados, o teste declara explicitamente que validou apenas a navegação HTML.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const chromium=process.env.CHROME_BIN||'chromium';
const userDir=await mkdtemp(join(tmpdir(),'madruga-browser-'));
const server=spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'18765'},stdio:'ignore'});
const browser=spawn(chromium,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0',`--user-data-dir=${userDir}`,'about:blank'],{stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const eventually=async fn=>{let last;for(let i=0;i<80;i++){try{return await fn();}catch(err){last=err;await pause(100);}}throw last;};
try {
  const [port]=await eventually(async()=>{const raw=await readFile(join(userDir,'DevToolsActivePort'),'utf8');return raw.split('\n');});
  const pages=await eventually(async()=>{const result=await fetch(`http://127.0.0.1:${port}/json/list`);if(!result.ok)throw Error('Sem CDP');return result.json();});
  const page=pages.find(p=>p.type==='page');assert.ok(page,'Chrome sem alvo Page');
  const socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let counter=0;const responses=new Map();
  socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id&&responses.has(data.id)){const {resolve,reject}=responses.get(data.id);responses.delete(data.id);if(data.error)reject(Error(data.error.message));else resolve(data.result);}};
  function call(method,params={}){return new Promise((resolve,reject)=>{const id=++counter;responses.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
  const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
  await call('Page.enable');await call('Runtime.enable');
  await eventually(async()=>{const r=await fetch('http://127.0.0.1:18765/');if(!r.ok)throw Error('Servidor local ainda indisponível');return true;});
  const navigation=await call('Page.navigate',{url:'http://127.0.0.1:18765/'});
  const offline=!!navigation.errorText;
  if(offline){
    console.log('AVISO: Chrome bloqueou localhost ('+navigation.errorText+'). Teste do DOM isolado; gameplay 3D não avaliado.');
    const frame=(await call('Page.getFrameTree')).frameTree.frame.id;
    const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
    await call('Page.setDocumentContent',{frameId:frame,html});
  } else {
    await eventually(async()=>{const ready=await evaluate('document.readyState');if(ready!=='complete'||!(await evaluate('location.href')).startsWith('http://127.0.0.1:18765/'))throw Error('Página carregando');return true;});
  }
  const ids=await evaluate(`['start-btn','load-btn','export-save-menu','import-save-menu','save-file-input','export-save-pause','import-save-pause','fps-display'].every(id=>!!document.getElementById(id))`);
  assert.equal(ids,true,'Interface de backup ou carregamento ausente');
  assert.equal(await evaluate('document.documentElement.dataset.build'),'2.38.0-save-profiling');
  assert.ok((await evaluate('document.title')).includes('2.38.0'));
  // Verifica troca de foco e retorno do menu, sem iniciar o mundo nem baixar GLBs.
  assert.equal(await evaluate(`(()=>{const b=document.getElementById('start-btn');b.focus();return document.activeElement===b;})()`),true);
  console.log('PASS Browser smoke: navegação do menu, botões de save, foco e versão 2.38.0');
  const loaded=await evaluate('Boolean(window.__madrugaReady)');
  if(!loaded)console.log('NOTA: runtime WebGL/Three.js não confirmado neste ambiente; sessão 3D e inventário requerem teste online.');
  else console.log('Runtime inicializado no navegador.');
  socket.close();
}finally{browser.kill('SIGKILL');server.kill('SIGKILL');await pause(450);try{await rm(userDir,{recursive:true,force:true,maxRetries:12,retryDelay:300});}catch(error){console.warn('Chrome temporário não pôde ser removido:',error.message);}}
