import {
  ACESFilmicToneMapping,
  AnimationClip,
  AnimationMixer,
  Clock,
  Euler,
  Group,
  HemisphereLight,
  InterpolateSmooth,
  LoopOnce,
  MathUtils,
  Mesh,
  MirroredRepeatWrapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  QuaternionKeyframeTrack,
  Scene,
  ShaderMaterial,
  SpotLight,
  TextureLoader,
  Vector3,
  VectorKeyframeTrack,
  WebGLRenderer,
} from "three";

import { Water } from "./objects/water.js";
import { Sky } from "three/examples/jsm/objects/Sky";
import * as joystick from "nipplejs";
import { JoystickManager } from "nipplejs";
import { garbageCollector } from "./game/garbageCollector";
import { moveCollectedBits } from "./game/physics";
import {
  crystalUiElement,
  nextLevel,
  nextLevelButton,
  progressUiElement,
  setProgress,
  shieldUiElement,
  showLevelEndScreen,
  startGameButton,
  startPanel,
  uiInit,
  updateLevelEndUI,
} from "./game/ui";
import {
  addBackgroundBit,
  addChallengeRow,
  challengeRows,
  environmentBits,
  mothershipModel,
  objectsInit,
  rocketModel,
  starterBay,
} from "./game/objects";
import { isTouchDevice } from "./isTouchDevice";
import { detectCollisions } from "./game/collisionDetection";
import { Material } from "three/src/materials/Material";

export const scene = new Scene();
export const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

let renderer: WebGLRenderer;

export const destructionBits = new Array<Mesh>();

let cameraAngleStartAnimation = 0.0;

let positionOffset = 0.0;

let joystickManager: JoystickManager | null;

const waterGeometry = new PlaneGeometry(10000, 10000);

const water = new Water(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: new TextureLoader().load(
    "static/normals/waternormals.jpeg",
    function (texture) {
      texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
    }
  ),
  sunDirection: new Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  distortionScale: 3.7,
  fog: scene.fog !== undefined,
});

let distance = 0.0;
let leftPressed = false;
let rightPressed = false;

const sun = new Vector3();
const light = new HemisphereLight(0xffffff, 0x444444, 1.0);
light.position.set(0, 1, 0);
scene.add(light);

export const sceneConfiguration = {
  ready: false,
  cameraMovingToStartPosition: false,
  rocketMoving: false,
  data: {
    crystalsCollected: 0,
    shieldsCollected: 0,
  },
  courseLength: 500,
  courseProgress: 0,
  levelOver: false,
  level: 1,

  coursePercentComplete: () =>
    sceneConfiguration.courseProgress / sceneConfiguration.courseLength,
  cameraStartAnimationPlaying: false,
  backgroundBitCount: 0,
  challengeRowCount: 0,
  speed: 0.0,
};

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateWaterMaterial();
}

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max);

const animate = () => {
  requestAnimationFrame(animate);

  if (leftPressed) {
    rocketModel.position.x -= 0.5;
  }

  if (rightPressed) {
    rocketModel.position.x += 0.5;
  }

  rocketModel.position.x += positionOffset;

  rocketModel.position.x = clamp(rocketModel.position.x, -20, 25);

  if (sceneConfiguration.rocketMoving) {
    progressUiElement.style.width =
      String(sceneConfiguration.coursePercentComplete() * 200) + "px";
    sceneConfiguration.speed += 0.001;
    sceneConfiguration.courseProgress += sceneConfiguration.speed;

    garbageCollector();
  }

  if (sceneConfiguration.ready) {
    if (rocketModel.userData?.mixer != null) {
      rocketModel.userData?.mixer?.update(
        rocketModel.userData.clock.getDelta()
      );
    }

    if (!sceneConfiguration.cameraStartAnimationPlaying) {
      camera.position.x = 20 * Math.cos(cameraAngleStartAnimation);
      camera.position.z = 20 * Math.sin(cameraAngleStartAnimation);
      camera.position.y = 30;
      camera.lookAt(rocketModel.position);
      cameraAngleStartAnimation += 0.005;
    }
    if (sceneConfiguration.levelOver) {
      if (sceneConfiguration.speed > 0) {
        sceneConfiguration.speed -= 0.1;
      }
    }

    destructionBits.forEach((mesh) => {
      if (mesh.userData.clock && mesh.userData.mixer) {
        mesh.userData.mixer.update(mesh.userData.clock.getDelta());
      }
    });

    camera.userData?.mixer?.update(camera.userData?.clock?.getDelta());

    if (sceneConfiguration.rocketMoving) {
      detectCollisions();

      for (let i = 0; i < environmentBits.length; i++) {
        let mesh = environmentBits[i];
        mesh.position.z += sceneConfiguration.speed;
      }

      for (let i = 0; i < challengeRows.length; i++) {
        challengeRows[i].rowParent.position.z += sceneConfiguration.speed;
      }

      if (
        (!environmentBits.length || environmentBits[0].position.z > -1300) &&
        !sceneConfiguration.levelOver
      ) {
        addBackgroundBit(sceneConfiguration.backgroundBitCount++, true);
      }

      if (
        (!challengeRows.length ||
          challengeRows[0].rowParent.position.z > -1300) &&
        !sceneConfiguration.levelOver
      ) {
        addChallengeRow(sceneConfiguration.challengeRowCount++, true);
      }

      if (starterBay != null) {
        starterBay.position.z += sceneConfiguration.speed;
      }

      if (starterBay.position.z > 200) {
        scene.remove(starterBay);
      }
    }

    moveCollectedBits();

    if (sceneConfiguration.courseProgress >= sceneConfiguration.courseLength) {
      if (!rocketModel.userData.flyingAway) {
        endLevel(false);
      }
    }

    if (rocketModel.userData.flyingAway) {
      camera.lookAt(rocketModel.position);
    }
  }
  updateWaterMaterial();
  renderer.render(scene, camera);
};

async function init() {
  renderer = new WebGLRenderer();
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  if (isTouchDevice()) {
    let touchZone = document.getElementById("joystick-zone");

    if (touchZone != null) {
      joystickManager = joystick.create({
        zone: document.getElementById("joystick-zone")!,
      });
      joystickManager.on("move", (event, data) => {
        positionOffset = data.vector.x;
      });
      joystickManager.on("end", (event, data) => {
        positionOffset = 0.0;
      });
    }
  }

  startPanel.classList.remove("hidden");

  nextLevelButton.onclick = (event) => {
    nextLevel();
  };

  startGameButton.onclick = (event) => {
    sceneConfiguration.cameraStartAnimationPlaying = true;
    shieldUiElement.classList.remove("danger");
    document.getElementById("headsUpDisplay")!.classList.remove("hidden");

    camera.userData.mixer = new AnimationMixer(camera);
    let track = new VectorKeyframeTrack(
      ".position",
      [0, 2],
      [
        camera.position.x, // x 1
        camera.position.y, // y 1
        camera.position.z, // z 1
        0, // x 2
        30, // y 2
        100, // z 2
      ],
      InterpolateSmooth
    );

    let identityRotation = new Quaternion().setFromAxisAngle(
      new Vector3(-1, 0, 0),
      0.3
    );

    let rotationClip = new QuaternionKeyframeTrack(
      ".quaternion",
      [0, 2],
      [
        camera.quaternion.x,
        camera.quaternion.y,
        camera.quaternion.z,
        camera.quaternion.w,
        identityRotation.x,
        identityRotation.y,
        identityRotation.z,
        identityRotation.w,
      ]
    );

    const animationClip = new AnimationClip("animateIn", 4, [
      track,
      rotationClip,
    ]);
    const animationAction = camera.userData.mixer.clipAction(animationClip);
    animationAction.setLoop(LoopOnce, 1);
    animationAction.clampWhenFinished = true;

    camera.userData.clock = new Clock();
    camera.userData.mixer.addEventListener("finished", function () {
      camera.lookAt(new Vector3(0, -500, -1400));
      sceneConfiguration.rocketMoving = true;
    });

    camera.userData.mixer.clipAction(animationClip).play();

    startPanel.classList.add("hidden");
  };

  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);

  setProgress("Scene loaded!");
  document.getElementById("loadingCover")?.remove();
  document.getElementById("loadingTextContainer")?.remove();
  document.getElementById("rocketPicture")?.remove();

  water.rotation.x = -Math.PI / 2;
  water.rotation.z = 0;

  scene.add(water);
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  const parameters = {
    elevation: 3,
    azimuth: 115,
  };

  const pmremGenerator = new PMREMGenerator(renderer);

  const phi = MathUtils.degToRad(90 - parameters.elevation);
  const theta = MathUtils.degToRad(parameters.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms["sunPosition"].value.copy(sun);
  (water.material as ShaderMaterial).uniforms["sunDirection"].value
    .copy(sun)
    .normalize();
  scene.environment = pmremGenerator.fromScene(sky as any).texture;

  (water.material as ShaderMaterial).uniforms["speed"].value = 0.0;

  const shadowLight = new SpotLight();
  shadowLight.lookAt(rocketModel.position);
  shadowLight.position.z = 50;
  shadowLight.position.y = 100;
  shadowLight.position.x = 100;
  shadowLight.castShadow = true;
  scene.add(shadowLight);

  rocketModel.scale.set(0.3, 0.3, 0.3);
  scene.add(rocketModel);
  scene.add(mothershipModel);

  mothershipModel.position.y = 200;
  mothershipModel.position.z = 100;
  mothershipModel.scale.set(15, 15, 15);
  sceneConfiguration.ready = true;
  sceneSetup(sceneConfiguration.level);
}

export const endLevel = (damaged: boolean) => {
  updateLevelEndUI(damaged);
  sceneConfiguration.rocketMoving = false;
  sceneConfiguration.levelOver = true;
  rocketModel.userData.flyingAway = true;
  destructionBits.forEach((x) => {
    scene.remove(x);
  });
  destructionBits.length = 0;

  let destinationRotation = camera.position;
  let cubeLook = new Group();
  let rocketPositionCopy = rocketModel.position.clone();
  cubeLook.position.copy(rocketPositionCopy);
  cubeLook.lookAt(rocketModel.position);
  let lookAtRocketQuaternion = cubeLook.quaternion;

  let cameraRotationTrack = new QuaternionKeyframeTrack(
    ".quaternion",
    [0, 2],
    [
      camera.quaternion.x,
      camera.quaternion.y,
      camera.quaternion.z,
      camera.quaternion.w,
      lookAtRocketQuaternion.x,
      lookAtRocketQuaternion.y,
      lookAtRocketQuaternion.z,
      lookAtRocketQuaternion.w,
    ]
  );

  const lookAtRocketAnimationClip = new AnimationClip("lookAtRocket", 2, [
    cameraRotationTrack,
  ]);
  const lookAtRocketAnimationAction = camera.userData.mixer.clipAction(
    lookAtRocketAnimationClip
  );
  lookAtRocketAnimationAction.setLoop(LoopOnce, 1);
  lookAtRocketAnimationAction.clampWhenFinished = true;
  lookAtRocketAnimationAction.play();

  rocketModel.userData.mixer = new AnimationMixer(rocketModel);
  let track = new VectorKeyframeTrack(
    ".position",
    [2, 3, 5],
    [
      rocketModel.position.x,
      rocketModel.position.y,
      rocketModel.position.z,
      20,
      100,
      20,
      40,
      400,
      100,
    ]
  );

  let destinationQuaternion = new Quaternion().setFromEuler(
    new Euler(-90, 0, -90)
  );

  let rotationTrack = new QuaternionKeyframeTrack(
    ".quaternion",
    [0, 2],
    [
      rocketModel.quaternion.x,
      rocketModel.quaternion.y,
      rocketModel.quaternion.z,
      rocketModel.quaternion.w,
      destinationQuaternion.x,
      destinationQuaternion.y,
      destinationQuaternion.z,
      destinationQuaternion.w,
    ]
  );

  rocketModel.userData.clock = new Clock();

  const animationClip = new AnimationClip("flyAway", 6, [track, rotationTrack]);
  const animationAction = rocketModel.userData.mixer.clipAction(animationClip);
  animationAction.setLoop(LoopOnce, 1);
  animationAction.clampWhenFinished = true;

  rocketModel.userData.mixer.addEventListener("finished", function () {
    showLevelEndScreen();
  });
  animationAction.play();
};

function updateWaterMaterial() {
  (water.material as ShaderMaterial).uniforms["time"].value += 1 / 60.0;
  if (sceneConfiguration.rocketMoving) {
    (water.material as ShaderMaterial).uniforms["speed"].value +=
      sceneConfiguration.speed / 50;
  }
}

function onKeyDown(event: KeyboardEvent) {
  console.log("keypress");
  let keyCode = event.which;
  if (keyCode == 37) {
    leftPressed = true;
  } else if (keyCode == 39) {
    rightPressed = true;
  }
}

function onKeyUp(event: KeyboardEvent) {
  let keyCode = event.which;
  if (keyCode == 37) {
    leftPressed = false;
  } else if (keyCode == 39) {
    rightPressed = false;
  }
}

export const sceneSetup = (level: number) => {
  sceneConfiguration.challengeRowCount = 0;
  sceneConfiguration.backgroundBitCount = 0;

  camera.position.z = 50;
  camera.position.y = 12;
  camera.position.x = 15;
  camera.rotation.y = 2.5;

  scene.add(starterBay);

  starterBay.position.copy(new Vector3(10, 0, 120));

  rocketModel.rotation.x = Math.PI;
  rocketModel.rotation.z = Math.PI;

  rocketModel.position.z = 70;
  rocketModel.position.y = 10;
  rocketModel.position.x = 0;

  challengeRows.forEach((x) => {
    scene.remove(x.rowParent);
  });

  environmentBits.forEach((x) => {
    scene.remove(x);
  });

  environmentBits.length = 0;
  challengeRows.length = 0;

  for (let i = 0; i < 60; i++) {
    addChallengeRow(sceneConfiguration.challengeRowCount++);
    addBackgroundBit(sceneConfiguration.backgroundBitCount++);
  }

  sceneConfiguration.cameraStartAnimationPlaying = false;
  sceneConfiguration.levelOver = false;
  rocketModel.userData.flyingAway = false;
  sceneConfiguration.courseProgress = 0;
  sceneConfiguration.courseLength = 1000 * level;

  sceneConfiguration.data.shieldsCollected = 0;
  sceneConfiguration.data.crystalsCollected = 0;

  crystalUiElement.innerText = String(
    sceneConfiguration.data.crystalsCollected
  );
  shieldUiElement.innerText = String(sceneConfiguration.data.shieldsCollected);

  document.getElementById(
    "levelIndicator"
  )!.innerText = `LEVEL ${sceneConfiguration.level}`;
  sceneConfiguration.ready = true;
};

objectsInit().then((x) => {
  uiInit();
  init();
  animate();
});
