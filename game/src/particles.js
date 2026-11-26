// particles — touchdown smoke and runway dust. Tiny world-space puffs:
// spawn, rise, grow, fade. The renderer draws them; this module only
// owns their life cycle.

export function createParticles() {
  return [];
}

export function spawnTouchdownSmoke(particles, plane, hard) {
  const count = hard ? 26 : 12;
  for (let i = 0; i < count; i += 1) {
    particles.push({
      pos: {
        x: plane.pos.x + (Math.random() - 0.5) * 6,
        y: plane.pos.y + 0.3,
        z: plane.pos.z + (Math.random() - 0.5) * 6,
      },
      vel: {
        x: (Math.random() - 0.5) * 3,
        y: 1 + Math.random() * 2,
        z: (Math.random() - 0.5) * 3,
      },
      sizeM: 1 + Math.random() * 1.5,
      growthM: 2.5,
      lifeSec: 0,
      maxLifeSec: 1.1 + Math.random() * 0.7,
      color: '#cfc8b8',
      alpha: 0.55,
    });
  }
}

export function spawnGateBurst(particles, pos) {
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    particles.push({
      pos: { x: pos.x, y: pos.y, z: pos.z },
      vel: { x: Math.cos(a) * 6, y: Math.sin(a) * 6, z: (Math.random() - 0.5) * 4 },
      sizeM: 0.6,
      growthM: 0.4,
      lifeSec: 0,
      maxLifeSec: 0.7,
      color: '#ffd66e',
      alpha: 0.9,
    });
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.lifeSec += dt;
    if (p.lifeSec >= p.maxLifeSec) {
      particles.splice(i, 1);
      continue;
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    p.sizeM += p.growthM * dt;
    p.alpha = 0.55 * (1 - p.lifeSec / p.maxLifeSec);
  }
}
