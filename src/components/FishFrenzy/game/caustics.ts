import * as THREE from 'three';

// Shared shader snippets for the reef: dancing caustic light on anything that
// faces the surface, and a gentle current sway for plants and tentacles. Both
// patch Three's built-in materials via onBeforeCompile, so lighting, fog and
// instancing keep working, and both compose with any patch already present
// (the fish swim shader, for example).

export interface OceanUniforms {
    uTime: { value: number };
}

export const createOceanUniforms = (): OceanUniforms => ({ uTime: { value: 0 } });

/** Bright lines along the edges of drifting Voronoi cells: cheap, convincing caustics. */
export const CAUSTICS_GLSL = /* glsl */`
vec2 causticHash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float causticLayer(vec2 p, float t) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    float f1 = 8.0, f2 = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(float(x), float(y));
            vec2 h = causticHash(cell + o);
            vec2 point = o + 0.5 + 0.4 * sin(t + 6.2831 * h);
            float d = length(point - f);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
        }
    }
    return 1.0 - smoothstep(0.0, 0.14, f2 - f1);
}

float caustics(vec2 p, float t) {
    vec2 warp = vec2(sin(p.y * 0.9 + t * 0.7), cos(p.x * 0.8 - t * 0.6)) * 0.25;
    float a = causticLayer(p + warp, t * 0.9);
    float b = causticLayer(p * 1.35 + vec2(4.1, 1.7) - warp, t * 1.15);
    return a * 0.65 + b * 0.35 + a * b;
}
`;

interface PatchOptions {
    strength: number; // how bright the caustic light gets
    scale: number;    // caustic cells per world unit
}

function composePatch<M extends THREE.Material>(
    material: M,
    key: string,
    patch: (shader: THREE.WebGLProgramParametersWithUniforms) => void,
) {
    const previous = material.onBeforeCompile.bind(material);
    const previousKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
        previous(shader, renderer);
        patch(shader);
    };
    material.customProgramCacheKey = () => `${previousKey()}|${key}`;
    return material;
}

/** Adds caustic light to a Phong/Standard material, strongest on upward-facing surfaces. */
export function withCaustics<M extends THREE.Material>(material: M, uniforms: OceanUniforms, options: PatchOptions): M {
    const { strength, scale } = options;
    return composePatch(material, `caustics-${strength}-${scale}`, shader => {
        shader.uniforms.uTime = uniforms.uTime;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                varying vec3 vCausticWorld;
                varying float vCausticUp;`)
            .replace('#include <project_vertex>', `
                vec4 causticPos = vec4(transformed, 1.0);
                vec3 causticNormal = objectNormal;
                #ifdef USE_INSTANCING
                    causticPos = instanceMatrix * causticPos;
                    causticNormal = mat3(instanceMatrix) * causticNormal;
                #endif
                vCausticWorld = (modelMatrix * causticPos).xyz;
                vCausticUp = normalize(mat3(modelMatrix) * causticNormal).y;
                #include <project_vertex>`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform float uTime;
                varying vec3 vCausticWorld;
                varying float vCausticUp;
                ${CAUSTICS_GLSL}`)
            .replace('#include <opaque_fragment>', `
                float causticLight = caustics(vCausticWorld.xz * ${scale.toFixed(3)}, uTime * 0.8);
                float facing = smoothstep(-0.2, 0.9, vCausticUp);
                outgoingLight += vec3(0.75, 0.95, 1.0) * causticLight * facing * ${strength.toFixed(3)};
                #include <opaque_fragment>`);
    });
}

/**
 * Sways geometry in the current. Bending grows with the square of the local
 * height (position.y, where 0 is the rooted base), so bases stay put.
 */
export function withSway<M extends THREE.Material>(material: M, uniforms: OceanUniforms, amount: number, speed = 1.2): M {
    return composePatch(material, `sway-${amount}-${speed}`, shader => {
        shader.uniforms.uTime = uniforms.uTime;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float uTime;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                vec3 swayRoot = vec3(0.0);
                #ifdef USE_INSTANCING
                    swayRoot = instanceMatrix[3].xyz;
                #endif
                float swayT = uTime * ${speed.toFixed(3)} + swayRoot.x * 0.35 + swayRoot.z * 0.27;
                float swayH = max(position.y, 0.0);
                transformed.x += (sin(swayT) + 0.4 * sin(swayT * 2.3 + 1.7)) * swayH * swayH * ${amount.toFixed(3)};
                transformed.z += cos(swayT * 0.8 + 0.9) * swayH * swayH * ${(amount * 0.6).toFixed(3)};`);
    });
}
