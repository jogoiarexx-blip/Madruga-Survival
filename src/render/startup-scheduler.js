// Scheduler independente do DOM. Nenhum frame é pedido antes de start().
export const PAUSED_RENDER_MS=250;
export function createFrameDriver({requestFrame,cancelFrame,setTimer,clearTimer,getMode,onFrame}){
  let started=false,raf=null,timer=null;
  function cancel(){
    if(raf!==null){cancelFrame(raf);raf=null;}
    if(timer!==null){clearTimer(timer);timer=null;}
  }
  function schedule(){
    if(!started)return;
    const mode=getMode();
    if(mode==='off')return;
    if(mode==='play')raf=requestFrame(tick);
    else if(mode==='pause')timer=setTimer(()=>{timer=null;raf=requestFrame(tick);},PAUSED_RENDER_MS);
  }
  function tick(){
    raf=null;
    if(!started||getMode()==='off')return;
    onFrame();
    schedule();
  }
  return {
    start(){if(started)return;started=true;schedule();},
    stop(){started=false;cancel();},
    wake(){cancel();schedule();},
    get running(){return started;}
  };
}
// Rigs carregados uma única vez, em ordem de importância e sem downloads
// paralelos concorrendo por memória; erro em um rig não impede os seguintes.
export function createAssetPipeline({stages,onProgress=()=>{}}){
  let task=null;
  function start(){
    if(task)return task;
    task=(async()=>{
      const results=[];
      for(let i=0;i<stages.length;i++){
        const stage=stages[i];
        onProgress({label:stage.name,done:i,total:stages.length,complete:false});
        try{results.push(!!(await stage.load()));}
        catch(error){console.warn('Asset opcional indisponível:',stage.name,error);results.push(false);}
      }
      onProgress({label:'',done:stages.length,total:stages.length,complete:true});
      return results;
    })();
    return task;
  }
  return {start,get started(){return task!==null;}};
}
