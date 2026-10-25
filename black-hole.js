// A sphere and tilted particle annulus with bounded background-only sky lensing.
export function captureBlackHoleSky(THREE, renderer, backdrop, stars, compact = false) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1021);
  scene.add(backdrop.clone(), stars.clone());
  const target = new THREE.WebGLCubeRenderTarget(compact ? 128 : 256, {
    type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter
  });
  const camera = new THREE.CubeCamera(0.1, 600, target);
  const shadows = renderer.shadowMap.enabled, tone = renderer.toneMapping;
  try {
    renderer.shadowMap.enabled = false; renderer.toneMapping = THREE.NoToneMapping;
    camera.update(renderer, scene);
  } catch (error) { target.dispose(); throw error; }
  finally { renderer.shadowMap.enabled = shadows; renderer.toneMapping = tone; }
  return target;
}

export function createBlackHole(THREE, { compact = false, environment = null } = {}) {
  const mesh = new THREE.Group(); mesh.name = 'volumetric-black-hole';
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, compact ? 32 : 48, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  body.name = 'black-hole-sphere'; mesh.add(body);
  const uniforms = { uSky: { value: environment?.texture ?? null }, uCenter: { value: mesh.position },
    uRadius: { value: 1 }, uDiskNormal: { value: new THREE.Vector3(0, 1, 0) },
    uViewUp: { value: new THREE.Vector3(0, 1, 0) } };
  const lens = new THREE.Mesh(new THREE.SphereGeometry(4.5, compact ? 24 : 40, 24),
    new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `uniform samplerCube uSky; uniform vec3 uCenter;
        uniform float uRadius; uniform vec3 uDiskNormal; uniform vec3 uViewUp; varying vec3 vWorld;
        void main() {
          vec3 ray = normalize(vWorld - cameraPosition);
          vec3 towards = uCenter - cameraPosition;
          float distanceToHole = length(towards);
          vec3 axis = towards / distanceToHole;
          float impact = length(cross(ray, axis)) * distanceToHole / uRadius;
          if (impact > 4.5) discard;
          if (impact < 1.015) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }
          else {
            vec3 tangent = normalize(ray - axis * dot(ray, axis));
            float bend = 0.15 / (impact * impact) * (1.0 - smoothstep(3.0, 4.5, impact));
            vec3 warped = normalize(ray - tangent * bend);
            vec3 sky = textureCube(uSky, warped).rgb;
            vec3 softSky = (textureCube(uSky, normalize(warped + vec3(0.004, 0.0, 0.0))).rgb
              + textureCube(uSky, normalize(warped - vec3(0.004, 0.0, 0.0))).rgb
              + textureCube(uSky, normalize(warped + vec3(0.0, 0.004, 0.0))).rgb
              + textureCube(uSky, normalize(warped - vec3(0.0, 0.004, 0.0))).rgb) * 0.25;
            vec3 projectedNormal = uDiskNormal - axis * dot(uDiskNormal, axis);
            projectedNormal /= max(length(projectedNormal), 0.0001);
            if (dot(projectedNormal, uViewUp) < 0.0) projectedNormal = -projectedNormal;
            float elevation = dot(tangent, projectedNormal);
            float upperArc = exp(-pow((impact - 1.72) / 0.17, 2.0)) * smoothstep(0.05, 0.8, elevation);
            float photonRing = exp(-pow((impact - 1.09) / 0.065, 2.0));
            vec3 glow = vec3(0.38, 0.64, 0.95) * upperArc * 0.44
              + vec3(0.72, 0.64, 0.92) * photonRing * 0.34;
            gl_FragColor = vec4(mix(sky, softSky, 0.35) + glow,
              1.0 - smoothstep(3.3, 4.5, impact));
          }
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
  lens.name = 'sky-gravitational-lens'; lens.renderOrder = -3; mesh.add(lens);
  const disk = new THREE.Group(); disk.name = 'tilted-accretion-volume'; mesh.add(disk);
  const timeUniform = { value: 0 };
  const band = new THREE.Mesh(new THREE.RingGeometry(1.3, 3.4, compact ? 96 : 144, 4),
    new THREE.ShaderMaterial({ uniforms: { uTime: timeUniform }, side: THREE.DoubleSide,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `varying vec2 vDisk;
        void main() { vDisk = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vDisk;
        void main() {
          float radius = length(vDisk), angle = atan(vDisk.y, vDisk.x);
          float edge = smoothstep(1.3, 1.6, radius) * (1.0 - smoothstep(2.75, 3.4, radius));
          float filaments = 0.78 + sin(radius * 48.0 + sin(angle * 8.0 - uTime * 0.08) * 0.5) * 0.08
            + sin(radius * 91.0 - angle * 3.0 + uTime * 0.05) * 0.04;
          vec3 color = mix(vec3(0.38, 0.75, 1.05), vec3(1.05, 0.61, 0.88),
            0.5 + sin(angle + radius * 0.8) * 0.5);
          color += vec3(0.5) * exp(-pow((radius - 1.6) / 0.2, 2.0));
          gl_FragColor = vec4(color, edge * filaments * 0.198);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
  band.renderOrder = -2; disk.add(band);
  const count = compact ? 420 : 900;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963, n = Math.sin(i * 127.1 + 31.7) * 43758.5453;
    const r = 1.38 + (n - Math.floor(n)) * 1.95;
    positions.set([Math.cos(a) * r, Math.sin(a) * r, Math.sin(i * 19.3) * 0.035], i * 3);
    const rose = 0.5 + Math.sin(a + r) * 0.5;
    colors.set([0.48 + rose * 0.52, 0.77 - rose * 0.12, 1.1 - rose * 0.14], i * 3);
    sizes[i] = 0.025 + (i % 7) * 0.005;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const pointUniforms = { uTime: timeUniform, uPointScale: { value: 600 } };
  const particles = new THREE.Points(geometry, new THREE.ShaderMaterial({ uniforms: pointUniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `uniform float uTime; uniform float uPointScale;
      attribute vec3 aColor; attribute float aSize; varying vec3 vColor;
      void main() {
        float angle = uTime * 0.1 / pow(length(position.xy), 1.5);
        mat2 rotation = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
        vec3 p = vec3(rotation * position.xy, position.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * uPointScale / max(1.0, -mv.z), 0.7, 3.0);
        vColor = aColor;
      }`,
    fragmentShader: `varying vec3 vColor;
      void main() {
        float alpha = (1.0 - smoothstep(0.03, 0.5, length(gl_PointCoord - 0.5))) * 0.315;
        gl_FragColor = vec4(vColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  particles.renderOrder = -2; disk.add(particles);
  let radius = 1;
  return { mesh, body, lens, disk, particles, environment,
    place(camera) {
      camera.updateMatrixWorld();
      mesh.position.set(-0.42, 0.38, 0.95).unproject(camera).sub(camera.position).normalize();
      const dot = camera.position.dot(mesh.position);
      const distance = Math.sqrt(dot * dot + 380 * 380 - camera.position.lengthSq()) - dot;
      mesh.position.multiplyScalar(distance).add(camera.position);
      const width = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      radius = width * (camera.aspect < 1 ? 0.52 : 0.34) / 6.8;
      mesh.scale.setScalar(radius); uniforms.uRadius.value = radius;
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      disk.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, mesh.position, up))
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.16))
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.3));
      uniforms.uDiskNormal.value.set(0, 0, 1).applyQuaternion(disk.quaternion);
    },
    update(time, camera, pixelHeight = 800) {
      timeUniform.value = time;
      uniforms.uViewUp.value.set(0, 1, 0).applyQuaternion(camera.quaternion);
      pointUniforms.uPointScale.value = radius * pixelHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    },
    dispose() {
      mesh.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      environment?.dispose();
    }
  };
}
