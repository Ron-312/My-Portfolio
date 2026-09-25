import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD } from './config';
import { CAUSTICS_GLSL, withCaustics, withSway, type OceanUniforms } from './caustics';
import type { LoadedModel } from './models';

// Everything that makes the arena look like a reef rather than a blue box:
// a sky-to-abyss gradient, a shimmering surface with light shafts, sandy
// dunes, and reef patches built from rock, coral, sponges, anemones and
// seagrass, plus kelp clumps. Almost all of it is procedural and instanced.

export const WATER = {
    deep: new THREE.Color(0x02243d),
    horizon: new THREE.Color(0x0a6a9a),
    shallow: new THREE.Color(0x3fb8d8),
};

/** Height of the sand at (x, z); props are planted on this and fish stay above it. */
export function floorHeight(x: number, z: number) {
    return WORLD.floorY - 0.4
        + Math.sin(x * 0.15) * 0.4
        + Math.cos(z * 0.11 + x * 0.05) * 0.5
        + Math.sin(x * 0.9 + z * 0.7) * 0.06; // small ripples
}

const randomIn = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

interface Placement {
    x: number;
    z: number;
    scale: THREE.Vector3;
    rotationY: number;
    tilt?: number;
    sink?: number;   // how far to push into the sand, in world units
    color: THREE.ColorRepresentation;
}

const PALETTE = {
    coral: ['#ff8a80', '#ffab62', '#c77dff', '#ffd6a5', '#f28482', '#80ffdb'],
    brain: ['#e0c98a', '#b8d98a', '#f0a8a0', '#d6b0ff'],
    sponge: ['#9b5de5', '#f15bb5', '#fb8b24', '#00bbf9', '#ff5d8f'],
    anemone: ['#ff7eb6', '#c77dff', '#ffb26b', '#7fffd4', '#ff6b6b'],
    rock: ['#9a8e80', '#8c857c', '#a3947f', '#7f786f'],
    seagrass: ['#3f9f5f', '#4fae62', '#5cbf6a', '#2f8f55'],
    kelp: ['#7a8a2a', '#8a8f3a', '#6b7a26', '#94a03c'],
};

export interface ReefOptions {
    mobile: boolean;
    uniforms: OceanUniforms;
    treeCoral: LoadedModel;
    fanCoral: LoadedModel;
}

export class Reef {
    readonly group = new THREE.Group();
    private readonly disposables: { dispose(): void }[] = [];
    private readonly sky: THREE.Mesh;
    private readonly shafts: THREE.Mesh[] = [];
    private readonly surface: THREE.Mesh;
    private readonly uniforms: OceanUniforms;

    constructor(opts: ReefOptions) {
        this.uniforms = opts.uniforms;
        this.sky = this.createSky();
        this.surface = this.createSurface();
        this.group.add(this.sky, this.surface);
        this.addSand();
        this.addReefPatches(opts);
        this.addKelp(opts.mobile ? 5 : 9);
        this.addLightShafts(opts.mobile ? 7 : 14);
    }

    /** Keeps the sky centred on the camera and turns light shafts toward it. */
    update(camera: THREE.Camera) {
        this.sky.position.copy(camera.position);
        this.surface.position.x = camera.position.x;
        this.surface.position.z = camera.position.z;
        for (const shaft of this.shafts) {
            shaft.rotation.y = Math.atan2(camera.position.x - shaft.position.x, camera.position.z - shaft.position.z);
        }
    }

    dispose() {
        for (const d of this.disposables) d.dispose();
    }

    private track<T extends { dispose(): void }>(item: T) {
        this.disposables.push(item);
        return item;
    }

    // ───────────────────────── water & light ─────────────────────────

    private createSky() {
        const material = this.track(new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            uniforms: {
                uDeep: { value: WATER.deep },
                uHorizon: { value: WATER.horizon },
                uShallow: { value: WATER.shallow },
            },
            vertexShader: /* glsl */`
                varying vec3 vDir;
                void main() {
                    vDir = normalize(position);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            fragmentShader: /* glsl */`
                uniform vec3 uDeep, uHorizon, uShallow;
                varying vec3 vDir;
                void main() {
                    float y = normalize(vDir).y;
                    vec3 color = mix(uHorizon, uDeep, 1.0 - smoothstep(-0.7, 0.0, y));
                    color = mix(color, uShallow, smoothstep(0.05, 0.9, y));
                    gl_FragColor = vec4(color, 1.0);
                    #include <colorspace_fragment>
                }`,
        }));
        const mesh = new THREE.Mesh(this.track(new THREE.SphereGeometry(150, 32, 16)), material);
        mesh.renderOrder = -1;
        mesh.frustumCulled = false;
        return mesh;
    }

    /** The underside of the water surface, rippling with light. */
    private createSurface() {
        const material = this.track(new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
            uniforms: { uTime: this.uniforms.uTime, uColor: { value: new THREE.Color(0xbfefff) } },
            vertexShader: /* glsl */`
                varying vec3 vWorld;
                void main() {
                    vec4 world = modelMatrix * vec4(position, 1.0);
                    vWorld = world.xyz;
                    gl_Position = projectionMatrix * viewMatrix * world;
                }`,
            fragmentShader: /* glsl */`
                uniform float uTime;
                uniform vec3 uColor;
                varying vec3 vWorld;
                ${CAUSTICS_GLSL}
                void main() {
                    float shimmer = caustics(vWorld.xz * 0.12, uTime * 0.6);
                    float fade = exp(-length(vWorld.xz - cameraPosition.xz) * 0.018);
                    gl_FragColor = vec4(uColor, (0.12 + shimmer * 0.45) * fade);
                    #include <colorspace_fragment>
                }`,
        }));
        const geometry = this.track(new THREE.PlaneGeometry(260, 260));
        geometry.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = WORLD.surfaceY + 4;
        mesh.frustumCulled = false;
        return mesh;
    }

    private addLightShafts(count: number) {
        const material = this.track(new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            fog: false,
            uniforms: { uTime: this.uniforms.uTime },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                varying float vSeed;
                varying float vDistance;
                void main() {
                    vUv = uv;
                    vSeed = modelMatrix[3].x * 0.13 + modelMatrix[3].z * 0.07;
                    vec4 world = modelMatrix * vec4(position, 1.0);
                    vDistance = length(world.xyz - cameraPosition);
                    gl_Position = projectionMatrix * viewMatrix * world;
                }`,
            fragmentShader: /* glsl */`
                uniform float uTime;
                varying vec2 vUv;
                varying float vSeed;
                varying float vDistance;
                void main() {
                    float across = sin(vUv.x * 3.14159);
                    float down = pow(vUv.y, 1.6);
                    float flicker = 0.65 + 0.35 * sin(uTime * 0.7 + vSeed * 9.0);
                    float near = smoothstep(2.0, 8.0, vDistance) * exp(-vDistance * 0.02);
                    float a = across * across * down * flicker * near * 0.22;
                    gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * a, 1.0);
                }`,
        }));
        const height = WORLD.surfaceY - WORLD.floorY + 6;
        for (let i = 0; i < count; i++) {
            const width = randomIn(2.5, 6);
            const geometry = this.track(new THREE.PlaneGeometry(width, height));
            geometry.translate(0, -height / 2, 0);
            geometry.rotateZ(randomIn(0.12, 0.3)); // slanted like late-afternoon sun
            const shaft = new THREE.Mesh(geometry, material);
            shaft.position.set(
                randomIn(-1, 1) * WORLD.halfWidth,
                WORLD.surfaceY + 4,
                randomIn(-1, 1) * WORLD.halfWidth,
            );
            shaft.renderOrder = 2;
            this.shafts.push(shaft);
            this.group.add(shaft);
        }
    }

    // ───────────────────────── sand ─────────────────────────

    private addSand() {
        const size = WORLD.halfWidth * 2 + 80;
        const geometry = this.track(new THREE.PlaneGeometry(size, size, 96, 96));
        geometry.rotateX(-Math.PI / 2);
        const pos = geometry.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const sand = new THREE.Color(0xd9c9a3);
        const dark = new THREE.Color(0xa8987a);
        const c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            const y = floorHeight(x, z);
            pos.setY(i, y);
            const ripple = 0.5 + 0.5 * Math.sin(x * 1.3 + Math.sin(z * 0.4) * 2);
            c.copy(sand).lerp(dark, ripple * 0.35 + Math.random() * 0.15);
            c.toArray(colors, i * 3);
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        const material = this.track(withCaustics(
            new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 4 }),
            this.uniforms, { strength: 0.4, scale: 0.3 },
        ));
        this.group.add(new THREE.Mesh(geometry, material));
    }

    // ───────────────────────── reef patches ─────────────────────────

    private patchCenters(count: number) {
        // One patch is always right in front of where the player starts.
        const centers: THREE.Vector2[] = [new THREE.Vector2(-5, -16)];
        const limit = WORLD.halfWidth - 5;
        for (let attempt = 0; centers.length < count && attempt < 400; attempt++) {
            const p = new THREE.Vector2(randomIn(-limit, limit), randomIn(-limit, limit));
            if (p.length() < 7) continue; // keep the spawn point open
            if (centers.every(c => c.distanceTo(p) > 13)) centers.push(p);
        }
        return centers;
    }

    private addReefPatches({ mobile, treeCoral, fanCoral }: ReefOptions) {
        const rocks: Placement[] = [];
        const trees: Placement[] = [];
        const fans: Placement[] = [];
        const brains: Placement[] = [];
        const sponges: Placement[] = [];
        const anemones: Placement[] = [];
        const grass: Placement[] = [];

        const around = (center: THREE.Vector2, radius: number) => {
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            return { x: center.x + Math.cos(a) * r, z: center.y + Math.sin(a) * r };
        };
        const uniform = (s: number) => new THREE.Vector3(s, s, s);

        for (const center of this.patchCenters(mobile ? 8 : 12)) {
            const radius = randomIn(4, 7);
            for (let i = 0; i < 5; i++) {
                const s = randomIn(1.2, 2.6);
                rocks.push({ ...around(center, radius * 0.6), scale: new THREE.Vector3(s * randomIn(1, 1.6), s * randomIn(0.5, 0.9), s), rotationY: Math.random() * 6.28, sink: s * 0.25, color: pick(PALETTE.rock) });
            }
            for (let i = 0; i < 3; i++) trees.push({ ...around(center, radius * 0.7), scale: uniform(randomIn(1.6, 4)), rotationY: Math.random() * 6.28, sink: 0.2, color: pick(PALETTE.coral) });
            for (let i = 0; i < 3; i++) fans.push({ ...around(center, radius), scale: uniform(randomIn(1.4, 3)), rotationY: Math.random() * 6.28, sink: 0.1, color: pick(PALETTE.coral) });
            for (let i = 0; i < 3; i++) {
                const s = randomIn(0.6, 1.4);
                brains.push({ ...around(center, radius), scale: new THREE.Vector3(s, s * 0.7, s), rotationY: Math.random() * 6.28, sink: 0.15, color: pick(PALETTE.brain) });
            }
            for (let i = 0; i < 2; i++) sponges.push({ ...around(center, radius), scale: uniform(randomIn(0.8, 1.6)), rotationY: Math.random() * 6.28, sink: 0.1, color: pick(PALETTE.sponge) });
            for (let i = 0; i < 4; i++) anemones.push({ ...around(center, radius), scale: uniform(randomIn(0.7, 1.3)), rotationY: Math.random() * 6.28, sink: 0.05, color: pick(PALETTE.anemone) });
            const blades = mobile ? 45 : 90;
            for (let i = 0; i < blades; i++) {
                const h = randomIn(0.8, 2.2);
                grass.push({ ...around(center, radius * 1.4), scale: new THREE.Vector3(randomIn(0.8, 1.4), h, 1), rotationY: Math.random() * 6.28, tilt: randomIn(-0.2, 0.2), color: pick(PALETTE.seagrass) });
            }
        }

        const u = this.uniforms;
        const rockMaterial = withCaustics(new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 2 }), u, { strength: 0.45, scale: 0.35 });
        this.addInstances(rockGeometry(), rockMaterial, rocks);

        const coralMaterial = (model: LoadedModel) => {
            const m = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 20, side: THREE.DoubleSide });
            const source = model.material as THREE.MeshStandardMaterial;
            if (source.map) m.map = source.map;
            return withCaustics(m, u, { strength: 0.35, scale: 0.35 });
        };
        this.addInstances(treeCoral.geometry, coralMaterial(treeCoral), trees);
        this.addInstances(fanCoral.geometry, withSway(coralMaterial(fanCoral), u, 0.04, 0.7), fans);

        this.addInstances(brainCoralGeometry(), withCaustics(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 12 }), u, { strength: 0.4, scale: 0.35 }), brains);
        this.addInstances(spongeGeometry(), withCaustics(new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, shininess: 8 }), u, { strength: 0.3, scale: 0.35 }), sponges);
        this.addInstances(anemoneGeometry(), withSway(new THREE.MeshPhongMaterial({ shininess: 40, emissive: 0x220a18 }), u, 0.2, 1.6), anemones);
        this.addInstances(bladeGeometry(0.1, 5), withSway(new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, shininess: 10 }), u, 0.22), grass);
    }

    private addKelp(clumps: number) {
        const kelp: Placement[] = [];
        const limit = WORLD.halfWidth - 3;
        for (let c = 0; c < clumps; c++) {
            let x = 0, z = 0;
            do {
                x = randomIn(-limit, limit);
                z = randomIn(-limit, limit);
            } while (Math.hypot(x, z) < 12);
            for (let i = 0; i < 7; i++) {
                const h = randomIn(7, WORLD.surfaceY - WORLD.floorY + 2);
                kelp.push({ x: x + randomIn(-2.5, 2.5), z: z + randomIn(-2.5, 2.5), scale: new THREE.Vector3(randomIn(1.6, 2.6), h, 1), rotationY: Math.random() * 6.28, tilt: randomIn(-0.08, 0.08), color: pick(PALETTE.kelp) });
            }
        }
        const material = withSway(new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, shininess: 30 }), this.uniforms, 0.7, 0.6);
        this.addInstances(bladeGeometry(0.18, 10), material, kelp);
    }

    private addInstances(geometry: THREE.BufferGeometry, material: THREE.Material, placements: Placement[]) {
        if (!placements.length) return;
        this.track(material);
        const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        placements.forEach((p, i) => {
            dummy.position.set(p.x, floorHeight(p.x, p.z) - (p.sink ?? 0), p.z);
            dummy.rotation.set(p.tilt ?? 0, p.rotationY, 0, 'YXZ');
            dummy.scale.copy(p.scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, color.set(p.color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        this.group.add(mesh);
        this.disposables.push({ dispose: () => mesh.dispose() });
    }
}

// ───────────────────────── procedural geometry ─────────────────────────
// Built at unit size with the base at y = 0; instances scale them.

/** A lumpy, flat-bottomed boulder with speckled vertex colours. */
function rockGeometry() {
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = 1 + 0.18 * Math.sin(v.x * 3.1 + v.z * 1.7) + 0.12 * Math.sin(v.y * 4.3 + v.x * 2.2) + 0.08 * Math.sin(v.z * 7.1);
        v.multiplyScalar(n);
        v.y = Math.max(v.y, -0.2) + 0.2;
        pos.setXYZ(i, v.x, v.y, v.z);
        const shade = 0.75 + 0.25 * Math.sin(v.x * 5 + v.z * 3) * Math.cos(v.y * 4);
        colors.set([shade, shade, shade], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
}

/** A dome with the meandering ridges of a brain coral. */
function brainCoralGeometry() {
    const geometry = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const ridge = Math.sin(v.x * 11 + Math.sin(v.z * 7) * 2.2 + Math.cos(v.y * 5));
        v.multiplyScalar(1 + ridge * 0.035);
        pos.setXYZ(i, v.x, v.y, v.z);
        const shade = 0.7 + 0.3 * (ridge * 0.5 + 0.5);
        colors.set([shade, shade, shade], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
}

/** A cluster of open-topped tube sponges. */
function spongeGeometry() {
    const tubes: THREE.BufferGeometry[] = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
        const h = 0.6 + Math.random() * 1.2;
        const r = 0.12 + Math.random() * 0.1;
        const tube = new THREE.CylinderGeometry(r * 1.15, r * 0.85, h, 12, 1, true);
        tube.translate(0, h / 2, 0);
        tube.rotateX((Math.random() - 0.5) * 0.35);
        tube.rotateZ((Math.random() - 0.5) * 0.35);
        const a = (i / count) * Math.PI * 2;
        tube.translate(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
        tubes.push(tube);
    }
    return mergeGeometries(tubes)!;
}

/** A squat base crowned with tapering tentacles (which the sway shader waves). */
function anemoneGeometry() {
    const parts: THREE.BufferGeometry[] = [];
    const base = new THREE.CylinderGeometry(0.3, 0.38, 0.3, 16).toNonIndexed();
    base.translate(0, 0.15, 0);
    parts.push(base);
    for (let i = 0; i < 26; i++) {
        const tentacle = new THREE.ConeGeometry(0.04, 0.55, 5).toNonIndexed();
        tentacle.translate(0, 0.275, 0);
        const ring = i < 16 ? 0.26 : 0.12;
        const a = (i / (i < 16 ? 16 : 10)) * Math.PI * 2;
        tentacle.rotateX(ring * 1.4 * (0.8 + Math.random() * 0.4));
        tentacle.rotateY(-a + Math.PI / 2);
        tentacle.translate(Math.cos(a) * ring, 0.28, Math.sin(a) * ring);
        parts.push(tentacle);
    }
    return mergeGeometries(parts)!;
}

/** A tapered, gently curved ribbon: seagrass when short, kelp when tall. */
function bladeGeometry(width: number, segments: number) {
    const geometry = new THREE.PlaneGeometry(width, 1, 1, segments);
    geometry.translate(0, 0.5, 0);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setX(i, pos.getX(i) * (1 - y * 0.7));
        pos.setZ(i, y * y * 0.15);
    }
    geometry.computeVertexNormals();
    return geometry;
}
