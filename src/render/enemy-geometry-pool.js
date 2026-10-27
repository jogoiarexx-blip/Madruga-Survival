// Reutiliza geometria procedural de criaturas compatíveis. Cada Mesh mantém
// transformações, materiais e rig independentes: nenhuma animação é partilhada.
// Não chamar dispose() destes buffers ao derrotar um único inimigo.
export function createEnemyGeometryPool(){
    const geometries=new Map();
    let reuseCount=0;
    function get(key,create){
        if(geometries.has(key)){
            reuseCount++;
            return geometries.get(key);
        }
        const geometry=create();
        if(!geometry)throw new Error('Não foi possível construir geometria: '+key);
        if(!geometry.userData)geometry.userData={};
        geometry.userData.sharedEnemyGeometry=true;
        geometries.set(key,geometry);
        return geometry;
    }
    return {get,get stats(){return {unique:geometries.size,reused:reuseCount};}};
}

export function canDisposeEnemyGeometry(geometry){
    return !!geometry&&!geometry.userData?.sharedEnemyGeometry;
}
