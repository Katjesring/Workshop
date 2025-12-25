import * as THREE from 'three';
import { Uniform } from "three"; // three.js Uniform wrapper for shader uniforms
import { LumaSplatsSemantics, LumaSplatsThree } from "@lumaai/luma-web"; // LumaAI splats integration
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // HDR environment map loader
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // GLTF model loader
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js'; // camera controls

let renderer, renderer3DText, orbitControls, orbitControls3DText;
// references to the currently displayed scene & camera
let currentScene, currentCamera;
// shader uniform bounds used to cull splats in LumaSplatThree's custom shader hook
let xpositive = new Uniform(10);
let ypositive = new Uniform(10);
let zpositive = new Uniform(10);
let xnegative = new Uniform(-10);
let ynegative = new Uniform(-10);
let znegative = new Uniform(-10);

// Scenes and cameras for Luma Splat content
let scenes = [];
let cameras = [];

// Luma splats objects 
let splats = [];

// 3D text / title model and its scene/camera
let titleMesh, scene3DText, camera3DText;

//parameters for the title hover animation
let hoverDirection = 10; // direction multiplier applied to x position each frame
let hoverSpeed = 0.05;  // Hover speed (delta per frame scaled by hoverDirection)
let hoverHeight = 20;  // Maximum hover amplitude from the center

// DOM containers for non-splat content
let imageContainer = document.getElementById('image-container');
let videoContainer = document.getElementById('video-container');
let myImage;
let myVideo;

// Reihenfolge des gezeigten Contents festlegen (nachdem alles initialisiert wurde)
let sequence = [
    {
        type: 'splat',
        src: 'https://lumalabs.ai/capture/0c19c097-5d06-4fb4-a398-f0433a09d7ff',
        startPosition: new THREE.Vector3(0, 10, 25),
        bounds: null,
        customSkybox: '/hdr/misty_pines_2k.hdr',
        description: 'Wer bin ich heute? Wer will ich sein?'
    },
    {
        type: 'splat',
        src: 'https://lumalabs.ai/capture/816bcf27-682f-4e48-976d-e452e9ed5df8',
        startPosition: new THREE.Vector3(-1.5, 0, -10),
        bounds: null,
        customSkybox: null,
        description: 'Wo fühlst du dich am wohlsten und warum?'
    },
    {
        type: 'splat',
        src: 'https://lumalabs.ai/capture/faa88f85-e4f6-4ff9-841d-d607a7d59cdc',
        startPosition: new THREE.Vector3(-1.5, 0, -10),
        bounds: { xpos: new Uniform(10), ypos: new Uniform(10), zpos: new Uniform(10), xneg: new Uniform(-10), yneg: new Uniform(-10), zneg: new Uniform(-10) },
        customSkybox: '/hdr/misty_pines_2k.hdr',
        description: 'Welche träume hast du heute?'
    },
    { type: 'image', src: '/images/pearl.jpg', description: 'Was inspiriert dich?' },
    // { type: 'image', src: '/images/pearl.jpg', description: 'Das Mädchen mit dem Perlenohrring', width: 600, height: 800}
    { type: 'image', src: '/images/mushroom.jpg', description: 'Welche Materialien findest du spannend?' },
    { type: 'video', src: '/videos/20.mp4', description: 'Wie möchtest du in Zukunft wohnen und arbeiten?' },
    //{ type: 'video', src: '/videos/C0019.mp4', description: 'This is a Video' , width: 1000, height: 800}
];

// Aktueller Index im Content-Sequenz-Array
let currentIndex = 0;



// initialize everything and start the render loop
init();
renderer.setAnimationLoop(animate);

function init() {

    //setup renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('splat-container').appendChild(renderer.domElement);

    sequence.forEach((element, index) => {
        if (element.type == 'splat') {
            setupSplatScene(index);
            if(index == 0){
                currentScene = element.scene;
                currentCamera = element.camera;
            }
        }
    });

    setupImageScene();
    setupVideoScene();

    document.getElementById('splat-text').innerText = sequence[0].description;

    orbitControls = new OrbitControls(currentCamera, renderer.domElement);
    orbitControls.enableDamping = true;


    setup3DText();

    orbitControls3DText = new OrbitControls(camera3DText, renderer3DText.domElement);
    orbitControls3DText.enableDamping = true;

    setupInput();

}

// Initialize splat scene from sequence
function setupSplatScene(seqIndex) {
    let newScene = new THREE.Scene();
    let newCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    newCamera.position.set(sequence[seqIndex].startPosition.x, sequence[seqIndex].startPosition.y, sequence[seqIndex].startPosition.z);

    let newSplat = new LumaSplatsThree({
        source: sequence[seqIndex].src,
        enableThreeShaderIntegration: true,
        particleRevealEnabled: false,

    });
    newSplat.position.set(0, 0, 0);
    newSplat.scale.set(3, 3, 3);  // Set scale to a visible size

    // Check if bounds have been added
    if (sequence[seqIndex].bounds != null) {
        // Custom shader hook to cull splats based on dynamic bounds
        newSplat.setShaderHooks({
            vertexShaderHooks: {
                additionalUniforms: {
                    xPos: ['float', sequence[seqIndex].bounds.xpos],
                    yPos: ['float', sequence[seqIndex].bounds.ypos],
                    zPos: ['float', sequence[seqIndex].bounds.zpos],
                    xNeg: ['float', sequence[seqIndex].bounds.xneg],
                    yNeg: ['float', sequence[seqIndex].bounds.yneg],
                    zNeg: ['float', sequence[seqIndex].bounds.zneg],
                },

                getSplatTransform: `
            (vec3 position, uint layersBitmask) {
                float x = 1.;
                float z = 1.;
                float y = 1.;
                if(position.x > xPos || position.x < xNeg
                || position.y > yPos || position.y < yNeg
                || position.z > zPos || position.z < zNeg)
                {
                    x = 0.0;
                    y = 0.0;
                    z = 0.0;
                }
                return mat4(
                    x, 0., 0., 0,
                    0., y, 0., 0,
                    0., 0., z, 0,
                    1., 1., 1., 1.
                );
            }
        `,
            }
        });
    }

    newSplat.onLoad = () => {
        newScene.add(newSplat);
    };

    if (sequence[seqIndex].customSkybox != null) {
        const hdrLoader = new RGBELoader();
        hdrLoader.loadAsync(sequence[seqIndex].customSkybox).then(hdrTexture => {
            hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
            newScene.background = hdrTexture;
        });
    }

    sequence[seqIndex].scene = newScene;
    sequence[seqIndex].camera = newCamera;
    sequence[seqIndex].splat = newSplat;
}

function setupImageScene() {
    // prepare an <img> element to show images in the UI
    imageContainer.style.display = 'none';
    myImage = new Image();
    myImage.style.display = 'none';
    myImage.style.maxWidth = '100vw';
    myImage.style.maxHeight = '100vh';
    imageContainer.appendChild(myImage);
}

function setupVideoScene() {
    // prepare a <video> element for video sequence items
    videoContainer.style.display = 'none';
    myVideo = document.createElement('video');
    myVideo.controls = true;
    myVideo.style.display = 'none';
    myVideo.style.maxWidth = '100vw';
    myVideo.style.maxHeight = '100vh';
    videoContainer.appendChild(myVideo);
}

function setup3DText() {
    // Scene for the 3D text
    scene3DText = new THREE.Scene();
    camera3DText = new THREE.OrthographicCamera(960 / - 2, 960 / 2, 150 / 2, 150 / - 2, 0.001, 1000);
    camera3DText.lookAt(new THREE.Vector3(0, 0, 0));
    scene3DText.add(new THREE.AmbientLight(0xffffff, 60));
    renderer3DText = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer3DText.setClearColor(0x000000, 0);
    renderer3DText.setSize(960, 150, false);
    document.getElementById('model-container').appendChild(renderer3DText.domElement);

    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/mesh/title7.glb', (gltf) => {
        titleMesh = gltf.scene;
        titleMesh.scale.set(10, 10, 10);  // Scale the model
        titleMesh.position.set(0, 0, 0);  // Position the model
        scene3DText.add(titleMesh);
    });
    const hdrLoader = new RGBELoader();
    hdrLoader.loadAsync('/hdr/misty_pines_2k.hdr').then(hdrTexture => {
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
        scene3DText.environment = hdrTexture;
    });

}


function setupInput() {
    // Event listeners for keyboard and click-based navigation
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight') {
                currentIndex = (currentIndex + 1) % sequence.length;
                showCurrentContent();
            }
            if (event.key === 'ArrowLeft') {
                currentIndex = (currentIndex - 1 + sequence.length) % sequence.length;
                showCurrentContent();
            }
            if (event.key === 'x') {
                console.log('ArrowLeft pressed');
                xpositive.value = xpositive.value - 0.1;
            }
            if (event.key === 'y') {
                ypositive.value = ypositive.value - 0.1;
            }
            if (event.key === 'z') {
                zpositive.value = zpositive.value - 0.1;
            }
            if (event.key === 'a') {
                xnegative.value = xnegative.value + 0.1;
            }
            if (event.key === 'b') {
                ynegative.value = ynegative.value + 0.1;
            }
            if (event.key === 'c') {
                znegative.value = znegative.value + 0.1;
            }
        });

        // Event listeners for mouse navigation
        document.getElementById('arrow-left').addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + sequence.length) % sequence.length;
            showCurrentContent();
        });
        document.getElementById('arrow-right').addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % sequence.length;
            showCurrentContent();
        });
    });
}

function changeScene(scene, camera, startPosition, description) {
    currentScene = scene;
    currentCamera = camera;
    camera.position.set(startPosition.x, startPosition.y, startPosition.z);
    orbitControls.object = currentCamera;
    document.getElementById('splat-text').innerText = description;
}

// Funktion zum Anzeigen des aktuellen Contents
function showCurrentContent() {
    renderer.domElement.style.display = 'none';
    imageContainer.style.display = 'none';
    if (myImage) myImage.style.display = 'none';
    videoContainer.style.display = 'none';
    if (myVideo) myVideo.style.display = 'none';
    // 3D-Objekt-Container
    let glbContainer = document.getElementById('glb-container');
    if (glbContainer) glbContainer.style.display = 'none';
    // Text-Container
    let textContainer = document.getElementById('text-container');
    if (textContainer) textContainer.style.display = 'none';
    // Audio-Element
    let audioElem = document.getElementById('audio-player');
    if (audioElem) {
        audioElem.pause();
        audioElem.style.display = 'none';
    }

    const item = sequence[currentIndex];
    if (item.type === 'splat') {
        renderer.domElement.style.display = 'block';
        changeScene(item.scene, item.camera, item.startPosition, item.description);
    } else if (item.type === 'image') {
        imageContainer.style.display = 'flex';
        if (myImage) {
            myImage.src = item.src;
            myImage.style.display = 'block';
            if (item.width) myImage.width = item.width;
            if (item.height) myImage.height = item.height;
        }
        document.getElementById('splat-text').innerText = item.description || "Bild";
    } else if (item.type === 'video') {
        videoContainer.style.display = 'flex';
        if (myVideo) {
            myVideo.src = item.src;
            myVideo.style.display = 'block';
            if (item.width) myVideo.width = item.width;
            if (item.height) myVideo.height = item.height;
            myVideo.autoplay = true;
            myVideo.loop = true;
            myVideo.load();
            // Für Autoplay ohne User-Interaktion ggf. muted setzen:
            myVideo.muted = true;
            myVideo.play();
        }
        document.getElementById('splat-text').innerText = item.description || "Video";
    }
    // ...existing code for 3dObject, text, audio...
}







// Animation loop per frame
function animate() {
    orbitControls.update();


    if (sequence[currentIndex].customSkybox != null) {
        // Deactivate splat skybox for the current frame to prevent it from covering up the hdr
        sequence[currentIndex].splat.skybox.visible = false;
    }

    // Hovering animation for the title
    if (titleMesh) {
        titleMesh.position.x += hoverDirection * hoverSpeed;
        if (titleMesh.position.x > 1 + hoverHeight) {
            hoverDirection = -1;
        } else if (titleMesh.position.x < 1 - hoverHeight) {
            hoverDirection = 1;
        }
    }
    renderer.render(currentScene, currentCamera);
    renderer3DText.render(scene3DText, camera3DText);
}



