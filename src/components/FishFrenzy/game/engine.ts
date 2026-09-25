import * as THREE from 'three';
import {
    CORALS, EAT_RATIO, INVULNERABLE_SECONDS, LENGTH_PER_SIZE, MAX_POWER_CHARGES, PLAYER, PLAYER_START_SIZE,
    POWER_FISH, POWER_POINTS, POWER_SPECIES, POWER_UPS, SHIELD_GRACE_SECONDS, SPECIES, SPEED_BOOST, WORLD,
    growthFor, pointsFor, unlockSize, type PowerKind, type PowerUp, type Species, type SwimParams,
} from './config';
import { fishGeometry, propModel } from './models';
import { createSwimMaterial, type SwimMaterial } from './swimMaterial';
import { PLAYER_SKIN, POWER_SKINS, SPECIES_SKINS, type FishSkin } from './skins';
import { createOceanUniforms, withCaustics } from './caustics';
import { Reef, WATER, floorHeight } from './reef';
import { Schools } from './schools';
import { Bubbles, Bursts } from './effects';
import { CATEGORY_COLORS, drawMinimap, type Category, type MapBlip } from './minimap';
import { approach, clamp, pick, randomIn, wrapAngle } from './math';
import type { Sfx } from './audio';

export interface GameInput {
    keys: Record<string, boolean>;
    stickX: number; // -1 (left) … 1 (right), from the touch joystick
    stickY: number; // -1 (down) … 1 (up)
}

/** Active power-ups: seconds of speed left, and shields / mega bites held. */
export interface PowerState {
    speed: number;
    shields: number;
    bites: number;
}

export interface GameEvents {
    onStats(score: number, size: number): void;
    onUnlock(species: Species): void;
    onPowerUp(power: PowerUp): void;
    onPowers(state: PowerState): void;
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
    age: number;
    chasing: boolean;
    power?: PowerKind; // set on the rare sparkling power-up fish
    life: number;      // seconds left before a power fish swims off
}

const LOGIC_STEP = 1 / 60;

// Fish wear natural colours; a glowing rim says whether they're food or a threat.
const CATEGORY_RIM: Record<Category, { color: THREE.Color; strength: number }> = {
    edible: { color: new THREE.Color(CATEGORY_COLORS.edible), strength: 1.4 },
    neutral: { color: new THREE.Color(CATEGORY_COLORS.neutral), strength: 1.1 },
    danger: { color: new THREE.Color(CATEGORY_COLORS.danger), strength: 1.8 },
};
const PLAYER_RIM = { color: new THREE.Color(0xffffff), strength: 0.2 };
const POWER_KINDS = Object.keys(POWER_UPS) as PowerKind[];
const POWER_COLORS = Object.fromEntries(
    POWER_KINDS.map(k => [k, new THREE.Color(POWER_UPS[k].color)]),
) as Record<PowerKind, THREE.Color>;
const ALL_SPECIES = [...SPECIES, POWER_SPECIES];

const lengthOf = (size: number) => size * LENGTH_PER_SIZE;

/** Unit heading for a yaw (around Y, 0 = +Z) and pitch (+ = nose up). */
function forwardOf(yaw: number, pitch: number, out: THREE.Vector3) {
    return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

/** Half the body height of a normalized fish geometry, for belly-to-back shading. */
function halfHeightOf(geometry: THREE.BufferGeometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    return Math.max(Math.abs(box.min.y), Math.abs(box.max.y));
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
    private readonly bursts = new Bursts(28);
    private readonly disposables: { dispose(): void }[] = [];
    private readonly geometries = new Map<string, THREE.BufferGeometry>();
    private readonly ocean = createOceanUniforms();
    private readonly targetPopulation: number;
    private reef!: Reef;
    private schools!: Schools;

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
    private powerCooldown = randomIn(6, 10);
    private sparkleCooldown = 0;
    private speedTime = 0;
    private shields = 0;
    private bites = 0;
    private lastPowerReport = '';
    private shieldBubble!: THREE.Mesh;

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

        this.scene.background = WATER.horizon.clone();
        this.scene.fog = new THREE.FogExp2(WATER.horizon, mobile ? 0.028 : 0.022);

        this.scene.add(new THREE.HemisphereLight(0xcff4ff, 0x2a4a5a, 1.7));
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
            ...ALL_SPECIES.map(s => fishGeometry(s.modelPath, s.head, s.up)),
        ]);
        ALL_SPECIES.forEach((s, i) => this.geometries.set(s.id, speciesGeos[i]));

        const { mobile } = this.opts;
        this.reef = new Reef({ mobile, uniforms: this.ocean, treeCoral: tree, fanCoral: fan });
        this.schools = new Schools(mobile ? 2 : 4, mobile ? 16 : 24, this.ocean);
        this.scene.add(this.reef.group, this.schools.mesh);
        this.disposables.push(this.reef, this.schools);

        const material = this.fishMaterial(PLAYER.swim, PLAYER_SKIN, playerGeo, { shininess: 90 });
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
        this.shieldBubble = this.createShieldBubble();
        this.scene.add(this.shieldBubble);

        while (this.fish.length < this.targetPopulation) this.spawnFish(0.12, true);
        this.updateCamera(1);
        this.reef.update(this.camera);
        this.unlocked = SPECIES.filter(s => PLAYER_START_SIZE > unlockSize(s)).length;
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
        this.ocean.uTime.value = this.time;
        this.schools.update(this.time, dt, this.player.mesh.position, lengthOf(this.player.size));
        this.updateCamera(dt);
        this.reef.update(this.camera);

        const { minimap } = this.opts;
        if (minimap && this.tickCount % 4 === 0) this.drawMap(minimap);
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
        const boosted = this.speedTime > 0 ? SPEED_BOOST.multiplier : 1;
        const targetSpeed = p.cruise * (sprint ? PLAYER.sprintMultiplier : 1) * boosted;
        p.speed += (targetSpeed - p.speed) * approach(4, dt);

        pos.addScaledVector(forwardOf(p.yaw, p.pitch, _forward), p.speed * dt);
        this.keepInBounds(pos, lengthOf(p.size));

        this.poseSwimmer(p, dt, sprint || boosted > 1 ? 1.3 : 1);
        this.updatePowers(dt);

        if (this.invulnerable > 0) {
            this.invulnerable -= dt;
            // Blink while protected; always end visible.
            p.mesh.visible = this.invulnerable <= 0 || Math.floor(this.time * 10) % 2 === 0;
        }
    }

    /** Ticks power-up timers and shows them on the player: glow, sparkle trail, shield bubble. */
    private updatePowers(dt: number) {
        const p = this.player;
        this.speedTime = Math.max(0, this.speedTime - dt);

        const skin = p.mesh.material.userData.skin;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
        if (this.bites > 0) {
            skin.uRimColor.value.copy(POWER_COLORS.bite);
            skin.uRimStrength.value = 1.2 + pulse;
        } else if (this.speedTime > 0) {
            skin.uRimColor.value.copy(POWER_COLORS.speed);
            skin.uRimStrength.value = 1 + pulse * 0.5;
        } else {
            // A soft white outline keeps you easy to find among the natural colours.
            skin.uRimColor.value.copy(PLAYER_RIM.color);
            skin.uRimStrength.value = PLAYER_RIM.strength;
        }

        this.sparkleCooldown -= dt;
        if (this.speedTime > 0 && this.sparkleCooldown <= 0) {
            this.sparkleCooldown = 0.12;
            _trail.copy(p.mesh.position).addScaledVector(forwardOf(p.yaw, p.pitch, _fishForward), -lengthOf(p.size) * 0.5);
            this.bursts.spawn(_trail, POWER_UPS.speed.color, 0.7);
        }

        const bubble = this.shieldBubble;
        bubble.visible = this.shields > 0;
        bubble.position.copy(p.mesh.position);
        bubble.scale.setScalar(lengthOf(p.size) * (0.72 + 0.03 * Math.sin(this.time * 3)));

        this.reportPowers();
    }

    private reportPowers() {
        const state: PowerState = { speed: Math.ceil(this.speedTime), shields: this.shields, bites: this.bites };
        const key = `${state.speed}|${state.shields}|${state.bites}`;
        if (key === this.lastPowerReport) return;
        this.lastPowerReport = key;
        this.opts.events.onPowers(state);
    }

    private grantPower(kind: PowerKind) {
        if (kind === 'speed') this.speedTime = SPEED_BOOST.seconds;
        if (kind === 'shield') this.shields = Math.min(this.shields + 1, MAX_POWER_CHARGES);
        if (kind === 'bite') this.bites = Math.min(this.bites + 1, MAX_POWER_CHARGES);
        this.opts.sfx.powerUp();
        this.opts.events.onPowerUp(POWER_UPS[kind]);
        this.reportPowers();
    }

    /** A soft iridescent bubble around the player while a shield is held. */
    private createShieldBubble() {
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: { uTime: this.ocean.uTime },
            vertexShader: /* glsl */`
                varying vec3 vNormal;
                varying vec3 vView;
                void main() {
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vNormal = normalize(normalMatrix * normal);
                    vView = normalize(-mv.xyz);
                    gl_Position = projectionMatrix * mv;
                }`,
            fragmentShader: /* glsl */`
                uniform float uTime;
                varying vec3 vNormal;
                varying vec3 vView;
                void main() {
                    float edge = pow(1.0 - abs(dot(vNormal, vView)), 2.5);
                    vec3 tint = 0.5 + 0.5 * cos(uTime * 1.5 + vNormal.yxz * 3.0 + vec3(0.0, 2.0, 4.0));
                    gl_FragColor = vec4(mix(vec3(0.9), tint, 0.5) * (edge * 0.9 + 0.04), 1.0);
                }`,
        });
        const geometry = new THREE.SphereGeometry(1, 32, 16);
        this.disposables.push(material, geometry);
        const bubble = new THREE.Mesh(geometry, material);
        bubble.visible = false;
        bubble.renderOrder = 3;
        return bubble;
    }

    /** Applies heading, banking and swim-shader animation to a fish mesh. */
    private poseSwimmer(s: Swimmer, dt: number, ampBoost = 1) {
        const bank = clamp(-s.yawVelocity * 0.3, -0.5, 0.5);
        s.mesh.rotation.set(-s.pitch, s.yaw, bank, 'YXZ');

        const swim = s.mesh.material.userData.swim;
        const effort = s.speed / Math.max(s.cruise, 0.01);
        swim.uPhase.value += dt * s.swimSpeed * (0.4 + 0.6 * effort);
        const targetBend = clamp(s.yawVelocity * 0.08, -0.15, 0.15);
        swim.uBend.value += (targetBend - swim.uBend.value) * approach(6, dt);
        swim.uAmp.value += (s.amp * ampBoost - swim.uAmp.value) * approach(4, dt);
    }

    /** Swim material with reef caustics dancing over the fish's back. */
    private fishMaterial(swim: SwimParams, skin: FishSkin, geometry: THREE.BufferGeometry, params?: THREE.MeshPhongMaterialParameters) {
        const material = createSwimMaterial(swim, skin, halfHeightOf(geometry), params);
        return withCaustics(material, this.ocean, { strength: 0.3, scale: 0.35 });
    }

    private keepInBounds(pos: THREE.Vector3, length: number) {
        const w = WORLD.halfWidth;
        pos.x = clamp(pos.x, -w, w);
        pos.z = clamp(pos.z, -w, w);
        pos.y = clamp(pos.y, floorHeight(pos.x, pos.z) + length * 0.2, WORLD.surfaceY);
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
        f.category = f.power ? 'edible' : this.categoryOf(f.size);
        if (f.power) f.life -= dt;

        const toPlayer = _toPlayer.subVectors(this.player.mesh.position, pos);
        const distance = toPlayer.length();
        const playerLength = lengthOf(this.player.size);
        const canChase = this.alive && this.invulnerable <= 0;
        f.chasing = canChase && f.category === 'danger' && distance < 12 + length;
        const fleeRadius = f.power ? POWER_FISH.fleeRadius + playerLength : 6 + playerLength * 1.5;
        const fleeing = this.alive && f.category === 'edible' && distance < fleeRadius;

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
            targetSpeed = f.power ? POWER_FISH.fleeSpeed : f.personalSpeed * 1.7;
            turnRate = f.power ? 2.6 : 2;
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
        if (pos.y < floorHeight(pos.x, pos.z) + 2 + length * 0.3) f.targetPitch = 0.3;
        else if (pos.y > WORLD.surfaceY - 2) f.targetPitch = -0.3;

        f.yawVelocity = clamp(wrapAngle(f.targetYaw - f.yaw) * 2, -turnRate, turnRate);
        f.yaw += f.yawVelocity * dt;
        f.pitch += clamp((f.targetPitch - f.pitch) * 2, -turnRate, turnRate) * dt;
        f.speed += (targetSpeed - f.speed) * approach(2, dt);

        pos.addScaledVector(forwardOf(f.yaw, f.pitch, _forward), f.speed * dt);
        this.keepInBounds(pos, length);

        // Grow in on spawn instead of popping into view.
        const grow = Math.min(f.age / 0.8, 1);
        const fade = f.power ? clamp(f.life, 0, 1) : 1; // power fish shrink away when their time is up
        f.mesh.scale.setScalar(length * (1 - (1 - grow) ** 3) * fade);

        this.poseSwimmer(f, dt);
        this.tintFish(f, dt);
    }

    private tintFish(f: Fish, dt: number) {
        if (f.power) {
            // Power fish shimmer in their colour and leave a sparkle trail.
            const color = POWER_COLORS[f.power];
            const pulse = 0.5 + 0.5 * Math.sin(this.time * 9 + f.personalSpeed * 10);
            const skin = f.mesh.material.userData.skin;
            skin.uRimColor.value.copy(color);
            skin.uRimStrength.value = 1.4 + pulse;
            f.mesh.material.emissive.copy(color).multiplyScalar(0.25 + 0.25 * pulse);
            if (Math.random() < dt * 5) this.bursts.spawn(f.mesh.position, POWER_UPS[f.power].color, 0.5);
            return;
        }
        const rim = CATEGORY_RIM[f.category];
        const skin = f.mesh.material.userData.skin;
        const blend = approach(5, dt);
        skin.uRimColor.value.lerp(rim.color, blend);
        skin.uRimStrength.value += (rim.strength - skin.uRimStrength.value) * blend;
        const glow = f.chasing ? 0.2 + 0.15 * Math.sin(this.time * 10) : 0;
        f.mesh.material.emissive.setRGB(glow, glow * 0.1, 0);
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
                if (this.bites > 0) {
                    this.bites--;
                    this.eat(i, true);
                } else if (this.invulnerable > 0) {
                    continue;
                } else if (this.shields > 0) {
                    this.blockWithShield(f);
                } else {
                    return this.die();
                }
            } else {
                this.bump(f);
            }
        }
    }

    private eat(index: number, mega = false) {
        const f = this.fish[index];
        const p = this.player;
        const color = f.power ? POWER_UPS[f.power].color : mega ? POWER_UPS.bite.color : CATEGORY_COLORS.edible;
        this.bursts.spawn(f.mesh.position, color, 2 + lengthOf(f.size) * (mega ? 1.5 : 1));
        if (f.power) this.grantPower(f.power);
        else if (mega) this.opts.sfx.megaBite();
        else this.opts.sfx.eat(f.size / p.size);
        this.removeFish(index);

        this.score += pointsFor(p.size, f.size) + (f.power ? POWER_POINTS : 0);
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

    /** The shield pops instead of you: bounce apart and get a moment of safety. */
    private blockWithShield(f: Fish) {
        this.shields--;
        this.invulnerable = SHIELD_GRACE_SECONDS;
        const away = _toPlayer.subVectors(this.player.mesh.position, f.mesh.position).normalize();
        this.player.mesh.position.addScaledVector(away, 1.2);
        f.mesh.position.addScaledVector(away, -1);
        this.bursts.spawn(this.player.mesh.position, POWER_UPS.shield.color, 4);
        this.opts.sfx.shieldBreak();
        this.reportPowers();
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
        this.bursts.spawn(this.player.mesh.position, CATEGORY_COLORS.danger, 5);
        this.player.mesh.visible = false;
        this.shieldBubble.visible = false;
        this.opts.sfx.gameOver();
        this.opts.events.onGameOver(this.score);
    }

    // ───────────────────────── population ─────────────────────────

    private updatePopulation(dt: number) {
        this.spawnCooldown -= dt;
        this.recycleCooldown -= dt;
        this.bumpCooldown -= dt;

        // Power fish whose time ran out swim off (they've shrunk to nothing by now).
        for (let i = this.fish.length - 1; i >= 0; i--) {
            if (this.fish[i].power && this.fish[i].life <= 0) this.removeFish(i);
        }
        this.powerCooldown -= dt;
        const powerFish = this.fish.filter(f => f.power).length;
        if (this.alive && this.powerCooldown <= 0 && powerFish < (this.opts.mobile ? 1 : 2)) {
            this.powerCooldown = randomIn(...POWER_FISH.respawn);
            this.spawnPowerFish();
        }

        // Fish far too small to matter get quietly replaced by relevant ones, out of sight.
        if (this.recycleCooldown <= 0) {
            this.recycleCooldown = 1;
            const index = this.fish.findIndex(f =>
                !f.power &&
                f.size < this.player.size * 0.25 &&
                f.mesh.position.distanceTo(this.player.mesh.position) > 25);
            if (index >= 0) this.removeFish(index);
        }

        if (this.spawnCooldown <= 0 && this.fish.length - powerFish < this.targetPopulation) {
            this.spawnCooldown = 0.3;
            const dangerFraction = this.time < 15 ? 0.2 : 0.32;
            this.spawnFish(dangerFraction);
        }
    }

    /** Spawns one fish, keeping roughly `dangerFraction` of the population bigger than you. */
    private spawnFish(dangerFraction: number, initial = false) {
        const playerSize = this.player.size;
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
        const playerPos = this.player.mesh.position;
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

        const fish = this.addFish(species, pick(SPECIES_SKINS[species.id]), size, pos, initial);
        // A light random tint so no two fish of the same morph look identical.
        fish.mesh.material.color.setHSL(Math.random(), randomIn(0, 0.3), randomIn(0.85, 0.95));
    }

    private spawnPowerFish() {
        const kind = pick(POWER_KINDS);
        const pos = new THREE.Vector3();
        for (let attempt = 0; attempt < 12; attempt++) {
            pos.set(
                randomIn(-1, 1) * (WORLD.halfWidth - 6),
                randomIn(WORLD.floorY + 3, WORLD.surfaceY - 3),
                randomIn(-1, 1) * (WORLD.halfWidth - 6),
            );
            const d = pos.distanceTo(this.player.mesh.position);
            if (d > 15 && d < 35) break; // close enough to chase, not on top of you
        }
        const size = randomIn(POWER_SPECIES.minSize, POWER_SPECIES.maxSize);
        const fish = this.addFish(POWER_SPECIES, POWER_SKINS[kind], size, pos, false, { shininess: 110 });
        fish.power = kind;
        fish.life = POWER_FISH.lifetime;
    }

    private addFish(species: Species, skin: FishSkin, size: number, pos: THREE.Vector3, initial: boolean, params?: THREE.MeshPhongMaterialParameters) {
        const geometry = this.geometries.get(species.id)!;
        const mesh = new THREE.Mesh(geometry, this.fishMaterial(species.swim, skin, geometry, params));
        mesh.position.copy(pos);
        const personalSpeed = species.speed * randomIn(0.8, 1.2);
        const yaw = Math.random() * Math.PI * 2;
        const category = this.categoryOf(size);
        mesh.material.userData.skin.uRimColor.value.copy(CATEGORY_RIM[category].color);
        mesh.material.userData.skin.uRimStrength.value = CATEGORY_RIM[category].strength;
        const fish: Fish = {
            mesh, species, size, category,
            yaw, pitch: 0, targetYaw: yaw, targetPitch: 0,
            speed: personalSpeed, personalSpeed, yawVelocity: 0,
            swimSpeed: species.swim.speed * randomIn(0.85, 1.15),
            amp: species.swim.amp,
            cruise: personalSpeed,
            wanderTimer: randomIn(0, 3),
            age: initial ? 1 : 0,
            chasing: false,
            life: Infinity,
        };
        mesh.scale.setScalar(initial ? lengthOf(size) : 0.001);
        this.scene.add(mesh);
        this.fish.push(fish);
        return fish;
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
        _desired.y = Math.max(_desired.y, floorHeight(_desired.x, _desired.z) + 0.6);
        this.camera.position.lerp(_desired, approach(5, dt));
        _lookAt.copy(p.mesh.position).addScaledVector(forwardOf(p.yaw, p.pitch, _fishForward), length * 1.5);
        this.camera.lookAt(_lookAt);
    }

    private drawMap(canvas: HTMLCanvasElement) {
        const blips: MapBlip[] = this.fish.map(f => ({
            x: f.mesh.position.x,
            z: f.mesh.position.z,
            length: lengthOf(f.size),
            category: f.category,
            power: f.power && POWER_UPS[f.power].color,
        }));
        const { x, z } = this.player.mesh.position;
        drawMinimap(canvas, { x, z, yaw: this.player.yaw }, blips);
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
const _trail = new THREE.Vector3();
