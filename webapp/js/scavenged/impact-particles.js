/**
 * Scavenged mechanic: pooled impact particles.
 * Conceptual provenance: vanilla Canvas arcade shooters and explosion demos.
 */
export class ImpactParticlePool {
  constructor({ max = 256, rng = Math.random } = {}) { this.max = max; this.rng = rng; this.items = []; }

  burst(x, y, count = 18, speed = 180) {
    for (let i = 0; i < count && this.items.length < this.max; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const velocity = speed * (0.35 + this.rng() * 0.65);
      this.items.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        age: 0, life: 0.25 + this.rng() * 0.45, size: 1 + this.rng() * 3 });
    }
  }

  update(dt) {
    const step = Math.max(0, Math.min(0.05, Number(dt)));
    for (const p of this.items) {
      p.x += p.vx * step; p.y += p.vy * step; p.vx *= 0.985; p.vy *= 0.985; p.age += step;
    }
    this.items = this.items.filter(p => p.age < p.life);
  }

  draw(ctx) {
    for (const p of this.items) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
