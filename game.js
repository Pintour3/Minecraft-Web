import * as THREE from "three"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import Stats from 'three/addons/libs/stats.module.js';
import { cameraFar, texture } from "three/tsl";
import { ThreeMFLoader, VerticalTiltShiftShader } from "three/examples/jsm/Addons.js";
import { sortedArray } from "three/src/animation/AnimationUtils.js";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { update } from "three/examples/jsm/libs/tween.module.js";
import { Box3, Clock } from "three/webgpu";
import VelocityNode from "three/src/nodes/accessors/VelocityNode.js";

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
        const helper = new THREE.Box3Helper(this.box,"#ff00ff")
        scene.add(helper)
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

var block = new Block(3,1,1)
block.create(false,"/textures/assets/minecraft/textures/block/grass_block_top.png","/textures/assets/minecraft/textures/block/dirt.png","/textures/assets/minecraft/textures/block/grass_block_side.png")
//helper


new Chunk(0,0,0)

//player 
const height = 1.8
const width = 0.6
const playerGeometry = new THREE.BoxGeometry(width,height,width)
playerGeometry.translate(width/2,height/2,width/2)
const playerMaterial = new THREE.MeshBasicMaterial({visible:true})
const player = new THREE.Mesh(playerGeometry,playerMaterial)
player.position.set(-1,1,0)
scene.add(player)
player.add(playerCamera)
playerCamera.position.set(0.3,1.6,0.3)
playerCamera.rotateY(-Math.PI/2)

//hitbox
const playerHitbox = new Box3().setFromObject(player)
const playerHitboxHelper = new THREE.Box3Helper(playerHitbox,"#ff00f0")
scene.add(playerHitboxHelper)

//inputs
const keys = {};
window.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

//vertical movements
let verticalVelocity = 0;
const gravity = -25; // block/s^2
const jumpForce = 8 // m/s

function animate(){
    
    function updateMovements(camera,speed) {
        const delta = clock.getDelta()
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
        if (keys["w"]&&keys["shift"]) newSpeed*=1.3;
        if (velocity.lengthSq() > 0){
            velocity.normalize().multiplyScalar(newSpeed*delta)
        }
        //déplacement sur coordonée X
        const vectorX = new THREE.Vector3(velocity.x,0,0);
        const vectorY = new THREE.Vector3(0,gravity*delta,0)
        const vectorZ = new THREE.Vector3(0,0,velocity.z) 
        const hitboxTest = {
            x:playerHitbox.clone().translate(vectorX),
            y:0,
            z:playerHitbox.clone().translate(vectorZ),
        }
        
        //walls collisions
        let canMoveX = true;
        let canMoveZ = true;
        collisionCubes.forEach(block=>{
            const box = block.box
            if (hitboxTest.x.intersectsBox(box)) {
                canMoveX = false
            }
            if (hitboxTest.z.intersectsBox(box)) {
                canMoveZ = false
            }
        })
        if (canMoveX) {
            player.position.x += vectorX.x
            playerHitbox.translate(vectorX) 
        }
        if (canMoveZ) {
            player.position.z += vectorZ.z
            playerHitbox.translate(vectorZ)
        }
        //floor collisions --> todo


    }
    updateMovements(playerCamera,4.3)
    //stats update
    stats.update()
    renderer.render(scene, playerCamera)  
}