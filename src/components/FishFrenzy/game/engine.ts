import * as THREE from 'three';
import {
    CORALS, EAT_RATIO, INVULNERABLE_SECONDS, LENGTH_PER_SIZE, PLAYER, PLAYER_START_SIZE,
    SPECIES, WORLD, growthFor, pointsFor, unlockSize, type Species,
} from './config';
import { fishGeometry, propModel } from './models';
import { createSwimMaterial, type SwimMaterial } from './swimMaterial';
import { Bubbles, Bursts } from './effects';
import { CATEGORY_COLORS, drawMinimap, type Category, type MapBlip } from './minimap';
import type { Sfx } from './audio';

export interface GameInput {
    keys: Record<string, boolean>;
    stickX: number; // -1 (left) … 1 (right), from the touch joystick
    stickY: number; // -1 (down) … 1 (up)
}

export interface GameEvents {
    onStats(score: number, size: number): void;
    onUnlock(species: Species): void;
    onGameOver(score: number): void;
    onPauseChange(paused: boolean): void;
}

export interface GameOptions {
    container: HTMLElement;
    minimap: HTMLCanvasElement | null;
    input: { current: GameInput };
    events: GameEvents;
    sfx: Sfx;
    mobile: boolean;
}

interface Swimmer {
    mesh: THREE.Mesh<THREE.BufferGeometry, SwimMaterial>;
    size: number;
    yaw: number;
    pitch: number;
    speed: number;
    yawVelocity: number;
    swimSpeed: number; // wave speed at cruising speed
    amp: number;       // tail sway at cruising speed
    cruise: number;    // cruising speed this swimmer's swim cycle is tuned to
}

interface Fish extends Swimmer {
    species: Species;
    category: Category;
    targetYaw: number;
    targetPitch: number;
    wanderTimer: number;
    personalSpeed: number; // per-fish variation of the species speed
    hue: number;
    age: number;
    chasing: boolean;
}

const LOGIC_STEP = 1 / 60;
const BACKGROUND = 0x0569a0;
const CORAL_TINTS = ['#ff8a80', '#ffab62', '#c77dff', '#ffd166', '#f28482', '#80ffdb'];
const CATEGORY_HUES: Record<Category, [number, number, number]> = {
    edible: [0.33, 0.65, 0.5],
    neutral: [0.12, 0.85, 0.55],
    danger: [0.0, 0.8, 0.5],
};

const lengthOf = (size: number) => size * LENGTH_PER_SIZE;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const randomIn = (min: number, max: number) => min + Math.random() * (max - min);

function forwardOf(yaw: number, pitch: number, out = new THREE.Vector3()) {
    return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

/** Closest distance from point p to the segment a–b. */
const _ab = new THREE.Vector3();
const _ap = new THREE.Vector3();
function distanceToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
    _ab.subVectors(b, a);
    _ap.subVectors(p, a);
    const t = clamp(_ap.dot(_ab) / Math.max(_ab.lengthSq(), 1e-6), 0, 1);
    return _ap.sub(_ab.multiplyScalar(t)).length();
}

export class FishFrenzyGame {
    private readonly opts: GameOptions;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera: THREE.PerspectiveCamera;
    private readonly clock = new THREE.Clock(false);
    private readonly resizeObserver: ResizeObserver;
    private readonly bubbles: Bubbles;
    private readonly bursts = new Bursts();
    private readonly disposables: { dispose(): void }[] = [];
    private readonly geometries = new Map<string, THREE.BufferGeometry>();

    private player!: Swimmer;
    private fish: Fish[] = [];
    private score = 0;
    private unlocked = 0;
    private invulnerable = INVULNERABLE_SECONDS;
    private alive = true;
    private paused = false;
    private running = false;
    private frameId = 0;
    private accumulator = 0;
    private time = 0;
    private tickCount = 0;
    private spawnCooldown = 0;
    private recycleCooldown = 0;
    private bumpCooldown = 0;

    private readonly targetPopulation: number;

    /** Builds a game once all models are cached (see preloadModels). */
    static async create(opts: GameOptions) {
        const game = new FishFrenzyGame(opts);
        await game.buildWorld();
        return game;
    }

    private constructor(opts: GameOptions) {
        this.opts = opts;
        const { container, mobile } = opts;
        this.targetPopulation = mobile ? 26 : 40;

        this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.domElement.style.display = 'block';
        container.prepend(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 200);

        this.scene.background = new THREE.Color(BACKGROUND);
        this.scene.fog = new THREE.FogExp2(BACKGROUND, mobile ? 0.03 : 0.024);

        this.scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x0a3050, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(10, 30, 8);
        this.scene.add(sun);

        this.bubbles = new Bubbles(mobile ? 250 : 700);
        this.scene.add(this.bubbles.points, this.bursts.group);
        this.disposables.push(this.bubbles, this.bursts);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    // ───────────────────────── world setup ─────────────────────────

    private async buildWorld() {
        const [playerGeo, tree, fan, ...speciesGeos] = await Promise.all([
            fishGeometry(PLAYER.modelPath, PLAYER.head, PLAYER.up),
            propModel(CORALS.tree),
            propModel(CORALS.fan),
            ...SPECIES.map(s => fishGeometry(s.modelPath, s.head, s.up)),
        ]);
        SPECIES.forEach((s, i) => this.geometries.set(s.id, speciesGeos[i]));

        this.addFloor();
        this.addCorals(tree.geometry, tree.material, 18, [1.5, 4]);
        this.addCorals(fan.geometry, fan.material, 18, [1.2, 3]);

        const material = createSwimMaterial(PLAYER.swim, {
            color: 0x2cc8de,
            shininess: 90,
            specular: 0x333333,
            emissive: 0x114455,
            emissiveIntensity: 0.4,
        });
        this.disposables.push(material);
        const cruise = PLAYER.baseSpeed + PLAYER_START_SIZE * PLAYER.speedPerSize;
        this.player = {
            mesh: new THREE.Mesh(playerGeo, material),
            size: PLAYER_START_SIZE,
            yaw: Math.PI, // facing -Z, away from the camera
            pitch: 0,
            speed: cruise,
            yawVelocity: 0,
            swimSpeed: PLAYER.swim.speed,
            amp: PLAYER.swim.amp,
            cruise,
        };
        this.player.mesh.scale.setScalar(lengthOf(PLAYER_START_SIZE));
        this.scene.add(this.player.mesh);

        while (this.fish.length < this.targetPopulation) this.spawnFish(0.12, true);
        this.updateCamera(1);
        this.unlocked = SPECIES.filter(s => PLAYER_START_SIZE > unlockSize(s)).length;
    }

    private addFloor() {
        const size = WORLD.halfWidth * 2 + 60;
        const geometry = new THREE.PlaneGeometry(size, size, 48, 48);
        geometry.rotateX(-Math.PI / 2);
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            pos.setY(i, Math.sin(x * 0.15) * 0.4 + Math.cos(z * 0.11 + x * 0.05) * 0.5 + Math.random() * 0.15);
        }
        geometry.computeVertexNormals();
        const material = new THREE.MeshPhongMaterial({ color: 0x3f8f96, shininess: 5 });
        const floor = new THREE.Mesh(geometry, material);
        floor.position.y = WORLD.floorY - 0.4;
        this.scene.add(floor);
        this.disposables.push(geometry, material);
    }

    private addCorals(geometry: THREE.BufferGeometry, material: THREE.Material, count: number, heights: [number, number]) {
        const mesh = new THREE.InstancedMesh(geometry, material, count);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        for (let i = 0; i < count; i++) {
            const h = randomIn(...heights);
            dummy.position.set(randomIn(-1, 1) * WORLD.halfWidth, WORLD.floorY - 0.3, randomIn(-1, 1) * WORLD.halfWidth);
            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
            dummy.scale.setScalar(h);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, color.set(CORAL_TINTS[i % CORAL_TINTS.length]));
        }
        mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(mesh);
        this.disposables.push({ dispose: () => mesh.dispose() });
    }

    // ───────────────────────── lifecycle ─────────────────────────

    start() {
        if (this.running) return;
        this.running = true;
        this.clock.start();
        this.frameId = requestAnimationFrame(this.frame);
    }

    setPaused(paused: boolean) {
        if (paused === this.paused || !this.alive) return;
        this.paused = paused;
        if (!paused) this.clock.getDelta(); // don't count the paused time
        this.opts.events.onPauseChange(paused);
    }

    get isPaused() {
        return this.paused;
    }

    dispose() {
        this.running = false;
        cancelAnimationFrame(this.frameId);
        this.resizeObserver.disconnect();
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        for (const f of this.fish) f.mesh.material.dispose();
        this.fish = [];
        for (const d of this.disposables) d.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private onVisibilityChange = () => {
        if (document.hidden) this.setPaused(true);
    };

    private resize() {
        const { clientWidth: w, clientHeight: h } = this.opts.container;
        if (!w || !h) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    private frame = () => {
        if (!this.running) return;
        this.frameId = requestAnimationFrame(this.frame);
        const dt = Math.min(this.clock.getDelta(), 0.1);
        if (!this.paused) {
            this.accumulator += dt;
            while (this.accumulator >= LOGIC_STEP) {
                this.tick(LOGIC_STEP);
                this.accumulator -= LOGIC_STEP;
            }
        }
        this.renderer.render(this.scene, this.camera);
    };

    // ───────────────────────── simulation ─────────────────────────

    private tick(dt: number) {
        this.time += dt;
        this.tickCount++;

        if (this.alive) this.updatePlayer(dt);
        for (const f of this.fish) this.updateFish(f, dt);
        if (this.alive) this.checkCollisions();
        this.updatePopulation(dt);

        this.bubbles.update(dt, this.time);
        this.bursts.update(dt);
        this.updateCamera(dt);

        if (this.opts.minimap && this.tickCount % 4 === 0) this.drawMap();
    }

    private readInput() {
        const { keys, stickX, stickY } = this.opts.input.current;
        const steerX = clamp(stickX + (keys.d ? 1 : 0) - (keys.a ? 1 : 0), -1, 1);
        const steerY = clamp(stickY + (keys.w ? 1 : 0) - (keys.s ? 1 : 0), -1, 1);
        return { steerX, steerY, sprint: !!keys.shift };
    }

    private updatePlayer(dt: number) {
        const p = this.player;
        const { steerX, steerY, sprint } = this.readInput();

        p.yawVelocity = -steerX * PLAYER.turnRate;
        const pos = p.mesh.position;
        // The arena walls are invisible, so swimming into one gently turns you back toward the middle.
        if (Math.max(Math.abs(pos.x), Math.abs(pos.z)) > WORLD.halfWidth - 3) {
            const heading = forwardOf(p.yaw, 0, _forward);
            if (heading.x * pos.x + heading.z * pos.z > 0) {
                const turn = wrapAngle(Math.atan2(-pos.x, -pos.z) - p.yaw);
                p.yawVelocity += clamp(turn * 2, -PLAYER.turnRate, PLAYER.turnRate);
            }
        }
        p.yaw += p.yawVelocity * dt;
        if (steerY !== 0) {
            p.pitch = clamp(p.pitch + steerY * PLAYER.turnRate * 0.7 * dt, -PLAYER.maxPitch, PLAYER.maxPitch);
        } else {
            p.pitch *= Math.exp(-1.5 * dt); // level out when not steering up/down
        }

        p.cruise = PLAYER.baseSpeed + p.size * PLAYER.speedPerSize;
        const targetSpeed = p.cruise * (sprint ? PLAYER.sprintMultiplier : 1);
        p.speed += (targetSpeed - p.speed) * (1 - Math.exp(-4 * dt));

        pos.addScaledVector(forwardOf(p.yaw, p.pitch, _forward), p.speed * dt);
        this.keepInBounds(pos, lengthOf(p.size));

        this.poseSwimmer(p, dt, sprint ? 1.3 : 1);

        if (this.invulnerable > 0) {
            this.invulnerable -= dt;
            // Blink while protected; always end visible.
            p.mesh.visible = this.invulnerable <= 0 || Math.floor(this.time * 10) % 2 === 0;
        }
    }

    /** Applies heading, banking and swim-shader animation to a fish mesh. */
    private poseSwimmer(s: Swimmer, dt: number, ampBoost = 1) {
        const bank = clamp(-s.yawVelocity * 0.3, -0.5, 0.5);
        s.mesh.rotation.set(-s.pitch, s.yaw, bank, 'YXZ');

        const swim = s.mesh.material.userData.swim;
        const effort = s.speed / Math.max(s.cruise, 0.01);
        swim.uPhase.value += dt * s.swimSpeed * (0.4 + 0.6 * effort);
        const targetBend = clamp(s.yawVelocity * 0.08, -0.15, 0.15);
        swim.uBend.value += (targetBend - swim.uBend.value) * (1 - Math.exp(-6 * dt));
        swim.uAmp.value += (s.amp * ampBoost - swim.uAmp.value) * (1 - Math.exp(-4 * dt));
    }

    private keepInBounds(pos: THREE.Vector3, length: number) {
        const w = WORLD.halfWidth;
        pos.x = clamp(pos.x, -w, w);
        pos.z = clamp(pos.z, -w, w);
        pos.y = clamp(pos.y, WORLD.floorY + length * 0.2, WORLD.surfaceY);
    }

    private categoryOf(size: number): Category {
        const player = this.player.size;
        if (player > size * EAT_RATIO) return 'edible';
        if (size > player * EAT_RATIO) return 'danger';
        return 'neutral';
    }

    private updateFish(f: Fish, dt: number) {
        const pos = f.mesh.position;
        const length = lengthOf(f.size);
        f.age += dt;
        f.category = this.categoryOf(f.size);

        const toPlayer = _toPlayer.subVectors(this.player.mesh.position, pos);
        const distance = toPlayer.length();
        const playerLength = lengthOf(this.player.size);
        const canChase = this.alive && this.invulnerable <= 0;
        f.chasing = canChase && f.category === 'danger' && distance < 12 + length;
        const fleeing = this.alive && f.category === 'edible' && distance < 6 + playerLength * 1.5;

        let targetSpeed = f.personalSpeed;
        let turnRate = 0.9;
        if (f.chasing) {
            f.targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
            f.targetPitch = clamp(Math.asin(toPlayer.y / Math.max(distance, 0.001)), -0.6, 0.6);
            // Predators are a touch slower than you cruise, so you can always escape.
            targetSpeed = Math.min(f.personalSpeed * 1.6, this.player.cruise * 0.85);
            turnRate = 1.6;
        } else if (fleeing) {
            f.targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z);
            f.targetPitch = clamp(-Math.asin(toPlayer.y / Math.max(distance, 0.001)), -0.4, 0.4);
            targetSpeed = f.personalSpeed * 1.7;
            turnRate = 2;
        } else {
            f.wanderTimer -= dt;
            if (f.wanderTimer <= 0) {
                f.targetYaw = f.yaw + randomIn(-1.4, 1.4);
                f.targetPitch = randomIn(-0.25, 0.25);
                f.wanderTimer = randomIn(2, 5);
            }
        }

        // Steer back toward the middle near the edges, floor and surface.
        const edge = WORLD.halfWidth - 6;
        if (Math.abs(pos.x) > edge || Math.abs(pos.z) > edge) {
            f.targetYaw = Math.atan2(-pos.x, -pos.z);
            turnRate = Math.max(turnRate, 1.4);
        }
        if (pos.y < WORLD.floorY + 2 + length * 0.3) f.targetPitch = 0.3;
        else if (pos.y > WORLD.surfaceY - 2) f.targetPitch = -0.3;

        f.yawVelocity = clamp(wrapAngle(f.targetYaw - f.yaw) * 2, -turnRate, turnRate);
        f.yaw += f.yawVelocity * dt;
        f.pitch += clamp((f.targetPitch - f.pitch) * 2, -turnRate, turnRate) * dt;
        f.speed += (targetSpeed - f.speed) * (1 - Math.exp(-2 * dt));

        pos.addScaledVector(forwardOf(f.yaw, f.pitch, _forward), f.speed * dt);
        this.keepInBounds(pos, length);

        // Grow in on spawn instead of popping into view.
        const grow = Math.min(f.age / 0.8, 1);
        f.mesh.scale.setScalar(length * (1 - (1 - grow) ** 3));

        this.poseSwimmer(f, dt);
        this.tintFish(f, dt);
    }

    private tintFish(f: Fish, dt: number) {
        const [h, s, l] = CATEGORY_HUES[f.category];
        _color.setHSL((h + f.hue + 1) % 1, s, l);
        const m = f.mesh.material;
        m.color.lerp(_color, 1 - Math.exp(-5 * dt));
        const glow = f.chasing ? 0.35 + 0.25 * Math.sin(this.time * 10) : 0;
        m.emissive.setRGB(glow, glow * 0.1, 0);
    }

    // ───────────────────────── collisions ─────────────────────────

    private checkCollisions() {
        const p = this.player;
        const playerLength = lengthOf(p.size);
        const playerRadius = PLAYER.hitRadius * playerLength;
        const center = p.mesh.position;
        const forward = forwardOf(p.yaw, p.pitch, _forward);
        _head.copy(center).addScaledVector(forward, playerLength * 0.35);
        _tail.copy(center).addScaledVector(forward, -playerLength * 0.35);

        for (let i = this.fish.length - 1; i >= 0; i--) {
            const f = this.fish[i];
            if (f.age < 0.5) continue; // still fading in
            const length = lengthOf(f.size);
            const reach = playerLength + length + 1;
            if (center.distanceToSquared(f.mesh.position) > reach * reach) continue;

            // Fish bodies are capsules along their spine; the player is sampled at head, middle and tail.
            const fishForward = forwardOf(f.yaw, f.pitch, _fishForward);
            _a.copy(f.mesh.position).addScaledVector(fishForward, length * 0.38);
            _b.copy(f.mesh.position).addScaledVector(fishForward, -length * 0.38);
            const distance = Math.min(
                distanceToSegment(_head, _a, _b),
                distanceToSegment(center, _a, _b),
                distanceToSegment(_tail, _a, _b),
            );
            if (distance > playerRadius + f.species.hitRadius * length) continue;

            if (f.category === 'edible') {
                this.eat(i);
            } else if (f.category === 'danger') {
                if (this.invulnerable <= 0) return this.die();
            } else {
                this.bump(f);
            }
        }
    }

    private eat(index: number) {
        const f = this.fish[index];
        const p = this.player;
        this.bursts.spawn(f.mesh.position, CATEGORY_COLORS.edible, 2 + lengthOf(f.size));
        this.opts.sfx.eat(f.size / p.size);
        this.removeFish(index);

        this.score += pointsFor(p.size, f.size);
        p.size += growthFor(p.size, f.size);
        p.mesh.scale.setScalar(lengthOf(p.size));
        this.opts.events.onStats(this.score, p.size);

        const unlocked = SPECIES.filter(s => p.size > unlockSize(s)).length;
        if (unlocked > this.unlocked) {
            this.unlocked = unlocked;
            this.opts.sfx.speciesUnlocked();
            this.opts.events.onUnlock(SPECIES[unlocked - 1]);
        }
    }

    private bump(f: Fish) {
        const away = _toPlayer.subVectors(this.player.mesh.position, f.mesh.position).normalize();
        this.player.mesh.position.addScaledVector(away, 0.25);
        f.mesh.position.addScaledVector(away, -0.15);
        if (this.bumpCooldown <= 0) {
            this.opts.sfx.bump();
            this.bumpCooldown = 0.4;
        }
    }

    private die() {
        this.alive = false;
        this.bursts.spawn(this.player.mesh.position, '#ff6347', 5);
        this.player.mesh.visible = false;
        this.opts.sfx.gameOver();
        this.opts.events.onGameOver(this.score);
    }

    // ───────────────────────── population ─────────────────────────

    private updatePopulation(dt: number) {
        this.spawnCooldown -= dt;
        this.recycleCooldown -= dt;
        this.bumpCooldown -= dt;

        // Fish far too small to matter get quietly replaced by relevant ones, out of sight.
        if (this.recycleCooldown <= 0) {
            this.recycleCooldown = 1;
            const index = this.fish.findIndex(f =>
                f.size < this.player.size * 0.25 &&
                f.mesh.position.distanceTo(this.player.mesh.position) > 25);
            if (index >= 0) this.removeFish(index);
        }

        if (this.spawnCooldown <= 0 && this.fish.length < this.targetPopulation) {
            this.spawnCooldown = 0.3;
            const dangerFraction = this.time < 15 ? 0.2 : 0.32;
            this.spawnFish(dangerFraction);
        }
    }

    /** Spawns one fish, keeping roughly `dangerFraction` of the population bigger than you. */
    private spawnFish(dangerFraction: number, initial = false) {
        const playerSize = this.player?.size ?? PLAYER_START_SIZE;
        const dangerCount = this.fish.filter(f => f.size > playerSize * EAT_RATIO).length;
        const wantDanger = dangerCount < this.targetPopulation * dangerFraction;

        let species: Species;
        let size: number;
        if (wantDanger) {
            const options = SPECIES.filter(s => s.maxSize > playerSize * EAT_RATIO * 1.02);
            if (options.length) {
                species = options[Math.floor(Math.random() * Math.min(options.length, 2))];
                size = randomIn(Math.max(species.minSize, playerSize * EAT_RATIO * 1.02), species.maxSize);
            } else {
                // You've outgrown everything: giant goblin sharks keep the pressure on.
                species = SPECIES[SPECIES.length - 1];
                size = playerSize * randomIn(1.15, 1.5);
            }
        } else {
            const options = SPECIES.filter(s => s.minSize * EAT_RATIO < playerSize);
            // Favour the biggest species you can eat so meals stay meaningful.
            const weights = options.map((_, i) => 1 + i * 1.5);
            let r = Math.random() * weights.reduce((a, b) => a + b, 0);
            species = options[options.length - 1];
            for (let i = 0; i < options.length; i++) {
                r -= weights[i];
                if (r <= 0) { species = options[i]; break; }
            }
            size = randomIn(species.minSize, Math.min(species.maxSize, playerSize / (EAT_RATIO * 1.02)));
        }

        const length = lengthOf(size);
        const playerPos = this.player?.mesh.position ?? new THREE.Vector3();
        const minDistance = wantDanger ? 28 : 16;
        const pos = new THREE.Vector3();
        for (let attempt = 0; attempt < 12; attempt++) {
            pos.set(
                randomIn(-1, 1) * (WORLD.halfWidth - 4),
                randomIn(WORLD.floorY + 1 + length * 0.3, WORLD.surfaceY - 1),
                randomIn(-1, 1) * (WORLD.halfWidth - 4),
            );
            if (pos.distanceTo(playerPos) > minDistance) break;
        }

        const hue = randomIn(-0.05, 0.05);
        const material = createSwimMaterial(species.swim, { shininess: 50, specular: 0x222222 });
        const category = this.categoryOf(size);
        const [h, s, l] = CATEGORY_HUES[category];
        material.color.setHSL((h + hue + 1) % 1, s, l);

        const mesh = new THREE.Mesh(this.geometries.get(species.id)!, material);
        mesh.position.copy(pos);
        const personalSpeed = species.speed * randomIn(0.8, 1.2);
        const yaw = Math.random() * Math.PI * 2;
        const fish: Fish = {
            mesh, species, size, category, hue,
            yaw, pitch: 0, targetYaw: yaw, targetPitch: 0,
            speed: personalSpeed, personalSpeed, yawVelocity: 0,
            swimSpeed: species.swim.speed * randomIn(0.85, 1.15),
            amp: species.swim.amp,
            cruise: personalSpeed,
            wanderTimer: randomIn(0, 3),
            age: initial ? 1 : 0,
            chasing: false,
        };
        mesh.scale.setScalar(initial ? length : 0.001);
        this.scene.add(mesh);
        this.fish.push(fish);
    }

    private removeFish(index: number) {
        const [f] = this.fish.splice(index, 1);
        this.scene.remove(f.mesh);
        f.mesh.material.dispose();
    }

    // ───────────────────────── camera & HUD ─────────────────────────

    private updateCamera(dt: number) {
        const p = this.player;
        const length = lengthOf(p.size);
        const forward = forwardOf(p.yaw, p.pitch * 0.5, _forward);
        // Fish are flat, so a dead-behind camera sees a sliver: sit above and a
        // little to the right for a three-quarter view of the body.
        _right.set(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
        _desired.copy(p.mesh.position)
            .addScaledVector(forward, -(1.8 + length * 1.8))
            .addScaledVector(_right, length * 0.5);
        _desired.y += 0.4 + length * 0.8;
        _desired.y = Math.max(_desired.y, WORLD.floorY + 0.5);
        this.camera.position.lerp(_desired, 1 - Math.exp(-5 * dt));
        _lookAt.copy(p.mesh.position).addScaledVector(forwardOf(p.yaw, p.pitch, _fishForward), length * 1.5);
        this.camera.lookAt(_lookAt);
    }

    private drawMap() {
        const blips: MapBlip[] = this.fish.map(f => ({
            x: f.mesh.position.x,
            z: f.mesh.position.z,
            length: lengthOf(f.size),
            category: f.category,
        }));
        const { x, z } = this.player.mesh.position;
        drawMinimap(this.opts.minimap!, { x, z, yaw: this.player.yaw }, blips);
    }
}

// Scratch objects reused every tick to avoid garbage.
const _forward = new THREE.Vector3();
const _fishForward = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _head = new THREE.Vector3();
const _tail = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _right = new THREE.Vector3();
const _color = new THREE.Color();
