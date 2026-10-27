// Só consulta dados que pertencem ao tipo de construção realmente encontrado.
// Uma porta, baú ou bancada possui crop=null: nunca acessar seus campos.
export function buildingInteractionLabel(structure,maturity=125){
    if(!structure)return '';
    switch(structure.type){
        case 'door':return structure.open?'Fechar porta':'Abrir porta';
        case 'bed':return 'Dormir até amanhecer';
        case 'chest':return 'Abrir baú';
        case 'workbench':return 'Usar bancada';
        case 'farmPlot':{
            const crop=structure.crop;
            if(!crop || typeof crop.planted!=='boolean')return 'Verificar canteiro';
            if(!crop.planted)return 'Plantar sementes';
            if(crop.growth>=maturity)return 'Colher legumes';
            return crop.water>8?'Canteiro crescendo':'Regar canteiro';
        }
        default:return 'Interagir';
    }
}
