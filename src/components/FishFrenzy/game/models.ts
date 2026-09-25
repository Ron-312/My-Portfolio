import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Axis } from './config';

// Models are meshopt-compressed and quantized, so their node transforms carry
// real scale/offset data. We bake those into the geometry and cache the result
// for the lifetime of the page: restarting a game reuses everything.

export interface LoadedModel {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const cache = new Map<string, Promise<LoadedModel>>();

/** Quantized (int8/int16) attributes can't hold baked transforms, so widen them to float32. */
function toFloatGeometry(source: THREE.BufferGeometry) {
    const geo = new THREE.BufferGeometry();
    if (source.index) geo.setIndex(source.index.clone());
    for (const [name, attr] of Object.entries(source.attributes)) {
        const a = attr as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
        const out = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) {
            for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
        }
        geo.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
    }
    return geo;
}

function loadRaw(path: string, onProgress: (loaded: number, total: number) => void) {
    let pending = cache.get(path);
    if (!pending) {
        pending = loader
            .loadAsync(path, e => onProgress(e.loaded, e.total))
            .then(gltf => {
                gltf.scene.updateMatrixWorld(true);
                const mesh = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh | undefined;
                if (!mesh) throw new Error(`No mesh in ${path}`);
                const geometry = toFloatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
                const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                return { geometry, material };
            });
        pending.catch(() => cache.delete(path)); // allow a retry after a network error
        cache.set(path, pending);
    }
    return pending;
}

/** Loads every path once, reporting overall progress from 0 to 1. */
export async function preloadModels(paths: string[], onProgress?: (fraction: number) => void) {
    const loaded = new Map<string, number>();
    const totals = new Map<string, number>();
    const report = () => {
        if (!onProgress) return;
        let l = 0, t = 0;
        for (const p of paths) {
            const total = totals.get(p) ?? 0;
            t += total;
            l += Math.min(loaded.get(p) ?? 0, total);
        }
        onProgress(t > 0 ? l / t : 0);
    };
    await Promise.all(paths.map(p =>
        loadRaw(p, (l, t) => { loaded.set(p, l); totals.set(p, t); report(); })
            .then(() => { totals.set(p, totals.get(p) || 1); loaded.set(p, totals.get(p)!); report(); })
    ));
    onProgress?.(1);
}

const AXES: Record<Axis, THREE.Vector3> = {
    '+x': new THREE.Vector3(1, 0, 0), '-x': new THREE.Vector3(-1, 0, 0),
    '+y': new THREE.Vector3(0, 1, 0), '-y': new THREE.Vector3(0, -1, 0),
    '+z': new THREE.Vector3(0, 0, 1), '-z': new THREE.Vector3(0, 0, -1),
};

const normalizedCache = new Map<string, Promise<THREE.BufferGeometry>>();

/**
 * A copy of the model's geometry re-oriented so the head points along +Z and
 * the back along +Y, centred, and scaled to a body length of exactly 1 (z in
 * [-0.5, 0.5]). The swim shader relies on this layout.
 */
export function fishGeometry(path: string, head: Axis, up: Axis) {
    const key = `${path}|${head}|${up}`;
    let pending = normalizedCache.get(key);
    if (!pending) {
        pending = loadRaw(path, () => { }).then(({ geometry }) => {
            const forward = AXES[head];
            const upVec = AXES[up];
            const right = new THREE.Vector3().crossVectors(upVec, forward);
            // Rows are the new basis, so each vertex p maps to (p·right, p·up, p·forward).
            const basis = new THREE.Matrix4().makeBasis(right, upVec, forward).transpose();
            const geo = geometry.clone().applyMatrix4(basis);

            geo.computeBoundingBox();
            const box = geo.boundingBox!;
            const center = box.getCenter(new THREE.Vector3());
            geo.translate(-center.x, -center.y, -center.z);
            const length = box.max.z - box.min.z;
            geo.scale(1 / length, 1 / length, 1 / length);

            if (!geo.attributes.normal) geo.computeVertexNormals();
            geo.computeBoundingSphere();
            return geo;
        });
        normalizedCache.set(key, pending);
    }
    return pending;
}

/** Coral geometry sitting on y = 0 with a height of 1, plus its original material. */
export async function propModel(path: string): Promise<LoadedModel> {
    const { geometry, material } = await loadRaw(path, () => { });
    const geo = geometry.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const height = box.max.y - box.min.y;
    const center = box.getCenter(new THREE.Vector3());
    geo.translate(-center.x, -box.min.y, -center.z);
    geo.scale(1 / height, 1 / height, 1 / height);
    return { geometry: geo, material };
}
