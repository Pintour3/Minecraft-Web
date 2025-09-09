import * as THREE from "three"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import Stats from 'three/addons/libs/stats.module.js';
import { texture } from "three/tsl";
import { ThreeMFLoader } from "three/examples/jsm/Addons.js";
import { sortedArray } from "three/src/animation/AnimationUtils.js";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { update } from "three/examples/jsm/libs/tween.module.js";
const loader = new GLTFLoader()

//textures
const textureLoader = new THREE.TextureLoader();
//scene init
const scene = new THREE.Scene(); 

//cam
const playerCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,2000) 

//pointer
const controls = new PointerLockControls(playerCamera,document.body)
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
    }
    draw(sameTexture = true,topTexture = "",bottomTexture = "",sideTexture = ""){
        function loadColorTexture(path) {
                const texture = textureLoader.load(path)
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.magFilter = THREE.NearestFilter // prevent blur effect
                texture.minFilter = THREE.NearestFilter
                texture.generateMipmaps = false
                return texture
            } 
        const geometry = new THREE.BoxGeometry(1,1,1);
        let mesh;

        if (sameTexture) {
            const material = new THREE.MeshBasicMaterial({
                map: loadColorTexture(topTexture)
            })
            mesh = new THREE.Mesh(geometry,material)
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
            mesh = new THREE.Mesh(geometry,materials)
        }
        mesh.position.set(this.x,this.y,this.z)
        scene.add(mesh)
    }
}
//tests
var block = new Block(0,0,0)
block.draw(true,"/textures/assets/minecraft/textures/block/dirt.png")
var block1 = new Block(3,1,0)
block1.draw(false,"/textures/assets/minecraft/textures/block/grass_block_top.png","/textures/assets/minecraft/textures/block/dirt.png","/textures/assets/minecraft/textures/block/grass_block_side.png")
playerCamera.position.set(1,2,5)
playerCamera.lookAt(block.x,block.y,block.z)

//inputs
const keysPressed = {};
window.addEventListener("keydown", (event) => {
    keysPressed[event.key] = true;
});
window.addEventListener("keyup", (event) => {
    keysPressed[event.key] = false;
});


function animate(){
    //inputs
    const velocity = new THREE.Vector3()

    function updateMovements(keys,camera,speed) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward,camera.up).normalize()
        velocity.set(0,0,0)
        
        if (keys["w"]) velocity.add(forward);
        if (keys["s"]) velocity.sub(forward);
        if (keys["a"]) velocity.sub(right);
        if (keys["d"]) velocity.add(right);


        if (velocity.lengthSq() > 0){
            velocity.normalize().multiplyScalar(speed)
        }
    }

    updateMovements(keysPressed,playerCamera,0.05)
    playerCamera.position.add(velocity)
    


    renderer.render(scene, playerCamera)
}

