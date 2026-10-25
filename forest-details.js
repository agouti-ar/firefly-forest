// Procedural surface detail and botanical geometry; no image downloads.
export function makeForestDetails(THREE) {
  const surfaces = new Map();
  function surfaceTexture(kind) {
    if (surfaces.has(kind)) return surfaces.get(kind);
    const size = 128, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const noise = grain - Math.floor(grain);
      let shade;
      if (kind === 'bark') {
        const groove = Math.sin(u * Math.PI * 28 + Math.sin(v * Math.PI * 4) * 0.7);
        shade = 0.77 + groove * 0.12 + noise * 0.11;
        if (groove < -0.88) shade *= 0.68;
      } else if (kind === 'feathers') {
        const bar = Math.sin(u * Math.PI * 24 + Math.abs(Math.sin(v * Math.PI * 12)) * 1.4);
        shade = 0.86 + bar * 0.09 + noise * 0.05;
      } else if (kind === 'leaves') {
        const cluster = Math.sin(u * 32 + Math.sin(v * 23)) * Math.cos(v * 29);
        shade = 0.88 + cluster * 0.06 + noise * 0.06;
      } else {
        const patches = Math.sin(u * Math.PI * 6) * Math.cos(v * Math.PI * 8);
        shade = 0.78 + patches * 0.08 + noise * 0.17;
        if (noise > 0.97) shade *= 0.65;
      }
      const index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = Math.round(Math.max(0, Math.min(1, shade)) * 255);
      pixels[index + 3] = 255;
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.repeat.set(kind === 'soil' ? 9 : 2, kind === 'soil' ? 9 : 3);
    texture.needsUpdate = true;
    surfaces.set(kind, texture);
    return texture;
  }

  function createLilyFlower(compact = false) {
    const flower = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true,
      roughness: 0.78, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe9bd55, roughness: 0.65 });
    for (let layer = 0; layer < 3; layer++) {
      const length = [0.37, 0.28, 0.19][layer];
      const width = [0.105, 0.085, 0.065][layer];
      const lift = [0.09, 0.13, 0.17][layer];
      const rows = 10, columns = 4, positions = [], colors = [], indices = [];
      for (let j = 0; j <= rows; j++) {
        const t = j / rows, halfWidth = Math.pow(Math.sin(t * Math.PI), 0.75) * width;
        for (let k = 0; k <= columns; k++) {
          const side = k / columns * 2 - 1;
          positions.push(side * halfWidth,
            layer * 0.015 + lift * t * t + Math.sin(t * Math.PI) * (0.025 + side * side * 0.025),
            0.025 + length * t);
          colors.push(0.96, 0.82 - t * 0.14, 0.85 + t * 0.06);
          if (j < rows && k < columns) {
            const a = j * (columns + 1) + k;
            indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const count = compact ? [8, 7, 5][layer] : [12, 10, 8][layer];
      for (let p = 0; p < count; p++) {
        const petal = new THREE.Mesh(geometry, material);
        petal.rotation.y = (p + layer * 0.5) / count * Math.PI * 2;
        flower.add(petal);
      }
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), gold);
    center.scale.y = 0.6;
    center.position.y = 0.065;
    flower.add(center);
    const stamens = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 6, 4), gold, 24);
    const stamen = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const angle = i * 2.39996, radius = 0.025 + (i % 3) * 0.017;
      stamen.position.set(Math.cos(angle) * radius, 0.08 + (i % 3) * 0.009, Math.sin(angle) * radius);
      stamen.scale.set(0.7, 1.9, 0.7);
      stamen.updateMatrix();
      stamens.setMatrixAt(i, stamen.matrix);
    }
    stamens.instanceMatrix.needsUpdate = true;
    flower.add(stamens);
    return flower;
  }

  function createMoon() {
    const size = 192, pixels = new Uint8Array(size * size * 4);
    const normals = new Float32Array(size * size * 3), albedo = new Float32Array(size * size);
    const craters = Array.from({ length: 22 }, (_, i) => ({
      x: Math.sin(i * 7.3) * 0.82, y: Math.cos(i * 4.7) * 0.78,
      r: 0.035 + (i % 5) * 0.02
    }));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size * 2 - 1, ny = 1 - (y + 0.5) / size * 2;
      const radius = Math.hypot(nx, ny), index = y * size + x;
      if (radius > 1) continue;
      normals.set([nx, ny, Math.sqrt(1 - radius * radius)], index * 3);
      let tone = 0.82 + Math.sin(nx * 8 + ny * 3) * Math.cos(ny * 9) * 0.09;
      for (const crater of craters) {
        const distance = Math.hypot(nx - crater.x, ny - crater.y) / crater.r;
        if (distance < 1) tone *= 0.8 + distance * 0.16;
        else if (distance < 1.15) tone *= 1.06;
      }
      albedo[index] = tone;
      pixels[index * 4 + 3] = Math.round(255 * Math.min(1, (1 - radius) * size * 0.5));
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = texture.minFilter = THREE.LinearFilter;
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture,
      transparent: true, fog: false, depthWrite: false }));
    moon.scale.set(14, 14, 1);
    moon.name = 'slow-phase-moon';
    let lastStep = -1;
    return { mesh: moon, update(time) {
      const angle = -2.3 + time * 0.0004;
      moon.position.set(Math.cos(angle) * 210, -20 + Math.sin(time * 0.0006) * 4, Math.sin(angle) * 210);
      const step = Math.floor(time / 3);
      if (step === lastStep) return;
      lastStep = step;
      const phase = 0.75 + time * Math.PI * 2 / 720;
      const sx = Math.sin(phase), sz = Math.cos(phase);
      for (let i = 0; i < albedo.length; i++) {
        if (!albedo[i]) continue;
        const diffuse = Math.max(0, normals[i * 3] * sx + normals[i * 3 + 2] * sz);
        const brightness = Math.min(1, albedo[i] * (0.055 + diffuse * 0.945));
        pixels[i * 4] = Math.round(brightness * 255);
        pixels[i * 4 + 1] = Math.round(brightness * 251);
        pixels[i * 4 + 2] = Math.round(brightness * 242);
      }
      texture.needsUpdate = true;
    } };
  }
  return { surfaceTexture, createLilyFlower, createMoon,
    setAnisotropy(value) { for (const texture of surfaces.values()) texture.anisotropy = value; } };
}
