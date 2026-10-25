// Procedural surface detail and botanical geometry; no image downloads.
export function makeForestDetails(THREE) {
  const surfaces = new Map();
  const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  function noise(x, y, period = 256) {
    const ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const h = (a, b) => hash((a % period + period) % period, (b % period + period) % period);
    return (h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx) * (1 - sy)
      + (h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx) * sy;
  }
  function clouds(x, y, period = 256) {
    return noise(x, y, period) * 0.57 + noise(x * 2, y * 2, period * 2) * 0.28
      + noise(x * 4, y * 4, period * 4) * 0.15;
  }
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
        const cx = Math.floor(u * 19), cy = Math.floor(v * 27);
        const dx = u * 19 - cx - 0.3 - hash(cx, cy) * 0.4;
        const dy = v * 27 - cy - 0.35;
        const spot = Math.exp(-(dx * dx * 55 + dy * dy * 15));
        shade = 0.88 + clouds(u * 8, v * 8, 8) * 0.1 - spot * 0.1;
      } else if (kind === 'leaves') {
        shade = 0.88 + clouds(u * 16, v * 16, 16) * 0.1 + noise * 0.025;
      } else {
        shade = 0.8 + clouds(u * 8, v * 8, 8) * 0.14 + noise * 0.07;
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

  function createMoon(updateRate = 4) {
    const size = 192, pixels = new Uint8Array(size * size * 4);
    const normals = new Float32Array(size * size * 3), albedo = new Float32Array(size * size);
    const craters = Array.from({ length: 85 }, (_, i) => ({
      x: (hash(i, 7) * 2 - 1) * 0.95, y: (hash(i, 19) * 2 - 1) * 0.95,
      r: 0.012 + hash(i, 31) ** 2 * 0.075
    }));
    craters.push({ x: -0.2, y: -0.58, r: 0.075 }, { x: -0.32, y: 0.18, r: 0.065 });
    const maria = [[-0.28, 0.42, 0.3, 0.24], [0.16, 0.46, 0.24, 0.3],
      [0.47, 0.14, 0.24, 0.23], [0.04, 0.04, 0.22, 0.28], [-0.47, 0.08, 0.21, 0.26]];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size * 2 - 1, ny = 1 - (y + 0.5) / size * 2;
      const radius = Math.hypot(nx, ny), index = y * size + x;
      if (radius > 1) continue;
      normals.set([nx, ny, Math.sqrt(1 - radius * radius)], index * 3);
      const grain = clouds((nx + 1) * 7, (ny + 1) * 7);
      let tone = 0.82 + grain * 0.15;
      for (const [mx, my, rx, ry] of maria) {
        const distance = Math.hypot((nx - mx) / rx, (ny - my) / ry);
        const edge = 1 + (grain - 0.5) * 0.3;
        if (distance < edge) tone *= 0.72 + 0.16 * THREE.MathUtils.smoothstep(distance, 0.65, edge);
      }
      for (const crater of craters) {
        if (Math.abs(nx - crater.x) > crater.r * 1.15 || Math.abs(ny - crater.y) > crater.r * 1.15) continue;
        const distance = Math.hypot(nx - crater.x, ny - crater.y) / crater.r;
        if (distance < 1) tone *= 0.8 + distance * 0.16;
        else if (distance < 1.15) tone *= 1.06;
      }
      const rayAngle = Math.atan2(ny + 0.58, nx + 0.2);
      const rayDistance = Math.hypot(ny + 0.58, nx + 0.2);
      if (rayDistance > 0.075 && rayDistance < 0.65) {
        tone += Math.pow(Math.max(0, Math.cos(rayAngle * 13 + Math.sin(rayAngle * 3))), 18)
          * 0.065 * (1 - rayDistance / 0.65);
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
    moon.name = 'cratered-moon';
    const haloPixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const radius = Math.hypot((x + 0.5) / 64 - 1, (y + 0.5) / 64 - 1);
      const alpha = Math.exp(-Math.pow((radius - 0.59) / 0.19, 2))
        * THREE.MathUtils.smoothstep(radius, 0.51, 0.6) * (1 - THREE.MathUtils.smoothstep(radius, 0.88, 1));
      const i = (y * 128 + x) * 4;
      haloPixels.set([184, 207, 237, Math.round(alpha * 255)], i);
    }
    const haloTexture = new THREE.DataTexture(haloPixels, 128, 128, THREE.RGBAFormat);
    haloTexture.colorSpace = THREE.SRGBColorSpace;
    haloTexture.magFilter = haloTexture.minFilter = THREE.LinearFilter;
    haloTexture.needsUpdate = true;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture,
      transparent: true, opacity: 0.14, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(24, 24, 1);
    halo.renderOrder = -1;
    const group = new THREE.Group(); group.add(halo, moon);
    let lastStep = -1;
    return { mesh: group, illumination: 1, update(time) {
      const angle = -2.3 + time * Math.PI * 2 / 480;
      group.position.set(Math.cos(angle) * 210, -20 + Math.sin(time * 0.004) * 4, Math.sin(angle) * 210);
      const step = Math.floor(time * updateRate);
      if (step === lastStep) return;
      lastStep = step;
      const phase = 0.45 + time * Math.PI * 2 / 90;
      this.illumination = (1 + Math.cos(phase)) / 2;
      halo.material.opacity = 0.035 + this.illumination * 0.11;
      const sx = Math.sin(phase), sz = Math.cos(phase);
      for (let i = 0; i < albedo.length; i++) {
        if (!albedo[i]) continue;
        const diffuse = Math.max(0, normals[i * 3] * sx + normals[i * 3 + 2] * sz);
        const brightness = Math.min(1, albedo[i] * (0.055 + diffuse * 0.945));
        pixels[i * 4] = Math.round(brightness * 255);
        pixels[i * 4 + 1] = Math.round(brightness * 254);
        pixels[i * 4 + 2] = Math.round(brightness * 252);
      }
      texture.needsUpdate = true;
    } };
  }
  function createNebula() {
    const width = 192, height = 96, pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const u = x / width, v = y / height;
      const veil = clouds(u * 7, v * 5);
      const envelope = Math.pow(Math.sin(u * Math.PI) * Math.sin(v * Math.PI), 1.5);
      const density = Math.max(0, veil - 0.35) * envelope;
      const i = (y * width + x) * 4;
      pixels.set([Math.round(85 + veil * 35), 105, Math.round(155 + veil * 45), Math.round(density * 95)], i);
    }
    const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true;
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture,
      transparent: true, opacity: 0.35, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    cloud.scale.set(150, 65, 1); cloud.position.set(135, -2, -195); cloud.renderOrder = -2;
    return cloud;
  }
  return { surfaceTexture, createLilyFlower, createMoon, createNebula,
    setAnisotropy(value) { for (const texture of surfaces.values()) texture.anisotropy = value; } };
}
