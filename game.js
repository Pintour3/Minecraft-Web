import * as THREE from "three"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import Stats from 'three/addons/libs/stats.module.js';
const loader = new GLTFLoader()

//scene init
const scene = new THREE.Scene(); 
//cam
const camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,2000) 
const renderer = new THREE.WebGLRenderer();

