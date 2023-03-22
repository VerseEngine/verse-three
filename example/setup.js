import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

export function setupScene(
  tickFunc /* ?: (deltaTime: number) => void */,
  withVR
) {
  console.log(getRenderInfo());

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  /* renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1; */
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0.0, 1.5, 2.0);

  const scene = new THREE.Scene();

  {
    const light = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(light);
    staticize(light);
  }
  {
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(0, 10, -10).normalize();
    scene.add(light);
    staticize(light);
  }
  {
    const sky = new Sky();
    sky.name = "sky";
    sky.scale.setScalar(450000);
    scene.add(sky);
    staticize(sky);

    const uniforms = sky.material.uniforms;
    const phi = THREE.MathUtils.degToRad(90 - 30);
    const theta = THREE.MathUtils.degToRad(180);

    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, phi, theta);

    uniforms["sunPosition"].value.copy(sun);
  }
  let ground;
  {
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50, 1, 1),
      new THREE.MeshLambertMaterial({
        color: 0x5e5e5e,
      })
    );
    ground.name = "ground";
    ground.rotation.x = Math.PI / -2;
    scene.add(ground);
    staticize(ground);
  }
  {
    const gridHelper = new THREE.GridHelper(50, 50);
    scene.add(gridHelper);
    staticize(gridHelper);
  }

  const clock = new THREE.Clock();
  let prevTime = performance.now();
  let frames = 0;

  function animate() {
    const dt = clock.getDelta();
    if (tickFunc) {
      tickFunc(dt);
    }

    renderer.render(scene, camera);

    frames++;
    const time = performance.now();
    if (time >= prevTime + 1000) {
      // Frame rate can be monitored with Chrome's Live Expression, etc.
      window._fps = (frames * 1000) / (time - prevTime);
      prevTime = time;
      frames = 0;
    }
  }
  renderer.setAnimationLoop(animate);

  let vrButton = undefined;
  if (withVR) {
    if ("xr" in navigator) {
      navigator.xr
        .isSessionSupported("immersive-vr")
        .then(function (supported) {
          if (supported) {
            renderer.xr.enabled = true;

            document.addEventListener("keydown", function (e) {
              if (e.key === "Escape") {
                if (renderer.xr.isPresenting) {
                  renderer.xr.getSession()?.end();
                }
              }
            });
            vrButton = VRButton.createButton(renderer);
            document.body.appendChild(vrButton);
          }
        });
    } else {
      if (window.isSecureContext === false) {
        console.warn("webxr needs https");
      } else {
        console.warn("webxr not available");
      }
    }
  }

  {
    // For Three.js Inspector (https://zz85.github.io/zz85-bookmarklets/threelabs.html)
    window.THREE = THREE;
    window._scene = scene;
  }

  const res = {
    camera,
    scene,
    renderer,
    ground,
    vrButton,
  };
  window._debugCtx = res; // debug
  return res;
}

export function getRenderInfo() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      return {
        vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
      };
    }
  } catch (ex) {
    console.warn(ex);
  }
}

function staticize(o) {
  o.matrixAutoUpdate = false;
  o.matrixWorldAutoUpdate = false;
  o.updateMatrix();
  o.updateMatrixWorld();
}
