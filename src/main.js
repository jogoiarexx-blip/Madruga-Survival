// MadrugaCraft Sobrevivência v1.9 — mundo modular e publicação estática.
import { createNatureAssets } from './world/nature-assets.js';
import { createCameraRig } from './render/camera-rig.js';
import { createForest } from './world/forest.js';
import { readSave, writeSave, clearSave } from './gameplay/save-system.js';
import { createTerrain } from './world/terrain.js';
import { createMinimap } from './ui/minimap.js';
import { weaponTypes } from './gameplay/equipment.js';
import { applyGraphicsSettings } from './render/quality.js';
import { initAudio, sfx } from './audio/sfx.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {shouldRenderFrame} from './render/frame-budget.js';
import {createZombieModelManager} from './characters/zombie-models.js?v=2.1.3-zombie-combat';
import { createPlayerModel } from './characters/player-model.js';
import { createEnemySpawner } from './characters/enemy-factory.js';
import { createEnemyAI } from './gameplay/enemy-ai.js?v=2.1.3-zombie-combat';
import { createCombatSystem } from './gameplay/combat.js';
import { createProjectileSystem } from './gameplay/projectiles.js';
import { createShrineSystem } from './world/shrine.js';
import { createCollisionWorld } from './world/collisions.js';
import {createSurvival,advanceSurvival,addResource,useConsumable,spendRecipe,canAfford,RECIPES} from './gameplay/survival.js';
import {createResourceWorld} from './world/resources.js?v=1.9.0-geometry';
import {createBuildingWorld} from './world/buildings.js?v=2.0.0-performance';
import {createSurvivalUI} from './ui/survival-ui.js';
import {createTouchControls} from './input/touch-controls.js';
import {createStorageUI} from './ui/storage-ui.js';
import {transferItem,sleepInBed,totalStored} from './gameplay/storage.js';
import {collidesWithStructure,MAX_STRUCTURES} from './world/building-rules.js';
import {isStructureRecipe,beginPlacement,nudgePlacement,rotatePlacement,toggleSnap,placementStatus,commitPlacement} from './gameplay/placement.js';
import {makeTool,useTool,canUseTool,restoreTool,TOOL_MAX} from './gameplay/tools.js';
import {createRaidState,planRaid} from './gameplay/raids.js';
import {raidTarget,maxBuildingHP} from './gameplay/base-defense.js';
import {workCrop,CROP_MATURITY} from './gameplay/farming.js';
import {tryFish} from './gameplay/fishing.js';
import {createWildlifeWorld} from './world/wildlife.js';
import {createCemetery,CEMETERY_POS,withinCemetery} from './world/cemetery.js';
import {createVillagerGuard} from './characters/villager-guard.js';
import {chooseZombieType} from './gameplay/zombie-variants.js';
import {createSkillsUI} from './ui/skills-ui.js';
import {SKILLS,awardSkill,skillLevel,fishingBonus,farmingBonus,huntingBonus,
    resourceBonus,recipeCost,cookedYield} from './gameplay/skills.js';


// ========== SCENE ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 300);
let graphicsQuality = 'medium'; // low, medium, high

const renderer = new THREE.WebGLRenderer({ antialias: !window.matchMedia('(max-width: 700px)').matches, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff8e7, 1.3);
sun.position.set(70, 100, 50);
let dayTime = 0;
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 250;
sun.shadow.camera.left = sun.shadow.camera.bottom = -100;
sun.shadow.camera.right = sun.shadow.camera.top = 100;
sun.shadow.bias = -0.0005;
scene.add(sun);

const ground = createTerrain(THREE, scene, getGroundHeight);

// Obstáculos físicos e visuais da câmera.
const rockColliders = [];
const collisionWorld = createCollisionWorld();
const allColliders = collisionWorld.colliders;
const cameraObstacles = [ground];
const natureAssets = createNatureAssets(THREE);

// ========== PERSONAGEM ==========
const {player,avatar,torso,headRig,leftLeg,rightLeg,leftArm,rightArm,weapon,hammerHead,spearHead} =
    createPlayerModel(THREE,scene);

// ========== CONTROLS ==========
// Terceira pessoa: não use PointerLockControls sobre a mesma câmera,
// pois ele também aplica rotação e conflita com camera.lookAt().
const touchEnabled=window.matchMedia('(pointer: coarse)').matches;
let touchPlaying=false;
const controls = {
    get isLocked() { return touchPlaying || document.pointerLockElement === renderer.domElement; },
    lock() {
        if(touchEnabled){touchPlaying=true;document.body.classList.add('touch-playing');return;}
        try {
            const promise = renderer.domElement.requestPointerLock?.();
            promise?.catch(() => showPauseMenu('Clique em continuar para capturar o mouse.'));
        } catch (_) { showPauseMenu('Clique em continuar para capturar o mouse.'); }
    },
    unlock() {
        if(touchEnabled){touchPlaying=false;document.body.classList.remove('touch-playing');return;}
        if (this.isLocked) document.exitPointerLock?.();
    }
};

// ========== GAME STATE ==========
let survival=createSurvival();
let raidState=createRaidState(),raidAlertUntil=0,poisonTimer=0,cemeterySpawnTimer=5;
let health = 100;
let maxHealth = 100;
let level = 1, xp = 0, kills = 0;
// As ruínas continuam como ponto de exploração e marco visual da floresta.
const shrinePosition = Object.freeze({x:32,z:-28});


let currentWeapon = 0, unlockedWeaponCount = 1;
let dashCooldown = 0, dashTimer = 0;
const dashDirection = new THREE.Vector3();

const xpRequired = () => 4 + level * 3;
let invulnerableTimer = 0, elapsed = 0;
let spawnTimer = 4;
let mousePitch = 0.18;
let cameraZoom = 7.6;
let toastTimer = null, skillAlertTimer = null;
let wave = 1;
let gameActive = false;

let speedBoost = 1;
let speedBoostTimer = 0;
const keys = {};
const baseSpeed = 7.5;
const runMultiplier = 1.65;
const velocity = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const moveDir = new THREE.Vector3();
let playerYaw = 0;
let verticalVelocity = 0;
let isGrounded = true;
const gravity = -25;
const jumpForce = 8.5;

const enemies = [];
const zombieModels=createZombieModelManager({THREE,scene,GLTFLoader,cloneSkeleton});
const healthPacks = [];
const speedBoosts = [];
const trees = [];
const particles = [];
const treeColliders = [];

const forest = createForest({THREE,scene,natureAssets,getGroundHeight,shrinePosition,
    collisionWorld,rockColliders,treeColliders,cameraObstacles,trees});
const cameraRig=createCameraRig({THREE,camera,player,raycaster,getGroundHeight,cameraObstacles,scene});
const resources=createResourceWorld({THREE,scene,getGroundHeight,isPositionFree:(x,z,r)=>collisionWorld.isPositionFree(x,z,r),findSpawnPoint:(min,max,r)=>findSpawnPoint(min,max,r)});
const buildings=createBuildingWorld({THREE,scene,getGroundHeight,isPositionFree:(x,z,r)=>collisionWorld.isPositionFree(x,z,r),getQuality:()=>graphicsQuality,mergeGeometries});
const wildlife=createWildlifeWorld({THREE,scene,getGroundHeight,
    isPositionFree:(x,z,r)=>collisionWorld.isPositionFree(x,z,r)&&!buildings.isBlocked(x,z,r),
    canSee:(from,to)=>!buildings.blocksLine(from,to),
    onHurt:(amount,origin)=>{if(gameActive)damagePlayer(amount,origin);},
    onHunt:(type,amount)=>{
      const quantity=amount+huntingBonus(skillLevel(survival,'hunting'));
      addResource(survival,'meat',quantity);gainXP(type==='boar'?3:1);
      earnSkill('hunting',type==='boar'?42:26);
      sfx.collect();showToast(`🏹 Caça: +${quantity} carne crua!`);updateHUD();saveProgress();}});


function getGroundHeight(x, z) {
    return Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.6 + Math.sin(x * 0.3) * 0.15;
}

function updateHUD() {
    document.getElementById('health-bar').style.width = Math.max(0, health / maxHealth * 100) + '%';
    document.getElementById('level-display').textContent = `Nível ${level} · XP ${xp}/${xpRequired()} · KOs ${kills}`;
    document.getElementById('xp-bar').style.width = `${100 * xp / xpRequired()}%`;
    const ability = document.getElementById('ability-display');
    ability.textContent = combat.specialCooldown > 0 ? `E · Giratório: ${combat.specialCooldown.toFixed(1)}s` : 'E · Golpe giratório pronto';
    ability.classList.toggle('ready', combat.specialCooldown <= 0);
    document.getElementById('score-display').textContent = `🌲 Acampamento livre`;
    document.getElementById('quest-display').textContent = `🪵 ${survival.inventory.wood}  🪨 ${survival.inventory.stone}  🫐 ${survival.inventory.berries}  💧 ${survival.inventory.water}`;
    document.getElementById('wave-display').textContent = `Perigo: ${wave}/6 · Invasões: ${raidState.waves}`;
    document.getElementById('guard-status').textContent = guard.hp===0?'🛡 Guarda caído · F para reanimar':guard.recruited?`🛡 Guarda aliado · ${guard.hp}/80 PV`:'🛡 Encontre o aldeão perto do acampamento (F)';
    document.getElementById('poison-status').textContent = poisonTimer>0?`☣ Envenenado: ${Math.ceil(poisonTimer)}s`:'';
    document.getElementById('cemetery-status').textContent = withinCemetery(player.position)?'🪦 Cemitério assombrado — inimigos mais perigosos':'';
    document.getElementById('raid-alert').classList.toggle('hidden',!(gameActive&&elapsed<raidAlertUntil));
    document.getElementById('enemies-left').textContent = `Criaturas: ${enemies.length}`;
    document.getElementById('boost-display').textContent = speedBoostTimer > 0 ? `⚡ Velocidade: ${speedBoostTimer.toFixed(1)}s` : '';
    document.getElementById('dodge-display').textContent = dashCooldown > 0 ? `Q · Esquiva: ${dashCooldown.toFixed(1)}s` : 'Q · Esquiva pronta';
    document.getElementById('mission-title').textContent = buildings.structures.some(s=>s.type==='farmPlot')?'Cultive alimentos, pesque e proteja sua casa':'Monte uma horta e complete sua casa';
    document.getElementById('mission-goal').textContent = survival.firesBuilt ?
      'Construa um telhado, um canteiro e fabrique uma vara de pesca'  : 'Reúna 4 madeiras e 4 pedras para a fogueira';
    document.getElementById('equipment-display').textContent = `Arma [${currentWeapon+1}]: ${weaponTypes[currentWeapon].name} · Durabilidade ${currentWeapon===0?'∞':survival.durability[currentWeapon===1?'hammer':'spear']}`;
    document.getElementById('target-hint').textContent = placement?'🧱 Construção: F confirma · G gira · Esc cancela':'F interagir/coletar · Y pescar · I mochila · U habilidades';
    document.getElementById('boss-bar-wrapper').classList.add('hidden');
    survivalUI.update();
    skillsUI.update();
    document.getElementById('skill-hud').textContent=`⭐ 🎣 ${skillLevel(survival,'fishing')} · 🌾 ${skillLevel(survival,'farming')} · 🏹 ${skillLevel(survival,'hunting')} · 🏠 ${skillLevel(survival,'building')}`;
    const closestBuilding=buildings.nearest(player.position,2.85);
    const closest=resources.findNearby(player.position);
    const prompt=document.getElementById('interact-hint');
    if(placement){
        prompt.classList.add('hidden');
    }else if(closestBuilding&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        const names={door:closestBuilding.open?'Fechar porta':'Abrir porta',bed:'Dormir até amanhecer',chest:'Abrir baú',workbench:'Usar bancada',farmPlot:!closestBuilding.crop.planted?'Plantar sementes':closestBuilding.crop.growth>=CROP_MATURITY?'Colher legumes':closestBuilding.crop.water>8?'Canteiro crescendo':'Regar canteiro'};
        prompt.textContent=`[F] ${names[closestBuilding.type]} · [X] desmontar`;
        prompt.classList.remove('hidden');
    }else if(guard.nearby(player.position)&&(!guard.recruited||!guard.alive)&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent=guard.hp===0?'[F] Reanimar aldeão com 2 frutas e 1 água':'[F] Recrutar aldeão para defender sua base';
        prompt.classList.remove('hidden');
    }else if(closest&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        const names={wood:'madeira',stone:'pedras',fiber:'fibras',berries:'frutas',water:'água',iron:'ferro (requer picareta)'};
        prompt.textContent=`[F] Coletar ${names[closest.type]}${closest.type==='water'?' · [Y] pescar':''}`;
        prompt.classList.remove('hidden');
    }else prompt.classList.add('hidden');
}

function flashDamage() {
    const el = document.getElementById('damage-flash');
    el.style.opacity = '1';
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(() => el.style.opacity = '0', 160);
}
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message; toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.style.opacity = '0', 1800);
}
function earnSkill(id,amount){
    const gained=awardSkill(survival,id,amount);
    if(gained.levelUps>0){
        sfx.boost();
        const message=`${SKILLS[id].icon} ${SKILLS[id].name} nível ${gained.level}! Novo bônus!`;
        const alert=document.getElementById('skill-level-up');
        alert.textContent=message;alert.classList.remove('hidden');
        clearTimeout(skillAlertTimer);
        skillAlertTimer=setTimeout(()=>alert.classList.add('hidden'),3000);
        saveProgress();
    }
    return gained;
}
function gainXP(amount) {
    xp += amount;
    while (xp >= xpRequired()) {
        xp -= xpRequired(); level++;
        maxHealth += 12;
        health = Math.min(maxHealth, health + 30);
        sfx.heal(); showToast(`⭐ Nível ${level}! +vida e +força`);
    }
    updateHUD();
}
function equipWeapon(index) {
    if (index < 0 || index >= unlockedWeaponCount) {
        showToast('🔒 Fabrique a arma na mochila [I]'); return false;
    }
    const tool=index===1?'hammer':index===2?'spear':null;
    if(tool&&!canUseTool(survival,tool)){showToast('⚠ Arma quebrada: repare na bancada');return false;}
    currentWeapon = index;
    const selected = weaponTypes[index];
    weapon.scale.set(1, selected.scale, 1);
    hammerHead.visible = index === 1;
    spearHead.visible = index === 2;
    weapon.material.color.setHex(selected.color);
    weapon.position.y = -1.17;
    showToast(`⚔ ${selected.name} equipada`);
    updateHUD(); return true;
}
function advanceQuestIfReady() {
    // Modo sobrevivência: sem campanha linear e sem vitória obrigatória.
    wave=Math.min(6,1+Math.floor((survival.days-1)/2));
    updateHUD();
}

function doDodge() {
    if (!gameActive || !controls.isLocked || dashCooldown > 0) return false;
    const inputX = Number(!!(keys.KeyD || keys.ArrowRight)) - Number(!!(keys.KeyA || keys.ArrowLeft));
    const inputZ = Number(!!(keys.KeyS || keys.ArrowDown)) - Number(!!(keys.KeyW || keys.ArrowUp));
    const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
    dashDirection.set(inputX*cos + inputZ*sin, 0, -inputX*sin + inputZ*cos);
    if (dashDirection.lengthSq() < 0.01) dashDirection.set(-sin,0,-cos);
    dashDirection.normalize();
    dashCooldown = 3.6; dashTimer = 0.24;
    invulnerableTimer = Math.max(invulnerableTimer,0.32);
    sfx.boost(); updateHUD(); return true;
}
function damagePlayer(amount, origin) {
    if (!gameActive || invulnerableTimer > 0) return false;
    health = Math.max(0,health-amount);
    invulnerableTimer = 0.86; flashDamage(); sfx.damage();
    const dx = player.position.x-origin.x, dz = player.position.z-origin.z;
    const d = Math.hypot(dx,dz)||1;
    const away = resolveCollision(player.position.x+dx/d*0.5,player.position.z+dz/d*0.5,0.46);
    player.position.x=away.x; player.position.z=away.z;
    updateHUD();
    if (health <= 0) loseGame();
    return true;
}
const projectileSystem = createProjectileSystem({THREE,scene,player,allColliders,isPositionFree,damagePlayer,
    removeMesh,isGameActive:()=>gameActive});

function removeMesh(mesh,defeated=false) {
    const deceased=enemies.find(e=>e.mesh===mesh);
    if(defeated&&deceased&&zombieModels.defeat(deceased))return;
    scene.remove(mesh);
    const zombie=enemies.find(e=>e.mesh===mesh);
    if(zombie)zombieModels.dispose(zombie);
    const disposed=new Set();
    mesh.traverse(node => {
        if (!node.isMesh) return;
        // Recursos partilhados entre braços/pernas de um mesmo inimigo são descartados uma só vez.
        if (node.geometry && !node.userData?.sharedZombieGeometry && !disposed.has(node.geometry)) {
            disposed.add(node.geometry);node.geometry.dispose();
        }
        for (const m of (Array.isArray(node.material) ? node.material : [node.material])) {
            if (m && !disposed.has(m)) {disposed.add(m);m.dispose();}
        }
    });
}

const particleGeometry = new THREE.SphereGeometry(0.07, 6, 6);
function spawnParticle(pos, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(
            particleGeometry,
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        );
        p.position.copy(pos);
        p.userData = {
            vel: new THREE.Vector3((Math.random()-0.5)*5, 2 + Math.random()*3.5, (Math.random()-0.5)*5),
            life: 1
        };
        scene.add(p);
        particles.push(p);
    }
}


function isPositionFree(x, z, radius = 0.9) {
    return collisionWorld.isPositionFree(x,z,radius)&&!buildings.isBlocked(x,z,radius);
}
function resolveCollision(x, z, radius = 0.45) {
    const staticPoint=collisionWorld.resolveCollision(x,z,radius);
    const builtPoint=buildings.resolveCollision(staticPoint.x,staticPoint.z,radius);
    return collisionWorld.resolveCollision(builtPoint.x,builtPoint.z,radius);
}
function findSpawnPoint(minRange = 10, maxRange = 70, radius = 1) {
    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minRange + Math.random() * (maxRange - minRange);
        const x = THREE.MathUtils.clamp(player.position.x + Math.sin(angle) * distance, -103, 103);
        const z = THREE.MathUtils.clamp(player.position.z + Math.cos(angle) * distance, -103, 103);
        if (isPositionFree(x, z, radius) && Math.hypot(x - player.position.x, z - player.position.z) > minRange - 0.1) return {x, z};
    }
    // Nunca criar um item ou inimigo dentro de uma árvore em caso de falha.
    for (let x = -100; x <= 100; x += 5) for (let z = -100; z <= 100; z += 5) {
        if (isPositionFree(x, z, radius) && Math.hypot(x-player.position.x,z-player.position.z)>minRange) return {x, z};
    }
    return { x: 0, z: 0 };
}
function spawnHealthPack(at = null) {
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x1abc9c, emissiveIntensity: 0.4, roughness: 0.4 });
    const pack = new THREE.Mesh(geo, mat);
    const spot = at || findSpawnPoint(9, 65);
    pack.position.set(spot.x, getGroundHeight(spot.x, spot.z) + 0.55, spot.z);
    pack.castShadow = true;
    scene.add(pack);
    healthPacks.push(pack);
}

function spawnSpeedBoost(at = null) {
    const geo = new THREE.OctahedronGeometry(0.28);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0099cc, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3 });
    const boost = new THREE.Mesh(geo, mat);
    const spot = at || findSpawnPoint(10, 65);
    boost.position.set(spot.x, getGroundHeight(spot.x, spot.z) + 0.7, spot.z);
    boost.userData.baseY = boost.position.y;
    boost.castShadow = true;
    scene.add(boost);
    speedBoosts.push(boost);
}

const spawnEnemy = createEnemySpawner({THREE,scene,getGroundHeight,findSpawnPoint,shrinePosition,enemies,getQuality:()=>graphicsQuality,onSpawn:enemy=>zombieModels.attach(enemy)});
const cemetery=createCemetery({THREE,scene,getGroundHeight,addCollider:collisionWorld.add,getQuality:()=>graphicsQuality});
const guard=createVillagerGuard({THREE,scene,getGroundHeight,resolveCollision,
    getStructures:()=>buildings.structures,getEnemies:()=>enemies,
    canSee:(a,b)=>!buildings.blocksLine(a,b),
    attackEnemy:(enemy,damage)=>combat.damageEnemy(enemy,damage,.08,false)});
const shrine = createShrineSystem({THREE,scene,shrinePosition,getGroundHeight,
    addCollider:collisionWorld.add,cameraObstacles,getGraphicsQuality:()=>graphicsQuality});
let worldSeed = Math.floor(Math.random() * 0x100000000);
function initWorld() {
    applyGraphicsSettings(THREE,graphicsQuality,renderer,scene,sun);
    natureAssets.setQuality(graphicsQuality);
    forest.generate(graphicsQuality,worldSeed);
    // Primeiro a arena e os obstáculos; depois os elementos dinâmicos.
    shrine.create();
    cemetery.create();
    cameraObstacles.push(...cemetery.cameraObstacles);
    cameraRig.refreshObstacles();
    forest.updateVisibility(player.position,graphicsQuality,0,true);
    resources.generate(worldSeed,graphicsQuality);
    wildlife.generate(worldSeed,graphicsQuality);
    void zombieModels.preload();
    for (let i=0; i<2; i++) spawnHealthPack();
    for (let i=0; i<2; i++) spawnSpeedBoost();
    for (let i=0; i<2; i++) spawnEnemy('normal');
    spawnEnemy('fast');
    if(Math.random()<0.35)spawnEnemy('zombie');
    updateHUD();
}

// Checkpoints. localStorage é específico da origem/domínio do GitHub Pages.
const progressStorage = (()=>{try{return window.localStorage;}catch(_){return null;}})();
let availableSave = readSave(progressStorage);
let saveTick=0;
let buildingCameraMeshes=[];
let rotationOffset=0;
let placement=null,placementGhost=null,placementInfo=null;
function refreshBuildingCamera(){
    for(const old of buildingCameraMeshes){const i=cameraObstacles.indexOf(old);if(i!==-1)cameraObstacles.splice(i,1);}
    buildingCameraMeshes=buildings.structures.map(s=>s.group);
    cameraObstacles.push(...buildingCameraMeshes);cameraRig.refreshObstacles();
}
function serializeProgress() {
    return {
        seed:worldSeed,graphicsQuality,level,xp,kills,health,maxHealth,wave,elapsed,
        currentWeapon,player:{x:player.position.x,z:player.position.z,yaw:playerYaw},
        survival,raid:raidState,guard:guard.getState(),poisonTimer,resources:resources.serialize(),buildings:buildings.serialize(),
        wildlife:wildlife.serialize(),
        healthPacks:healthPacks.map(item=>({x:item.position.x,z:item.position.z})),
        speedBoosts:speedBoosts.map(item=>({x:item.position.x,z:item.position.z})),
        enemies:enemies.map(enemy=>({type:enemy.type,x:enemy.mesh.position.x,z:enemy.mesh.position.z,
            hp:enemy.hp,enraged:enemy.enraged,raider:!!enemy.raider}))
    };
}

function saveProgress(manual=false) {
    if (!worldInitialized || !gameActive || health<=0) return false;
    const saved = writeSave(progressStorage,serializeProgress());
    if (saved) {availableSave=readSave(progressStorage);if (manual) showToast('💾 Progresso salvo neste navegador');}
    else if (manual) showToast('⚠ Armazenamento indisponível. Não foi possível salvar.');
    return saved;
}
function replaceItems(items, data, create) {
    for (const item of items) removeMesh(item);
    items.length=0;
    for (const at of data) create(at);
}
function restoreProgress(data) {
    level=data.level;xp=data.xp;kills=data.kills;maxHealth=data.maxHealth;health=data.health;
    wave=data.wave;elapsed=data.elapsed;spawnTimer=4;
    survival=data.survival;raidState=data.raid||createRaidState();raidAlertUntil=0;
    poisonTimer=data.poisonTimer||0;cemeterySpawnTimer=5;guard.setState(data.guard);
    buildings.restore(data.buildings);
    if(Array.isArray(data.wildlife))wildlife.restore(data.wildlife);
    refreshBuildingCamera();
    resources.restore(data.resources);
    unlockedWeaponCount=survival.crafted.spear?3:survival.crafted.hammer?2:1;
    const location=resolveCollision(data.player.x,data.player.z,.46);
    player.position.set(location.x,getGroundHeight(location.x,location.z),location.z);
    playerYaw=data.player.yaw;player.rotation.y=playerYaw;
    replaceItems(healthPacks,data.healthPacks,spawnHealthPack);
    replaceItems(speedBoosts,data.speedBoosts,spawnSpeedBoost);
    for(const enemy of enemies) removeMesh(enemy.mesh);
    enemies.length=0;
    for(const savedEnemy of data.enemies) {
        spawnEnemy(savedEnemy.type);
        const enemy=enemies[enemies.length-1];
        enemy.mesh.position.set(savedEnemy.x,getGroundHeight(savedEnemy.x,savedEnemy.z)+enemy.size/2,savedEnemy.z);
        enemy.hp=Math.min(enemy.maxHp,savedEnemy.hp);enemy.raider=!!savedEnemy.raider;
        if(savedEnemy.type==='boss'&&savedEnemy.enraged){
            enemy.enraged=true;enemy.speed*=1.28;enemy.mesh.material.color.setHex(0xe24629);
        }
    }
    const desired=Math.min(data.currentWeapon,unlockedWeaponCount-1);
    equipWeapon(desired>0&&!canUseTool(survival,desired===1?'hammer':'spear')?0:desired);
    invulnerableTimer=.75;dashCooldown=0;dashTimer=0;
    velocity.set(0,0,0);verticalVelocity=0;isGrounded=true;
    updateHUD();
}

function updateContinueButton() {
    const button=document.getElementById('load-btn');
    button.classList.toggle('hidden',!availableSave);
    if(availableSave) button.textContent=`Retomar Dia ${availableSave.survival.days} · Nível ${availableSave.level}`;
}

// ========== INPUT / COMBATE / PAUSA ==========
const overlay = document.getElementById('overlay');
const pauseMenu = document.getElementById('pause-menu');
function showPauseMenu(message = '') {
    if (!gameActive || survivalUI.isOpen || storageUI.isOpen || skillsUI.isOpen) return;
    pauseMenu.classList.remove('hidden');
    if (message) pauseMenu.querySelector('p').textContent = message;
    Object.keys(keys).forEach(key => { keys[key] = false; });
}
function resumeGame() { pauseMenu.classList.add('hidden'); initAudio(); controls.lock(); }
document.addEventListener('keydown', e => {
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    // O modo construção captura atalhos antes de combate e coleta.
    if (placement && !e.repeat){
        if(['Escape','Backspace'].includes(e.code)){cancelPlacement();return;}
        if(['Enter','KeyF'].includes(e.code)){confirmPlacement();return;}
        if(['KeyG','KeyR'].includes(e.code)){rotateBuild();return;}
        if(e.code==='KeyC'){switchPlacementSnap();return;}
        if(e.code==='ArrowLeft'){movePlacement('lateral',-1.5);return;}
        if(e.code==='ArrowRight'){movePlacement('lateral',1.5);return;}
        if(e.code==='ArrowUp'){movePlacement('distance',.75);return;}
        if(e.code==='ArrowDown'){movePlacement('distance',-.75);return;}
        if(e.code==='KeyI'){cancelPlacement();openInventory();return;}
        if(e.code==='KeyP'){saveProgress(true);return;}
        if(!['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code))return;
    }
    keys[e.code] = true;
    if (e.code === 'F3') e.preventDefault();
    if (e.code === 'KeyI' && !e.repeat && gameActive) {toggleInventory();return;}
    if (e.code === 'KeyU' && !e.repeat && gameActive) {toggleSkills();return;}
    if (e.code === 'Escape' && survivalUI.isOpen) {closeInventory();return;}
    if (e.code === 'Escape' && storageUI.isOpen) {closeStorage();return;}
    if (e.code === 'Escape' && skillsUI.isOpen) {closeSkills();return;}
    if (e.code === 'F3' && !e.repeat) {
        showFps = !showFps;
        fpsDisplay.classList.toggle('hidden', !showFps);
    }
    if (!gameActive || !controls.isLocked || survivalUI.isOpen || storageUI.isOpen || skillsUI.isOpen || e.repeat) return;
    if (e.code === 'Space' && isGrounded) {
        verticalVelocity = jumpForce; isGrounded = false; sfx.boost();
    }
    if (e.code === 'KeyJ') combat.attack();
    if (e.code === 'KeyE') combat.special();
    if (e.code === 'KeyQ') doDodge();
    if (e.code === 'Digit1') equipWeapon(0);
    if (e.code === 'Digit2') equipWeapon(1);
    if (e.code === 'Digit3') equipWeapon(2);
    if (e.code === 'KeyP') saveProgress(true);
    if (e.code === 'KeyF') harvestNear();
    if (e.code === 'KeyY') fishNearby();
    if (e.code === 'KeyB') craft('campfire');
    if (e.code === 'KeyH') craft('shelter');
    if (e.code === 'Digit4') consume('berries');
    if (e.code === 'Digit5') consume('water');
    if (e.code === 'Digit6') consume('cooked');
    if (e.code === 'KeyR') craft('cooked');
    if (e.code === 'KeyG') rotateBuild();
    if (e.code === 'KeyV') craft('floor');
    if (e.code === 'KeyM') craft('wall');
    if (e.code === 'KeyN') craft('door');
    if (e.code === 'KeyK') craft('bed');
    if (e.code === 'KeyL') craft('chest');
    if (e.code === 'KeyX') deconstructNear();
    if (e.code === 'KeyT') repairNear();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { Object.keys(keys).forEach(key => keys[key] = false); if (controls.isLocked) controls.unlock(); });

function setGfx(q, activeBtn) {
    graphicsQuality = q;
    document.querySelectorAll('.gfx-btn').forEach(b => b.style.background = '#555');
    activeBtn.style.background = '#e74c3c';
    try { localStorage.setItem('madrugacraft.gfx', q); } catch (_) {}
}
document.getElementById('gfx-low').onclick = () => setGfx('low', document.getElementById('gfx-low'));
document.getElementById('gfx-med').onclick = () => setGfx('medium', document.getElementById('gfx-med'));
document.getElementById('gfx-high').onclick = () => setGfx('high', document.getElementById('gfx-high'));
        try {
            const savedQuality = localStorage.getItem('madrugacraft.gfx');
            if (['low','medium','high'].includes(savedQuality))
                setGfx(savedQuality, document.getElementById('gfx-'+(savedQuality==='medium'?'med':savedQuality)));
        } catch (_) {}
let worldInitialized = false;
function beginAdventure(restore=false) {
    if(placement)releasePlacement();
    const save = restore ? availableSave : null;
    if (!save) {clearSave(progressStorage);availableSave=null;}
    else {
        worldSeed=save.seed;
        graphicsQuality=save.graphicsQuality;
    }
    if (!worldInitialized) {initWorld();worldInitialized=true;}
    if (save) restoreProgress(save);
    overlay.classList.add('hidden');
    gameActive=true;saveTick=0;
    initAudio();controls.lock();
}
document.getElementById('start-btn').onclick = () => beginAdventure(false);
document.getElementById('load-btn').onclick = () => beginAdventure(true);
document.getElementById('save-btn').onclick = () => saveProgress(true);
updateContinueButton();
document.getElementById('resume-btn').onclick = resumeGame;
document.getElementById('restart-btn').onclick = () => location.reload();
document.addEventListener('pointerlockchange', () => {
    document.getElementById('instructions').style.opacity = controls.isLocked ? '0.6' : '1';
    if (controls.isLocked) pauseMenu.classList.add('hidden');
    else if (gameActive && !placement && !survivalUI.isOpen && !storageUI.isOpen && !skillsUI.isOpen) {saveProgress();showPauseMenu();}
});
document.addEventListener('wheel', e => {
    if (!controls.isLocked || !gameActive) return;
    e.preventDefault();
    if(placement){movePlacement('distance', e.deltaY>0?.75:-.75);return;}
    cameraZoom=THREE.MathUtils.clamp(cameraZoom+e.deltaY*.004,4.0,11.0);
    cameraRig.setDistance(cameraZoom);
}, {passive:false});
document.addEventListener('mousemove', e => {
    if (!controls.isLocked || !gameActive) return;
    playerYaw -= e.movementX * 0.003;
    mousePitch = THREE.MathUtils.clamp(mousePitch + e.movementY * 0.003, -0.30, 0.76);
});

const combat = createCombatSystem({THREE,scene,player,enemies,weaponTypes,healthPacks,speedBoosts,particles,
    getGroundHeight,resolveCollision,removeMesh,spawnParticle,gainXP,showToast,sfx,
    spawnEnemy,spawnHealthPack,spawnSpeedBoost,advanceQuestIfReady,updateHUD,
    onBossDefeated:()=>{shrine.hideBossTelegraph();showToast('Guardião derrotado! A floresta continua perigosa.');},
    onEnemyKilled:(type)=>{kills++;if(type.startsWith('zombie')&&Math.random()<.55){addResource(survival,'fiber',1);showToast('🧟 Zumbi derrotado · +1 fibra');}else if(type!=='boss'&&!type.startsWith('zombie')&&Math.random()<.42){addResource(survival,'meat',1);showToast('🥩 +1 carne crua · asse na fogueira');}},
    getWeaponBonus:()=>currentWeapon===2&&survival.crafted.ironSpear?3:0,
    onSwing:(range,arc,damage,yaw)=>wildlife.attack(player.position,yaw,range,arc,damage),
    onWeaponHit:()=>{const tool=currentWeapon===1?'hammer':currentWeapon===2?'spear':null;
        if(tool&&useTool(survival,tool,1)&&!canUseTool(survival,tool)){equipWeapon(0);showToast('⚠ Arma quebrada! Repare na bancada.');}},
    getLevel:()=>level,getWeaponIndex:()=>currentWeapon,getPlayerYaw:()=>playerYaw,
    isGameActive:()=>gameActive,isLocked:()=>controls.isLocked});

const enemyAI = createEnemyAI({enemies,player,getGroundHeight,resolveCollision,
    showBossTelegraph:shrine.showBossTelegraph,hideBossTelegraph:shrine.hideBossTelegraph,
    damagePlayer,spawnParticle,throwProjectile:projectileSystem.throwProjectile,sfx,
    isGameActive:()=>gameActive,hasLineOfSight:(from,to)=>!buildings.blocksLine(from,to),
    getRaidTarget:(pos)=>raidTarget(buildings.structures,pos,player.position),
    getGuard:()=>guard.recruited&&guard.alive?guard.position:null,
    onGuardDamage:amount=>{if(guard.damage(amount)&&!guard.alive){showToast('💔 O aldeão caiu! Reanime-o com comida e água.');saveProgress();}},
    onPoison:seconds=>{poisonTimer=Math.max(poisonTimer,seconds);showToast('☣ Zumbi tóxico! Você foi envenenado.');},
    onRaidDamage:(structure,damage)=>{const hit=buildings.damage(structure,damage);
       if(hit.destroyed){refreshBuildingCamera();
           if(structure.type==='campfire')survival.firesBuilt=Math.max(0,survival.firesBuilt-1);
           if(structure.type==='shelter')survival.sheltersBuilt=Math.max(0,survival.sheltersBuilt-1);
           showToast(`💥 Sua ${RECIPES[structure.type].label.toLowerCase()} foi destruída!`);saveProgress();}
    }});

// Jogabilidade de sobrevivência: interação próxima, consumo e construção.
function rotateBuild(){
    if(placement){rotatePlacement(placement);updatePlacementPreview();return;}
    rotationOffset=(rotationOffset+1)%4;
    showToast(`🧭 Rotação inicial: ${rotationOffset*90}°`);
}
const placementPanel=document.getElementById('placement-panel');
const placementName=document.getElementById('placement-name');
const placementStatusLabel=document.getElementById('placement-status');
function releasePlacement(){
    placementGhost?.dispose();placementGhost=null;placement=null;placementInfo=null;
    placementPanel.classList.add('hidden');document.body.classList.remove('placing');
}
function cancelPlacement(){
    if(!placement)return false;
    releasePlacement();showToast('↩ Construção cancelada — materiais preservados');updateHUD();return true;
}
function switchPlacementSnap(){
    if(!placement)return false;
    const active=toggleSnap(placement);
    updatePlacementPreview();showToast(active?'🧲 Encaixe automático ligado':'🧲 Encaixe automático desligado');
    return active;
}
function movePlacement(axis,delta){
    if(!placement)return;
    nudgePlacement(placement,axis,delta);updatePlacementPreview();
}
function updatePlacementPreview(){
    if(!placement||!placementGhost)return;
    const status=placementStatus(placement,player.position,playerYaw,
       (...args)=>buildings.canPlace(...args),
       type=>canAfford(survival,type,recipeCost(type,RECIPES[type].cost,survival.skills)),
       buildings.structures);
    placementInfo=status;
    const c=status.candidate;
    if(c)placementGhost.setPosition(c.x,c.z,c.rotation||0);
    placementGhost.setValid(status.valid);
    placementStatusLabel.textContent=`${status.valid?'✅':'⛔'} ${status.reason}`;
    document.getElementById('placement-snap').textContent=placement.snapEnabled?'🧲 Ímã: ligado [C]':'🧲 Ímã: desligado [C]';
    document.getElementById('placement-snap').setAttribute('aria-pressed',String(placement.snapEnabled));
    placementStatusLabel.classList.toggle('blocked',!status.valid);
    document.getElementById('placement-confirm').disabled=!status.valid;
    document.getElementById('placement-coords').textContent=c?`Local ${c.x.toFixed(1)}, ${c.z.toFixed(1)} · giro ${(c.rotation||0)*90}°`:'';
}
function startPlacement(recipe){
    if(!gameActive||!isStructureRecipe(recipe)||!RECIPES[recipe])return false;
    const cost=recipeCost(recipe,RECIPES[recipe].cost,survival.skills);
    if(!canAfford(survival,recipe,cost)){showToast('Materiais insuficientes para construir.');return false;}
    if(buildings.structures.length>=MAX_STRUCTURES){showToast('Limite de construções atingido.');return false;}
    // A construção real só acontece na confirmação; o holograma não salva nem colide.
    releasePlacement();
    placement=beginPlacement(recipe,playerYaw,rotationOffset);
    placementGhost=buildings.createPreview(recipe);
    if(!placementGhost){releasePlacement();return false;}
    placementName.textContent=`🧱 ${RECIPES[recipe].label}`;
    placementPanel.classList.remove('hidden');document.body.classList.add('placing');
    if(survivalUI.isOpen)survivalUI.close();
    pauseMenu.classList.add('hidden');
    initAudio();controls.lock();
    updatePlacementPreview();updateHUD();
    return true;
}
function confirmPlacement(){
    if(!gameActive||!placement)return false;
    // Revalida com a localização atual e confirma como uma transação única.
    const cost=recipeCost(placement.type,RECIPES[placement.type].cost,survival.skills);
    const result=commitPlacement({
      plan:placement,position:player.position,yaw:playerYaw,structures:buildings.structures,
      canPlace:(...args)=>buildings.canPlace(...args),
      canAfford:type=>canAfford(survival,type,cost),
      spend:type=>spendRecipe(survival,type,cost),
      place:c=>buildings.place(placement.type,c.x,c.z,c.rotation||0,{preserveCoordinates:!!c.snapped}),
      refund:()=>{for(const [id,count] of Object.entries(cost))addResource(survival,id,count);}
    });
    if(!result.ok){updatePlacementPreview();showToast(result.reason);return false;}
    const type=placement.type;
    if(type==='campfire')survival.firesBuilt++;
    if(type==='shelter')survival.sheltersBuilt++;
    refreshBuildingCamera();releasePlacement();
    earnSkill('building',25);sfx.boost();showToast(`✅ ${RECIPES[type].label} posicionada!`);
    updateHUD();saveProgress();return true;
}
for(const [id,callback] of [
    ['placement-confirm',confirmPlacement],['placement-cancel',cancelPlacement],
    ['placement-rotate',rotateBuild],['placement-snap',switchPlacementSnap],
    ['placement-left',()=>movePlacement('lateral',-1.5)],
    ['placement-right',()=>movePlacement('lateral',1.5)],
    ['placement-far',()=>movePlacement('distance',.75)],
    ['placement-near',()=>movePlacement('distance',-.75)]
])document.getElementById(id).addEventListener('click',callback);
const skillsUI=createSkillsUI({getState:()=>survival,onClose:closeSkills});
const survivalUI=createSurvivalUI({getState:()=>survival,onCraft:craft,onConsume:consume,
    onClose:closeInventory,onRotate:rotateBuild,onDismantle:deconstructNear,onRepair:repairNear,onFish:fishNearby,
    getRotation:()=>rotationOffset*90,getCanCraft:canCraftAtPosition,
    getRecipeCost:id=>recipeCost(id,RECIPES[id]?.cost,survival.skills)});
const storageUI=createStorageUI({getInventory:()=>survival.inventory,onTransfer:(chest,key,direction,amount)=>{
    if(!gameActive||!buildings.structures.includes(chest))return;
    const count=transferItem(survival,chest,key,direction,amount);
    if(count){sfx.collect();saveProgress();updateHUD();}else showToast('Sem itens ou baú cheio.');
},onClose:closeStorage});
function closeStorage(){
    if(!storageUI.isOpen)return;
    buildings.setChestOpen(storageUI.chest,false);storageUI.close();resumeGame();
}
function interactWithBuilding(){
    const item=buildings.nearest(player.position,2.85);
    if(!item)return false;
    if(item.type==='workbench'){openInventory();return true;}
    if(item.type==='farmPlot'){
        const result=workCrop(item.crop,survival.inventory,farmingBonus(skillLevel(survival,'farming')));
        if(result.ok){
            earnSkill('farming',result.action==='harvest'?35:result.action==='plant'?12:10);
            buildings.updateCropVisual(item);sfx.collect();saveProgress();updateHUD();}
        showToast(result.message);return true;}
    if(item.type==='door'){
        if(item.open&&collidesWithStructure({...item,open:false},player.position.x,player.position.z,.48)){
            showToast('Afaste-se do batente para fechar a porta.');return true;
        }
        const isOpen=buildings.toggleDoor(item);
        showToast(isOpen?'🚪 Porta aberta':'🚪 Porta fechada');sfx.collect();saveProgress();return true;
    }
    if(item.type==='chest'){
        storageUI.open(item);buildings.setChestOpen(item,true);
        controls.unlock();pauseMenu.classList.add('hidden');return true;
    }
    if(item.type==='bed'){
        if(enemies.some(e=>Math.hypot(e.mesh.position.x-player.position.x,e.mesh.position.z-player.position.z)<9)){
            showToast('Existem criaturas por perto. Não é seguro dormir.');return true;
        }
        const result=sleepInBed(survival);
        if(!result.ok){showToast(result.reason);return true;}
        health=Math.min(maxHealth,health+result.healing);
        earnSkill('survival',30);
        wave=Math.min(6,1+Math.floor((survival.days-1)/2));
        sfx.heal();showToast(`🛏 Descansou até o amanhecer do dia ${survival.days}`);
        updateHUD();saveProgress();return true;
    }
    return false;
}
function repairNear(){
    const candidate=buildings.structures.filter(s=>s.hp<maxBuildingHP(s.type)&&Math.hypot(s.x-player.position.x,s.z-player.position.z)<3.5)
      .sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0];
    if(!candidate){showToast('Nenhuma construção danificada ao alcance.');return false;}
    if(!buildings.repair(candidate,survival)){showToast('Precisa de 1 madeira ou pedra para reparar.');return false;}
    earnSkill('building',8);
    sfx.collect();showToast(`🛠 ${RECIPES[candidate.type].label} reparada: ${candidate.hp}/${maxBuildingHP(candidate.type)}`);
    saveProgress();updateHUD();return true;
}
function deconstructNear(){
    const candidates=buildings.structures.filter(s=>Math.hypot(s.x-player.position.x,s.z-player.position.z)<3.25);
    candidates.sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z));
    const target=candidates[0];
    if(!target){showToast('Chegue perto de uma construção para desmontar [X].');return false;}
    if(target.type==='chest'&&totalStored(target.items)>0){showToast('Esvazie o baú antes de desmontá-lo.');return false;}
    if(target.type==='farmPlot'&&target.crop.planted){showToast('Colha os legumes antes de desmontar o canteiro.');return false;}
    if(!buildings.remove(target))return false;
    if(target.type==='campfire')survival.firesBuilt=Math.max(0,survival.firesBuilt-1);
    if(target.type==='shelter')survival.sheltersBuilt=Math.max(0,survival.sheltersBuilt-1);
    for(const [id,count] of Object.entries(RECIPES[target.type]?.cost||{}))addResource(survival,id,Math.max(1,Math.floor(count/2)));
    refreshBuildingCamera();sfx.collect();showToast(`♻ ${RECIPES[target.type].label} desmontado · parte dos recursos devolvida`);
    updateHUD();saveProgress();return true;
}

function harvestNear(){
    if(interactWithBuilding())return true;
    if(guard.nearby(player.position)&&(!guard.recruited||!guard.alive)){
        showToast(guard.interact(survival.inventory));saveProgress();updateHUD();return true;
    }
    const result=resources.harvest(player.position,canUseTool(survival,'pickaxe'));
    if(!result){
        if(guard.nearby(player.position)){showToast(guard.interact(survival.inventory));return true;}
        showToast('Procure madeira, pedras, minério, planta ou água (F)');return false;
    }
    if(result.requires){showToast('⛏ Faça uma picareta na bancada e repare se estiver quebrada!');return false;}
    if(result.type==='iron'){
        useTool(survival,'pickaxe',Math.max(1,4-Math.floor((skillLevel(survival,'mining')-1)/6)));
        if(!canUseTool(survival,'pickaxe'))showToast('⛏ Picareta quebrada — repare na bancada');
    }
    const skill=['iron','stone'].includes(result.type)?'mining':'gathering';
    const quantity=result.amount+resourceBonus(result.type,skillLevel(survival,skill));
    addResource(survival,result.type,quantity);
    earnSkill(skill,result.type==='iron'?27:result.type==='stone'?12:9);
    if(result.type==='berries'){addResource(survival,'seeds',1);}
    const labels={wood:'Madeira',stone:'Pedra',berries:'Frutas',fiber:'Fibra',water:'Água',iron:'Minério de ferro'};
    sfx.collect();showToast(`+${quantity} ${labels[result.type]}${result.type==='berries'?' · +1 semente':''}`);
    updateHUD();saveProgress();return true;
}
function fishNearby(){
    if(!gameActive)return false;
    const node=resources.nodes.find(n=>n.type==='water'&&Math.hypot(n.x-player.position.x,n.z-player.position.z)<3.8);
    const result=tryFish(survival,elapsed,!!node,fishingBonus(skillLevel(survival,'fishing')));
    if(result.ok){earnSkill('fishing',28);sfx.collect();updateHUD();saveProgress();}
    showToast(result.message);
    return result.ok;
}
function consume(type){
    if(!gameActive)return false;
    if(!useConsumable(survival,type)){
        showToast('Você não tem este alimento ou água na mochila');return false;
    }
    if(type==='water')poisonTimer=Math.max(0,poisonTimer-3);
    sfx.heal();showToast(type==='water'?'💧 Sede recuperada!':'🍖 Fome recuperada!');updateHUD();return true;
}
function canCraftAtPosition(recipe){
    if(recipe==='hammer'||recipe==='spear')return !survival.crafted[recipe]&&(recipe!=='spear'||survival.crafted.hammer);
    if(['cooked','grilledFish','stew'].includes(recipe))return buildings.near('campfire',player.position,6);
    if(recipe==='fishingRod')return !survival.crafted.fishingRod;
    if(['pickaxe','ironSpear','repairPickaxe','repairHammer','repairSpear'].includes(recipe)){
        if(!buildings.near('workbench',player.position,6))return false;
        if(recipe==='pickaxe')return !survival.crafted.pickaxe;
        if(recipe==='ironSpear')return survival.crafted.spear&&!survival.crafted.ironSpear;
        const tool=recipe.slice('repair'.length).toLowerCase();
        return !!survival.crafted[tool]&&survival.durability[tool]<TOOL_MAX[tool];
    }
    return true;
}
function craft(recipe){
    if(!gameActive||!RECIPES[recipe])return false;
    if(!canCraftAtPosition(recipe)){
        showToast('Precisa da bancada/fogueira ou o equipamento já foi produzido.');return false;
    }
    if(isStructureRecipe(recipe))return startPlacement(recipe);
    const cost=recipeCost(recipe,RECIPES[recipe].cost,survival.skills);
    if(!canAfford(survival,recipe,cost)){showToast('Faltam recursos! Confira os custos da mochila.');return false;}
    if(!spendRecipe(survival,recipe,cost))return false;
    if(recipe==='fishingRod')survival.crafted.fishingRod=true;
    if(['hammer','spear','pickaxe'].includes(recipe)){
        makeTool(survival,recipe);
        if(recipe==='hammer'){unlockedWeaponCount=Math.max(2,unlockedWeaponCount);equipWeapon(1);}
        if(recipe==='spear'){unlockedWeaponCount=3;equipWeapon(2);}
    }
    if(recipe==='ironSpear')survival.crafted.ironSpear=true;
    if(recipe.startsWith('repair'))restoreTool(survival,recipe.slice(6).toLowerCase());
    const cooking=['cooked','grilledFish','stew'].includes(recipe);
    if(cooking)addResource(survival,recipe,cookedYield(skillLevel(survival,'crafting')));
    earnSkill('crafting',cooking?14:22);
    sfx.boost();showToast(`🔨 ${RECIPES[recipe].label} — fabricado!`);
    updateHUD();saveProgress();return true;
}
function openInventory(){
    if(!gameActive||survivalUI.isOpen||storageUI.isOpen||skillsUI.isOpen)return;
    if(placement)releasePlacement();
    survivalUI.open();
    controls.unlock();
    pauseMenu.classList.add('hidden');
}
function closeInventory(){
    if(!survivalUI.isOpen)return;
    survivalUI.close();resumeGame();
}
function toggleInventory(){if(storageUI.isOpen||skillsUI.isOpen)return;if(survivalUI.isOpen)closeInventory();else openInventory();}
function openSkills(){
    if(!gameActive||storageUI.isOpen||skillsUI.isOpen)return;
    if(placement)releasePlacement();
    if(survivalUI.isOpen)survivalUI.close();
    skillsUI.open();controls.unlock();pauseMenu.classList.add('hidden');
}
function closeSkills(){if(!skillsUI.isOpen)return;skillsUI.close();resumeGame();}
function toggleSkills(){if(skillsUI.isOpen)closeSkills();else openSkills();}
document.getElementById('inventory-toggle').onclick=toggleInventory;
document.getElementById('skills-toggle').onclick=toggleSkills;
document.getElementById('open-skills-inventory').onclick=openSkills;
const touchControls=createTouchControls({canvas:renderer.domElement,enabled:touchEnabled,
    onLook:(dx,dy)=>{if(!gameActive||!touchPlaying)return;
      playerYaw-=dx*.006;mousePitch=THREE.MathUtils.clamp(mousePitch+dy*.005,-.30,.76);},
    onKey:(code,down)=>{document.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{
        code,bubbles:true,cancelable:true}));},
    onPause:()=>{if(gameActive){if(placement)releasePlacement();controls.unlock();touchControls.release();showPauseMenu();saveProgress();}},
    onInventory:toggleInventory});
document.addEventListener('mousedown', e => {
    if(e.button!==0||e.target!==renderer.domElement||!controls.isLocked)return;
    if(placement)confirmPlacement();else combat.attack();
});

// ========== MINIMAPA ==========
const drawMinimap = createMinimap(document.getElementById('minimap'), () => ({
  player, treeColliders, rockColliders, collectibles:[], healthPacks, speedBoosts,
  enemies, shrinePosition, playerYaw, resources:resources.nodes, structures:buildings.structures,
  cemeteryPosition:CEMETERY_POS,guardPosition:guard.alive?guard.position:null
}));

// ========== GAME LOOP ==========
const clock = new THREE.Clock();
let walkTime = 0, hudTick = 0, minimapTick = 0, fpsTime = 0, fpsFrames = 0;
let showFps = false;
let lastIdleRenderAt=-Infinity;
const fpsDisplay = document.getElementById('fps-display');
player.position.y = getGroundHeight(0,0);
camera.position.set(0, 3.8, 7.4);
camera.lookAt(0, 1.6, 0);

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) return;
    const running = gameActive && controls.isLocked && health > 0;
    // Pausa/menu: 4 FPS para manter a cena visível sem consumir GPU a 60/144 Hz.
    // Relógio é atualizado primeiro, evitando salto de física ao retomar.
    if (!running) {
        const now=performance.now();
        if (!shouldRenderFrame({running,now,lastIdleRenderAt})) return;
        lastIdleRenderAt=now;
    }

    if (running) {
        elapsed += dt;
        saveTick+=dt;
        if(saveTick>=15) {saveTick=0;saveProgress();}
        // Movimento relativo à direção de olhar. Aceleração e frenagem
        // independem da taxa de quadros; diagonal não aumenta a velocidade.
        moveDir.set(0, 0, 0);
        if (keys.KeyW || keys.ArrowUp) moveDir.z -= 1;
        if (keys.KeyS || keys.ArrowDown) moveDir.z += 1;
        if (keys.KeyA || keys.ArrowLeft) moveDir.x -= 1;
        if (keys.KeyD || keys.ArrowRight) moveDir.x += 1;
        moveDir.normalize();
        const requestedSprint=!!(keys.ShiftLeft||keys.ShiftRight)&&moveDir.lengthSq()>.01;
        const runningFast=requestedSprint && survival.stamina>4 && survival.hunger>5 && survival.thirst>5;
        const beforeDay=survival.days;
        const vitals=advanceSurvival(survival,dt,{sprinting:runningFast,moving:moveDir.lengthSq()>.01,
            nearFire:buildings.near('campfire',player.position,7),sheltered:buildings.near('shelter',player.position,5)||buildings.covered(player.position),
            survivalLevel:skillLevel(survival,'survival')});
        if(survival.days>beforeDay)earnSkill('survival',40);
        const poisonStep=Math.min(dt,poisonTimer);poisonTimer=Math.max(0,poisonTimer-poisonStep);
        const dotDamage=poisonStep*.92;
        if(vitals.damage+dotDamage>0){health=Math.max(0,health-vitals.damage-dotDamage);if(health<=0){loseGame();return;}}
        wave=Math.min(6,1+Math.floor((survival.days-1)/2));
        const raid=planRaid(survival,raidState,buildings.structures.length);
        if(raid){
            const allowed=Math.max(0,12-enemies.length);
            for(let i=0;i<Math.min(raid.count,allowed);i++){
                spawnEnemy(i%4===0?chooseZombieType({night:true,day:survival.days,roll:Math.random()}):i%3===0?'zombie_runner':i%2===0?'fast':'normal');
                const invader=enemies[enemies.length-1];
                const location=findSpawnPoint(18,27,invader.size*.55);
                invader.mesh.position.set(location.x,getGroundHeight(location.x,location.z)+invader.size/2,location.z);
                invader.raider=true;
            }
            raidAlertUntil=elapsed+11;
            showToast(`⚔️ Invasão da noite ${raid.night}! Defenda as estruturas!`);
            saveProgress();
        }
        const currentSpeed=(baseSpeed+(level-1)*.15)*speedBoost*(runningFast?runMultiplier:1)*(poisonTimer>0?.76:1);
        const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
        dashCooldown=Math.max(0,dashCooldown-dt);
        dashTimer=Math.max(0,dashTimer-dt);
        const targetVX = dashTimer>0 ? dashDirection.x*19 : (moveDir.x*cos + moveDir.z*sin) * currentSpeed;
        const targetVZ = dashTimer>0 ? dashDirection.z*19 : (-moveDir.x*sin + moveDir.z*cos) * currentSpeed;
        const moveBlend = 1 - Math.exp(-13 * dt);
        velocity.x += (targetVX - velocity.x)*moveBlend;
        velocity.z += (targetVZ - velocity.z)*moveBlend;

        // Deslizar por paredes/troncos: eixos tratados separadamente.
        const cx = resolveCollision(player.position.x + velocity.x * dt, player.position.z, 0.46);
        const cz = resolveCollision(cx.x, player.position.z + velocity.z * dt, 0.46);
        player.position.x = cz.x;
        player.position.z = cz.z;
        const groundY = getGroundHeight(player.position.x, player.position.z);
        if (!isGrounded) {
            verticalVelocity += gravity * dt;
            player.position.y += verticalVelocity * dt;
            if (player.position.y <= groundY) {
                player.position.y = groundY; verticalVelocity = 0; isGrounded = true;
            }
        } else player.position.y = groundY;
        player.rotation.y = playerYaw;
        if(placement)updatePlacementPreview();

        const movingSpeed = Math.hypot(velocity.x, velocity.z);
        const motionFactor = THREE.MathUtils.clamp(movingSpeed/baseSpeed,0,1.7);
        const stride = (movingSpeed > .4 && moveDir.lengthSq()>.01) ? motionFactor : 0;
        walkTime += dt * (8.5 + movingSpeed*.48) * (stride>0?1:0);
        const blend=1-Math.exp(-12*dt);
        const legSwing=Math.sin(walkTime)*.62*stride;
        leftLeg.rotation.x=THREE.MathUtils.lerp(leftLeg.rotation.x,legSwing,blend);
        rightLeg.rotation.x=THREE.MathUtils.lerp(rightLeg.rotation.x,-legSwing,blend);
        leftArm.rotation.x=THREE.MathUtils.lerp(leftArm.rotation.x,-legSwing*.68,blend);
        rightArm.rotation.x=THREE.MathUtils.lerp(rightArm.rotation.x,legSwing*.50-.20,blend);
        const hop=(stride>0?Math.abs(Math.sin(walkTime))*.055*stride:Math.sin(elapsed*2)*.014);
        torso.position.y=1.15+hop;
        torso.rotation.z=THREE.MathUtils.lerp(torso.rotation.z,
            (dashTimer>0?.13:-moveDir.x*.075),blend);
        torso.rotation.x=THREE.MathUtils.lerp(torso.rotation.x,dashTimer>0?-.20:.015*stride,blend);
        headRig.rotation.z=Math.sin(elapsed*1.2)*.027;
        combat.update(dt);
        if(combat.isAttacking){
            const progress=1-combat.attackAnimTimer/combat.attackAnimDuration;
            const arc=Math.sin(progress*Math.PI);
            rightArm.rotation.x=-.32-arc*2.05;
            rightArm.rotation.z=-.18-arc*.32;
            torso.rotation.y=-arc*.23;
        } else {
            rightArm.rotation.z=THREE.MathUtils.lerp(rightArm.rotation.z,-.08,blend);
            torso.rotation.y=THREE.MathUtils.lerp(torso.rotation.y,0,blend);
        }
        invulnerableTimer = Math.max(0, invulnerableTimer-dt);
        player.visible = invulnerableTimer<=0 || Math.floor(invulnerableTimer*12)%2 === 0;

        if (speedBoostTimer > 0) {
            speedBoostTimer = Math.max(0,speedBoostTimer-dt);
            if (speedBoostTimer===0) speedBoost = 1;
        }

        // Árvore distante fica invisível, mas mantém seu collider físico.
        forest.updateVisibility(player.position,graphicsQuality,dt);
        cameraRig.update(dt,playerYaw,mousePitch);

        // Recursos são colhidos com F; jamais coletados por proximidade.
        // O loop não cria peças de missão nem força uma vitória linear.
        for (let i=healthPacks.length-1; i>=0 && gameActive; i--) {
            const pack=healthPacks[i]; pack.rotation.y+=dt*1.6;
            if (health<maxHealth && Math.hypot(player.position.x-pack.position.x,player.position.z-pack.position.z)<1.25) {
                const position=pack.position.clone();
                removeMesh(pack);healthPacks.splice(i,1);
                health=Math.min(maxHealth,health+28);
                sfx.heal();spawnParticle(position,0x2ecc71,9);updateHUD();
            }
        }
        for (let i=speedBoosts.length-1; i>=0 && gameActive; i--) {
            const boost=speedBoosts[i];boost.rotation.y+=dt*2.5;
            boost.position.y=boost.userData.baseY+Math.sin(elapsed*3+i)*0.13;
            if (Math.hypot(player.position.x-boost.position.x,player.position.z-boost.position.z)<1.3) {
                const position=boost.position.clone();removeMesh(boost);speedBoosts.splice(i,1);
                speedBoost=1.75;speedBoostTimer=7;
                sfx.boost();spawnParticle(position,0x00d4ff,10);updateHUD();
            }
        }

        resources.update(dt,player.position,graphicsQuality);
        buildings.update(elapsed,dt);
        wildlife.update(dt,player.position,graphicsQuality);
        guard.update(dt,elapsed,player.position);
        enemyAI.update(dt,elapsed);
        zombieModels.updateCorpses(dt,removeMesh);
        // Patrulha do cemitério: surgem infectados quando o jogador explora a região.
        cemeterySpawnTimer-=dt;
        if(withinCemetery(player.position,21)&&cemeterySpawnTimer<=0&&enemies.length<12){
            cemeterySpawnTimer=7+Math.random()*4;
            const type=chooseZombieType({graveyard:true,night:vitals.night,day:survival.days,roll:Math.random()});
            for(let attempt=0;attempt<8;attempt++){
                const angle=Math.random()*Math.PI*2,radius=8+Math.random()*4;
                const x=CEMETERY_POS.x+Math.cos(angle)*radius,z=CEMETERY_POS.z+Math.sin(angle)*radius;
                if(!isPositionFree(x,z,.85))continue;
                spawnEnemy(type);const spawned=enemies[enemies.length-1];
                spawned.mesh.position.set(x,getGroundHeight(x,z)+spawned.size/2,z);break;
            }
        }
        projectileSystem.update(dt);
        if (!gameActive) { drawMinimap(); renderer.render(scene,camera); return; }
        // Spawn por SEGUNDOS, não por quadro: dificuldade coerente a 30/60/144 FPS.
        spawnTimer-=dt;
        if (spawnTimer<=0) {
            spawnTimer=Math.max(2.7,10-wave*.7-(vitals.night?3:0))+Math.random()*2;
            if (enemies.length<Math.min(12,4+wave*2)) {
                const r=Math.random();spawnEnemy(vitals.night ? (r<0.43?chooseZombieType({night:true,day:survival.days,roll:Math.random()}):r<0.66?'normal':r<0.81?'fast':r<0.92?'tank':'shaman') : (r<0.42?'normal':r<0.68?'fast':r<0.88?'tank':'shaman'));
            }
        }
        hudTick+=dt;
        if (hudTick>0.12) { hudTick=0;updateHUD(); }

        // Dia/noite só evolui durante o jogo ativo.
        dayTime=survival.time;
        const sunAngle=((dayTime%480)/480)*Math.PI*2;
        sun.position.set(Math.cos(sunAngle)*80,Math.sin(sunAngle-Math.PI/2)*65+5,Math.sin(sunAngle)*40);
        const intensity=Math.max(0.08,Math.sin(sunAngle-Math.PI/2)*.5+.5);
        const graveDist=Math.hypot(player.position.x-CEMETERY_POS.x,player.position.z-CEMETERY_POS.z);
        const graveAtmosphere=THREE.MathUtils.clamp((26-graveDist)/14,0,1);
        sun.intensity=(.13+intensity*1.35)*(1-graveAtmosphere*.47);
        ambient.intensity=(.12+intensity*.49)*(1-graveAtmosphere*.30);
        scene.background.setHSL(.59,.38-graveAtmosphere*.21,.065+intensity*.55-graveAtmosphere*.075);
        scene.fog.color.copy(scene.background);

        shrine.update(dt,elapsed);
        combat.tickEffects(dt);
    }
    if (showFps) {
        fpsTime += dt; fpsFrames++;
        if (fpsTime > .75) {
            fpsDisplay.textContent = `FPS: ${Math.round(fpsFrames/fpsTime)} · Draw calls: ${renderer.info.render.calls} · Árvores: ${forest.visibilityStats.visibleTrees}/${forest.visibilityStats.totalTrees}`;
            fpsTime=0; fpsFrames=0;
        }
    }
    minimapTick += dt;
    if (minimapTick >= 0.10) { minimapTick = 0; drawMinimap(); }
    renderer.render(scene,camera);
}

function loseGame() {
    if(placement)releasePlacement();
    gameActive = false;
    // Permitir retomar o último checkpoint após morrer.
    sfx.lose();
    document.getElementById('go-title').textContent = 'Fim da sobrevivência';
    document.getElementById('go-title').style.color = '#e74c3c';
    document.getElementById('go-msg').textContent = `Sobreviveu até o Dia ${survival.days} e derrotou ${kills} criaturas. Recomece para tentar durar mais!`;
    document.getElementById('gameover').classList.remove('hidden');
    controls.unlock();
}

window.addEventListener('pagehide',()=>saveProgress());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveProgress();});

// O mundo só é criado depois da escolha de qualidade, não antes.
updateHUD();
animate();
window.__madrugaReady = true;

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
