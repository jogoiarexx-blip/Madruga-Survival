import {GUARD_WORK_KEYS,GUARD_WORK_LABELS,GUARD_FARM_KEY} from '../gameplay/guard-work-preferences.js';
// Painel montado sob demanda; toda alteração é salva pelo controlador principal.
export function createGuardWorkUI({getPreferences,onChange}={}){
 const overlay=document.createElement('section');overlay.id='guard-work-panel';overlay.className='hidden';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Prioridades de coleta do Chaves');
 overlay.innerHTML='<div class="guard-work-dialog"><header><h2>🧺 Trabalho do Chaves</h2><button type="button" id="guard-work-close" aria-label="Fechar painel">✕</button></header><p>Escolha quais recursos Chaves poderá buscar. A cesta continua limitada a 18 itens, e ele levará a carga aos baús.</p><div id="guard-work-checks"></div><p class="guard-work-help">Desativar um recurso não apaga o que já está na cesta. Chaves ainda depositará a carga existente.</p></div>';
 const styles=document.createElement('style');styles.textContent=`#guard-work-panel:not(.hidden){position:fixed;inset:0;z-index:240;background:rgba(4,10,12,.80);display:flex;align-items:center;justify-content:center;padding:16px} .guard-work-dialog{background:#192724;color:#f7f5e6;border:1px solid #8aab86;border-radius:16px;padding:22px;max-width:480px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 18px 50px #0009} .guard-work-dialog header{display:flex;justify-content:space-between;align-items:center;gap:12px}.guard-work-dialog header button{background:#3b5445;color:#fff;min-width:44px;min-height:42px;border:0;border-radius:8px;font-size:20px}.guard-work-dialog p{font-size:14px;line-height:1.45}.guard-work-dialog #guard-work-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:20px 0}.guard-work-dialog label{background:#263a2d;padding:12px;border-radius:8px;display:flex;align-items:center;gap:12px;cursor:pointer}.guard-work-dialog input{width:19px;height:19px;accent-color:#a5d88c}`;
 document.head.appendChild(styles);document.body.appendChild(overlay);
 const wrap=overlay.querySelector('#guard-work-checks');
 const keys=[...GUARD_WORK_KEYS,GUARD_FARM_KEY];
 const labels={...GUARD_WORK_LABELS,farm:'🌾 Cuidar da horta'};
 for(const key of keys){const label=document.createElement('label');const box=document.createElement('input');box.type='checkbox';box.dataset.resource=key;label.append(box,document.createTextNode(labels[key]));wrap.append(label);
  box.addEventListener('change',()=>{const next={...getPreferences(),[key]:box.checked};if(onChange?.(next)===false)box.checked=!box.checked;});}
 function close(){overlay.classList.add('hidden');}
 function open(){const p=getPreferences();for(const box of wrap.querySelectorAll('input'))box.checked=p[box.dataset.resource]!==false;overlay.classList.remove('hidden');overlay.querySelector('input')?.focus();}
 overlay.querySelector('#guard-work-close').addEventListener('click',close);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 return {open,close,get isOpen(){return !overlay.classList.contains('hidden')}};
}
