import * as THREE from "three"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import Stats from 'three/addons/libs/stats.module.js';
import { cameraFar, texture } from "three/tsl";
import { ThreeMFLoader } from "three/examples/jsm/Addons.js";
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
    }
}
//chunk generation
class Chunk {
    constructor(originX,originZ){
        this.originX = originX
        this.originZ = originZ
        //2d map
        this.map = []
        this.chunkSize = 16;
        this.mesh = null;
        this.create()
    }
    //chunk is 16x16
    //we need chunk map (matrice)
    create(){
        for (let x = 0; x <= 16; x ++) {
            this.map[x] = []
            for (let z = 0;z <=16;z ++){
                const block =  new Block(this.originX*this.chunkSize+x,0,this.originZ*this.chunkSize + z)
                block.create(true,"/textures/assets/minecraft/textures/block/dirt.png")

            }
        }
    }
}
//cube collision
var block = new Block(3,1,0)
block.create(false,"/textures/assets/minecraft/textures/block/grass_block_top.png","/textures/assets/minecraft/textures/block/dirt.png","/textures/assets/minecraft/textures/block/grass_block_side.png")

//helper
const box = new THREE.Box3().setFromObject(block.mesh)
const helper = new THREE.Box3Helper(box,"#ff00ff")
scene.add(helper)

new Chunk(0,0)

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
        const hitboxTestX = playerHitbox.clone()
        const hitboxTestZ = playerHitbox.clone() 
        const vectorX = new THREE.Vector3(velocity.x,0,0) 
        const vectorZ = new THREE.Vector3(0,0,velocity.z) 
        hitboxTestX.translate(vectorX) 
        hitboxTestZ.translate(vectorZ) 
        if (!hitboxTestX.intersectsBox(box)){ 
            if (!hitboxTestZ.intersectsBox(box)){ 
                player.position.add(velocity) 
                playerHitbox.translate(velocity) 
            } else {
                player.position.x += velocity.x
                playerHitbox.translate(vectorX) 
            }
        } else {
            player.position.z += velocity.z
            playerHitbox.translate(vectorZ) 
        }
    }
    updateMovements(playerCamera,4.3)
   
    
    //stats update
    stats.update()
    renderer.render(scene, playerCamera)  
}

