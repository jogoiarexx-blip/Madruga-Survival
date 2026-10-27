// Diagnóstico de frames por janela deslizante; usa duração REAL, antes do clamp da física.
// Não cria timers nem escreve no DOM. A atualização só ocorre ao abrir F3.
export function createFrameProfiler({capacity=240,slowThreshold=50}={}){
  const size=Math.max(8,Math.min(2400,Math.floor(capacity)||240));
  const values=new Float32Array(size);
  let index=0,count=0;
  function record(milliseconds){
    if(!Number.isFinite(milliseconds)||milliseconds<0)return;
    values[index]=Math.min(milliseconds,10000);index=(index+1)%size;
    count=Math.min(count+1,size);
  }
  function snapshot(){
    if(!count)return {samples:0,p50:0,p95:0,p99:0,max:0,slowFrames:0};
    const sorted=Array.from(values.slice(0,count)).sort((a,b)=>a-b);
    const at=p=>Math.round(sorted[Math.min(count-1,Math.ceil(count*p)-1)]*10)/10;
    return {samples:count,p50:at(.5),p95:at(.95),p99:at(.99),max:at(1),slowFrames:sorted.filter(v=>v>=slowThreshold).length};
  }
  function reset(){index=0;count=0;}
  return {record,snapshot,reset};
}
