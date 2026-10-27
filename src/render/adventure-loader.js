// Controlador de carregamento: progresso por ETAPAS CONCLUÍDAS (não um timer).
// Sem acesso ao DOM, WebGL nem a save; pode ser testado independentemente.
export function createAdventureLoader({yieldToBrowser=async()=>{},onProgress=()=>{}}={}){
    let running=null;
    async function run(stages){
        if(!Array.isArray(stages)||!stages.length)throw Error('Nenhuma etapa de carregamento');
        const total=stages.length,optionalFailures=[];
        const emit=(status,done,label='',error=null)=>onProgress({
            status,done,total,label,error,optionalFailures:[...optionalFailures],
            percent:Math.round(done/total*100)
        });
        emit('loading',0,stages[0].name);
        await yieldToBrowser();
        for(let i=0;i<total;i++){
            const stage=stages[i];
            emit('loading',i,stage.name);
            await yieldToBrowser();
            try{
                const result=await stage.load();
                if(result===false){
                    if(!stage.optional)throw Error(`A etapa \"${stage.name}\" não foi concluída`);
                    optionalFailures.push(stage.name);
                }
            }catch(error){
                if(!stage.optional){emit('error',i,stage.name,error);throw error;}
                optionalFailures.push(stage.name);
                console.warn('[Carregamento opcional]',stage.name,error);
            }
            emit('loading',i+1,stages[i+1]?.name||'Finalizando');
        }
        emit('ready',total,'Pronto para jogar');
        return {total,optionalFailures};
    }
    return {
        start(stages){
            if(running)return running;
            const task=run(stages);
            running=task;
            void task.finally(()=>{if(running===task)running=null;}).catch(()=>{});
            return task;
        },
        get running(){return running!==null;}
    };
}
