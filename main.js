import * as THREE from 'three';
import { LumaSplatsSemantics, LumaSplatsThree } from "@lumaai/luma-web";
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js';

let renderer, renderer3DText, orbitControls, orbitControls3DText;
let currentScene, currentCamera;

let sceneSplat1, sceneSplat2;
let cameraSplat1, cameraSplat2;
let startPositions = [new THREE.Vector3(0, 10, 25), new THREE.Vector3(-1.5, 0, -10)];

let splat1, splat2;

//3D Text animation
let titleMesh, scene3DText, camera3DText;

let hoverDirection = 10;
let hoverSpeed = 0.05;  // Hover speed
let hoverHeight = 20;  // Maximum hover height

init();
renderer.setAnimationLoop(animate);

function init() {

    //setup renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('splat-container').appendChild(renderer.domElement);

    setupScene1();
    setupScene2();

    currentScene = sceneSplat1;
    currentCamera = cameraSplat1;

    orbitControls = new OrbitControls(currentCamera, renderer.domElement);
    orbitControls.enableDamping = true;
    

    setup3DText();

    orbitControls3DText = new OrbitControls(camera3DText, renderer3DText.domElement);
    orbitControls3DText.enableDamping = true;

    setupHDR();

    setupInput();

}

// Initialize splat1 before adding it to the scene
function setupScene1() {
    sceneSplat1 = new THREE.Scene();

    cameraSplat1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraSplat1.position.set(startPositions[0].x, startPositions[0].y, startPositions[0].z);

    splat1 = new LumaSplatsThree({
        source: 'https://lumalabs.ai/capture/0c19c097-5d06-4fb4-a398-f0433a09d7ff',
        enableThreeShaderIntegration: true,
        particleRevealEnabled: false,
        
    });
    //splat1.semanticsMask = LumaSplatsSemantics.FOREGROUND;
    splat1.position.set(0, 0, 0);
    splat1.scale.set(3, 3, 3);  // Set scale to a visible size
    splat1.onLoad = () => {
        sceneSplat1.add(splat1);
    };
    
}

// Initialize splat2
function setupScene2() {
    sceneSplat2 = new THREE.Scene();

    cameraSplat2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    cameraSplat2.position.set(startPositions[1].x, startPositions[1].y, startPositions[1].z);

    splat2 = new LumaSplatsThree({
        source: 'https://lumalabs.ai/capture/816bcf27-682f-4e48-976d-e452e9ed5df8',
        enableThreeShaderIntegration: true,
        particleRevealEnabled: false,
        semanticsMask: LumaSplatsSemantics.FOREGROUND
    });
    splat2.position.set(0, 0, 0);
    splat2.scale.set(3, 3, 3);  // Set scale to a visible size
    /*
    splat2.setShaderHooks({
        vertexShaderHooks: {
            additionalUniforms: {
            },

            getSplatTransform: `
            (vec3 position, uint layersBitmask) {
                float x = 1.;
                float z = 1.;
                float y = 1.;
                if(position.x > 2.8 || position.x < -2.8
                || position.y > 0.5 || position.y < -2.0
                || position.z > 2.1 || position.z < -2.5)
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
    */
    splat2.onLoad = () => {
        sceneSplat2.add(splat2);
    };
}

function setup3DText() {
    // Scene for the 3D text
    scene3DText = new THREE.Scene();
    camera3DText = new THREE.OrthographicCamera( 960 / - 2, 960 / 2, 150 / 2, 150 / - 2, 0.001, 1000 );
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


}



function setupHDR() {
    const hdrLoader = new RGBELoader();
    hdrLoader.loadAsync('/hdr/misty_pines_2k.hdr').then(hdrTexture => {
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
        sceneSplat1.background = hdrTexture;
        scene3DText.environment = hdrTexture;
    });
    hdrLoader.loadAsync('/hdr/misty_pines_2k.hdr').then(hdrTexture => {
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
        sceneSplat2.background = hdrTexture;
    });
}

function setupInput() {
    // Event listeners for keyboard and click-based navigation
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight') {
                console.log('ArrowRight pressed');
                if (currentScene === sceneSplat1) {
                    changeScene(sceneSplat2, cameraSplat2, startPositions[1]);
                } else {
                    changeScene(sceneSplat1, cameraSplat1, startPositions[0]);
                }
            }
            if (event.key === 'ArrowLeft') {
                console.log('ArrowLeft pressed');
                if (currentScene === sceneSplat1) {
                    changeScene(sceneSplat2, cameraSplat2, startPositions[1]);
                } else {
                    changeScene(sceneSplat1, cameraSplat1, startPositions[0]);
                }
            }
        });

        // Event listeners for mouse navigation
        document.getElementById('arrow-left').addEventListener('click', () => {
            console.log('ArrowLeft clicked');
            if (currentScene === sceneSplat1) {
                changeScene(sceneSplat2, cameraSplat2, startPositions[1]);
            } else {
                changeScene(sceneSplat1, cameraSplat1, startPositions[0]);
            }
        });

        document.getElementById('arrow-right').addEventListener('click', () => {
            console.log('ArrowRight clicked');
            if (currentScene === sceneSplat1) {
                changeScene(sceneSplat2, cameraSplat2, startPositions[1]);
            } else {
                changeScene(sceneSplat1, cameraSplat1, startPositions[0]);
            }
        });
    });
}

function changeScene(scene, camera, startPosition) {
    currentScene = scene;
    currentCamera = camera;
    camera.position.set(startPosition.x, startPosition.y, startPosition.z);
    orbitControls.object = currentCamera;
}

// Animation loop
function animate() {
    orbitControls.update();
    if(splat1 != null)
        {
            splat1.skybox.visible = false;
        }
        /*
        if(splat2 != null)
            {
                splat2.skybox.visible = false;
            } */
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



