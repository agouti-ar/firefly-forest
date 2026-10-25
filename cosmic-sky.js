// A baked, world-fixed sky: one texture sample per fragment, no animated noise shader.
export function createCosmicSky(THREE, reducedMotion = false) {
  const width = 768, height = 384, pixels = new Uint8Array(width * height * 4);
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let a = x - ix, b = y - iy;
    a = a * a * (3 - 2 * a); b = b * b * (3 - 2 * b);
    return (hash(ix, iy) * (1 - a) + hash(ix + 1, iy) * a) * (1 - b)
      + (hash(ix, iy + 1) * (1 - a) + hash(ix + 1, iy + 1) * a) * b;
  }
  const clouds = (x, y) => noise(x, y) * 0.58 + noise(x * 2, y * 2) * 0.28 + noise(x * 4, y * 4) * 0.14;
  const heading = Math.atan2(-0.52, -0.85);
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const longitude = column / width * Math.PI * 2;
    const latitude = (row / (height - 1) - 0.5) * Math.PI;
    const y = Math.sin(latitude);
    const azimuth = Math.atan2(Math.sin(longitude), -Math.cos(longitude));
    const angle = Math.atan2(Math.sin(azimuth - heading), Math.cos(azimuth - heading));
    const sector = Math.exp(-Math.pow(angle / 0.68, 4));
    const n = clouds(angle * 9 + 40, y * 13 + 20);
    const ridge = -0.29 + (clouds(angle * 4 + 60, 3) - 0.5) * 0.27;
    const edge = ridge - y;
    const body = THREE.MathUtils.smoothstep(edge, -0.025, 0.075);
    const lowerFade = Math.exp(-Math.pow((y + 0.48) / 0.31, 2));
    const gold = sector * body * lowerFade * (0.18 + n * 0.25);
    const rim = sector * Math.exp(-Math.pow(edge / 0.018, 2)) * (0.12 + n * 0.08);
    const carmine = sector * body * Math.exp(-Math.pow((y + 0.72) / 0.22, 2)) * 0.28;
    const dustCenter = -0.18 + angle * 0.62;
    const dust = Math.exp(-Math.pow((y - dustCenter) / 0.105, 2))
      * Math.exp(-Math.pow(angle / 0.92, 4)) * (0.025 + n * 0.09);
    const low = Math.max(0, -y);
    let r = 11 + low * 4, g = 16 + low * 3, b = 33 + low * 9;
    r += (229 - r) * (gold + rim) + (131 - r) * carmine + (145 - r) * dust;
    g += (142 - g) * (gold + rim) + (52 - g) * carmine + (150 - g) * dust;
    b += (38 - b) * (gold + rim) + (113 - b) * carmine + (185 - b) * dust;
    const i = (row * width + column) * 4;
    pixels.set([Math.round(r), Math.round(g), Math.round(b), 255], i);
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(290, 48, 24),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false, depthWrite: false }));
  mesh.renderOrder = -10;
  const count = 28, positions = new Float32Array(count * 6), colors = new Float32Array(count * 6);
  const uv = new Float32Array(count * 4), indices = [];
  for (let i = 0; i < count; i++) {
    const fade = Math.pow(1 - i / (count - 1), 1.7);
    for (let edge = 0; edge < 2; edge++) {
      colors.set([fade * 0.65, fade * 0.8, fade], i * 6 + edge * 3);
      uv.set([edge, i / (count - 1)], i * 4 + edge * 2);
    }
    if (i < count - 1) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const glowPixels = new Uint8Array(32 * 32 * 4), trailPixels = new Uint8Array(32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const r2 = Math.pow((x - 15.5) / 15.5, 2) + Math.pow((y - 15.5) / 15.5, 2);
    glowPixels.set([255, 255, 255, Math.round(Math.max(0, Math.exp(-r2 * 5) - 0.007) * 255)], (y * 32 + x) * 4);
  }
  for (let x = 0; x < 32; x++) trailPixels.set([255, 255, 255,
    Math.round(Math.exp(-Math.pow((x - 15.5) / 15.5, 2) * 5) * 255)], x * 4);
  const glowTexture = new THREE.DataTexture(glowPixels, 32, 32, THREE.RGBAFormat);
  const trailTexture = new THREE.DataTexture(trailPixels, 32, 1, THREE.RGBAFormat);
  for (const map of [glowTexture, trailTexture]) {
    map.magFilter = map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geometry.setIndex(indices);
  const meteor = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: trailTexture,
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  meteor.frustumCulled = false;
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xe6f5ff,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0x8fc8ff,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  head.scale.set(1.3, 1.3, 1); halo.scale.set(3.8, 3.8, 1);
  const shootingStar = new THREE.Group(); shootingStar.add(meteor, halo, head); shootingStar.visible = false;
  const group = new THREE.Group(); group.add(mesh, shootingStar);
  const start = new THREE.Vector3(80, 108, -220), end = new THREE.Vector3(0, 66, -228);
  const tangent = new THREE.Vector3(), side = new THREE.Vector3(0, 1, 0), point = new THREE.Vector3();
  let lastEvent = -1;
  function skyPoint(x, y, camera, output) {
    output.set(x, y, 0.95).unproject(camera).sub(camera.position).normalize()
      .multiplyScalar(195).add(camera.position);
  }
  return { mesh: group, texture, meteor, head, halo, update(time, camera) {
    const cycle = time % 16, progress = (cycle - 5) / 2.6;
    meteor.visible = !reducedMotion && progress > 0 && progress < 1;
    shootingStar.visible = meteor.visible;
    if (!meteor.visible) return;
    const event = Math.floor(time / 16);
    if (event !== lastEvent) {
      lastEvent = event;
      if (camera) {
        // Capture a clear upper corner at launch; the path then stays fixed in world space.
        const direction = event % 2 ? -1 : 1;
        skyPoint(direction * 0.82, 0.78, camera, start);
        skyPoint(direction * 0.32, 0.54, camera, end);
        tangent.copy(end).sub(start);
        camera.getWorldDirection(point);
        side.crossVectors(tangent, point).normalize();
      } else side.set(0, 1, 0);
    }
    tangent.copy(end).sub(start);
    for (let i = 0; i < count; i++) {
      const travel = progress - i / (count - 1) * 0.38;
      point.copy(start).addScaledVector(tangent, travel);
      const width = 0.5 * (1 - i / count);
      for (let edge = 0; edge < 2; edge++) {
        const offset = (edge ? 1 : -1) * width;
        positions.set([point.x + side.x * offset, point.y + side.y * offset,
          point.z + side.z * offset], i * 6 + edge * 3);
      }
    }
    const glow = Math.pow(Math.sin(progress * Math.PI), 0.65);
    meteor.material.opacity = glow * 0.85;
    head.position.copy(start).addScaledVector(tangent, progress); halo.position.copy(head.position);
    head.material.opacity = glow; halo.material.opacity = glow * 0.42;
    geometry.attributes.position.needsUpdate = true;
  } };
}
