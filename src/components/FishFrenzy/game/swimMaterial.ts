import * as THREE from 'three';
import type { SwimParams } from './config';

// The fish models have no skeleton or animation clips, so swimming is done in
// the vertex shader: a sine wave travels from head (+Z) to tail (-Z) and sways
// the body sideways, growing toward the tail. `uBend` curves the whole body
// into a turn. Geometry must be normalized by fishGeometry() (length 1, head +Z).

export interface SwimUniforms {
    uPhase: { value: number };
    uFreq: { value: number };
    uAmp: { value: number };
    uBend: { value: number };
}

export type SwimMaterial = THREE.MeshPhongMaterial & { userData: { swim: SwimUniforms } };

const VERTEX_HEADER = /* glsl */`
uniform float uPhase;
uniform float uFreq;
uniform float uAmp;
uniform float uBend;

// Sideways offset of the body at position z, and its slope d(offset)/dz.
vec2 swimOffset(float z) {
    float t = clamp(0.5 - z, 0.0, 1.0);          // 0 at the head, 1 at the tail
    float envelope = 0.12 + t * t;
    float w = sin(z * uFreq - uPhase);
    float dw = cos(z * uFreq - uPhase) * uFreq;
    float offset = w * uAmp * envelope + uBend * t * t;
    float slope = dw * uAmp * envelope - (w * uAmp + uBend) * 2.0 * t;
    return vec2(offset, slope);
}
`;

export function createSwimMaterial(swim: SwimParams, params: THREE.MeshPhongMaterialParameters) {
    const material = new THREE.MeshPhongMaterial(params) as SwimMaterial;
    const uniforms: SwimUniforms = {
        uPhase: { value: Math.random() * Math.PI * 2 },
        uFreq: { value: swim.freq },
        uAmp: { value: swim.amp },
        uBend: { value: 0 },
    };
    material.userData.swim = uniforms;

    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${VERTEX_HEADER}`)
            .replace(
                '#include <beginnormal_vertex>',
                `#include <beginnormal_vertex>
                objectNormal = normalize(vec3(objectNormal.x, objectNormal.y,
                    objectNormal.z - objectNormal.x * swimOffset(position.z).y));`
            )
            .replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                transformed.x += swimOffset(position.z).x;`
            );
    };
    // Every swim material compiles to the same program, so share it.
    material.customProgramCacheKey = () => 'fish-swim';
    return material;
}
