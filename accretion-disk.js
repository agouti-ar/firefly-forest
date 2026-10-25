// Distant, stylised lensing silhouette baked once; one quad, no ray marching.
export function createAccretionDisk(THREE) {
  const size = 256, pixels = new Uint8Array(size * size * 4);
  const angle = Math.PI * 0.2, c = Math.cos(angle), s = Math.sin(angle);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + 0.5) / size * 2 - 1, ny = (y + 0.5) / size * 2 - 1;
    const u = nx * c + ny * s, v = -nx * s + ny * c;
    const radius = Math.hypot(nx, ny), i = (y * size + x) * 4;
    if (radius < 0.225) { pixels.set([0, 0, 0, 255], i); continue; }
    const ellipse = Math.hypot(u, v / 0.2);
    const band = Math.exp(-Math.pow((ellipse - 0.67) / 0.085, 2));
    const haze = Math.exp(-Math.pow((ellipse - 0.67) / 0.21, 2)) * 0.16;
    const photon = Math.exp(-Math.pow((radius - 0.253) / 0.014, 2));
    const arc = v > 0 ? Math.exp(-Math.pow((Math.hypot(u, v / 0.78) - 0.43) / 0.027, 2))
      * THREE.MathUtils.smoothstep(v, 0.01, 0.11) * 0.65 : 0;
    const grain = 0.96 + Math.sin(u * 42 + Math.sin(v * 16) * 0.5) * 0.04;
    const brightness = band * grain * (0.72 + u * 0.22) + photon * 0.9 + arc;
    const alpha = Math.min(1, brightness + haze + Math.exp(-Math.pow((radius - 0.26) / 0.08, 2)) * 0.1);
    const white = Math.min(1, brightness);
    pixels.set([255, Math.round(137 + white * 104), Math.round(66 + white * 137), Math.round(alpha * 255)], i);
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true,
    fog: false, depthWrite: false, color: new THREE.Color(1.35, 1.35, 1.35) }));
  mesh.name = 'distant-accretion-disk'; mesh.renderOrder = -2;
  return { mesh, texture, place(camera) {
    camera.updateMatrixWorld();
    mesh.position.set(-0.64, 0.66, 0.95).unproject(camera).sub(camera.position).normalize();
    const dot = camera.position.dot(mesh.position);
    const distance = Math.sqrt(dot * dot + 380 * 380 - camera.position.lengthSq()) - dot;
    mesh.position.multiplyScalar(distance).add(camera.position);
    const fraction = camera.aspect < 1 ? 0.12 : 0.08;
    const width = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const scale = width * fraction / 0.94;
    mesh.scale.set(scale, scale, 1);
  } };
}
