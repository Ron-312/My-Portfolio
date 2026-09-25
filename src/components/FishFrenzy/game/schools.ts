import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD } from './config';
import { withCaustics, type OceanUniforms } from './caustics';
import { approach, randomIn } from './math';

// Schools of little silver fish that loop around the reef. They're scenery,
// not food: they don't collide, and they scatter when you swim through them.
// One InstancedMesh draws every fish; the tail wag is in the vertex shader.

const SCHOOL_COLORS = ['#dcecff', '#9fdcff', '#c7b8ff', '#a8f0ff'];

interface School {
    anchor: THREE.Vector3;
    radiusX: number;
    radiusZ: number;
    speed: number;
    phase: number;
    center: THREE.Vector3;
    heading: THREE.Vector3;
}

interface SchoolFish {
    school: School;
    offset: THREE.Vector3; // place in the formation, relative to the heading
    push: THREE.Vector3;   // current dodge away from the player
    phase: number;
    size: number;
}

/** A tiny fish at length 1, head along +Z: an ellipsoid body and a flat tail. */
function schoolFishGeometry() {
    const body = new THREE.SphereGeometry(0.5, 10, 6);
    body.scale(0.16, 0.32, 0.85);
    body.translate(0, 0, 0.08);
    const tail = new THREE.ConeGeometry(0.2, 0.3, 4);
    tail.rotateX(Math.PI / 2); // tip toward the body (+Z)
    tail.scale(0.08, 1, 1);
    tail.translate(0, 0, -0.42);
    return mergeGeometries([body, tail])!;
}

export class Schools {
    readonly mesh: THREE.InstancedMesh;
    private readonly schools: School[] = [];
    private readonly fish: SchoolFish[] = [];
    private readonly dummy = new THREE.Object3D();

    constructor(schoolCount: number, perSchool: number, uniforms: OceanUniforms) {
        const limit = WORLD.halfWidth - 10;
        for (let s = 0; s < schoolCount; s++) {
            const school: School = {
                anchor: new THREE.Vector3(
                    randomIn(-limit, limit) * 0.6,
                    randomIn(WORLD.floorY + 4, WORLD.surfaceY - 5),
                    randomIn(-limit, limit) * 0.6,
                ),
                radiusX: randomIn(8, 14),
                radiusZ: randomIn(8, 14),
                speed: randomIn(0.08, 0.14) * (Math.random() < 0.5 ? -1 : 1),
                phase: Math.random() * Math.PI * 2,
                center: new THREE.Vector3(),
                heading: new THREE.Vector3(0, 0, 1),
            };
            this.schools.push(school);
            for (let i = 0; i < perSchool; i++) {
                this.fish.push({
                    school,
                    offset: new THREE.Vector3(
                        randomIn(-1.6, 1.6),
                        randomIn(-0.8, 0.8),
                        randomIn(-2, 2),
                    ),
                    push: new THREE.Vector3(),
                    phase: Math.random() * Math.PI * 2,
                    size: randomIn(0.3, 0.45),
                });
            }
        }

        const material = new THREE.MeshPhongMaterial({ shininess: 90, specular: 0x777777 });
        material.onBeforeCompile = shader => {
            shader.uniforms.uTime = uniforms.uTime;
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nuniform float uTime;')
                .replace('#include <begin_vertex>', `#include <begin_vertex>
                    float wag = sin(position.z * 9.0 - uTime * 14.0 + float(gl_InstanceID) * 1.7);
                    transformed.x += wag * 0.09 * clamp(0.45 - position.z, 0.0, 1.0);`);
        };
        material.customProgramCacheKey = () => 'school-fish';
        withCaustics(material, uniforms, { strength: 0.25, scale: 0.35 });

        this.mesh = new THREE.InstancedMesh(schoolFishGeometry(), material, this.fish.length);
        this.mesh.frustumCulled = false;
        const color = new THREE.Color();
        this.fish.forEach((f, i) => {
            const base = SCHOOL_COLORS[this.schools.indexOf(f.school) % SCHOOL_COLORS.length];
            this.mesh.setColorAt(i, color.set(base).offsetHSL(0, 0, randomIn(-0.05, 0.05)));
        });
        this.update(0, 1 / 60, new THREE.Vector3(0, -1000, 0), 1);
    }

    update(time: number, dt: number, player: THREE.Vector3, playerLength: number) {
        for (const s of this.schools) {
            const t = time * s.speed + s.phase;
            s.center.set(
                s.anchor.x + Math.sin(t) * s.radiusX,
                s.anchor.y + Math.sin(t * 1.7) * 1.5,
                s.anchor.z + Math.cos(t) * s.radiusZ,
            );
            s.heading.set(
                Math.cos(t) * s.radiusX * s.speed,
                Math.cos(t * 1.7) * 1.5 * 1.7 * s.speed,
                -Math.sin(t) * s.radiusZ * s.speed,
            ).normalize();
        }

        const scareRadius = 2.5 + playerLength * 1.5;
        const target = _target;
        const away = _away;
        const blend = approach(5, dt);
        this.fish.forEach((f, i) => {
            const s = f.school;
            const yaw = Math.atan2(s.heading.x, s.heading.z);
            target.copy(f.offset).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(s.center);
            target.x += Math.sin(time * 1.3 + f.phase) * 0.3;
            target.y += Math.cos(time * 1.1 + f.phase) * 0.2;

            // Scatter away from the player, then drift back into formation.
            away.subVectors(target, player);
            const distance = away.length();
            const dodge = distance < scareRadius ? away.multiplyScalar((scareRadius - distance) * 1.6 / Math.max(distance, 0.01)) : away.set(0, 0, 0);
            f.push.lerp(dodge, blend);

            this.dummy.position.copy(target).add(f.push);
            this.dummy.lookAt(target.add(s.heading).add(f.push));
            this.dummy.scale.setScalar(f.size);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        });
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.mesh.dispose();
    }
}

// Scratch vectors reused every update.
const _target = new THREE.Vector3();
const _away = new THREE.Vector3();
