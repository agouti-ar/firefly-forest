export function createTreeAvoidance(THREE) {
  const colliders = [];
  const scale = new THREE.Vector3();
  const probe = { x: 0, y: 0, z: 0, r: 0, d2: 0, cx: 0, cy: 0, cz: 0 };
  function sample(c, x, y, z) {
    let center = c.center, radius = c.radius;
    if (c.type === 'trunk') {
      const t = Math.max(0, Math.min(1, ((x - c.start.x) * c.axis.x + (y - c.start.y) * c.axis.y
        + (z - c.start.z) * c.axis.z) / c.length2));
      probe.cx = c.start.x + c.axis.x * t;
      probe.cy = c.start.y + c.axis.y * t;
      probe.cz = c.start.z + c.axis.z * t;
      radius = (c.base * (1 - t) + c.tip * t) * c.worldScale + 0.3;
    } else {
      probe.cx = center.x; probe.cy = center.y; probe.cz = center.z;
    }
    probe.x = x - probe.cx; probe.y = y - probe.cy; probe.z = z - probe.cz;
    probe.r = radius;
    probe.d2 = probe.x * probe.x + probe.y * probe.y + probe.z * probe.z;
    return probe;
  }
  function isFree(x, y, z) {
    for (const c of colliders) { const p = sample(c, x, y, z); if (p.d2 < p.r * p.r) return false; }
    return true;
  }
  return {
    colliders,
    addCanopy(mesh) {
      mesh.geometry.computeBoundingSphere();
      colliders.push({ type: 'canopy', mesh, center: new THREE.Vector3(), radius: 0 });
    },
    addTrunk(mesh, height, base, tip) {
      colliders.push({ type: 'trunk', mesh, height, base, tip, worldScale: 1,
        start: new THREE.Vector3(), end: new THREE.Vector3(), axis: new THREE.Vector3(), length2: 1 });
    },
    update() {
      for (const c of colliders) {
        c.mesh.updateWorldMatrix(true, false);
        c.mesh.getWorldScale(scale);
        const worldScale = Math.max(scale.x, scale.y, scale.z);
        if (c.type === 'canopy') {
          c.center.copy(c.mesh.geometry.boundingSphere.center).applyMatrix4(c.mesh.matrixWorld);
          c.radius = c.mesh.geometry.boundingSphere.radius * worldScale + 0.3;
        } else {
          c.start.set(0, -c.height / 2, 0).applyMatrix4(c.mesh.matrixWorld);
          c.end.set(0, c.height / 2, 0).applyMatrix4(c.mesh.matrixWorld);
          c.axis.copy(c.end).sub(c.start); c.length2 = c.axis.lengthSq(); c.worldScale = worldScale;
        }
      }
    },
    isFree,
    steer(x, y, z, velocity, dt, ascending) {
      for (const c of colliders) {
        const p = sample(c, x, y, z), outer = p.r + 1.1;
        if (p.d2 >= outer * outer) continue;
        const distance = Math.max(0.05, Math.sqrt(p.d2));
        const force = Math.pow(Math.max(0, 1 - (distance - p.r) / 1.1), 2) * 5 * dt;
        velocity.x += p.x / distance * force;
        velocity.y += (p.y / distance + (ascending ? 0.7 : 0.12)) * force;
        velocity.z += p.z / distance * force;
      }
    },
    resolve(positions, index, velocity) {
      let x = positions[index], y = positions[index + 1], z = positions[index + 2];
      for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        for (const c of colliders) {
          const p = sample(c, x, y, z);
          if (p.d2 >= p.r * p.r) continue;
          const distance = Math.sqrt(p.d2);
          const nx = distance > 0.001 ? p.x / distance : 0;
          const ny = distance > 0.001 ? p.y / distance : 1;
          const nz = distance > 0.001 ? p.z / distance : 0;
          const penetration = p.r + 0.015 - distance;
          x += nx * penetration; y += ny * penetration; z += nz * penetration;
          const inward = velocity.x * nx + velocity.y * ny + velocity.z * nz;
          if (inward < 0) { velocity.x -= inward * nx; velocity.y -= inward * ny; velocity.z -= inward * nz; }
          changed = true;
        }
        if (!changed) break;
      }
      // Resolve overlapping crown volumes with a vertical escape, rather than
      // letting a particle remain embedded between two branches.
      y = Math.max(0.7, y);
      for (let pass = 0; pass < 12 && !isFree(x, y, z); pass++) {
        for (const c of colliders) {
          const p = sample(c, x, y, z);
          if (p.d2 < p.r * p.r) y = Math.max(y, p.cy + p.r + 0.02);
        }
        velocity.y = Math.max(0, velocity.y);
      }
      positions[index] = x; positions[index + 1] = Math.max(0.7, y); positions[index + 2] = z;
    }
  };
}
