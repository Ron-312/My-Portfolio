import * as THREE from 'three';
import type { SwimParams } from './config';
import type { FishSkin } from './skins';

// The fish models have no skeleton or animation clips, so swimming is done in
// the vertex shader: a sine wave travels from head (+Z) to tail (-Z) and sways
// the body sideways, growing toward the tail. `uBend` curves the whole body
// into a turn. Geometry must be normalized by fishGeometry() (length 1, head +Z).
//
// The fragment shader paints a procedural skin (see skins.ts) and adds a rim
// glow whose colour tells the player whether the fish is food or a threat.

export interface SwimUniforms {
    uPhase: { value: number };
    uFreq: { value: number };
    uAmp: { value: number };
    uBend: { value: number };
}

export interface SkinUniforms {
    uRimColor: { value: THREE.Color };
    uRimStrength: { value: number };
}

export type SwimMaterial = THREE.MeshPhongMaterial & { userData: { swim: SwimUniforms; skin: SkinUniforms } };

const VERTEX_HEADER = /* glsl */`
uniform float uPhase;
uniform float uFreq;
uniform float uAmp;
uniform float uBend;
varying vec3 vSkinPos;

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

const FRAGMENT_HEADER = /* glsl */`
uniform float uPhase;
uniform vec3 uBack, uBelly, uStripe, uBarColor, uSpot, uFin, uSheen, uRimColor;
uniform float uHalfHeight, uStripeY, uStripeWidth, uBars, uBarStrength;
uniform float uSpotDensity, uSpotSize, uSpotPulse, uTailStart, uScales, uRimStrength;
varying vec3 vSkinPos;

float skinHash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

vec3 fishSkin() {
    vec3 p = vSkinPos;
    float yn = clamp(p.y / uHalfHeight, -1.0, 1.0); // -1 belly … 1 back

    // Countershading: dark back, pale belly.
    vec3 color = mix(uBelly, uBack, smoothstep(-0.35, 0.45, yn));

    // Lateral stripe.
    float stripe = exp(-pow((yn - uStripeY) / max(uStripeWidth, 1e-3), 2.0));
    color = mix(color, uStripe, stripe * step(1e-3, uStripeWidth) * 0.85);

    // Vertical bars, fading out toward the belly.
    float bars = smoothstep(0.35, 0.85, sin(p.z * uBars * 6.2831)) * smoothstep(-0.5, 0.3, yn);
    color = mix(color, uBarColor, bars * uBarStrength);

    // Spots: one jittered dot in roughly half of the cells of a 3D grid.
    if (uSpotDensity > 0.0) {
        vec3 sp = p * uSpotDensity;
        vec3 cell = floor(sp);
        vec3 jitter = vec3(skinHash(cell + 1.3), skinHash(cell + 2.7), skinHash(cell + 5.1)) - 0.5;
        float d = length(fract(sp) - 0.5 - jitter * 0.35);
        float h = skinHash(cell);
        float spot = (1.0 - smoothstep(uSpotSize * 0.7, uSpotSize, d)) * step(0.45, h);
        spot *= mix(1.0, 0.55 + 0.45 * sin(uPhase * 0.7 + h * 30.0), uSpotPulse); // squid chromatophores
        color = mix(color, uSpot, spot);
    }

    // Fins (top and bottom edges) and tail.
    float tail = 1.0 - smoothstep(uTailStart - 0.12, uTailStart, p.z);
    float fins = smoothstep(0.72, 0.95, abs(yn));
    color = mix(color, uFin, max(tail, fins) * 0.85);

    // Fine scales.
    float scales = sin(p.z * 190.0 + sin(p.y * 95.0) * 1.6) * sin(p.y * 170.0 + p.x * 60.0);
    color *= 1.0 + scales * uScales;
    return color;
}
`;

const colorUniform = (hex: string) => ({ value: new THREE.Color(hex) });

export function createSwimMaterial(
    swim: SwimParams,
    skin: FishSkin,
    halfHeight: number,
    params: THREE.MeshPhongMaterialParameters = {},
) {
    const material = new THREE.MeshPhongMaterial({ shininess: 70, specular: 0x555555, ...params }) as SwimMaterial;
    const uniforms: SwimUniforms = {
        uPhase: { value: Math.random() * Math.PI * 2 },
        uFreq: { value: swim.freq },
        uAmp: { value: swim.amp },
        uBend: { value: 0 },
    };
    const skinUniforms: SkinUniforms = {
        uRimColor: { value: new THREE.Color(0xffffff) },
        uRimStrength: { value: 0 },
    };
    const paint = {
        uBack: colorUniform(skin.back),
        uBelly: colorUniform(skin.belly),
        uStripe: colorUniform(skin.stripe?.color ?? skin.back),
        uStripeY: { value: skin.stripe?.y ?? 0 },
        uStripeWidth: { value: skin.stripe?.width ?? 0 },
        uBarColor: colorUniform(skin.bars?.color ?? skin.back),
        uBars: { value: skin.bars?.count ?? 0 },
        uBarStrength: { value: skin.bars?.strength ?? 0 },
        uSpot: colorUniform(skin.spots?.color ?? skin.back),
        uSpotDensity: { value: skin.spots?.density ?? 0 },
        uSpotSize: { value: skin.spots?.size ?? 0 },
        uSpotPulse: { value: skin.spots?.pulse ? 1 : 0 },
        uFin: colorUniform(skin.fin),
        uTailStart: { value: skin.tailStart },
        uSheen: colorUniform(skin.sheen),
        uScales: { value: skin.scales },
        uHalfHeight: { value: halfHeight },
    };
    material.userData.swim = uniforms;
    material.userData.skin = skinUniforms;

    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms, skinUniforms, paint);
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
                vSkinPos = position;
                transformed.x += swimOffset(position.z).x;`
            );
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\n${FRAGMENT_HEADER}`)
            .replace('#include <color_fragment>', `#include <color_fragment>
                diffuseColor.rgb *= fishSkin();`)
            .replace('#include <opaque_fragment>', `
                float grazing = 1.0 - abs(dot(normal, normalize(vViewPosition)));
                outgoingLight += uSheen * pow(grazing, 3.0) * 0.35;
                outgoingLight += uRimColor * uRimStrength * (pow(grazing, 1.4) + 0.06);
                #include <opaque_fragment>`);
    };
    // Every fish compiles to the same program; colours and patterns are uniforms.
    material.customProgramCacheKey = () => 'fish-swim-skin';
    return material;
}
