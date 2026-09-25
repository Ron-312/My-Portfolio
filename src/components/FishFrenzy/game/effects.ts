import * as THREE from 'three';
import { WORLD } from './config';

/** A white radial-gradient sprite, so points render as round dots instead of squares. */
function radialTexture(stops: [offset: number, alpha: number][]) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [offset, alpha] of stops) g.addColorStop(offset, `rgba(255,255,255,${alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

/** A bubble: bright centre, faint body, brighter rim. */
const bubbleTexture = () => radialTexture([[0, 0.9], [0.55, 0.35], [0.8, 0.6], [1, 0]]);

/** A soft glowing dot for sparkles and eat bursts. */
const glowTexture = () => radialTexture([[0, 1], [0.3, 0.8], [1, 0]]);

/** Ambient bubbles that drift up with a little wobble and wrap back to the floor. */
export class Bubbles {
    readonly points: THREE.Points;
    private positions: Float32Array;
    private speeds: Float32Array;
    private texture: THREE.Texture;

    constructor(count: number) {
        this.positions = new Float32Array(count * 3);
        this.speeds = new Float32Array(count);
        const w = WORLD.halfWidth + 10;
        for (let i = 0; i < count; i++) {
            this.positions[i * 3] = (Math.random() * 2 - 1) * w;
            this.positions[i * 3 + 1] = WORLD.floorY + Math.random() * (WORLD.surfaceY - WORLD.floorY + 6);
            this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * w;
            this.speeds[i] = 0.3 + Math.random() * 0.7;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.texture = bubbleTexture();
        const material = new THREE.PointsMaterial({
            size: 0.18,
            map: this.texture,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
        });
        this.points = new THREE.Points(geometry, material);
        this.points.frustumCulled = false;
    }

    update(dt: number, time: number) {
        const p = this.positions;
        const top = WORLD.surfaceY + 6;
        for (let i = 0; i < this.speeds.length; i++) {
            const y = i * 3 + 1;
            p[y] += this.speeds[i] * dt;
            p[i * 3] += Math.sin(time * 1.3 + i) * 0.1 * dt;
            if (p[y] > top) p[y] = WORLD.floorY;
        }
        this.points.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        this.points.geometry.dispose();
        (this.points.material as THREE.Material).dispose();
        this.texture.dispose();
    }
}

const BURST_PARTICLES = 48;
const BURST_LIFETIME = 0.7;

/** A small pool of particle bursts reused round-robin for eat/death effects. */
export class Bursts {
    readonly group = new THREE.Group();
    private bursts: {
        points: THREE.Points;
        material: THREE.PointsMaterial;
        velocities: Float32Array;
        age: number;
    }[] = [];
    private next = 0;
    private readonly texture = glowTexture();

    constructor(poolSize = 8) {
        for (let b = 0; b < poolSize; b++) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURST_PARTICLES * 3), 3));
            const material = new THREE.PointsMaterial({
                size: 0.12,
                map: this.texture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const points = new THREE.Points(geometry, material);
            points.visible = false;
            points.frustumCulled = false;
            this.group.add(points);
            this.bursts.push({ points, material, velocities: new Float32Array(BURST_PARTICLES * 3), age: BURST_LIFETIME });
        }
    }

    spawn(at: THREE.Vector3, color: THREE.ColorRepresentation, spread: number) {
        const burst = this.bursts[this.next];
        this.next = (this.next + 1) % this.bursts.length;
        const pos = burst.points.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < BURST_PARTICLES; i++) {
            pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
            burst.velocities[i * 3] = (Math.random() - 0.5) * spread;
            burst.velocities[i * 3 + 1] = (Math.random() - 0.3) * spread;
            burst.velocities[i * 3 + 2] = (Math.random() - 0.5) * spread;
        }
        burst.points.geometry.attributes.position.needsUpdate = true;
        burst.material.color.set(color);
        burst.material.size = 0.12 + spread * 0.05;
        burst.age = 0;
        burst.points.visible = true;
    }

    update(dt: number) {
        for (const burst of this.bursts) {
            if (burst.age >= BURST_LIFETIME) continue;
            burst.age += dt;
            if (burst.age >= BURST_LIFETIME) { burst.points.visible = false; continue; }
            const pos = burst.points.geometry.attributes.position.array as Float32Array;
            const drag = Math.exp(-3 * dt);
            for (let i = 0; i < pos.length; i++) {
                burst.velocities[i] *= drag;
                pos[i] += burst.velocities[i] * dt;
            }
            burst.points.geometry.attributes.position.needsUpdate = true;
            burst.material.opacity = 0.9 * (1 - burst.age / BURST_LIFETIME);
        }
    }

    dispose() {
        for (const burst of this.bursts) {
            burst.points.geometry.dispose();
            burst.material.dispose();
        }
        this.texture.dispose();
    }
}
