import * as THREE from "three"

export function HUD(){
    //scene
    const sceneHUD = new THREE.Scene()
    //cam made for 2d objects
    const orthoCamera = new THREE.OrthographicCamera(
        -window.innerWidth / 2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        -window.innerHeight / 2,
        0,
        10)
    orthoCamera.position.z = 1

    //loader
    const textureLoader = new THREE.TextureLoader() 
    class displayHUD {
        constructor(x,y,sizeX,sizeY,scale,texturePath){
            this.x = x
            this.y = y
            this.sizeX = sizeX * scale
            this.sizeY = sizeY * scale
            this.texturePath = texturePath
            this.mesh = null
            const texture = textureLoader.load(this.texturePath)
            texture.colorSpace = THREE.SRGBColorSpace
            texture.flipY = false
            texture.magFilter = THREE.NearestFilter
            texture.minFilter = THREE.NearestFilter
            texture.generateMipmaps = false
            const geometry = new THREE.PlaneGeometry(this.sizeX,this.sizeY)
            const material = new THREE.MeshBasicMaterial({map:texture,transparent:true})
            const mesh = new THREE.Mesh(geometry,material)
            mesh.position.set(this.x,-this.y/2 + this.sizeY/2,0)
            this.mesh = mesh
            sceneHUD.add(mesh)
        }
        newPos(x,y){
            this.x = x
            this.y = y
            this.mesh.position.set(this.x,-this.y/2 + this.sizeY/2,0)
        }
    }
    //hotbar
    const hotbar = new displayHUD(0,window.innerHeight,182,24,2.5,"/textures/assets/minecraft/textures/gui/sprites/hud/hotbar.png")
    //hotbarSquare 
    let hotbarPos = 1
    const hotbarSquare = new displayHUD(25*(-10 + hotbarPos*2) - 1,window.innerHeight-3,24,23,2.6,"/textures/assets/minecraft/textures/gui/sprites/hud/hotbar_selection.png")
    hotbarSquare.mesh.rotateZ(Math.PI)
    return {sceneHUD,orthoCamera,hotbarSquare,hotbarPos}
}