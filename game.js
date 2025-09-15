import * as THREE from "three"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import Stats from 'three/addons/libs/stats.module.js';
import { add, cameraFar, directPointLight, orthographicDepthToViewZ, texture, textureLoad } from "three/tsl";
import { ThreeMFLoader, VerticalTiltShiftShader } from "three/examples/jsm/Addons.js";
import { sortedArray } from "three/src/animation/AnimationUtils.js";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { update } from "three/examples/jsm/libs/tween.module.js";
import { Box3, Clock } from "three/webgpu";
import VelocityNode from "three/src/nodes/accessors/VelocityNode.js";
import {gsap} from "gsap"
import { HUD } from "./HUD";
const {sceneHUD, orthoCamera, hotbarSquare} = HUD()
let {hotbarPos} = HUD()

const loader = new GLTFLoader()


//textures
const textureLoader = new THREE.TextureLoader();

//scene init
const scene = new THREE.Scene(); 
//clock
const clock = new THREE.Clock();

//stats ( for performance display )
const stats = Stats();
document.body.appendChild(stats.dom)

//axeHelper
const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.set(0, 0, 0);
scene.add(axesHelper);

//cam
const playerCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,2000);

//pointer
const controls = new PointerLockControls(playerCamera,document.body)
controls.minPolarAngle = Math.PI/180
controls.maxPolarAngle = Math.PI - Math.PI*2/360// 179 degres 

document.addEventListener("click",()=>{
    controls.lock()
})

//render
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setAnimationLoop(animate)
const canvas = renderer.domElement
canvas.tabIndex = 0
document.body.appendChild(canvas)



class Block {
    constructor(x,y,z) {
        this.x = x
        this.y = y
        this.z = z
        this.mesh = null
        this.box = null
        this.helper = null
        this.displayHelper = false
    }
    create(sameTexture = true,topTexture = "",bottomTexture = "",sideTexture = ""){
        function loadColorTexture(path) {
                const texture = textureLoader.load(path)
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.magFilter = THREE.NearestFilter // prevent blur effect
                texture.minFilter = THREE.NearestFilter
                texture.generateMipmaps = false
                return texture
            } 
        const geometry = new THREE.BoxGeometry(1,1,1);
        geometry.translate(0.5,0.5,0.5)

        if (sameTexture) {
            const material = new THREE.MeshBasicMaterial({
                map: loadColorTexture(topTexture)
            })
            this.mesh = new THREE.Mesh(geometry,material)
        } else {
            const materials = [
                new THREE.MeshBasicMaterial({map: loadColorTexture(sideTexture)}),
                new THREE.MeshBasicMaterial({map: loadColorTexture(sideTexture)}),
                (topTexture.includes("grass_block_top.png"))
                ? new THREE.MeshBasicMaterial({map:loadColorTexture(topTexture),color:"#00ff00"})
                : new THREE.MeshBasicMaterial({map:loadColorTexture(topTexture)})
                ,
                new THREE.MeshBasicMaterial({map: loadColorTexture(bottomTexture)}),
                new THREE.MeshBasicMaterial({map: loadColorTexture(sideTexture)}),
                new THREE.MeshBasicMaterial({map: loadColorTexture(sideTexture)}),
            ]  
            this.mesh = new THREE.Mesh(geometry,materials)
        }
        this.mesh.position.set(this.x,this.y,this.z)
        scene.add(this.mesh)
        this.box = new THREE.Box3().setFromObject(this.mesh)
        this.helper = new THREE.Box3Helper(this.box,"#00ffff")
        collisionCubes.push(this)
    }
}
//chunk generation
class Chunk {
    constructor(originX,originY,originZ){
        this.originX = originX
        this.originY = originY
        this.originZ = originZ
        //2d map
        this.map = []
        this.chunkSize = 16;
        this.create()
    }
    //chunk is 16x16
    //we need chunk map (matrice)
    create(){
        for (let x = 0; x <= 16; x ++) {
            this.map[x] = []
            for (let z = 0;z <=16;z ++){
                const block =  new Block(this.originX*this.chunkSize+x,this.originY,this.originZ*this.chunkSize + z)
                block.create(true,"/textures/assets/minecraft/textures/block/dirt.png")
            }
        }
    }
}
//cube collision
let collisionCubes = []
//crackMaterial
const crackList = []
for (let elt = 0;elt <= 9;elt ++ ){
    const texture = textureLoader.load(`/textures/assets/minecraft/textures/block/destroy_stage_${elt}.png`)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    const material = new THREE.MeshBasicMaterial({
        map:texture,
        transparent:true,
        premultipliedAlpha: true,
        depthWrite:false, //éviter les bug,
        blending: THREE.MultiplyBlending
    });
    crackList.push(material)
}


var block = new Block(3,1,1)
block.create(false,"/textures/assets/minecraft/textures/block/grass_block_top.png","/textures/assets/minecraft/textures/block/dirt.png","/textures/assets/minecraft/textures/block/grass_block_side.png")

new Chunk(0,0,0)

//player 
const height = 1.8
const width = 0.6
const playerGeometry = new THREE.BoxGeometry(width,height,width)
playerGeometry.translate(width/2,height/2,width/2)
const playerMaterial = new THREE.MeshBasicMaterial({visible:true})
const player = new THREE.Mesh(playerGeometry,playerMaterial)
player.position.set(0,1,0)
scene.add(player)
player.add(playerCamera)
playerCamera.position.set(0.3,1.6,0.3)
playerCamera.rotateY(-Math.PI/2)

//hitbox
const playerHitbox = new Box3().setFromObject(player)
const playerHitboxHelper = new THREE.Box3Helper(playerHitbox,"#ff00ff")
scene.add(playerHitboxHelper)

//inputs
const keys = {};
window.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});
const click = {}
window.addEventListener("mousedown",(event)=>{
    click[event.button.toString()] = true})
window.addEventListener("mouseup",(event)=>{
    click[event.button.toString()] = false
})
const scroll = {}
window.addEventListener("wheel",(event)=>{
    if (event.deltaY < 0) {
        scroll["up"] = true
    } else if (event.deltaY > 0)  {
        scroll["down"] = true
    }
})


//vertical movements
let verticalVelocity = 0;
const gravity = -25; // block/s^2
const jumpForce = 8 // m/s

let onGround;
let previousTargetBox;

let breakingDuration = 0.75
let breakingTime = breakingDuration;
let previousCrackIndex;
let crackMesh = null;

function animate(){
    let delta = clock.getDelta()
    delta = Math.min(delta,0.05) //prevent delta from being too big, otherwise it avoids Y axis collisions during fps drop

    //movements and collisions
    function updateMovements(camera,speed) {
        const velocity = new THREE.Vector3()
       
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward,camera.up).normalize()
        
        if (keys["w"]){velocity.add(forward)}
        if (keys["s"]) velocity.sub(forward);
        if (keys["a"]) velocity.sub(right);
        if (keys["d"]) velocity.add(right);
        let newSpeed = speed
        if (keys["w"]&&keys["shift"]){
            newSpeed*=1.3;
            playerCamera.fov = 80
            playerCamera.updateProjectionMatrix()
        } else {
            playerCamera.fov = 75
            playerCamera.updateProjectionMatrix()
        }
        if (velocity.lengthSq() > 0){
            velocity.normalize().multiplyScalar(newSpeed*delta)
        }

        verticalVelocity += gravity * delta //met a jour la gravité

        //déplacement sur coordonée x,y,z
        const vectorX = new THREE.Vector3(velocity.x,0,0);
        const vectorY = new THREE.Vector3(0,verticalVelocity*delta,0)
        const vectorZ = new THREE.Vector3(0,0,velocity.z) 
        const hitboxTest = {
            x:playerHitbox.clone().translate(vectorX),
            y:playerHitbox.clone().translate(vectorY),
            z:playerHitbox.clone().translate(vectorZ),
        }
        
        //walls collisions
        let canMoveX = true;
        let canMoveY = true;
        let canMoveZ = true;
        
        collisionCubes.forEach(block=>{
            const box = block.box
            if (hitboxTest.x.intersectsBox(box)) {
                canMoveX = false
            }
            if (hitboxTest.y.intersectsBox(box)){
                canMoveY = false
                verticalVelocity = 0; //stop falling
                onGround = true;
            }
            if (hitboxTest.z.intersectsBox(box)) {
                canMoveZ = false
            }
        })
        if (canMoveX) {
            player.position.x += vectorX.x
            playerHitbox.translate(vectorX) 
        }
        if (canMoveY) {
            player.position.y += vectorY.y
            playerHitbox.translate(vectorY)
            onGround = false;
        }
        if (canMoveZ) {
            player.position.z += vectorZ.z
            playerHitbox.translate(vectorZ)
        }
        if (keys[" "] && onGround) {
            verticalVelocity += jumpForce
        }
    }
    updateMovements(playerCamera,4.3)

    // and place block
    const raycaster = new THREE.Raycaster()
    function raycast(){
        const playerPos = player.position.clone().add(playerCamera.position) //origin
        const direction = new THREE.Vector3() //direction
        playerCamera.getWorldDirection(direction) //get direction from camera
        raycaster.set(playerPos,direction) //set a raycaster from origin following direction
        raycaster.far = 5 //length of the raycast
        const blocksIntersect = raycaster.intersectObjects(collisionCubes.map(block => block.mesh)) //raycast only works with mesh (not box3D)
        const blockIntersect = blocksIntersect[0] //block target by raycast
        let originBlock;
        if (blockIntersect) {
            originBlock = collisionCubes.find(block=>block.mesh === blockIntersect.object)//the real block from the list
        }
       
        //draw ray
        return originBlock
    }
    let targetBlock = raycast()
    //bordure au survol du bloc
    //si il y a un help précédent et si il avait un helper
    if (previousTargetBox && previousTargetBox.displayHelper) { 
        previousTargetBox.displayHelper = false //on supprime 
        scene.remove(previousTargetBox.helper)
    }
    if (targetBlock) { //si il y a un bloc en cible
        previousTargetBox = targetBlock
        if (!targetBlock.displayHelper) { //s'il n'y a pas de helper
            scene.add(targetBlock.helper)
            targetBlock.displayHelper = true
        }
    } else {
        previousTargetBox = null //si aucun bloc n'es dans le focus
    }
    //left click event on block
    //no tools at the moment

    if (click[0]) {
        if (targetBlock && targetBlock === previousTargetBox) {
            if(breakingTime > 0) {
                const progress = (breakingDuration - breakingTime) / breakingDuration // 0 --> 1
                let crackIndex = Math.floor(progress*crackList.length)
                crackIndex = Math.min(crackIndex,crackList.length - 1) // 0 --> 9
                breakingTime -= delta;
                if (previousCrackIndex !== crackIndex) {
                    previousCrackIndex = crackIndex
                    if (previousCrackIndex == crackList.length - 1) {
                        scene.remove(crackMesh)
                        scene.remove(targetBlock.mesh)
                        const index = collisionCubes.indexOf(targetBlock)
                        collisionCubes.splice(index,1)
                        crackMesh = null;
                        breakingTime = breakingDuration

                        return;
                    } else {
                        if (!crackMesh) {
                            crackMesh = new THREE.Mesh(targetBlock.mesh.geometry,crackList[crackIndex])
                            crackMesh.position.copy(targetBlock.mesh.position)
                            crackMesh.renderOrder = 999;
                            scene.add(crackMesh)
                        } else {
                            crackMesh.material = crackList[crackIndex];
                            crackMesh.material.needsUpdate = true
                        }
                    }
                    
                }
            }
        }
    } 
    if (click[2]) {
        console.log("right")
    }

    //hotbar square move
    if (scroll["up"]){
        scroll["up"] = false
        if (hotbarPos >= 9){
            hotbarPos = 1
        } else {
            hotbarPos ++
        }
        hotbarSquare.newPos(25*(-10 + hotbarPos*2) - 1,window.innerHeight-3)
        } 
    if (scroll["down"]){
        scroll["down"] = false
        if (hotbarPos <= 1) {
            hotbarPos = 9
        } else {
            hotbarPos --
        }

        hotbarSquare.newPos(25*(-10 + hotbarPos*2) - 1,window.innerHeight-3)
    }

    //stats update
    stats.update()
    renderer.autoClear = false //prevent the autoclear
    //main scene and 3d render
    renderer.clear() //clear scene
    renderer.render(scene, playerCamera)
    //2D scene render (hud and stuffs)
    renderer.clearDepth() //fixes
    renderer.render(sceneHUD, orthoCamera)
}