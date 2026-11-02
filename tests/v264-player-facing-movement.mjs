import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextPlayerFacing,movementFacingYaw,shortestTurn,PLAYER_TURN_MIN_SPEED}
 from '../src/characters/player-facing.js';
import {movementCameraOffset} from '../src/render/camera-follow.js';
import {isInAttackArc} from '../src/gameplay/combat.js';

const near=(a,b,tol=.01)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const dt=1/60;
const step=(targetYaw,{lookYaw=0,dx=0,dz=0,moving=true,manualLook=false,attacking=false,dashing=false,seconds=1}={})=>{
 let value=targetYaw;
 for(let i=0;i<Math.round(seconds/dt);i++)
  value=nextPlayerFacing(value,lookYaw,dt,{dx,dz,moving,manualLook,attacking,dashing});
 return value;
};
near(movementFacingYaw(0,-.13,dt),0);
near(movementFacingYaw(.13,0,dt),-Math.PI/2);
near(movementFacingYaw(-.13,0,dt),Math.PI/2);
near(Math.abs(movementFacingYaw(0,.13,dt)),Math.PI);
assert.equal(movementFacingYaw(.00001,0,dt),null,'Micro deslocamento por animação não gira corpo');
assert.equal(movementFacingYaw(0,0,dt),null);
assert.equal(movementFacingYaw(.2,0,0),null);
assert.equal(shortestTurn(Math.PI-.1,-Math.PI+.1)>.0,true,'Maior arco nunca usado ao cruzar ±pi');
near(step(0,{dx:0,dz:-.13}),0);
near(step(0,{dx:.13,dz:0}),-Math.PI/2,.002);
near(step(0,{dx:-.13,dz:0}),Math.PI/2,.002);
near(Math.abs(step(0,{dx:0,dz:.13})),Math.PI,.002);
const diagonal=step(0,{dx:.09,dz:-.09});
near(diagonal,-Math.PI/4,.002);
near(step(1.2,{dx:0,dz:0,moving:false}),1.2,1e-9);
near(step(1.2,{dx:0,dz:0,moving:true}),1.2,1e-9);
near(step(0,{dx:.12,dz:0,moving:false}),0,1e-9);
near(step(0,{lookYaw:1.1,manualLook:true,dx:0,dz:0,moving:false}),1.1,.002);
near(step(-Math.PI/2,{lookYaw:0,attacking:true,dx:.13,dz:0}),0,.002);
near(step(0,{dx:-.1,dz:0,dashing:true,moving:false}),Math.PI/2,.002);
assert.equal(nextPlayerFacing(1,.5,0,{dx:.1,dz:0,moving:true}),1);
assert.equal(nextPlayerFacing(.7,NaN,dt),0,'Falha segura para ângulos inválidos');

// A câmera pode iniciar sua curva antes que o corpo complete a rotação;
// ambos usam o mesmo vetor WORLD, mas WASD segue baseado em lookYaw.
const offset=movementCameraOffset(0,.13,0,dt);
assert.ok(offset<0);
const face=nextPlayerFacing(0,0,dt,{dx:.13,dz:0,moving:true});
assert.ok(face<0,'Corpo vira para o mesmo lado que o acompanhamento automático da câmera');
assert.ok(Math.abs(face)<.3,'Primeiro frame não teletransporta a orientação');
const cameraYaw=.4;
const wInput={x:0,z:-1};
const worldMove={dx:(wInput.x*Math.cos(cameraYaw)+wInput.z*Math.sin(cameraYaw))*.13,
  dz:(-wInput.x*Math.sin(cameraYaw)+wInput.z*Math.cos(cameraYaw))*.13};
near(movementFacingYaw(worldMove.dx,worldMove.dz,dt),cameraYaw);
near(step(0,{lookYaw:cameraYaw,...worldMove}),cameraYaw,.002);

// O cone de ataque é o mesmo eixo da frente VISUAL, e não o yaw de controle.
const actorYaw=step(0,{dx:.13,dz:0});
assert.equal(isInAttackArc({x:0,z:0},actorYaw,{x:2,z:0},3,.6),true);
assert.equal(isInAttackArc({x:0,z:0},actorYaw,{x:-2,z:0},3,.6),false);

const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(code,/player\.rotation\.y=nextPlayerFacing\(player\.rotation\.y,playerYaw,dt/);
assert.match(code,/getPlayerYaw:\(\)=>player\.rotation\.y/);
assert.match(code,/dx:realDx,dz:realDz,moving:moveDir\.lengthSq\(\)>\.01/);
assert.match(code,/if\(Math\.abs\(e\.movementX\)\+Math\.abs\(e\.movementY\)>0\)\{cameraRig\.onManualLook\(\);manualFaceGrace=\.35;\}/);
assert.match(code,/playerYaw=data\.player\.yaw;player\.rotation\.y=playerYaw;manualFaceGrace=0/);
assert.ok(!code.includes('player.rotation.y = playerYaw;\n        const realMovementSpeed'),
 'Não pode reaplicar yaw da câmera à malha depois do movimento');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/forest-webp-r1-s2-f8/);
console.log('OK v2.64: Madruga vira com W/A/S/D, combate acompanha corpo, câmera/manual/saves preservados');
