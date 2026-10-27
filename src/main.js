// Madruga Survival v2.35.0 — saves com recuperação, navegação econômica e HUD mais leve.
import { createNatureAssets } from './world/nature-assets.js';
import { createCameraRig } from './render/camera-rig.js?v=2.14.0';
import { createForest } from './world/forest.js?v=2.13.0';
import { readSave, writeSave } from './gameplay/save-system.js?v=2.13.0';
import { createTerrain } from './world/terrain.js';
import { createMinimap } from './ui/minimap.js';
import { weaponTypes } from './gameplay/equipment.js';
import { applyGraphicsSettings } from './render/quality.js';
import { initAudio, sfx } from './audio/sfx.js?v=2.11.0-spider';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {shouldRenderFrame} from './render/frame-budget.js';
import {createFrameDriver} from './render/startup-scheduler.js';
import {canDisposeEnemyGeometry} from './render/enemy-geometry-pool.js';
import {createAdventureLoader} from './render/adventure-loader.js';
import {createGpuWarmup} from './render/gpu-warmup.js';
import {createMenuPreview} from './ui/menu-preview.js';
import {buildingInteractionLabel} from './ui/building-interaction-label.js';
import {createZombieModelManager} from './characters/zombie-models.js?v=2.1.5-foot-plant';
import {createSpiderModelManager} from './characters/spider-model.js?v=2.14.0';
import {createSpiderAI} from './gameplay/spider-ai.js?v=2.14.0';
import {chooseSpiderVariant} from './gameplay/spider-variants.js?v=2.13.0';
import {createZombieSenses,alertZombie,ambientSpawnPlan} from './gameplay/zombie-perception.js?v=2.3.0';
import { createPlayerModel } from './characters/player-model.js?v=2.6.0-crafting';
import {samplePlayerAttackPose,idleGripPose} from './characters/player-attack-pose.js?v=2.4.0-combat';
import {createPlayerRev5} from './characters/player-rev5.js?v=2.4.0-combat';
import { createEnemySpawner } from './characters/enemy-factory.js';
import {createGoblinModelManager} from './characters/goblin-model.js';
import {findGoblinEncounterSpot,nearestGoblinEncounter} from './gameplay/goblin-encounter.js';
import { createEnemyAI } from './gameplay/enemy-ai.js?v=2.3.0-perception';
import { createCombatSystem } from './gameplay/combat.js?v=2.13.0';
import { createProjectileSystem } from './gameplay/projectiles.js?v=2.13.0-cave';
import { createShrineSystem } from './world/shrine.js';
import { createCollisionWorld } from './world/collisions.js';
import {createSurvival,advanceSurvival,isNight,addResource,useConsumable,spendRecipe,canAfford,RECIPES,RESOURCES} from './gameplay/survival.js?v=2.13.0';
import {createResourceWorld} from './world/resources.js?v=1.9.0-geometry';
import {createExplorationWorld} from './world/exploration.js?v=2.6.0';
import {createSpiderNestWorld} from './world/spider-nests.js?v=2.12.0';
import {createArachnidCave,CAVE_CENTER,CAVE_RADIUS} from './world/arachnid-cave.js?v=2.14.0';
import {createBuildingWorld} from './world/buildings.js?v=2.0.0-performance';
import {createSurvivalUI} from './ui/survival-ui.js?v=2.18.0';
import {createConsumableHotbarUI} from './ui/consumable-hotbar-ui.js?v=2.16.0';
import {defaultHotbar,assignHotbarSlot,hotbarIndexFromCode} from './gameplay/consumable-hotbar.js?v=2.15.0';
import {canPlaceOnHotbar,getQuickSlot} from './gameplay/inventory-ui-logic.js';
import {createBag,reconcileBag,validBag,moveBagStack,splitBagStack,sortBag} from './gameplay/inventory-slots.js';
import {createTouchControls} from './input/touch-controls.js';
import {createBuildWheelUI,BUILD_WHEEL_TYPES} from './ui/build-wheel-ui.js';
import {createStorageUI} from './ui/storage-ui.js';
import {transferItem,sleepInBed,totalStored} from './gameplay/storage.js';
import {planStoreBagStack,planTakeFromChest} from './gameplay/bag-storage.js';
import {isGearEquipped,setGearEquipped,equipNewCraft} from './gameplay/gear-loadout.js';
import {collidesWithStructure,MAX_STRUCTURES} from './world/building-rules.js';
import {isStructureRecipe,beginPlacement,nudgePlacement,rotatePlacement,toggleSnap,placementStatus,commitPlacement} from './gameplay/placement.js';
import {makeTool,useTool,canUseTool,restoreTool,TOOL_MAX} from './gameplay/tools.js';
import {craftAvailability,craftItem,reserveCraftMaterials} from './gameplay/crafting.js?v=2.13.0';
import {createRaidState,planRaid} from './gameplay/raids.js';
import {raidTarget,maxBuildingHP} from './gameplay/base-defense.js';
import {workCrop,CROP_MATURITY} from './gameplay/farming.js';
import {tryFish} from './gameplay/fishing.js';
import {createWildlifeWorld} from './world/wildlife.js';
import {createCemetery,CEMETERY_POS,withinCemetery} from './world/cemetery.js';
import {CRAFT_STATIONS} from './gameplay/crafting.js';
import {createWorkbenchUI} from './ui/workbench-ui.js';
import {createVillagerGuard} from './characters/villager-guard.js';
import {chooseZombieType} from './gameplay/zombie-variants.js';
import {createSkillsUI} from './ui/skills-ui.js';
import {SKILLS,awardSkill,skillLevel,fishingBonus,farmingBonus,huntingBonus,
    resourceBonus,recipeCost,cookedYield} from './gameplay/skills.js?v=2.6.0-crafting';


// ========== SCENE ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 300);
let graphicsQuality = 'medium'; // low, medium, high

// Cria somente o canvas no menu. Contexto WebGL, sombras e buffers alocados
// apenas quando o jogador inicia uma partida, poupando GPU/CPU no menu.
const gameCanvas=document.createElement('canvas');
gameCanvas.id='game-canvas';
gameCanvas.style.visibility='hidden';
document.body.appendChild(gameCanvas);
let renderer=null;
function ensureRenderer(){
    if(renderer)return renderer;
    renderer=new THREE.WebGLRenderer({canvas:gameCanvas,
        antialias:!window.matchMedia('(max-width: 700px)').matches,
        powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.setSize(innerWidth,innerHeight);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.1;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFShadowMap;
    return renderer;
}

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

let ground=null; // Geometria procedural adiada até Iniciar/Retomar

// Obstáculos físicos e visuais da câmera.
const rockColliders = [];
const collisionWorld = createCollisionWorld();
const allColliders = collisionWorld.colliders;
const cameraObstacles = [];
const natureAssets = createNatureAssets(THREE);

// ========== PERSONAGEM ==========
const {player,avatar,torso,headRig,leftLeg,rightLeg,leftArm,rightArm,weapon,equipWeaponVisual,setWeaponUpgrades} =
    createPlayerModel(THREE,scene);
let menuPreparing=false;
const gpuWarmup=createGpuWarmup({
  getRenderer:()=>renderer,getScene:()=>scene,getCamera:()=>camera,
  isActive:()=>!document.hidden&&(gameActive||menuPreparing||adventureLoading),
  onProgress:({label,phase,done,total})=>{
    if(!gameActive)return;
    const status=document.getElementById('gpu-warmup-status');
    if(!status)return;
    if(phase==='ready'||phase==='failed'){status.classList.add('hidden');return;}
    status.textContent=phase==='textures'?`🎨 Preparando ${label}: textura ${done}/${total}`:
      `🎨 Preparando shaders: ${label}`;
    status.classList.remove('hidden');
  }
});
const modelBanner=document.getElementById('player-model-status');
const modelMessage=document.getElementById('player-model-message');
const modelRetry=document.getElementById('player-model-retry');
function showPlayerModelStatus(message,state){
    console.info('[Player REV5]',state,message);
    modelMessage.textContent=message;
    // Acompanhar as 17 partes reais do REV5 no loading, sem porcentagem inventada.
    if(adventureLoading&&!adventureReady&&!gameActive &&
       loadingStage?.textContent==='Preparando Seu Madruga e animações'){
        loadingDetail.textContent=message;
    }
    modelBanner.style.display=(state==='ready'||!gameActive)?'none':'block';
    modelBanner.dataset.state=state;
    modelRetry.style.display=state==='error'?'inline-block':'none';
}
const playerRev5=createPlayerRev5({THREE,GLTFLoader,player,avatar,weapon,
    onStatus:showPlayerModelStatus,fallbackRig:{torso,leftLeg,rightLeg},
    onBeforeMount:(root,label)=>gpuWarmup.prepare(root,label)});
modelRetry.addEventListener('click',()=>{if(gameActive)void playerRev5.preload();});
if(typeof window!=='undefined')Object.defineProperty(window,'madrugaRev5Status',{
    configurable:true,get:()=>({loaded:playerRev5.loaded,failed:playerRev5.failed,
      oldVisualVisible:playerRev5.oldVisualVisible,
      modelVisible:playerRev5.visualVisible,
      meshName:playerRev5.model?.name||null})
});

modelBanner.style.display='none'; // Nenhum GLB requisitado no menu principal.

// ========== CONTROLS ==========
// Terceira pessoa: não use PointerLockControls sobre a mesma câmera,
// pois ele também aplica rotação e conflita com camera.lookAt().
const touchEnabled=window.matchMedia('(pointer: coarse)').matches;
let touchPlaying=false;
const controls = {
    get isLocked() { return touchPlaying || document.pointerLockElement === gameCanvas; },
    lock() {
        if(touchEnabled){touchPlaying=true;document.body.classList.add('touch-playing');return;}
        try {
            const promise = gameCanvas.requestPointerLock?.();
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
let hotbarSlots=defaultHotbar();
let inventorySlots=createBag(survival.inventory);
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
let spawnTimer = 15;
let sneaking=false,runningFastNow=false,footstepTimer=0,webSlowTimer=0;
const zombieSenses=createZombieSenses();
const playerNoise=(radius,kind)=>zombieSenses.emit(player.position,radius,elapsed,kind);
let mousePitch = 0.18;
let cameraZoom = 7.6;
let toastTimer = null, skillAlertTimer = null;
let wave = 1;
let gameActive = false;
let adventureLoading=false;
let frameDriver=null;

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
const zombieModels=createZombieModelManager({THREE,scene,GLTFLoader,cloneSkeleton,getGroundHeight,deferPreload:true,
  onBeforeMount:(root,label)=>gpuWarmup.prepare(root,label)});
const spiderModels=createSpiderModelManager({THREE,GLTFLoader,cloneSkeleton,getGroundHeight,deferPreload:true,
  onBeforeMount:(root,label)=>gpuWarmup.prepare(root,label)});
const goblinModels=createGoblinModelManager({THREE,GLTFLoader,cloneSkeleton,deferPreload:true,getGroundHeight,
  onBeforeMount:(root,label)=>gpuWarmup.prepare(root,label)});
if(typeof window!=='undefined')Object.defineProperty(window,'madrugaSpiderStatus',{configurable:true,
  get:()=>({loaded:spiderModels.loaded,failed:spiderModels.failed,active:enemies.filter(e=>e.type==='spider').length,
     variants:Object.fromEntries(['shadow','hunter','weaver'].map(id=>[id,enemies.filter(e=>e.spiderVariant===id).length]))})});
if(typeof window!=='undefined')Object.defineProperty(window,'madrugaGoblinStatus',{configurable:true,
  get:()=>{const nearby=nearestGoblinEncounter(enemies,player.position);
    return {loaded:goblinModels.loaded,failed:goblinModels.failed,
      alive:enemies.filter(e=>e.type==='normal'&&e.hp>0).length,
      animated:enemies.filter(e=>e.type==='normal'&&e.hp>0&&!!e.goblinVisual).length,
      nearestMeters:nearby?Math.round(nearby.distance):null};
  }});
const healthPacks = [];
const speedBoosts = [];
const trees = [];
const particles = [];
const treeColliders = [];

const forest = createForest({THREE,scene,natureAssets,getGroundHeight,shrinePosition,
    collisionWorld,rockColliders,treeColliders,cameraObstacles,trees});
const cameraRig=createCameraRig({THREE,camera,player,raycaster,getGroundHeight,cameraObstacles,scene});
const resources=createResourceWorld({THREE,scene,getGroundHeight,isPositionFree:(x,z,r)=>collisionWorld.isPositionFree(x,z,r),findSpawnPoint:(min,max,r)=>findSpawnPoint(min,max,r)});
const exploration=createExplorationWorld({THREE,scene,getGroundHeight,
    isPositionFree:(x,z,r)=>collisionWorld.isPositionFree(x,z,r),
    addCollider:collider=>collisionWorld.add(collider)});
const spiderNests=createSpiderNestWorld({THREE,scene,getGroundHeight,
    isPositionFree:(x,z,r)=>collisionWorld.isPositionFree(x,z,r)});
const arachnidCave=createArachnidCave({THREE,scene,getGroundHeight});
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
    playerRev5.setGear?.(survival.equippedGear);
    const ability = document.getElementById('ability-display');
    ability.textContent = combat.specialCooldown > 0 ? `E · Giratório: ${combat.specialCooldown.toFixed(1)}s` : 'E · Golpe giratório pronto';
    ability.classList.toggle('ready', combat.specialCooldown <= 0);
    const combo=document.getElementById('combat-combo-status');
    if(combo){combo.textContent=combat.isAttacking?`⚔ Combo ${combat.comboStep+1}/3`:
      combat.attackBuffered?'⚔ Próximo golpe preparado':combat.comboActive?'⚔ Continue atacando para combinar golpes':'⚔ J/clique: 3 golpes em sequência';}
    document.getElementById('score-display').textContent = `🌲 Acampamento livre`;
    document.getElementById('quest-display').textContent = `🪵 ${survival.inventory.wood}  🪨 ${survival.inventory.stone}  🫐 ${survival.inventory.berries}  💧 ${survival.inventory.water}`;
    document.getElementById('wave-display').textContent = `Perigo: ${wave}/6 · Invasões: ${raidState.waves}`;
    document.getElementById('guard-status').textContent = guard.hp===0?'🛡 Chaves caído · F para reanimar':guard.recruited?`🛡 Chaves ${guard.mode==='follow'?'seguindo':guard.mode==='patrol'?'patrulhando':'defendendo a base'} · ${guard.hp}/80 PV · [O] ordem`:'🛡 Encontre o Chaves perto do acampamento (F)';
    const activityNode=document.getElementById('guard-activity');
    if(activityNode){
      const activities={idle:'Aguardando',down:'Precisa de ajuda',shooting:'Em combate',engaging:'Protegendo área',blocked:'Caminho obstruído',repositioning:'Procurando ângulo de tiro',pathfinding:'Procurando caminho',following:'Acompanhando',patrolling:'Em ronda',defending:'Guardando a base'};
      const active=gameActive&&guard.recruited;
      activityNode.classList.toggle('hidden',!active);
      if(active){const key=guard.activity;const title=activities[key]||'Aguardando';
        if(activityNode.textContent!==title)activityNode.textContent=title;
        activityNode.dataset.activity=key;}
    }
    const orderBtn=document.getElementById('guard-order');
    if(orderBtn){orderBtn.classList.toggle('hidden',!gameActive||!guard.recruited||!guard.alive);orderBtn.textContent=`🛡 ${guard.mode==='follow'?'Seguir':guard.mode==='patrol'?'Patrulhar':'Defender'} [O]`;}
    document.getElementById('poison-status').textContent = poisonTimer>0?`☣ Envenenado: ${Math.ceil(poisonTimer)}s`:'';
    document.getElementById('cemetery-status').textContent = withinCemetery(player.position)?'🪦 Cemitério assombrado — inimigos mais perigosos':'';
    document.getElementById('raid-alert').classList.toggle('hidden',!(gameActive&&elapsed<raidAlertUntil));
    const nearbyGoblin=nearestGoblinEncounter(enemies,player.position);
    const goblinHint=nearbyGoblin && nearbyGoblin.distance<65 ?
      ` · 👺 Goblin ${Math.round(nearbyGoblin.distance)}m${goblinModels.failed?' (visual simples)':''}`:'';
    document.getElementById('enemies-left').textContent = `Criaturas: ${enemies.length}${goblinHint}`;
    const nearbyZombies=enemies.filter(e=>e.isZombie&&e.awareness&&
      Math.hypot(e.mesh.position.x-player.position.x,e.mesh.position.z-player.position.z)<24);
    const following=nearbyZombies.filter(e=>e.awareness.state==='chase').length;
    const investigating=nearbyZombies.filter(e=>e.awareness.state==='investigate'||e.awareness.state==='search').length;
    const stealthStatus=document.getElementById('stealth-status');
    stealthStatus.textContent=following?`⚠️ Detectado · ${following} zumbi(s) na perseguição`:
      investigating?`👂 ${investigating} zumbi(s) investigando a área`:
      sneaking?'🤫 Furtividade ativa · ruído reduzido':'👣 Passos normais · C para andar silenciosamente';
    stealthStatus.dataset.alert=following?'danger':investigating?'caution':sneaking?'quiet':'normal';
    document.getElementById('boost-display').textContent = webSlowTimer>0?`🕸 Teia: ${webSlowTimer.toFixed(1)}s`:speedBoostTimer > 0 ? `⚡ Velocidade: ${speedBoostTimer.toFixed(1)}s` : '';
    document.getElementById('dodge-display').textContent = dashCooldown > 0 ? `Q · Esquiva: ${dashCooldown.toFixed(1)}s` : 'Q · Esquiva pronta';
    const explorationGoal=exploration.objective(player.position);
    const explorationStatus=document.getElementById('exploration-status');
    explorationStatus.textContent=!explorationGoal.ready?'🧭 Procure suprimentos nas casas abandonadas':
      explorationGoal.complete?'🗺 Todos os locais vasculhados!':
      `🧭 Explorar: ${explorationGoal.site.discovered?explorationGoal.site.label:'Local desconhecido'} · ${explorationGoal.direction} · ${explorationGoal.meters}m · caixas ${explorationGoal.opened}/${explorationGoal.total}`;
    const queen=enemies.find(e=>e.spiderVariant==='matriarch');
    const nestCount=spiderNests.nests.reduce((sum,n)=>sum+n.eggs,0);
    document.getElementById('cave-status').textContent=arachnidCave.inside?
      (arachnidCave.state.bossDefeated?'💎 Caverna segura · recolha os cristais e procure a saída':queen?`🕷 Rainha das Aranhas: ${Math.max(0,Math.ceil(queen.hp))}/${queen.maxHp} PV · FASE ${queen.enraged?2:1}`:'🕷 Caverna perigosa: aproxime-se da Rainha!'):
      (arachnidCave.state.bossDefeated?'💎 Rainha derrotada · recursos restantes na caverna':'⛏ Encontre a entrada da caverna perto da Colônia das Tecelãs');
    document.getElementById('spider-nest-status').textContent=nestCount?
      `🕸 Ninhos: ${nestCount} ovos restantes · F recolhe seda e quitina · cuidado com as teias!`:
      '🕸 Ninhos explorados · procure seda e quitina nas aranhas selvagens';
    document.getElementById('mission-title').textContent = buildings.structures.some(s=>s.type==='farmPlot')?'Cultive alimentos, pesque e proteja sua casa':'Monte uma horta e complete sua casa';
    document.getElementById('mission-goal').textContent = survival.firesBuilt ?
      'Construa um telhado, um canteiro e fabrique uma vara de pesca'  : 'Reúna 4 madeiras e 4 pedras para a fogueira';
    document.getElementById('equipment-display').textContent = `Arma [${currentWeapon+1}]: ${weaponTypes[currentWeapon].name} · Durabilidade ${currentWeapon===0?'∞':survival.durability[currentWeapon===1?'hammer':'spear']}`;
    document.getElementById('target-hint').textContent = placement?'🧱 Construção: F confirma · G gira · Esc cancela':'F interagir · C furtividade · Y pescar · I mochila · U habilidades';
    const bossWrapper=document.getElementById('boss-bar-wrapper');
    const showQueen=arachnidCave.inside&&!!queen&&queen.hp>0;
    bossWrapper.classList.toggle('hidden',!showQueen);
    if(showQueen){
      document.getElementById('boss-name').textContent=queen.enraged?'🕷 RAINHA DAS ARANHAS · FASE 2':'🕷 Rainha das Aranhas · Fase 1';
      document.getElementById('boss-bar').style.width=`${Math.max(0,Math.min(100,queen.hp/queen.maxHp*100))}%`;
      bossWrapper.classList.toggle('rage',!!queen.enraged);
    }
    survivalUI.update();
    consumableHotbarUI.update();
    skillsUI.update();
    document.getElementById('skill-hud').textContent=`⭐ 🎣 ${skillLevel(survival,'fishing')} · 🌾 ${skillLevel(survival,'farming')} · 🏹 ${skillLevel(survival,'hunting')} · 🏠 ${skillLevel(survival,'building')}`;
    const closestBuilding=buildings.nearest(player.position,2.85);
    const closest=resources.findNearby(player.position);
    const closestLoot=exploration.nearest(player.position);
    const nearNest=spiderNests.nearest(player.position);
    const prompt=document.getElementById('interact-hint');
    if(placement){
        prompt.classList.add('hidden');
    }else if(closestBuilding&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        const action=buildingInteractionLabel(closestBuilding,CROP_MATURITY);
        prompt.textContent=`[F] ${action} · [X] desmontar`;
        prompt.classList.remove('hidden');
    }else if(guard.nearby(player.position)&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent=guard.hp===0?'[F] Reanimar Chaves com 2 frutas e 1 água':guard.recruited?'[F/O] Mudar ordem do Chaves':'[F] Contratar Chaves para defender sua base';
        prompt.classList.remove('hidden');
    }else if(arachnidCave.nearPortal(player.position)&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent='[F] Entrar na Caverna das Aranhas';prompt.classList.remove('hidden');
    }else if(arachnidCave.nearExit(player.position)&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent='[F] Sair da Caverna';prompt.classList.remove('hidden');
    }else if(arachnidCave.nearestCrystal(player.position)&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent='[F] Recolher cristal subterrâneo';prompt.classList.remove('hidden');
    }else if(nearNest&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent=`[F] Recolher ovo · ${nearNest.label} (${nearNest.eggs} restantes)`;
        prompt.classList.remove('hidden');
    }else if(closestLoot&&gameActive&&!survivalUI.isOpen&&!storageUI.isOpen){
        prompt.textContent=`[F] Vasculhar ${closestLoot.container.label} · ${closestLoot.site.label}`;
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
    equipWeaponVisual(index);
    setWeaponUpgrades(survival.crafted);
    playerRev5.equip(index);
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
    sfx.boost(); playerRev5.jump(); updateHUD(); return true;
}
function damagePlayer(amount, origin) {
    if (!gameActive || invulnerableTimer > 0) return false;
    health = Math.max(0,health-amount*(isGearEquipped(survival,'vest')?.80:1)*(isGearEquipped(survival,'padding')?.90:1));
    invulnerableTimer = 0.86; flashDamage(); sfx.damage(); playerRev5.hurt();
    const dx = player.position.x-origin.x, dz = player.position.z-origin.z;
    const d = Math.hypot(dx,dz)||1;
    const away = resolveCollision(player.position.x+dx/d*0.5,player.position.z+dz/d*0.5,0.46);
    player.position.x=away.x; player.position.z=away.z;
    updateHUD();
    if (health <= 0) loseGame();
    return true;
}
const projectileSystem = createProjectileSystem({THREE,scene,player,allColliders,isPositionFree,damagePlayer,
    removeMesh,isGameActive:()=>gameActive,onWebHit:seconds=>{webSlowTimer=Math.max(webSlowTimer,seconds);showToast('🕸 Teia! Movimento reduzido temporariamente.');}});
const spiderAI=createSpiderAI({player,getGroundHeight,resolveCollision,damagePlayer,
  onSpiderSound:(kind,distance)=>{
    const event={step:'spiderStep',attack:'spiderAttack',charge:'spiderCharge',web:'spiderWeb',jump:'spiderJump'}[kind];
    if(event)sfx[event]?.(distance);
  },
    throwProjectile:(enemy,spread)=>projectileSystem.throwProjectile(enemy,spread),
    hasLineOfSight:(a,b)=>!buildings.blocksLine(a,b)});

function removeMesh(mesh,defeated=false) {
    const deceased=enemies.find(e=>e.mesh===mesh);
    if(defeated&&deceased&&(zombieModels.defeat(deceased)||spiderModels.defeat(deceased)||goblinModels.defeat(deceased)))return;
    scene.remove(mesh);
    const zombie=enemies.find(e=>e.mesh===mesh);
    if(zombie){zombieModels.dispose(zombie);spiderModels.dispose(zombie);goblinModels.dispose(zombie);}
    const disposed=new Set();
    mesh.traverse(node => {
        if (!node.isMesh) return;
        // Recursos partilhados entre braços/pernas de um mesmo inimigo são descartados uma só vez.
        if (canDisposeEnemyGeometry(node.geometry) && !node.userData?.sharedZombieGeometry && !node.userData?.sharedGoblinGeometry && !disposed.has(node.geometry)) {
            disposed.add(node.geometry);node.geometry.dispose();
        }
        for (const m of (Array.isArray(node.material) ? node.material : [node.material])) {
            if (m && !node.userData?.sharedGoblinMaterial && !disposed.has(m)) {disposed.add(m);m.dispose();}
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
    return Math.hypot(x-CAVE_CENTER.x,z-CAVE_CENTER.z)>12.9+radius &&
      collisionWorld.isPositionFree(x,z,radius)&&!buildings.isBlocked(x,z,radius);
}
function resolveCollision(x, z, radius = 0.45) {
    // A câmara é uma instância fechada: a criatura não atravessa a parede de rocha.
    if(arachnidCave.inside&&Math.hypot(x-CAVE_CENTER.x,z-CAVE_CENTER.z)<18){
        const dx=x-CAVE_CENTER.x,dz=z-CAVE_CENTER.z,d=Math.hypot(dx,dz);
        const max=11.2-radius;if(d>max){x=CAVE_CENTER.x+dx/d*max;z=CAVE_CENTER.z+dz/d*max;}
    }
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

const spawnEnemy = createEnemySpawner({THREE,scene,getGroundHeight,findSpawnPoint,shrinePosition,enemies,getQuality:()=>graphicsQuality,onSpawn:enemy=>{zombieModels.attach(enemy);spiderModels.attach(enemy);goblinModels.attach(enemy);}});
// Só adiciona um encontro se não houver nenhum goblin perto; não move os
// inimigos de um save antigo. O modelo 3D é montado quando o preload concluir.
function ensureVisibleGoblinEncounter(){
    if(arachnidCave.inside||enemies.length>=12)return false;
    const near=nearestGoblinEncounter(enemies,player.position);
    if(near&&near.distance<42)return false;
    const position=findGoblinEncounterSpot({player:player.position,yaw:playerYaw,
        isFree:isPositionFree,hasClearPath:(from,to)=>!buildings.blocksLine(from,to)});
    if(!position){console.warn('[Goblin] Sem local seguro próximo do jogador');return false;}
    spawnEnemy('normal');
    const enemy=enemies[enemies.length-1];
    enemy.mesh.position.set(position.x,getGroundHeight(position.x,position.z)+enemy.size/2,position.z);
    console.info('[Goblin] Encontro criado a',Math.round(Math.hypot(position.x-player.position.x,position.z-player.position.z)),'m',goblinModels.loaded?'3D animado':'visual provisório');
    return true;
}
const cemetery=createCemetery({THREE,scene,getGroundHeight,addCollider:collisionWorld.add,getQuality:()=>graphicsQuality});
const guard=createVillagerGuard({THREE,GLTFLoader,scene,getGroundHeight,resolveCollision,isPositionFree,
    getStructures:()=>buildings.structures,getEnemies:()=>enemies,
    canSee:(a,b)=>!buildings.blocksLine(a,b),
    attackEnemy:(enemy,damage)=>combat.damageEnemy(enemy,damage,.08,false),
    onStatus:(message,state)=>console.info('[Chaves]',state,message),
    onBeforeMount:(root,label)=>gpuWarmup.prepare(root,label)});
function changeChavesOrder(){
    if(!gameActive||!guard.recruited||!guard.alive){showToast('Recrute e mantenha o Chaves vivo para dar ordens.');return false;}
    const order=guard.cycleOrder();
    if(!order)return false;
    showToast(`🛡 Ordem do Chaves: ${order}.`);
    saveProgress();updateHUD();return true;
}
document.getElementById('guard-order').addEventListener('click',changeChavesOrder);
const shrine = createShrineSystem({THREE,scene,shrinePosition,getGroundHeight,
    addCollider:collisionWorld.add,cameraObstacles,getGraphicsQuality:()=>graphicsQuality});
let worldSeed = Math.floor(Math.random() * 0x100000000);
// Etapas independentes: o navegador pode atualizar o loading entre blocos pesados.
// Nenhum mapa, IA ou física é atualizado no menu principal.
function initWorld() {
    return [
        {name:'Preparando terreno e iluminação',load:()=>{
            ensureRenderer();
            if(!ground){
                ground=createTerrain(THREE,scene,getGroundHeight);
                cameraObstacles.unshift(ground);
                cameraRig.refreshObstacles();
            }
            applyGraphicsSettings(THREE,graphicsQuality,renderer,scene,sun);
            natureAssets.setQuality(graphicsQuality);
        }},
        {name:'Gerando floresta e vegetação',load:()=>{
            forest.generate(graphicsQuality,worldSeed);
        }},
        {name:'Construindo locais, ruínas e caverna',load:()=>{
            shrine.create();
            cemetery.create();
            cameraObstacles.push(...cemetery.cameraObstacles);
            cameraRig.refreshObstacles();
            forest.updateVisibility(player.position,graphicsQuality,0,true);
            exploration.generate(worldSeed);
            spiderNests.generate(worldSeed);
            arachnidCave.generate(spiderNests.nests);
            cameraRig.setArena(null);
        }},
        {name:'Distribuindo recursos e criaturas',load:()=>{
            resources.generate(worldSeed,graphicsQuality);
            wildlife.generate(worldSeed,graphicsQuality);
            for(let i=0;i<2;i++)spawnHealthPack();
            for(let i=0;i<2;i++)spawnSpeedBoost();
            // Um goblin aparece à frente do jogador; o outro patrulha livremente.
            ensureVisibleGoblinEncounter();
            spawnEnemy('normal');
            spawnEnemy('fast');
            if(Math.random()<0.35)spawnEnemy('zombie');
            spawnEnemy('spider','shadow');
            updateHUD();
            worldInitialized=true;
        }}
    ];
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
    inventorySlots=reconcileBag(inventorySlots,survival.inventory) || createBag(survival.inventory);
    return {
        seed:worldSeed,graphicsQuality,level,xp,kills,health,maxHealth,wave,elapsed,
        currentWeapon,hotbar:hotbarSlots,inventorySlots,player:{x:player.position.x,z:player.position.z,yaw:playerYaw},
        survival,raid:raidState,guard:guard.getState(),poisonTimer,resources:resources.serialize(),buildings:buildings.serialize(),
        wildlife:wildlife.serialize(),exploration:exploration.serialize(),spiderNests:spiderNests.serialize(),
        arachnidCave:arachnidCave.serialize(),
        healthPacks:healthPacks.map(item=>({x:item.position.x,z:item.position.z})),
        speedBoosts:speedBoosts.map(item=>({x:item.position.x,z:item.position.z})),
        enemies:enemies.map(enemy=>({type:enemy.type,x:enemy.mesh.position.x,z:enemy.mesh.position.z,
            hp:enemy.hp,enraged:enemy.enraged,raider:!!enemy.raider,
            ...(enemy.type==='spider'?{spiderVariant:enemy.spiderVariant||'shadow'}:{})}))
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
    wave=data.wave;elapsed=data.elapsed;spawnTimer=15;
    zombieSenses.clear();sneaking=false;runningFastNow=false;footstepTimer=0;webSlowTimer=0;
    survival=data.survival;hotbarSlots=[...data.hotbar];inventorySlots=data.inventorySlots.map(s=>s?{...s}:null);raidState=data.raid||createRaidState();raidAlertUntil=0;
    poisonTimer=data.poisonTimer||0;cemeterySpawnTimer=5;guard.setState(data.guard);
    buildings.restore(data.buildings);
    if(Array.isArray(data.wildlife))wildlife.restore(data.wildlife);
    refreshBuildingCamera();
    resources.restore(data.resources);
    exploration.restore(data.exploration);
    spiderNests.restore(data.spiderNests);
    arachnidCave.restore(data.arachnidCave);
    cameraRig.setArena(arachnidCave.inside?{...CAVE_CENTER,radius:CAVE_RADIUS-.20}:null,arachnidCave.cameraBlockers);
    unlockedWeaponCount=survival.crafted.spear?3:survival.crafted.hammer?2:1;
    const location=resolveCollision(data.player.x,data.player.z,.46);
    player.position.set(location.x,getGroundHeight(location.x,location.z),location.z);
    playerYaw=data.player.yaw;player.rotation.y=playerYaw;
    replaceItems(healthPacks,data.healthPacks,spawnHealthPack);
    replaceItems(speedBoosts,data.speedBoosts,spawnSpeedBoost);
    for(const enemy of enemies){
        zombieModels.dispose(enemy);spiderModels.dispose(enemy);goblinModels.dispose(enemy);
        removeMesh(enemy.mesh);
    }
    enemies.length=0;
    for(const savedEnemy of data.enemies) {
        spawnEnemy(savedEnemy.type,savedEnemy.spiderVariant);
        const enemy=enemies[enemies.length-1];
        enemy.mesh.position.set(savedEnemy.x,getGroundHeight(savedEnemy.x,savedEnemy.z)+enemy.size/2,savedEnemy.z);
        enemy.hp=Math.min(enemy.maxHp,savedEnemy.hp);enemy.raider=!!savedEnemy.raider;
        if(savedEnemy.type==='spider'&&savedEnemy.spiderVariant==='matriarch'&&savedEnemy.enraged){
            enemy.enraged=true;enemy.speed*=1.2;enemy.spiderVisual?.enrage({intro:false});
        }
        if(savedEnemy.type==='boss'&&savedEnemy.enraged){
            enemy.enraged=true;enemy.speed*=1.28;enemy.mesh.material.color.setHex(0xe24629);
        }
    }
    const desired=Math.min(data.currentWeapon,unlockedWeaponCount-1);
    equipWeapon(desired>0&&!canUseTool(survival,desired===1?'hammer':'spear')?0:desired);
    invulnerableTimer=.75;dashCooldown=0;dashTimer=0;
    // Saves antigos sem goblins próximos também recebem um encontro único,
    // sem apagar ou reposicionar criaturas já existentes.
    ensureVisibleGoblinEncounter();
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
let menuPreview=null;
let menuPreviewRequested=false;
async function prepareMainMenuPreview(){
    if(menuPreviewRequested||gameActive||adventureLoading||document.hidden)return;
    menuPreviewRequested=true;menuPreparing=true;
    const hint=document.getElementById('menu-performance-tip');
    try{
        // Uma compilacao no contexto WebGL REAL da partida, sem terreno, IA ou fisica.
        ensureRenderer();
        hint.textContent='Carregando Seu Madruga e preparando shaders…';
        const ok=await playerRev5.preload();
        if(gameActive||adventureLoading||!ok||!playerRev5.model){if(!gameActive&&!adventureLoading)hint.textContent='Prévia indisponível. O jogo continua funcionando.';return;}
        menuPreview=createMenuPreview({THREE,cloneSkeleton,renderer,model:playerRev5.model});
        await gpuWarmup.prepare(playerRev5.model,'Prévia REV5');
        if(gameActive||adventureLoading)return;
        gameCanvas.style.visibility='visible';
        menuPreview.draw(); // Renderiza UMA vez e nao agenda frames.
        hint.textContent='✓ Personagem e shaders preparados · sem simulação';
    }catch(error){console.warn('[Menu Preview] Opcional:',error);if(!adventureLoading)hint.textContent='Prévia não disponível · jogo pronto para iniciar';}
    finally{menuPreparing=false;}
}
// Carregamento ocioso: apenas REV5, nunca mundo, IA, florestas ou demais inimigos.
const scheduleMenuPreview=()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(()=>void prepareMainMenuPreview(),{timeout:1400});else setTimeout(()=>void prepareMainMenuPreview(),900);};
scheduleMenuPreview();

const pauseMenu = document.getElementById('pause-menu');
const helpPanel=document.getElementById('help-panel');
const campaignPanel=document.getElementById('campaign-hud');
const vitalsPanel=document.getElementById('survival-hud');
function toggleDetails(panel,buttonId){
  const open=panel.classList.toggle('expanded');
  const button=document.getElementById(buttonId);
  button.setAttribute('aria-expanded',String(open));
  button.textContent=buttonId==='status-toggle'?(open?'−':'+'):(open?'Recolher ▴':'Detalhes ▾');
}
document.getElementById('mission-toggle').addEventListener('click',()=>toggleDetails(campaignPanel,'mission-toggle'));
document.getElementById('status-toggle').addEventListener('click',()=>toggleDetails(vitalsPanel,'status-toggle'));
function setHelpOpen(open){
  helpPanel.classList.toggle('hidden',!open);
  if(open&&gameActive){controls.unlock();Object.keys(keys).forEach(key=>{keys[key]=false;});}
  else if(!open&&gameActive&&pauseMenu.classList.contains('hidden'))resumeGame();
}
document.getElementById('help-toggle').addEventListener('click',()=>setHelpOpen(true));
document.getElementById('menu-help').addEventListener('click',()=>setHelpOpen(true));
document.getElementById('help-close').addEventListener('click',()=>setHelpOpen(false));
helpPanel.addEventListener('click',event=>{if(event.target===helpPanel)setHelpOpen(false);});

// Loader exibido somente depois de Iniciar/Continuar; o mundo permanece pausado.
const loadingScreen=document.getElementById('loading-screen');
const loadingTitle=document.getElementById('loading-title');
const loadingDetail=document.getElementById('loading-detail');
const loadingStage=document.getElementById('loading-stage');
const loadingCount=document.getElementById('loading-stage-count');
const loadingBar=document.getElementById('loading-progress');
const loadingFill=document.getElementById('loading-progress-fill');
const loadingPercent=document.getElementById('loading-percent');
const loadingWarning=document.getElementById('loading-warning');
const loadingRetry=document.getElementById('loading-retry');
const loadingEnter=document.getElementById('loading-enter');
let adventureReady=false;
const adventureLoader=createAdventureLoader({
    // RAF seguido de uma tarefa: garante chance real de pintar o progresso.
    yieldToBrowser:()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0))),
    onProgress:({status,label,done,total,percent,optionalFailures,error})=>{
        if(status==='error'){
            loadingTitle.textContent='Não foi possível carregar o mundo';
            loadingDetail.textContent='Seu progresso salvo foi preservado. Recarregue para tentar novamente.';
            loadingStage.textContent=error?.message||'Falha inesperada na preparação';
            loadingScreen.dataset.state='error';
            loadingRetry.classList.remove('hidden');loadingRetry.focus();
            return;
        }
        const previousLabel=loadingStage.textContent;
        loadingStage.textContent=status==='ready'?'Pronto para explorar':label;
        // Ao mudar de etapa, não conservar uma mensagem de download REV5 antiga.
        if(status==='loading' && label!==previousLabel){
            loadingDetail.textContent='Preparando os recursos desta etapa, sem avançar a simulação.';
        }
        loadingCount.textContent=`Etapa ${done} de ${total}`;
        loadingPercent.textContent=`${percent}%`;
        loadingBar.setAttribute('aria-valuenow',String(percent));
        loadingFill.style.width=`${percent}%`;
        if(status==='ready'&&optionalFailures?.length){
            loadingWarning.textContent='Alguns modelos opcionais usarão o visual simplificado.';
            loadingWarning.classList.remove('hidden');
        }
    }
});
loadingRetry.onclick=()=>location.reload();
loadingEnter.onclick=()=>{
    if(!adventureLoading||!adventureReady||gameActive)return;
    adventureReady=false;
    adventureLoading=false;
    loadingScreen.classList.add('hidden');
    loadingScreen.removeAttribute('aria-busy');
    document.body.classList.remove('adventure-loading');
    document.body.classList.add('game-active');
    gameCanvas.style.visibility='visible';
    document.getElementById('consumable-hotbar').classList.remove('hidden');
    consumableHotbarUI.update();
    saveTick=0;
    gameActive=true;
    clock.getDelta();
    // O clique real no botão é necessário para solicitar Pointer Lock e desbloquear áudio.
    initAudio();controls.lock();
    frameDriver.start();
    if(!loadingWarning.classList.contains('hidden'))showToast('⚠ Alguns modelos 3D usam o visual de reserva.');
};
function showPauseMenu(message = '') {
    if (!gameActive || !helpPanel.classList.contains('hidden') || survivalUI.isOpen || storageUI.isOpen || skillsUI.isOpen || workbenchUI.isOpen || buildWheelUI.isOpen) return;
    pauseMenu.classList.remove('hidden');
    if (message) pauseMenu.querySelector('p').textContent = message;
    frameDriver?.wake();
    Object.keys(keys).forEach(key => { keys[key] = false; });
}
function resumeGame() { pauseMenu.classList.add('hidden'); initAudio(); controls.lock(); frameDriver?.wake(); }
document.addEventListener('keydown', e => {
    if(adventureLoading){e.preventDefault();return;}
    if(e.code==='F1'){e.preventDefault();setHelpOpen(helpPanel.classList.contains('hidden'));return;}
    if(!helpPanel.classList.contains('hidden')){if(e.code==='Escape'){e.preventDefault();setHelpOpen(false);}return;}
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    // Com a roda aberta, nenhuma tecla movimenta, ataca ou fabrica inadvertidamente.
    if(buildWheelUI.isOpen){
        if(e.code==='Escape'||e.code==='KeyZ'){e.preventDefault();closeBuildWheel();return;}
        if(buildWheelUI.keydown(e.code))e.preventDefault();
        return;
    }
    if(e.code==='KeyZ' && !e.repeat && gameActive){
        e.preventDefault();
        if(placement)releasePlacement();
        openBuildWheel();return;
    }
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
    if (e.code === 'Escape' && workbenchUI.isOpen) {workbenchUI.close();return;}
    if (e.code === 'Escape' && survivalUI.isOpen) {closeInventory();return;}
    if (e.code === 'Escape' && storageUI.isOpen) {closeStorage();return;}
    if (e.code === 'Escape' && skillsUI.isOpen) {closeSkills();return;}
    if (e.code === 'F3' && !e.repeat) {
        showFps = !showFps;
        fpsDisplay.classList.toggle('hidden', !showFps);
    }
    if (!gameActive || !controls.isLocked || survivalUI.isOpen || storageUI.isOpen || skillsUI.isOpen || workbenchUI.isOpen || e.repeat) return;
    if (e.code === 'Space' && isGrounded) {
        playerNoise(12,'jump');
        verticalVelocity = jumpForce; isGrounded = false; sfx.boost(); playerRev5.jump();
    }
    if (e.code === 'KeyC' && !placement) {
        sneaking=!sneaking;
        showToast(sneaking?'🤫 Modo furtivo: movimentos silenciosos':'👣 Movimento normal: mais rápido e barulhento');
        updateHUD();return;
    }
    if (e.code === 'KeyO'){changeChavesOrder();return;}
    if (e.code === 'KeyJ') combat.attack();
    if (e.code === 'KeyE') combat.special();
    if (e.code === 'KeyQ') doDodge();
    if (e.code === 'Digit1') equipWeapon(0);
    if (e.code === 'Digit2') equipWeapon(1);
    if (e.code === 'Digit3') equipWeapon(2);
    if (e.code === 'KeyP') saveProgress(true);
    if (e.code === 'KeyF') {playerNoise(10,'interaction');harvestNear();}
    if (e.code === 'KeyY') fishNearby();
    if (e.code === 'KeyB') craft('campfire');
    if (e.code === 'KeyH') craft('shelter');
    const hotbarIndex=hotbarIndexFromCode(e.code);
    if (hotbarIndex!==-1) {useHotbarSlot(hotbarIndex);return;}
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
    document.querySelectorAll('.gfx-btn').forEach(b => b.setAttribute('aria-pressed',String(b===activeBtn)));
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
async function beginAdventure(restore=false) {
    // Evita duplo clique e alterações de partida durante o carregamento.
    if(adventureLoading||gameActive)return;
    const save=restore?availableSave:null;
    if(restore&&!save){updateContinueButton();return;}
    adventureLoading=true;
    adventureReady=false;
    loadingEnter.classList.add('hidden');loadingEnter.disabled=true;
    document.body.classList.add('adventure-loading');
    loadingScreen.dataset.state='loading';
    loadingTitle.textContent=save?'Retomando sua sobrevivência':'Preparando sua sobrevivência';
    loadingDetail.textContent=save?`Restaurando Dia ${save.survival.days} · Nível ${save.level}`:
        'Construindo seu mundo e preparando os recursos para jogar.';
    loadingWarning.classList.add('hidden');loadingWarning.textContent='';
    loadingRetry.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    loadingScreen.setAttribute('aria-busy','true');
    document.getElementById('start-btn').disabled=true;
    document.getElementById('load-btn').disabled=true;
    overlay.classList.add('hidden');
    if(placement)releasePlacement();
    buildWheelUI.close();
    menuPreview?.dispose();menuPreview=null;
    gameCanvas.style.visibility='hidden';
    menuPreparing=false;
    if(save){worldSeed=save.seed;graphicsQuality=save.graphicsQuality;}
    zombieSenses.clear();sneaking=false;runningFastNow=false;
    footstepTimer=0;webSlowTimer=0;spawnTimer=15;

    // initWorld() descreve etapas executadas progressivamente somente após o clique.
    const stages=[
        ...(worldInitialized?[]:initWorld()),
        {name:save?'Restaurando inventário e progresso':'Organizando a nova sobrevivência',load:()=>{
            if(save)restoreProgress(save);
            else{hotbarSlots=defaultHotbar();inventorySlots=createBag(survival.inventory);updateHUD();}
        }},
        {name:'Compilando shaders e texturas do cenário',optional:true,load:()=>gpuWarmup.prepare(scene,'Mundo e vegetação')},
        {name:'Preparando Seu Madruga e animações',optional:true,load:()=>playerRev5.preload()},
        {name:'Carregando zumbis e animações',optional:true,load:()=>zombieModels.preload()},
        {name:'Carregando aranhas e animações',optional:true,load:()=>spiderModels.preload()},
        {name:'Carregando goblins e animações',optional:true,load:()=>goblinModels.preload()},
        {name:'Carregando Chaves e animações',optional:true,load:()=>guard.preload()},
        {name:'Preparando o primeiro quadro',load:()=>{
            renderer.render(scene,camera); // Primeiro desenho oculto: evita o pico inicial de compilação.
        }}
    ];
    try{
        await adventureLoader.start(stages);
        // Não apagar o save anterior durante o loading. Um novo checkpoint válido
        // só o substitui em saveProgress(), depois que a partida estiver ativa.
        loadingTitle.textContent='Tudo pronto para sobreviver';
        loadingDetail.textContent='A floresta está preparada. Entre para começar a jogar.';
        loadingScreen.dataset.state='ready';
        loadingScreen.removeAttribute('aria-busy');
        adventureReady=true;
        loadingEnter.disabled=false;loadingEnter.classList.remove('hidden');loadingEnter.focus();
    }catch(error){
        console.error('[Adventure Loading]',error);
        // O loader mostra o erro, oferece recarregar e não inicia física/IA.
        adventureLoading=false;
        adventureReady=false;
        menuPreparing=false;
        loadingScreen.removeAttribute('aria-busy');
    }
}
document.getElementById('start-btn').onclick=()=>void beginAdventure(false);
document.getElementById('load-btn').onclick=()=>void beginAdventure(true);
document.getElementById('save-btn').onclick = () => saveProgress(true);
updateContinueButton();
document.getElementById('resume-btn').onclick = resumeGame;
document.getElementById('restart-btn').onclick = () => location.reload();
document.addEventListener('pointerlockchange', () => {
    document.getElementById('instructions').style.opacity = controls.isLocked ? '0.6' : '1';
    if (controls.isLocked) pauseMenu.classList.add('hidden');
    else if (gameActive && !placement && !survivalUI.isOpen && !storageUI.isOpen && !skillsUI.isOpen && !buildWheelUI.isOpen && helpPanel.classList.contains('hidden')) {saveProgress();showPauseMenu();}
    frameDriver?.wake();
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

let cameraImpact=0;
const combat = createCombatSystem({THREE,scene,player,enemies,weaponTypes,healthPacks,speedBoosts,particles,
    getGroundHeight,resolveCollision,removeMesh,spawnParticle,gainXP,showToast,sfx,
    spawnEnemy,spawnHealthPack,spawnSpeedBoost,advanceQuestIfReady,updateHUD,
    onBossDefeated:()=>{shrine.hideBossTelegraph();showToast('Guardião derrotado! A floresta continua perigosa.');},
    onEnemyKilled:(type,drop,enemy)=>{kills++;if(type==='spider'){
        if(enemy?.spiderVariant==='matriarch'&&arachnidCave.defeatBoss()){
            showToast('🏆 Rainha derrotada! O grande cristal da caverna foi revelado.');
            saveProgress();
        }addResource(survival,'spiderSilk',1);if(Math.random()<.65)addResource(survival,'chitin',1);showToast('🕸 Aranha derrotada · +1 seda');}else if(type.startsWith('zombie')&&Math.random()<.55){addResource(survival,'fiber',1);showToast('🧟 Zumbi derrotado · +1 fibra');}else if(type!=='boss'&&!type.startsWith('zombie')&&Math.random()<.42){addResource(survival,'meat',1);showToast('🥩 +1 carne crua · asse na fogueira');}},
    getWeaponBonus:()=>currentWeapon===2?(survival.crafted.ironSpear?3:0)+(survival.crafted.hardenedSpear?2:0)+(survival.crafted.crystalSpear?3:0):
       currentWeapon===1?(survival.crafted.ironHammer?2:0)+(survival.crafted.spikedHammer?2:0):
       survival.crafted.armoredBroom?1:0,
    onSwing:(range,arc,damage,yaw)=>wildlife.attack(player.position,yaw,range,arc,damage),
    onAttackStart:()=>{playerNoise(24,'attack');playerRev5.setComboStep(combat.comboStep);return playerRev5.attack();},
    onHitFeedback:({hits,step})=>{cameraImpact=Math.min(.045,Math.max(cameraImpact,(step===2?.026:.012)+Math.min(4,hits)*.002));},
    onSpecialStart:()=>{playerNoise(36,'special');return playerRev5.special();},
    onEnemyDamaged:enemy=>{
        alertZombie(enemy,player.position,elapsed);
        if(enemy.spiderVariant==='matriarch'&&enemy.hp>0&&enemy.hp<=enemy.maxHp*.5&&!enemy.enraged){
            enemy.enraged=true;enemy.speed*=1.2;
            enemy.spiderVisual?.enrage();
            enemy.spiderBrain={cooldown:1.65,action:null,actionTime:0,hit:false};
            showToast('⚠ A RAINHA ESTÁ FURIOSA! Sua velocidade aumentou.');
            for(let i=0;i<2&&enemies.length<12;i++){
                spawnEnemy('spider','hunter');const minion=enemies.at(-1);
                const x=CAVE_CENTER.x+(i?2:-2),z=CAVE_CENTER.z+2;
                minion.mesh.position.set(x,getGroundHeight(x,z)+minion.size/2,z);
            }
        }
    },
    onWeaponHit:()=>{const tool=currentWeapon===1?'hammer':currentWeapon===2?'spear':null;
        if(!tool)return;
        if(survival.crafted.reinforcedGrip){
          survival.gripStrikes=(survival.gripStrikes+1)%2;
          if(survival.gripStrikes===1)return;
        }
        if(useTool(survival,tool,1)&&!canUseTool(survival,tool)){
          equipWeapon(0);showToast('⚠ Arma quebrada! Repare na bancada.');
        }},
    getLevel:()=>level,getWeaponIndex:()=>currentWeapon,getPlayerYaw:()=>playerYaw,
    isGameActive:()=>gameActive,isLocked:()=>controls.isLocked});

const enemyAI = createEnemyAI({enemies,player,getGroundHeight,resolveCollision,
    showBossTelegraph:shrine.showBossTelegraph,hideBossTelegraph:shrine.hideBossTelegraph,
    damagePlayer,spawnParticle,throwProjectile:projectileSystem.throwProjectile,sfx,
    isGameActive:()=>gameActive,hasLineOfSight:(from,to)=>!buildings.blocksLine(from,to),
    spiderAI,
    getPlayerPerception:()=>({sounds:zombieSenses,night:isNight(survival),sneaking,sprinting:runningFastNow}),
    getRaidTarget:(pos)=>raidTarget(buildings.structures,pos,player.position),
    getGuard:()=>guard.recruited&&guard.alive?guard.position:null,
    onGuardDamage:amount=>{if(guard.damage(amount)&&!guard.alive){showToast('💔 O Chaves caiu! Reanime-o com comida e água.');saveProgress();}},
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
function nearbyCraftChests(){
    return buildings.structures.filter(b=>b.type==='chest' && b.items &&
      Math.hypot(b.x-player.position.x,b.z-player.position.z)<=6);
}
function constructionCost(type){
    return recipeCost(type,RECIPES[type].cost,survival.skills);
}
function hasConstructionMaterials(type,cost=constructionCost(type)){
    return craftAvailability(survival,type,{cost,chests:nearbyCraftChests()}).ok;
}
function updatePlacementPreview(){
    if(!placement||!placementGhost)return;
    const status=placementStatus(placement,player.position,playerYaw,
       (...args)=>buildings.canPlace(...args),
       type=>hasConstructionMaterials(type),
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
    if(!hasConstructionMaterials(recipe,cost)){showToast('Materiais insuficientes na mochila e nos baús próximos.');return false;}
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
    let reservation=null;
    const result=commitPlacement({
      plan:placement,position:player.position,yaw:playerYaw,structures:buildings.structures,
      canPlace:(...args)=>buildings.canPlace(...args),
      canAfford:type=>hasConstructionMaterials(type,cost),
      spend:()=>{reservation=reserveCraftMaterials(survival,cost,nearbyCraftChests());return reservation.ok;},
      place:c=>buildings.place(placement.type,c.x,c.z,c.rotation||0,{preserveCoordinates:!!c.snapped}),
      refund:()=>reservation?.refund(),
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
// A roda não fabrica nem debita recursos: reutiliza startPlacement/confirmPlacement.
const buildWheelUI=createBuildWheelUI({
  getAvailability:type=>{
    const cost=constructionCost(type);
    const stock=Object.fromEntries(Object.keys(cost).map(key=>[
      key,(survival.inventory[key]||0)+nearbyCraftChests().reduce((sum,chest)=>sum+(chest.items[key]||0),0)]));
    const enough=hasConstructionMaterials(type,cost);
    const limit=buildings.structures.length>=MAX_STRUCTURES;
    return {cost,stock,ok:gameActive&&enough&&!limit,
      reason:limit?'Limite de construções atingido':enough?'Inicie a partida':'Materiais insuficientes'};
  },
  onSelect:type=>{
    if(!BUILD_WHEEL_TYPES.includes(type)||!gameActive)return false;
    buildWheelUI.close();
    const started=startPlacement(type);
    if(!started)buildWheelUI.open();
    return started;
  },
  onClose:()=>closeBuildWheel()
});
function openBuildWheel(){
  if(!gameActive||survivalUI.isOpen||storageUI.isOpen||skillsUI.isOpen||workbenchUI.isOpen)return false;
  if(placement)releasePlacement();
  buildWheelUI.open();
  Object.keys(keys).forEach(key=>{keys[key]=false;});
  controls.unlock();pauseMenu.classList.add('hidden');
  return true;
}
function closeBuildWheel(){
  if(!buildWheelUI.isOpen)return false;
  buildWheelUI.close();
  if(gameActive)resumeGame();
  return true;
}
function toggleBuildWheel(){return buildWheelUI.isOpen?closeBuildWheel():openBuildWheel();}
document.getElementById('build-toggle').addEventListener('click',toggleBuildWheel);
document.getElementById('pause-build-btn').addEventListener('click',openBuildWheel);
const skillsUI=createSkillsUI({getState:()=>survival,onClose:closeSkills});
let selectedInventoryItem=null;
function chooseInventoryItem(key){
  selectedInventoryItem=key;
  consumableHotbarUI.update();
}
function quickAssignInventoryItem(key){
  const index=getQuickSlot(hotbarSlots,key);
  if(index<0){showToast('Barra cheia. Selecione um slot 4–9 para substituir.');return false;}
  const success=configureHotbar(index,key);
  if(success){selectedInventoryItem=null;survivalUI.update(true);showToast(`✅ ${key} definido no atalho ${index+4}`);}
  return success;
}
const consumableHotbarUI=createConsumableHotbarUI({
  getSlots:()=>hotbarSlots,getInventory:()=>survival.inventory,
  onUse:useHotbarSlot,onAssign:configureHotbar,
  getSelectedItem:()=>selectedInventoryItem,
  onSelectSlot:index=>{
    if(!canPlaceOnHotbar(selectedInventoryItem))return false;
    const success=configureHotbar(index,selectedInventoryItem);
    if(success){selectedInventoryItem=null;survivalUI.update(true);consumableHotbarUI.update();}
    return success;
  },
  onConfigured:()=>{selectedInventoryItem=null;survivalUI.update(true);consumableHotbarUI.update();}
});
function updateBagFromInventory(){
  inventorySlots=reconcileBag(inventorySlots,survival.inventory) || createBag(survival.inventory);
  return inventorySlots;
}
function changeBagPosition(from,to,mode='move',amount){
  const before=updateBagFromInventory();
  const result=mode==='split'?(amount===undefined?splitBagStack(before,from,to):moveBagStack(before,from,to,amount)):
    moveBagStack(before,from,to);
  if(!result||!validBag(result,survival.inventory))return false;
  inventorySlots=result;saveProgress();return true;
}
function organizeBag(){
  const result=sortBag(updateBagFromInventory());
  if(!result||!validBag(result,survival.inventory))return false;
  inventorySlots=result;saveProgress();return true;
}
function closestAccessibleChest(){
  const nearby=nearbyCraftChests();
  nearby.sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z));
  return nearby[0]||null;
}
function commitBagChestPlan(chest,plan){
  if(!plan)return false;
  // Protege contra baú destruído ou movido depois da escolha.
  if(!gameActive||!buildings.structures.includes(chest)||closestAccessibleChest()!==chest)return false;
  Object.assign(survival.inventory,plan.inventory);
  chest.items=plan.items;inventorySlots=plan.bag;
  sfx.collect();saveProgress();updateHUD();return true;
}
function storeSelectedStack(index,amount){
  const chest=closestAccessibleChest();if(!chest)return false;
  const plan=planStoreBagStack(survival.inventory,updateBagFromInventory(),chest.items,index,amount);
  return commitBagChestPlan(chest,plan);
}
function withdrawChestResource(key,amount){
  const chest=closestAccessibleChest();if(!chest)return false;
  const plan=planTakeFromChest(survival.inventory,updateBagFromInventory(),chest.items,key,amount);
  return commitBagChestPlan(chest,plan);
}
function toggleEquippedGear(key){
  if(!gameActive||!survival.crafted)return false;
  const next=!isGearEquipped(survival,key);
  if(!setGearEquipped(survival,key,next))return false;
  updateHUD();saveProgress();showToast(next?'🛡 Equipamento vestido':'🎒 Equipamento retirado');return true;
}
const survivalUI=createSurvivalUI({getState:()=>survival,onCraft:craft,onConsume:consume,onToggleGear:toggleEquippedGear,
    getBag:updateBagFromInventory,onBagMove:changeBagPosition,onBagSort:organizeBag,
    getNearbyChest:closestAccessibleChest,onBagStore:storeSelectedStack,onChestTake:withdrawChestResource,
    onClose:closeInventory,onRotate:rotateBuild,onDismantle:deconstructNear,onRepair:()=>repairNear(),onRepairKit:()=>repairNear(true),onFish:fishNearby,
    getRotation:()=>rotationOffset*90,getCanCraft:canCraftAtPosition,
    getCraftStatus:(id,cost)=>craftingStatus(id,cost),
    getRecipeCost:id=>recipeCost(id,RECIPES[id]?.cost,survival.skills),
    getSelectedItem:()=>selectedInventoryItem,onSelectItem:chooseInventoryItem,onQuickAssign:quickAssignInventoryItem});
const workbenchUI=createWorkbenchUI({getStatus:(id)=>craftingStatus(id),onCraft:(id)=>craft(id),
    onClose:()=>{if(gameActive)resumeGame();}});
const storageUI=createStorageUI({getInventory:()=>survival.inventory,getBag:updateBagFromInventory,
 onTransfer:(chest,key,direction,amount,index)=>{
  if(!gameActive||!buildings.structures.includes(chest)||closestAccessibleChest()!==chest)return false;
  const bag=updateBagFromInventory();
  const source=direction==='store'?(Number.isInteger(index)?index:bag.findIndex(s=>s?.item===key)):-1;
  const plan=direction==='store'?planStoreBagStack(survival.inventory,bag,chest.items,source,amount):
    planTakeFromChest(survival.inventory,bag,chest.items,key,amount);
  if(!commitBagChestPlan(chest,plan)){showToast('⚠ Estoque insuficiente ou baú cheio.');return false;}
  return true;
 },onClose:closeStorage});
function openWorkbench(){
    if(!gameActive||survivalUI.isOpen||storageUI.isOpen||skillsUI.isOpen||workbenchUI.isOpen)return;
    if(!buildings.near('workbench',player.position,6))return;
    if(placement)releasePlacement();
    workbenchUI.open();controls.unlock();pauseMenu.classList.add('hidden');
}
function closeStorage(){
    if(!storageUI.isOpen)return;
    buildings.setChestOpen(storageUI.chest,false);storageUI.close();resumeGame();
}
function interactWithBuilding(){
    const item=buildings.nearest(player.position,2.85);
    if(!item)return false;
    if(item.type==='workbench'){openWorkbench();return true;}
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
function repairNear(useKit=false){
    const candidate=buildings.structures.filter(s=>s.hp<maxBuildingHP(s.type)&&Math.hypot(s.x-player.position.x,s.z-player.position.z)<3.5)
      .sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0];
    if(!candidate){showToast('Nenhuma construção danificada ao alcance.');return false;}
    if(!(useKit?buildings.repairKit(candidate,survival):buildings.repair(candidate,survival))){
        showToast(useKit?'Precisa fabricar um kit de manutenção na bancada.':'Precisa de 1 madeira ou pedra para reparar.');return false;}
    earnSkill('building',useKit?18:8);
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
    if(arachnidCave.nearPortal(player.position)){
        const where=arachnidCave.enter();if(!where)return false;
        cameraRig.setArena({...CAVE_CENTER,radius:CAVE_RADIUS-.20},arachnidCave.cameraBlockers);
        player.position.set(where.x,getGroundHeight(where.x,where.z),where.z);
        showToast('⛏ Caverna das Aranhas! Procure cristais e enfrente a Rainha.');
        if(!arachnidCave.state.bossDefeated&&!enemies.some(e=>e.spiderVariant==='matriarch')){
            spawnEnemy('spider','matriarch');const queen=enemies.at(-1);
            queen.mesh.position.set(CAVE_CENTER.x+4,getGroundHeight(CAVE_CENTER.x+4,CAVE_CENTER.z)+queen.size/2,CAVE_CENTER.z);
        }
        saveProgress();updateHUD();return true;
    }
    if(arachnidCave.nearExit(player.position)){
        const where=arachnidCave.leave();cameraRig.setArena(null);
        player.position.set(where.x,getGroundHeight(where.x,where.z),where.z);
        showToast('🌲 Você voltou à floresta.');saveProgress();updateHUD();return true;
    }
    if(arachnidCave.nearestCrystal(player.position)){
        const found=arachnidCave.harvest(player.position,survival.inventory);
        if(!found.ok){showToast('🎒 '+found.reason);return false;}
        showToast(`💎 +${found.amount} cristal subterrâneo`);earnSkill('mining',35);sfx.collect();saveProgress();updateHUD();return true;
    }
    if(arachnidCave.inside){showToast('Explore os cristais ou volte ao portal de saída [F].');return false;}
    if(interactWithBuilding())return true;
    if(guard.nearby(player.position)){
        if(guard.recruited&&guard.alive)return changeChavesOrder();
        showToast(guard.interact(survival.inventory));saveProgress();updateHUD();return true;
    }
    if(spiderNests.nearest(player.position)){
        const result=spiderNests.harvest(player.position,survival.inventory);
        if(!result.ok){showToast('🎒 '+result.reason);return false;}
        playerNoise(17,'nest');earnSkill('gathering',20);sfx.collect();
        showToast(`🕸 Ovo recolhido: +${result.items.spiderSilk} seda · +${result.items.chitin} quitina`);
        saveProgress();updateHUD();return true;
    }
    if(exploration.nearest(player.position)){
        const loot=exploration.search(player.position,survival.inventory);
        if(!loot.ok){showToast(`🎒 ${loot.reason}`);return false;}
        const items=Object.entries(loot.items).map(([key,count])=>
          `+${count} ${RESOURCES[key]?.label||key}`).join(' · ');
        playerNoise(12,'search');
        earnSkill('gathering',16);sfx.collect();
        showToast(`📦 ${loot.label}: ${items}`);updateHUD();saveProgress();return true;
    }
    const result=resources.harvest(player.position,canUseTool(survival,'pickaxe'));
    if(!result){
        if(guard.nearby(player.position)){return changeChavesOrder();}
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
function useHotbarSlot(index){
  if(!gameActive || placement || !controls.isLocked || survivalUI.isOpen || storageUI.isOpen || skillsUI.isOpen || workbenchUI.isOpen ||
     !document.getElementById('pause-menu').classList.contains('hidden'))return false;
  const item=hotbarSlots[index];
  return item?consume(item):false;
}
function configureHotbar(index,item){
  const changed=assignHotbarSlot(hotbarSlots,index,item);
  if(!changed)return false;
  hotbarSlots=changed;
  consumableHotbarUI.update();saveProgress();return true;
}
function consume(type){
  if(!gameActive)return false;
  if(type==='medicalKit'){
    if((survival.inventory.medicalKit||0)<1){showToast('🧰 Nenhum kit médico disponível');return false;}
    if(health>=maxHealth&&poisonTimer<=0){showToast('❤️ Vida cheia e nenhum veneno ativo');return false;}
    survival.inventory.medicalKit--;health=Math.min(maxHealth,health+65);poisonTimer=0;
    sfx.heal();showToast('🧰 Kit médico: até +65 vida e veneno eliminado');updateHUD();saveProgress();return true;
  }
  if(type==='silkDressing'){
    if((survival.inventory.silkDressing||0)<1){showToast('🕸 Sem curativos de seda');return false;}
    if(health>=maxHealth&&webSlowTimer<=0){showToast('❤️ Sem feridas ou teia para remover');return false;}
    survival.inventory.silkDressing--;health=Math.min(maxHealth,health+40);webSlowTimer=0;
    sfx.heal();showToast('🕸 Curativo: +40 vida e teia removida');updateHUD();saveProgress();return true;
  }
  if(type==='bandage'){
    if((survival.inventory.bandage||0)<1){showToast('🩹 Sem bandagens na mochila');return false}
    if(health>=maxHealth){showToast('❤️ Vida já está no máximo');return false}
    survival.inventory.bandage--;
    health=Math.min(maxHealth,health+25);
    sfx.heal();showToast('🩹 Bandagem aplicada: +25 de vida');updateHUD();saveProgress();return true;
  }
  if(!useConsumable(survival,type)){
      showToast('Você não tem este alimento ou água na mochila');return false;
  }
  if(type==='water')poisonTimer=Math.max(0,poisonTimer-3);
  sfx.heal();showToast(type==='water'?'💧 Sede recuperada!':'🍖 Fome recuperada!');
  updateHUD();saveProgress();return true;
}
function craftingStatus(recipe,cost=recipeCost(recipe,RECIPES[recipe]?.cost,survival.skills)){
  if(!gameActive)return {ok:false,reason:'Inicie o jogo para fabricar',maxBatch:0,missing:[]};
  return craftAvailability(survival,recipe,{
    cost,chests:nearbyCraftChests(),workbench:buildings.near('workbench',player.position,6),
    campfire:buildings.near('campfire',player.position,6),
    yieldCount:['cooked','grilledFish','stew'].includes(recipe)?cookedYield(skillLevel(survival,'crafting')):1
  });
}
function canCraftAtPosition(recipe){return craftingStatus(recipe).ok}
function craft(recipe,quantity=1){
  if(!gameActive||!RECIPES[recipe])return false;
  // Receitas avançadas só podem ser confirmadas pela tela da bancada.
  if(CRAFT_STATIONS[recipe]==='workbench'&&(!workbenchUI.isOpen||!buildings.near('workbench',player.position,6))){
    showToast('⚠ Use uma bancada próxima [F] para esta receita.');return false;
  }
  if(isStructureRecipe(recipe)){
    if(quantity!==1)return false;
    return startPlacement(recipe);
  }
  const cost=recipeCost(recipe,RECIPES[recipe].cost,survival.skills);
  const status=craftingStatus(recipe,cost);
  if(!status.ok){showToast('⚠ '+status.reason);return false}
  const result=craftItem(survival,recipe,quantity,{
    cost,chests:nearbyCraftChests(),workbench:buildings.near('workbench',player.position,6),
    campfire:buildings.near('campfire',player.position,6),
    yieldCount:['cooked','grilledFish','stew'].includes(recipe)?cookedYield(skillLevel(survival,'crafting')):1
  });
  if(!result.ok){showToast('⚠ '+result.reason);return false}
  equipNewCraft(survival,recipe);
  if(recipe==='hammer'){unlockedWeaponCount=Math.max(2,unlockedWeaponCount);equipWeapon(1)}
  if(recipe==='spear'){unlockedWeaponCount=3;equipWeapon(2)}
  if(['ironSpear','ironHammer','reinforcedGrip','spikedHammer','hardenedSpear','armoredBroom'].includes(recipe))setWeaponUpgrades(survival.crafted);
  const cooking=['cooked','grilledFish','stew'].includes(recipe);
  earnSkill('crafting',Math.min(300,(cooking?14:22)*quantity));
  sfx.boost();
  showToast('🔨 '+RECIPES[recipe].label+' · '+(result.produced>1?'+'+result.produced:'fabricado')+'!');
  updateHUD();saveProgress();return true;
}
function openInventory(){
    if(!gameActive||survivalUI.isOpen||storageUI.isOpen||skillsUI.isOpen||workbenchUI.isOpen)return;
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
const touchControls=createTouchControls({canvas:gameCanvas,enabled:touchEnabled,
    onLook:(dx,dy)=>{if(!gameActive||!touchPlaying)return;
      playerYaw-=dx*.006;mousePitch=THREE.MathUtils.clamp(mousePitch+dy*.005,-.30,.76);},
    onKey:(code,down)=>{document.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{
        code,bubbles:true,cancelable:true}));},
    onPause:()=>{if(gameActive){if(placement)releasePlacement();if(buildWheelUI.isOpen)buildWheelUI.close();controls.unlock();touchControls.release();showPauseMenu();saveProgress();}},
    onInventory:toggleInventory,onBuild:toggleBuildWheel});
document.addEventListener('mousedown', e => {
    if(e.button!==0||e.target!==gameCanvas||!controls.isLocked)return;
    if(placement)confirmPlacement();else combat.attack();
});

// ========== MINIMAPA ==========
const drawMinimap = createMinimap(document.getElementById('minimap'), () => ({
  player, treeColliders, rockColliders, collectibles:[], healthPacks, speedBoosts,
  enemies, shrinePosition, playerYaw, resources:resources.nodes, structures:buildings.structures,
  explorationSites:exploration.sites,spiderNests:spiderNests.nests,
  caveEntrance:arachnidCave.entry(),caveInside:arachnidCave.inside,
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
    // Apenas o driver agenda quadros; a tela inicial não cria um loop RAF.
    const dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) return;
    const running = gameActive && controls.isLocked && health > 0;
    // Pausa: o driver agenda 4 FPS via timer, evitando RAF contínuo a 60/144 Hz.
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
        const runningFast=requestedSprint && !sneaking && survival.stamina>4 && survival.hunger>5 && survival.thirst>5;
        runningFastNow=runningFast;
        const beforeDay=survival.days;
        const vitals=advanceSurvival(survival,dt,{sprinting:runningFast,moving:moveDir.lengthSq()>.01,
            nearFire:buildings.near('campfire',player.position,7),sheltered:buildings.near('shelter',player.position,5)||buildings.covered(player.position),
            survivalLevel:skillLevel(survival,'survival'),trailBoots:isGearEquipped(survival,'boots')});
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
        const currentSpeed=(baseSpeed+(level-1)*.15)*speedBoost*(runningFast?runMultiplier:1)*
            (sneaking?.43:1)*(poisonTimer>0?.76:1)*(webSlowTimer>0?.52:1);
        const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
        dashCooldown=Math.max(0,dashCooldown-dt);
        dashTimer=Math.max(0,dashTimer-dt);
        const targetVX = dashTimer>0 ? dashDirection.x*19 : (moveDir.x*cos + moveDir.z*sin) * currentSpeed;
        const targetVZ = dashTimer>0 ? dashDirection.z*19 : (-moveDir.x*sin + moveDir.z*cos) * currentSpeed;
        const moveBlend = 1 - Math.exp(-13 * dt);
        velocity.x += (targetVX - velocity.x)*moveBlend;
        velocity.z += (targetVZ - velocity.z)*moveBlend;

        // Deslizar por paredes/troncos: eixos tratados separadamente.
        const beforeMoveX=player.position.x,beforeMoveZ=player.position.z;
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
        const realMovementSpeed=Math.hypot(player.position.x-beforeMoveX,player.position.z-beforeMoveZ)/Math.max(dt,1e-5);
        footstepTimer-=dt;
        if(realMovementSpeed>.55 && moveDir.lengthSq()>.01 && isGrounded){
            if(footstepTimer<=0){
                playerNoise(sneaking?3:runningFast?22:9,'footsteps');
                footstepTimer=sneaking?1.15:runningFast?.40:.68;
            }
        }else footstepTimer=Math.max(footstepTimer,.12);
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
        // O esqueleto REV5 controla sua própria animação. Mover o punho
        // procedural nesse modo desorientaria a arma presa ao osso do GLB.
        if(!playerRev5.loaded){
          if(combat.isAttacking){
            const progress=THREE.MathUtils.clamp(1-combat.attackAnimTimer/combat.attackAnimDuration,0,1);
            const pose=samplePlayerAttackPose(combat.attackWeaponIndex,progress,combat.comboStep);
            rightArm.rotation.set(pose.armX,pose.armY,pose.armZ);
            leftArm.rotation.x=THREE.MathUtils.lerp(leftArm.rotation.x,pose.leftArmX,.8);
            weapon.rotation.x=pose.gripX;weapon.rotation.z=pose.gripZ;
            torso.rotation.y=pose.torsoY;
          }else{
            rightArm.rotation.y=THREE.MathUtils.lerp(rightArm.rotation.y,0,blend);
            rightArm.rotation.z=THREE.MathUtils.lerp(rightArm.rotation.z,-.08,blend);
            torso.rotation.y=THREE.MathUtils.lerp(torso.rotation.y,0,blend);
            const grip=idleGripPose(currentWeapon);
            weapon.rotation.x=THREE.MathUtils.lerp(weapon.rotation.x,grip.x,blend);
            weapon.rotation.z=THREE.MathUtils.lerp(weapon.rotation.z,grip.z,blend);
          }
        }
        playerRev5.update(dt,{speed:realMovementSpeed,sprinting:runningFast,grounded:isGrounded,
          attackProgress:combat.isAttacking?THREE.MathUtils.clamp(1-combat.attackAnimTimer/combat.attackAnimDuration,0,1):null,
          attackStep:combat.comboStep});
        webSlowTimer=Math.max(0,webSlowTimer-dt);
        invulnerableTimer = Math.max(0, invulnerableTimer-dt);
        player.visible = invulnerableTimer<=0 || Math.floor(invulnerableTimer*12)%2 === 0;

        if (speedBoostTimer > 0) {
            speedBoostTimer = Math.max(0,speedBoostTimer-dt);
            if (speedBoostTimer===0) speedBoost = 1;
        }

        // Árvore distante fica invisível, mas mantém seu collider físico.
        forest.updateVisibility(player.position,graphicsQuality,dt);
        cameraImpact=Math.max(0,cameraImpact-dt*.25);
        cameraRig.update(dt,playerYaw,mousePitch+cameraImpact);

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

        zombieSenses.prune(elapsed);
        resources.update(dt,player.position,graphicsQuality);
        for(const event of exploration.update(player.position,graphicsQuality)){
            if(event.type==='discovered'){showToast(`🗺 Descoberto: ${event.site.label}. Vasculhe os móveis com F!`);saveProgress();}
            if(event.type==='danger'){
                showToast(`⚠ ${event.site.label}: infectados rondam a região!`);
                for(let i=0;i<event.site.threat&&enemies.length<10;i++){
                    for(let attempt=0;attempt<12;attempt++){
                        const angle=Math.random()*Math.PI*2,d=8+Math.random()*3;
                        const x=event.site.x+Math.cos(angle)*d,z=event.site.z+Math.sin(angle)*d;
                        if(!isPositionFree(x,z,.85)||Math.hypot(x-player.position.x,z-player.position.z)<7)continue;
                        const useSpider=i===0&&event.site.threat>=2;
                        spawnEnemy(useSpider?'spider':'zombie',useSpider?chooseSpiderVariant({day:survival.days,threat:event.site.threat,night:vitals.night,roll:Math.random()}):undefined);
                        const spawned=enemies[enemies.length-1];
                        spawned.mesh.position.set(x,getGroundHeight(x,z)+spawned.size/2,z);break;
                    }
                }
                saveProgress();
            }
        }
        for(const event of spiderNests.update(dt,player.position,{
            canHatch:enemies.length<11&&enemies.filter(e=>e.type==='spider').length<4,
            canTrip:invulnerableTimer<=0&&dashTimer<=0})){
            if(event.type==='hatch'){
                spawnEnemy('spider',event.variant);
                const spawned=enemies[enemies.length-1];
                const pos=resolveCollision(event.x+1.6,event.z+1.4,spawned.size*.36);
                spawned.mesh.position.set(pos.x,getGroundHeight(pos.x,pos.z)+spawned.size/2,pos.z);
                showToast('⚠ Ovos eclodiram! Uma aranha saiu do ninho.');saveProgress();
            }else if(event.type==='web'){
                webSlowTimer=Math.max(webSlowTimer,event.seconds);
                showToast('🕸 Teia no chão! Movimento reduzido.');
            }
        }
        buildings.update(elapsed,dt);
        wildlife.update(dt,player.position,graphicsQuality);
        guard.update(dt,elapsed,player.position);
        enemyAI.update(dt,elapsed);
        zombieModels.updateCorpses(dt,removeMesh);
        spiderModels.updateCorpses(dt,removeMesh);
        goblinModels.updateCorpses(dt,removeMesh);
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
            const spawnPlan=ambientSpawnPlan({night:vitals.night,wave,random:Math.random()});
            spawnTimer=spawnPlan.delay;
            if (enemies.length<spawnPlan.cap) {
                const r=Math.random(),spawnSpider=r<.08&&survival.days>=2&&enemies.filter(e=>e.type==='spider').length<2;
                const type=spawnSpider?'spider':vitals.night ? (r<.85?chooseZombieType({night:true,day:survival.days,roll:Math.random()}):r<.94?'fast':'tank') : (r<.75?chooseZombieType({night:false,day:survival.days,roll:Math.random()}):r<.9?'normal':'fast');
                spawnEnemy(type,spawnSpider?chooseSpiderVariant({day:survival.days,night:vitals.night,roll:Math.random()}):undefined);
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
        sun.intensity=arachnidCave.inside?.08:(.13+intensity*1.35)*(1-graveAtmosphere*.47);
        ambient.intensity=arachnidCave.inside?.18:(.12+intensity*.49)*(1-graveAtmosphere*.30);
        scene.background.setHSL(.59,.38-graveAtmosphere*.21,.065+intensity*.55-graveAtmosphere*.075);
        scene.fog.density=arachnidCave.inside?.025:(graphicsQuality==='low'?.012:graphicsQuality==='high'?.006:.008);
        if(arachnidCave.inside){scene.background.setHex(0x130e20);scene.fog.color.setHex(0x1d1828);}
        else scene.fog.color.copy(scene.background);
        arachnidCave.update(elapsed,enemies.find(e=>e.spiderVariant==='matriarch'&&e.hp>0));

        shrine.update(dt,elapsed);
        combat.tickEffects(dt);
    }
    if (showFps) {
        fpsTime += dt; fpsFrames++;
        if (fpsTime > .75) {
            fpsDisplay.textContent = `FPS: ${Math.round(fpsFrames/fpsTime)} · Draw calls: ${renderer.info.render.calls} · Árvores: ${forest.visibilityStats.visibleTrees}/${forest.visibilityStats.totalTrees} · Geom. reutilizadas: ${spawnEnemy.geometryStats().reused}`;
            fpsTime=0; fpsFrames=0;
        }
    }
    minimapTick += dt;
    if (minimapTick >= 0.10) { minimapTick = 0; drawMinimap(); }
    renderer.render(scene,camera);
}

function loseGame() {
    playerRev5.die();
    if(placement)releasePlacement();
    gameActive = false;
    // Permitir retomar o último checkpoint após morrer.
    sfx.lose();
    document.getElementById('go-title').textContent = 'Fim da sobrevivência';
    document.getElementById('go-title').style.color = '#e74c3c';
    document.getElementById('go-msg').textContent = `Sobreviveu até o Dia ${survival.days} e derrotou ${kills} criaturas. Recomece para tentar durar mais!`;
    document.getElementById('gameover').classList.remove('hidden');
    controls.unlock();
    frameDriver?.stop();
}

// Se algum subsistema lançar no RAF, pare a simulação e preserve o último
// checkpoint. O erro fica visível e o jogador pode voltar ao menu com segurança.
function recoverFromFrameError(error){
    console.error('[Madruga Survival] Falha durante quadro do jogo:',error);
    gameActive=false;
    frameDriver?.stop();
    Object.keys(keys).forEach(key=>{keys[key]=false;});
    controls.unlock();
    const hasCheckpoint=!!readSave(progressStorage);
    document.getElementById('go-title').textContent='Partida interrompida';
    document.getElementById('go-title').style.color='#f7bf83';
    document.getElementById('go-msg').textContent=hasCheckpoint?
        'Um erro interrompeu o jogo. O último checkpoint salvo está preservado; volte ao menu para continuar.':
        'Um erro interrompeu o jogo. Volte ao menu para tentar novamente.';
    document.getElementById('restart-btn').textContent='↻ Voltar ao menu';
    document.getElementById('gameover').classList.remove('hidden');
}

window.addEventListener('pagehide',()=>saveProgress());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveProgress();frameDriver?.wake();});
window.addEventListener('focus',()=>frameDriver?.wake());

// Menu principal: nenhum requestAnimationFrame, timer recorrente ou download GLB.
// O render começa exclusivamente após Iniciar/Retomar e suspende em abas ocultas.
frameDriver=createFrameDriver({
    requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:id=>cancelAnimationFrame(id),
    setTimer:(callback,ms)=>setTimeout(callback,ms),
    clearTimer:id=>clearTimeout(id),
    getMode:()=>!gameActive||document.hidden?'off':controls.isLocked&&health>0?'play':'pause',
    onFrame:animate,
    onError:recoverFromFrameError
});
updateHUD();
window.__madrugaReady = true;

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer?.setSize(innerWidth, innerHeight);
    if(!gameActive&&!adventureLoading&&menuPreview&&!document.hidden)menuPreview.draw();
});
