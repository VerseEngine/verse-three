import * as THREE from "three";
import { createNoise4D } from "simplex-noise";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  Body,
  Color,
  Emitter,
  Gravity,
  Life,
  Mass,
  Position,
  RadialVelocity,
  RandomDrift,
  Rate,
  Scale,
  Span,
  SphereZone,
  SpriteRenderer,
  Vector3D,
  System,
  ease,
} from "three-nebula";

export function createObject0(disposables, _color) {
  const g = new THREE.IcosahedronGeometry(1.5, 0);
  const m = new THREE.MeshPhysicalMaterial({
    // color,
    side: THREE.DoubleSide,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.5,
  });
  disposables.push(g, m);

  const mesh = new THREE.Mesh(g, m);

  mesh.position.set(0, 2, 0);

  let i = 0;
  const intervalSec = 1 / 60;
  let sec = 0;
  return {
    object: mesh,
    tick: (dt) => {
      sec += dt;
      if (sec < intervalSec) {
        return;
      }
      sec = 0;

      m.roughness = Math.max(0, Math.sin(i) / 4);
      i += 0.01;
      if (i > 0xffffffff) {
        i = 0;
      }

      const time = performance.now() * 0.001;
      mesh.rotation.x = time * 0.2;
      mesh.rotation.z = time * 0.15;
      mesh.updateMatrixWorld();
    },
  };
}
export function createTextObject(message, font, disposables, color) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    side: THREE.DoubleSide,
    metalness: 0,
    roughness: 0.5,
    transmission: 1,
    thickness: 0.5,
  });

  const g = new TextGeometry(message, {
    font,
    size: 0.3,
    height: 0.03,
  });
  g.computeBoundingBox();
  const xMid = -0.5 * (g.boundingBox.max.x - g.boundingBox.min.x);
  g.translate(xMid, 0, 0);

  disposables.push(g, m);

  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(0, 2, 0);

  const time = performance.now() * 0.001;
  mesh.rotation.x = time * -0.2;
  mesh.rotation.z = time * 0.15;
  mesh.updateMatrix();
  mesh.updateMatrixWorld();

  mesh.matrixAutoUpdate = false;
  mesh.matrixWorldAutoUpdate = false;

  const intervalSec = 1 / 60;
  let sec = 0;
  return {
    object: mesh,
    tick: (dt) => {
      sec += dt;
      if (sec < intervalSec) {
        return;
      }
      sec = 0;
      const time = performance.now() * 0.001;
      mesh.rotation.x = time * -0.2;
      mesh.rotation.z = time * 0.15;
      mesh.updateMatrix();
      mesh.updateMatrixWorld();
    },
  };
}
export function createObject1(disposables, color) {
  if (typeof color !== "object") {
    color = new THREE.Color(color);
  }
  // https://codepen.io/Esambino/pen/AvbXzm
  const { h, s, l } = color.getHSL({});
  const emissive = new THREE.Color();
  const specular = new THREE.Color();
  emissive.setHSL((h - 0.1) % 1, s, Math.max(0, l - 0.2));
  specular.setHSL((h + 0.2) % 1, s, Math.max(0, l - 0.1));

  const g = new THREE.SphereGeometry(0.5, 30, 30, 0, Math.PI * 2, 0, Math.PI);
  const m = new THREE.MeshPhongMaterial({
    color,
    emissive,
    specular,
    shininess: 3,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  disposables.push(g, m);

  const res = new THREE.Mesh(g, m);
  res.position.y = 2;

  const intervalSec = 1 / 60;
  let sec = 0;
  return {
    object: res,
    tick: (dt) => {
      sec += dt;
      if (sec < intervalSec) {
        return;
      }
      sec = 0;

      const time = performance.now() * 0.001;
      res.rotation.x = time * 0.2;
      res.rotation.y = time * 0.15;
    },
  };
}
// https://codepen.io/seanfree/pen/xxbKqPv
// https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.4.0/simplex-noise.min.js
export function createObject2(disposables, color) {
  function createParticles() {
    if (positions) {
      return;
    }
    positions = new PropsArray(particleCount, positionProps);
    velocities = new PropsArray(particleCount, velocityProps);
    colors = new PropsArray(particleCount, colorProps);
    ages = new PropsArray(particleCount, ageProps);
    positions.map(createPosition);
    velocities.map(createVelocity);
    colors.map(createColor);
    ages.map(createAge);
  }

  function createMesh() {
    const uniforms = {
      u_texture: {
        type: "sampler2D",
        value: new THREE.TextureLoader().load(PARTICLE_TEXTURE),
      },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      uniforms,
    });

    geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions.values, positions.spread)
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors.values, colors.spread)
    );
    geometry.setAttribute(
      "age",
      new THREE.BufferAttribute(ages.values, ages.spread)
    );

    const mesh = new THREE.Points(geometry, material);
    mesh.rotation.x = 0.5;
    mesh.scale.set(0.01, 0.01, 0.01);
    return mesh;
  }
  function resetParticle(i) {
    positions.set(createPosition(), i * positions.spread);
    velocities.set(createVelocity(), i * velocities.spread);
    colors.set(createColor(), i * colors.spread);
    ages.set(createAge(), i * ages.spread);
  }

  function updateParticles() {
    let i, x, y, z, vx, vy, vz, vw, age, life, p, t;

    for (i = 0; i < particleCount; i++) {
      [age, life] = ages.get(i * ages.spread);

      if (age > life) {
        resetParticle(i);
      } else {
        ([x, y, z] = positions.get(i * positions.spread)),
          ([vx, vy, vz, vw] = velocities.get(i * velocities.spread));

        t = noise4D(x * 0.005, y * 0.005, z * 0.005, time * 0.0005) * TAU * 6;
        p = t * 2;

        vx = lerp(vx, sin(p) * cos(t) * vw, 0.25);
        vy = lerp(vy, sin(p) * sin(t) * vw, 0.25);
        vz = lerp(vz, cos(p) * vw, 0.25);
        vw *= 0.9975;

        x = lerp(x, x + vx, 0.125);
        y = lerp(y, y + vy, 0.125);
        z = lerp(z, z + vz, 0.125);

        positions.set([x, y, z], i * positions.spread);
        velocities.set([vx, vy, vz, vw], i * velocities.spread);
        ages.set([++age], i * ages.spread);
      }
    }
  }

  function createPosition(_v, _i) {
    let d, p, t, x, y, z;

    d = 100;
    p = rand(TAU);
    t = rand(PI);

    x = d * sin(p) * cos(t);
    y = d * sin(p) * sin(t);
    z = d * cos(p);

    return [x, y, z];
  }

  function createVelocity(_v, _i) {
    let vx, vy, vz, vw;

    vx = vy = vz = 0;
    vw = 6 + rand(4);

    return [vx, vy, vz, vw];
  }

  function createAge(_v, _i) {
    let age, life;

    age = 0;
    life = rand(300) + 100;

    return [age, life];
  }

  if (typeof color !== "object") {
    color = new THREE.Color(color);
  }
  const { h, s } = color.getHSL({});
  const tmpColor = new THREE.Color();

  function createColor(_v, _i) {
    // let r, g, b;
    /* r = fadeIn(60 + rand(40), 360);
    g = fadeIn(60 + rand(60), 360);
    b = fadeIn(100 + rand(120), 360); */

    tmpColor.setHSL(h, s, 0.5 + Math.random() * 0.5);

    return [tmpColor.r, tmpColor.g, tmpColor.b];
  }

  const VERT_SHADER = `
attribute vec3 color;
attribute vec2 age;

varying vec3 v_color;
varying vec2 v_age;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.);

  v_color = color;
  v_age = age;

  gl_PointSize = 8. * (8. / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
  `;
  const FRAG_SHADER = `
uniform sampler2D u_texture;

varying vec3 v_color;
varying vec2 v_age;

float fadeInOut(float t, float m) {
  float h = .5 * m;

  return abs(mod((t + h), m) - h) / h;
}	

void main() {
  float alpha = fadeInOut(v_age.s, v_age.t);
  
  gl_FragColor = vec4(v_color, alpha) * texture2D(u_texture, gl_PointCoord);
}
  `;

  // https://codepen.io/seanfree/pen/LvrJWz.js
  const { cos, PI, random, sin } = Math;
  const TAU = 2 * PI;
  const rand = (n) => n * random();
  // const fadeIn = (t, m) => t / m;
  const lerp = (a, b, t) => (1 - t) * a + t * b;

  Float32Array.prototype.get = function (i = 0, n = 0) {
    return this.slice(i, i + n);
  };

  class PropsArray {
    constructor(count = 0, props = [], type = "float") {
      this.count = count;
      this.props = props;
      this.spread = props.length;
      this.values =
        type === "float"
          ? new Float32Array(count * props.length)
          : new Uint32Array(count * props.length);
    }
    get length() {
      return this.values.length;
    }
    set(a = [], i = 0) {
      this.values.set(a, i);
    }
    setMap(o = {}, i = 0) {
      this.set(Object.values(o), i);
    }
    get(i = 0) {
      return this.values.get(i, this.spread);
    }
    getMap(i = 0) {
      return this.get(i).reduce((r, v, i) => {
        r[this.props[i]] = v;

        return r;
      }, {});
    }
    forEach(cb) {
      let i = 0;

      for (; i < this.length; i += this.spread) {
        cb(this.get(i), i, this);
      }
    }
    map(cb) {
      let i = 0;

      for (; i < this.length; i += this.spread) {
        this.set(cb(this.get(i), i, this), i);
      }
    }
    async *read() {
      let i = 0;

      for (; i < this.length; i += this.spread) {
        yield { index: i, value: this.get(i) };
      }
    }
  }

  const PARTICLE_TEXTURE =
    "data:image/png;base64,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";

  const INTERVAL_SEC = 1 / 30; // 30fps

  const particleCount = 10000;
  const positionProps = ["x", "y", "z"];
  const velocityProps = ["vx", "vx", "vz", "vw"];
  const ageProps = ["age", "life"];
  const colorProps = ["r", "g", "b"];
  const noise4D = createNoise4D();

  let time = 0;
  let geometry;
  let positions;
  let velocities;
  let ages;
  let colors;

  return (() => {
    createParticles();
    const mesh = createMesh();
    disposables.push(mesh.geometry, mesh.material);
    let sec = 0;
    mesh.position.y = 2;
    return {
      object: mesh,
      tick: (dt) => {
        sec += dt;
        if (sec < INTERVAL_SEC) {
          return;
        }
        sec = 0;

        time++;
        updateParticles();
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.attributes.age.needsUpdate = true;
        mesh.rotation.y += 0.003;
      },
    };
  })();
}

export function createObject3(disposables, color) {
  if (typeof color !== "object") {
    color = new THREE.Color(color);
  }
  const { h, s, l } = color.getHSL({});
  let color1 = new THREE.Color();
  color1.setHSL((h + 0.5) % 1.0, s, l);
  color = color.getStyle().replace("rgb(", "vec3(");
  color1 = color1.getStyle().replace("rgb(", "vec3(");

  // https://codepen.io/tksiiii/pen/WJZPmY
  const vertices = 100000; // Number of vertices
  const axes = 3; // The number of axes
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array(vertices * axes);
  const width = 1;
  const halfWidth = width / 2;
  const maxDistance = Math.sqrt(halfWidth ** 2 * 2);

  for (let i = 0, len = positions.length; i < len; i += axes) {
    const x = width * Math.random() - halfWidth;
    const y = width * Math.random() - halfWidth;
    const z = width * Math.random() - halfWidth;
    positions[i] = x;
    positions[i + 1] = y;
    positions[i + 2] = z;
  }
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const m = new THREE.PointsMaterial({
    size: 0.004,
    transparent: false,
    blending: THREE.AdditiveBlending,
    onBeforeCompile: (shader) => {
      shader.vertexShader = `
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
        `#include <color_vertex>`,
        `#include <color_vertex>
        float d = distance(position, vec3(0., 0., 0.)) / ${maxDistance} - 0.2;
        d = clamp(d, 0., 1.);
        vColor = mix(${color1}, ${color}, d) / 255.;
      `
      );
      shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `
        .replace(
          `#include <clipping_planes_fragment>`,
          `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
      `
        )
        .replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d));`
        );
    },
  });
  const points = new THREE.Points(g, m);
  disposables.push(g, m);

  points.position.y = 2;
  return {
    object: points,
    tick: () => {
      points.rotation.y -= 0.001;
      points.rotation.z -= 0.001;
    },
  };
}

export function createObject4(disposables, color) {
  if (typeof color !== "object") {
    color = new THREE.Color(color);
  }
  const { h, s, l } = color.getHSL({});
  let color1 = new THREE.Color();
  color1.setHSL((h + 0.3) % 1.0, s, l);
  let color2 = new THREE.Color();
  color2.setHSL((h - 0.3) % 1.0, s, l);

  // https://three-nebula.org/examples/gravity
  const DOT =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAJkSURBVHjaxJeJbusgEEW94S1L//83X18M2MSuLd2pbqc4wZGqRLrKBsyZhQHny7Jk73xVL8xpVhWrcmiB5lX+6GJ5YgQ2owbAm8oIwH1VgKZUmGcRqKGGPgtEQQAzGR8hQ59fAmhJHSAagigJ4E7GPWRXOYC6owAd1JM6wDQPADyMWUqZRMqmAojHp1Vn6EQQEgUNMJLnUjMyJsM49wygBkAPw9dVFwXRkncCIIW3GRgoTQUZn6HxCMAFEFd8TwEQ78X4rHbILoAUmeT+RFG4UhQ6MiIAE4W/UsYFjuVjAIa2nIY4q1R0GFtQWG3E84lqw2GO2QOoCKBVu0BAPgDSU0eUDjjQenNkV/AW/pWChhpMTelo1a64AOKM30vk18GzTHXCNtI/Knz3DFBgsUqBGIjTInXRY1yA9xkVoqW5tVq3pDR9A0hfF5BSARmVnh7RMDCaIdcNgbPBkgzn1Bu+SfIEFSpSBmkxyrMicb0fAEuCZrWnN89veA/4XcakrPcjBWzkTuLjlbfTQPOlBhz+HwkqqPXmPQDdrQItxE1moGof1S74j/8txk8EHhTQrAE8qlwfqS5yukm1x/rAJ9Jiaa6nyATqD78aUVBhFo8b1V4DdTXdCW+IxA1zB4JhiOhZMEWO1HqnvdoHZ4FAMIhV9REF8FiUm0jsYPEJx/Fm/N8OhH90HI9YRHesWbXXZwAShU8qThe7H8YAuJmw5yOd989uRINKRTJAhoF8jbqrHKfeCYdIISZfSq26bk/K+yO3YvfKrVgiwQBHnwt8ynPB25+M8hceTt/ybPhnryJ78+tLgAEAuCFyiQgQB30AAAAASUVORK5CYII=";
  const createSprite = () => {
    const map = new THREE.TextureLoader().load(DOT);
    const material = new THREE.SpriteMaterial({
      map: map,
      color: 0xff0000,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    return new THREE.Sprite(material);
  };

  const createEmitter = () => {
    const emitter = new Emitter();
    return (
      emitter
        // https://three-nebula-docs.netlify.app/class/src/initializer/rate.js~rate
        // .setRate(new Rate(new Span(5, 10), new Span(0.1, 0.2)))
        .setRate(new Rate(new Span(10, 50), new Span(0.1, 0.2)))
        .addInitializers([
          new Body(createSprite()),
          new Mass(1000),
          new Life(2, 3),
          new Position(new SphereZone(0.2)),
          new RadialVelocity(new Span(2, 3), new Vector3D(0, 1, 0), 5),
        ])
        .addBehaviours([
          new RandomDrift(5, 5, 5, 0.1),
          new Scale(new Span(0.07, 0.05), 0),
          new Gravity(0.5),
          new Color(
            `#${color.getHexString()}`,
            [`#${color1.getHexString()}`, `#${color2.getHexString()}`],
            Infinity,
            ease.easeLinear
          ),
        ])
        .setPosition({ x: 0, y: 0.5 })
        .emit()
    );
  };

  const container = new THREE.Object3D();
  const nebula = new System()
    .addEmitter(createEmitter())
    .addRenderer(new SpriteRenderer(container, THREE));

  disposables.push({
    dispose: () => {
      nebula.destroy();
    },
  });

  return {
    object: container,
    tick: (_dt) => {
      nebula.update();
    },
  };
}
