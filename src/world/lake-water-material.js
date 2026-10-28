// Lagoa com reflexo de céu simulado e ondas procedurais, sem cubemaps ou render-to-texture.
// O shader usa uma única superfície e não cria draw calls por onda.
export const WATER_DETAIL_DISTANCE=60;
export function useDetailedWater(distance,quality='medium'){
 return Number.isFinite(distance)&&distance<(quality==='high'?WATER_DETAIL_DISTANCE:quality==='medium'?39:0);
}
export function createLakeWaterMaterial(THREE){
 return new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uOpacity:{value:.88}},
  vertexShader:`varying vec2 vLakeUv;varying vec3 vLakeWorld;
    void main(){vLakeUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vLakeWorld=w.xyz;
    gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;uniform float uOpacity;
    varying vec2 vLakeUv;varying vec3 vLakeWorld;
    void main(){
      vec2 p=(vLakeUv-.5)*2.0;float rad=length(p);
      float w1=sin(p.x*22.0+uTime*.85+sin(p.y*13.0-uTime*.4)*.7);
      float w2=sin(p.y*32.0-uTime*1.25-p.x*8.0);
      float waves=w1*.5+w2*.5;
      vec3 viewDir=normalize(cameraPosition-vLakeWorld);
      float grazing=pow(1.0-clamp(abs(viewDir.y),0.0,1.0),2.3);
      vec3 deep=vec3(.045,.30,.36),sky=vec3(.22,.54,.60);
      vec3 col=mix(deep,sky,clamp(.22+.62*grazing+.09*waves,0.0,1.0));
      float glint=pow(max(0.0,sin(p.x*30.0+p.y*19.0+uTime*1.1)*sin(p.y*40.0-uTime*.85)),12.0);
      col+=vec3(.26,.36,.36)*glint*(.24+.45*grazing);
      float foam=smoothstep(.88,1.0,rad)*(.38+.28*sin(p.x*26.0+p.y*16.0+uTime*.65));
      col=mix(col,vec3(.64,.78,.72),clamp(foam,0.0,.52));
      gl_FragColor=vec4(col,uOpacity);
    }`,
  transparent:true,depthWrite:false,side:THREE.DoubleSide,
 });
}
