import * as THREE from "three";
import { Uniform } from "three"; // three.js Uniform wrapper for shader uniforms
import { LumaSplatsThree } from "@lumaai/luma-web"; // LumaAI splats integration
import { RGBELoader } from "three/addons/loaders/RGBELoader.js"; // HDR environment map loader
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"; // GLTF model loader
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js"; // camera controls
import { SplatMesh } from "@sparkjsdev/spark";

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

// Current index in the content sequence array
let currentIndex = 0;

// 3D text / title model and its scene/camera
let titleMesh, scene3DText, camera3DText;

//parameters for the title hover animation
let hoverDirection = 10; // direction multiplier applied to x position each frame
let hoverSpeed = 0.05; // Hover speed (delta per frame scaled by hoverDirection)
let hoverHeight = 20; // Maximum hover amplitude from the center

// DOM containers for non-splat content
let imageContainer = document.getElementById("image-container");
let videoContainer = document.getElementById("video-container");
let audioContainer = document.getElementById("audio-container");
let plyContainer = document.getElementById("ply-container");

let myImage;
let myVideo;
let myAudio;
let myGLB;

let currentAudioSrc = null; // Track the currently playing audio

// Define the order of displayed content (after everything has been initialized)
let sequence = [
  {
    type: "luma-splat",
    src: "https://lumalabs.ai/capture/0c19c097-5d06-4fb4-a398-f0433a09d7ff",
    cameraStartPosition: new THREE.Vector3(-25, 10, 25),
    bounds: null,
    customSkybox: "/hdr/misty_pines_2k.hdr",
    description: "Wer bin ich heute? Wer will ich sein?",
    answer:
      "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et;",
    audio: "/audio/ambient.mp3",
  },
  {
    type: "luma-splat",
    src: "https://lumalabs.ai/capture/816bcf27-682f-4e48-976d-e452e9ed5df8",
    cameraStartPosition: new THREE.Vector3(-10, 0, -10),
    bounds: null,
    customSkybox: null,
    description: "Wo fühlst du dich am wohlsten und warum?",
    answer:
      "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy \neirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.  ",
    audio: "/audio/ambient.mp3",
  },
  {
    type: "luma-splat",
    src: "https://lumalabs.ai/capture/faa88f85-e4f6-4ff9-841d-d607a7d59cdc",
    cameraStartPosition: new THREE.Vector3(10, 0, 0),
    //'q' / 'w': 'e' / 'r' ,'t' / 'y'
    rotation: new THREE.Vector3(-0.1, 0.1, 0.2),
    bounds: {
      xpos: new Uniform(10),
      ypos: new Uniform(10),
      zpos: new Uniform(10),
      xneg: new Uniform(-10),
      yneg: new Uniform(-10),
      zneg: new Uniform(-10),
    },
    customSkybox: "/hdr/misty_pines_2k.hdr",
    description: "Welche Träume hast du heute?",
    answer:
      "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy \n eirmod tempor invidunt ut labore et",
    audio: "/audio/ambient.mp3",
  },
  {
    type: "image",
    src: "/images/pearl.jpg",
    description: "Was inspiriert dich?",
    answer: "",
  },
  {
    type: "image",
    src: "/images/mushroom.jpg",
    description: "Welche Materialien findest du spannend?",
    answer: "",
  },
  {
    type: "video",
    src: "/videos/20.mp4",
    description: "Wie möchtest du in Zukunft wohnen und arbeiten?",
    answer: "",
  },
  {
    type: "ply-splat",
    src: "/ply-scans/Streetart.ply",
    cameraStartPosition: new THREE.Vector3(3.16, 1.34, -0.32),
    position: new THREE.Vector3(1.1, 0.0, 0.0),
    rotation: new THREE.Vector3(3.2, 0, 0),
    cameraLookAt: new THREE.Vector3(0, 0, 0),
    description: "",
    answer: "",
  },
  {
    type: "ply-splat",
    src: "/ply-scans/Garten4.ply",
    cameraStartPosition: new THREE.Vector3(0.82, 1, 3.97),
    position: new THREE.Vector3(-1, -1, 0),
    rotation: new THREE.Vector3(3.2, 0, 0),
    description: "",
    answer: "",
  },
  {
    type: "ply-splat",
    src: "/ply-scans/BahnUncut.ply",
    cameraStartPosition: new THREE.Vector3(2.13, 0.36, 1.7),
    position: new THREE.Vector3(0.1, 0.0, 0.0),
    rotation: new THREE.Vector3(3.2, 0, 0),
    customSkybox: "/hdr/dikhololo_night_4k.hdr",
    description: "",
    answer: "",
  },
  {
    type: "ply-splat",
    src: "/ply-scans/Bahncut.ply",
    customSkybox: "/hdr/dikhololo_night_4k.hdr",
    cameraStartPosition: new THREE.Vector3(0.71, 0.15, 1.98),
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Vector3(3.2, 0, 0),
    description: "",
    answer: "",
  },
  {
    type: "glb",
    src: "/mesh/cat.glb",
    description: "Wie möchtest du in Zukunft wohnen und arbeiten?",
    answer: "",
    cameraStartPosition: new THREE.Vector3(0, 1, 2),
    scale: new THREE.Vector3(10, 10, 10),
    position: new THREE.Vector3(0, 0, 0),
    customSkybox: "/hdr/misty_pines_2k.hdr",
  },
  {
    type: "glb",
    src: "/mesh/FlowersMesh.glb",
    description: "Wie möchtest du in Zukunft wohnen und arbeiten?",
    answer:
      "Ich glaube, ich wünsche mir irgendwann so eine Mischung aus Ruhe und Inspiration. Also kein komplett abgelegenes Leben, aber auch nicht mitten im Stress. Vielleicht eine Wohnung oder ein kleines Haus mit viel Licht, Pflanzen überall, ein Ort, an dem man sich wirklich gern aufhält. Arbeiten würde ich am liebsten flexibel – nicht jeden Tag das Gleiche, sondern Projekte, die sich verändern. Irgendwas Kreatives, wo ich das Gefühl hab, ich baue wirklich etwas Eigenes auf und entwickle mich weiter. Und am besten so, dass ich nicht an einen festen Ort gebunden bin. Also auch mal woanders sein können, neue Eindrücke sammeln, ohne dass alles zusammenbricht. Und wichtig wäre mir, dass Arbeit sich nicht komplett vom Leben trennt, sondern eher ein Teil davon ist, der sich gut anfühlt – nicht nur etwas, das man „abarbeitet“.",
    cameraStartPosition: new THREE.Vector3(-3.79, 2.64, 1.7),
    scale: new THREE.Vector3(5, 5, 5),
    position: new THREE.Vector3(0, -1, 0),
    customSkybox: "/hdr/misty_pines_2k.hdr",
  },
];

// initialize everything and start the render loop
init();
renderer.setAnimationLoop(animate);

function init() {
  //setup renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("render-container").appendChild(renderer.domElement);

  sequence.forEach((element, index) => {
    if (element.type == "luma-splat") {
      setupSplatScene(index);
      if (index == 0) {
        currentScene = element.scene;
        currentCamera = element.camera;
      }
    } else if (element.type == "glb") {
      setupGLBScene(index);
      if (index == 0) {
        currentScene = element.scene;
        currentCamera = element.camera;
      }
    } else if (element.type == "ply-splat") {
      setupPLYScene(index);
      if (index == 0) {
        currentScene = element.scene;
        currentCamera = element.camera;
      }
    }
  });

  setupImageScene();
  setupVideoScene();
  setupAudioScene();

  document.getElementById("question-text").innerText = sequence[0].description;

  orbitControls = new OrbitControls(currentCamera, renderer.domElement);
  orbitControls.enableDamping = true;
  if (sequence[0].cameraLookAt) {
    orbitControls.target.set(
      sequence[0].cameraLookAt.x,
      sequence[0].cameraLookAt.y,
      sequence[0].cameraLookAt.z,
    );
  }
  orbitControls.addEventListener("change", () => {
    const p = currentCamera.position;
    console.log(
      `Camera: x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, z=${p.z.toFixed(2)}`,
    );
    console.log(`Target: x=${orbitControls.target.x.toFixed(2)}, y=${orbitControls.target.y.toFixed(2)}, z=${orbitControls.target.z.toFixed(2)}`);
  });

  setup3DText();

  orbitControls3DText = new OrbitControls(
    camera3DText,
    renderer3DText.domElement,
  );
  orbitControls3DText.enableDamping = true;

  setupInput();

  // Play audio for initial splat if it has one
  if (sequence[0].audio && myAudio) {
    myAudio.src = sequence[0].audio;
    currentAudioSrc = sequence[0].audio;
    myAudio.play();
    // Show audio buttons
    document.getElementById("audio-start").style.display = "block";
    document.getElementById("audio-stop").style.display = "block";
  }

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    sequence.forEach((element) => {
      if (element.camera) {
        element.camera.aspect = window.innerWidth / window.innerHeight;
        element.camera.updateProjectionMatrix();
      }
    });
  });
}

// Initialize splat scene from sequence
function setupSplatScene(seqIndex) {
  let newScene = new THREE.Scene();
  let newCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  newCamera.position.set(
    sequence[seqIndex].cameraStartPosition.x,
    sequence[seqIndex].cameraStartPosition.y,
    sequence[seqIndex].cameraStartPosition.z,
  );

  let newSplat = new LumaSplatsThree({
    source: sequence[seqIndex].src,
    enableThreeShaderIntegration: true,
    particleRevealEnabled: false,
  });
  newSplat.position.set(0, 0, 0);
  newSplat.scale.set(3, 3, 3); // Set scale to a visible size

  // Apply rotation if specified
  if (sequence[seqIndex].rotation) {
    newSplat.rotation.set(
      sequence[seqIndex].rotation.x,
      sequence[seqIndex].rotation.y,
      sequence[seqIndex].rotation.z,
    );
  }

  // Check if bounds have been added
  if (sequence[seqIndex].bounds != null) {
    // Custom shader hook to cull splats based on dynamic bounds
    newSplat.setShaderHooks({
      vertexShaderHooks: {
        additionalUniforms: {
          xPos: ["float", sequence[seqIndex].bounds.xpos],
          yPos: ["float", sequence[seqIndex].bounds.ypos],
          zPos: ["float", sequence[seqIndex].bounds.zpos],
          xNeg: ["float", sequence[seqIndex].bounds.xneg],
          yNeg: ["float", sequence[seqIndex].bounds.yneg],
          zNeg: ["float", sequence[seqIndex].bounds.zneg],
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
      },
    });
  }

  newSplat.onLoad = () => {
    newScene.add(newSplat);
  };

  if (sequence[seqIndex].customSkybox != null) {
    const hdrLoader = new RGBELoader();
    hdrLoader.loadAsync(sequence[seqIndex].customSkybox).then((hdrTexture) => {
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
  imageContainer.style.display = "none";
  myImage = new Image();
  myImage.style.display = "none";
  myImage.style.maxWidth = "100vw";
  myImage.style.maxHeight = "100vh";
  imageContainer.appendChild(myImage);
}

function setupVideoScene() {
  // prepare a <video> element for video sequence items
  videoContainer.style.display = "none";
  myVideo = document.createElement("video");
  myVideo.controls = true;
  myVideo.style.display = "none";
  myVideo.style.maxWidth = "100vw";
  myVideo.style.maxHeight = "100vh";
  videoContainer.appendChild(myVideo);
}

function setupGLBScene(seqIndex) {
  let glbScene = new THREE.Scene();
  let glbCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  glbCamera.position.set(
    sequence[seqIndex].cameraStartPosition.x,
    sequence[seqIndex].cameraStartPosition.y,
    sequence[seqIndex].cameraStartPosition.z,
  );
  glbScene.add(new THREE.AmbientLight(0xffffff, 4));

  const gltfLoader = new GLTFLoader();
  gltfLoader.load(sequence[seqIndex].src, (gltf) => {
    myGLB = gltf.scene;
    myGLB.scale.set(
      sequence[seqIndex].scale.x,
      sequence[seqIndex].scale.y,
      sequence[seqIndex].scale.z,
    ); // Scale the model
    myGLB.position.set(
      sequence[seqIndex].position.x,
      sequence[seqIndex].position.y,
      sequence[seqIndex].position.z,
    ); // Position the model
    glbScene.add(myGLB);
  });
  if (sequence[seqIndex].customSkybox != null) {
    const hdrLoader = new RGBELoader();
    hdrLoader.loadAsync(sequence[seqIndex].customSkybox).then((hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      glbScene.background = hdrTexture;
    });
  }
  sequence[seqIndex].scene = glbScene;
  sequence[seqIndex].camera = glbCamera;
}

function setupPLYScene(seqIndex) {
  let plyScene = new THREE.Scene();
  let plyCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  plyCamera.position.set(
    sequence[seqIndex].cameraStartPosition.x,
    sequence[seqIndex].cameraStartPosition.y,
    sequence[seqIndex].cameraStartPosition.z,
  );
  plyScene.add(new THREE.AmbientLight(0xffffff, 4));

  const plyObject = new SplatMesh({ url: sequence[seqIndex].src });
  if (sequence[seqIndex].rotation) {
    plyObject.rotation.set(
      sequence[seqIndex].rotation.x,
      sequence[seqIndex].rotation.y,
      sequence[seqIndex].rotation.z,
    );
  }
  plyObject.position.set(
    sequence[seqIndex].position.x,
    sequence[seqIndex].position.y,
    sequence[seqIndex].position.z,
  );
  plyScene.add(plyObject);

  if (sequence[seqIndex].customSkybox != null) {
    const hdrLoader = new RGBELoader();
    hdrLoader.loadAsync(sequence[seqIndex].customSkybox).then((hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
      plyScene.background = hdrTexture;
    });
  }
  sequence[seqIndex].scene = plyScene;
  sequence[seqIndex].camera = plyCamera;
  sequence[seqIndex].plyObject = plyObject;
}

function setupAudioScene() {
  // prepare an <audio> element for audio playback
  audioContainer =
    document.getElementById("audio-container") || document.createElement("div");
  audioContainer.id = "audio-container";
  audioContainer.style.display = "none";
  myAudio = document.createElement("audio");
  myAudio.controls = true;
  myAudio.style.maxWidth = "100vw";
  audioContainer.appendChild(myAudio);
  if (!document.getElementById("audio-container")) {
    document.body.appendChild(audioContainer);
  }
}

function setup3DText() {
  // Scene for the 3D text
  scene3DText = new THREE.Scene();
  camera3DText = new THREE.OrthographicCamera(
    960 / -2,
    960 / 2,
    150 / 2,
    150 / -2,
    0.001,
    1000,
  );
  camera3DText.lookAt(new THREE.Vector3(0, 0, 0));
  scene3DText.add(new THREE.AmbientLight(0xffffff, 60));
  renderer3DText = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer3DText.setClearColor(0x000000, 0);
  renderer3DText.setSize(960, 150, false);
  document
    .getElementById("model-container")
    .appendChild(renderer3DText.domElement);

  const gltfLoader = new GLTFLoader();
  gltfLoader.load("/mesh/title7.glb", (gltf) => {
    titleMesh = gltf.scene;
    titleMesh.scale.set(10, 10, 10); // Scale the model
    titleMesh.position.set(0, 0, 0); // Position the model
    scene3DText.add(titleMesh);
  });
  const hdrLoader = new RGBELoader();
  hdrLoader.loadAsync("/hdr/misty_pines_2k.hdr").then((hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene3DText.environment = hdrTexture;
  });
}

function setupInput() {
  // Event listeners for keyboard and click-based navigation
  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        currentIndex = (currentIndex + 1) % sequence.length;
        showCurrentContent();
      }
      if (event.key === "ArrowLeft") {
        currentIndex = (currentIndex - 1 + sequence.length) % sequence.length;
        showCurrentContent();
      }
      if (event.key === "x") {
        xpositive.value = xpositive.value - 0.1;
      }
      if (event.key === "y") {
        ypositive.value = ypositive.value - 0.1;
      }
      if (event.key === "z") {
        zpositive.value = zpositive.value - 0.1;
      }
      if (event.key === "a") {
        xnegative.value = xnegative.value + 0.1;
      }
      if (event.key === "b") {
        ynegative.value = ynegative.value + 0.1;
      }
      if (event.key === "c") {
        znegative.value = znegative.value + 0.1;
      }
      // Rotation controls for current splat
      if (event.key === "q") {
        if (sequence[currentIndex].rotation) {
          sequence[currentIndex].rotation.x += 0.1;
          console.log(
            `Rotation: x: ${sequence[currentIndex].rotation.x.toFixed(2)}, y: ${sequence[currentIndex].rotation.y.toFixed(2)}, z: ${sequence[currentIndex].rotation.z.toFixed(2)}`,
          );
        }
      }
      if (event.key === "w") {
        if (sequence[currentIndex].rotation) {
          sequence[currentIndex].rotation.x -= 0.1;
          console.log(
            `Rotation: x: ${sequence[currentIndex].rotation.x.toFixed(2)}, y: ${sequence[currentIndex].rotation.y.toFixed(2)}, z: ${sequence[currentIndex].rotation.z.toFixed(2)}`,
          );
        }
      }
      if (event.key === "e") {
        if (sequence[currentIndex].rotation) {
          sequence[currentIndex].rotation.y += 0.1;
          console.log(
            `Rotation: x: ${sequence[currentIndex].rotation.x.toFixed(2)}, y: ${sequence[currentIndex].rotation.y.toFixed(2)}, z: ${sequence[currentIndex].rotation.z.toFixed(2)}`,
          );
        }
      }
      if (event.key === "r") {
        if (sequence[currentIndex].rotation) {
          sequence[currentIndex].rotation.y -= 0.1;
          console.log(
            `Rotation: x: ${sequence[currentIndex].rotation.x.toFixed(2)}, y: ${sequence[currentIndex].rotation.y.toFixed(2)}, z: ${sequence[currentIndex].rotation.z.toFixed(2)}`,
          );
        }
      }
      if (event.key === "t") {
        if (sequence[currentIndex].rotation) {
          sequence[currentIndex].rotation.z += 0.1;
          console.log(
            `Rotation: x: ${sequence[currentIndex].rotation.x.toFixed(2)}, y: ${sequence[currentIndex].rotation.y.toFixed(2)}, z: ${sequence[currentIndex].rotation.z.toFixed(2)}`,
          );
        }
      }
      if (event.key === "y") {
        if (sequence[currentIndex].rotation) {
          sequence[currentIndex].rotation.z -= 0.1;
          console.log(
            `Rotation: x: ${sequence[currentIndex].rotation.x.toFixed(2)}, y: ${sequence[currentIndex].rotation.y.toFixed(2)}, z: ${sequence[currentIndex].rotation.z.toFixed(2)}`,
          );
        }
      }
    });

    // Event listeners for mouse navigation
    document.getElementById("arrow-left").addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + sequence.length) % sequence.length;
      showCurrentContent();
    });
    document.getElementById("arrow-right").addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % sequence.length;
      showCurrentContent();
    });

    // Click handler for description to toggle answer field
    document
      .getElementById("question-text")
      .addEventListener("click", toggleAnswer);
    document
      .getElementById("answer-text")
      .addEventListener("click", toggleAnswer);

    // Audio control buttons
    document.getElementById("audio-start").addEventListener("click", () => {
      if (myAudio) myAudio.play();
    });
    document.getElementById("audio-stop").addEventListener("click", () => {
      if (myAudio) myAudio.pause();
    });
  });
}

function toggleAnswer() {
  const answerElement = document.getElementById("answer-text");
  const textWrapper = document.getElementById("text-wrapper");
  const currentItem = sequence[currentIndex];

  // Check if answer field is visible
  if (answerElement.classList.contains("visible")) {
    // Hide the answer field
    answerElement.classList.remove("visible");
    if (textWrapper) {
      textWrapper.classList.remove("answer-open");
    }
  } else {
    // Show the answer field
    answerElement.innerText = currentItem.answer || "Keine Antwort vorhanden";
    answerElement.classList.add("visible");
    if (textWrapper) {
      textWrapper.classList.add("answer-open");
    }
  }
}

function changeScene(
  scene,
  camera,
  cameraStartPosition,
  description,
  cameraLookAt,
) {
  currentScene = scene;
  currentCamera = camera;
  camera.position.set(
    cameraStartPosition.x,
    cameraStartPosition.y,
    cameraStartPosition.z,
  );
  const lookAt = cameraLookAt || new THREE.Vector3(0, 0, 0);
  orbitControls.object = currentCamera;
  orbitControls.target.set(lookAt.x, lookAt.y, lookAt.z);
  orbitControls.enableDamping = false;
  orbitControls.update();
  orbitControls.enableDamping = true;
  document.getElementById("question-text").innerText = description;
  document.getElementById("answer-text").classList.remove("visible");
  document.getElementById("answer-text").innerText = "";
  const textWrapper = document.getElementById("text-wrapper");
  if (textWrapper) {
    textWrapper.classList.remove("answer-open");
  }
}

// Display the current content item
function showCurrentContent() {
  renderer.domElement.style.display = "none";
  imageContainer.style.display = "none";
  if (myImage) {
    myImage.style.display = "none";
  }
  videoContainer.style.display = "none";
  if (myVideo) {
    myVideo.style.display = "none";
  }
  if (plyContainer) {
    plyContainer.style.display = "none";
  }
  const item = sequence[currentIndex];

  // Stop audio only if the new item has different audio
  if (item.audio !== currentAudioSrc) {
    if (myAudio) {
      myAudio.pause();
      myAudio.currentTime = 0;
      audioContainer.style.display = "none";
    }
  }
  // Text container
  let textContainer = document.getElementById("text-container");
  if (textContainer) textContainer.style.display = "none";
  // Audio element
  let audioElem = document.getElementById("audio-player");
  if (audioElem) {
    audioElem.pause();
    audioElem.style.display = "none";
  }

  if (item.type === "luma-splat") {
    renderer.domElement.style.display = "block";
    changeScene(
      item.scene,
      item.camera,
      item.cameraStartPosition,
      item.description,
      item.cameraLookAt,
    );
  } else if (item.type === "glb") {
    renderer.domElement.style.display = "block";
    changeScene(
      item.scene,
      item.camera,
      item.cameraStartPosition,
      item.description,
      item.cameraLookAt,
    );
  } else if (item.type === "ply-splat") {
    renderer.domElement.style.display = "block";
    changeScene(
      item.scene,
      item.camera,
      item.cameraStartPosition,
      item.description,
      item.cameraLookAt,
    );
  } else if (item.type === "image") {
    imageContainer.style.display = "flex";
    if (myImage) {
      myImage.src = item.src;
      myImage.style.display = "block";
      if (item.width) myImage.width = item.width;
      if (item.height) myImage.height = item.height;
    }
    document.getElementById("question-text").innerText =
      item.description || "Bild";
    document.getElementById("answer-text").classList.remove("visible");
    document.getElementById("answer-text").innerText = "";
    const textWrapper = document.getElementById("text-wrapper");
    if (textWrapper) {
      textWrapper.classList.remove("answer-open");
    }
  } else if (item.type === "video") {
    videoContainer.style.display = "flex";
    if (myVideo) {
      myVideo.src = item.src;
      myVideo.style.display = "block";
      if (item.width) myVideo.width = item.width;
      if (item.height) myVideo.height = item.height;
      myVideo.autoplay = true;
      myVideo.loop = true;
      myVideo.load();
      // Set muted to allow autoplay without user interaction:
      myVideo.muted = true;
      myVideo.play();
    }
    document.getElementById("question-text").innerText =
      item.description || "Video";
    document.getElementById("answer-text").classList.remove("visible");
    document.getElementById("answer-text").innerText = "";
    const textWrapper = document.getElementById("text-wrapper");
    if (textWrapper) {
      textWrapper.classList.remove("answer-open");
    }
  }

  // Handle audio playback (can be added to any content type)
  if (item.audio) {
    audioContainer.style.display = "block";
    document.getElementById("audio-start").style.display = "block";
    document.getElementById("audio-stop").style.display = "block";
    if (myAudio) {
      // Only load and play if it's a different audio file
      if (item.audio !== currentAudioSrc) {
        myAudio.src = item.audio;
        currentAudioSrc = item.audio;
        myAudio.play();
      }
      // If same audio, it keeps playing
    }
  } else {
    document.getElementById("audio-start").style.display = "none";
    document.getElementById("audio-stop").style.display = "none";
    currentAudioSrc = null;
  }
}

// Animation loop per frame
function animate() {
  orbitControls.update();

  // Apply rotation updates to current splat
  if (
    sequence[currentIndex].type === "luma-splat" &&
    sequence[currentIndex].splat &&
    sequence[currentIndex].rotation
  ) {
    sequence[currentIndex].splat.rotation.set(
      sequence[currentIndex].rotation.x,
      sequence[currentIndex].rotation.y,
      sequence[currentIndex].rotation.z,
    );
  }

  // Apply rotation updates to current ply
  if (
    sequence[currentIndex].type === "ply-splat" &&
    sequence[currentIndex].plyObject &&
    sequence[currentIndex].rotation
  ) {
    sequence[currentIndex].plyObject.rotation.set(
      sequence[currentIndex].rotation.x,
      sequence[currentIndex].rotation.y,
      sequence[currentIndex].rotation.z,
    );
  }

  if (
    sequence[currentIndex].customSkybox != null &&
    sequence[currentIndex].type === "luma-splat"
  ) {
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
