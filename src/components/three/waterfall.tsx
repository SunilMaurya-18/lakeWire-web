"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Points, ShaderMaterial, Vector2 } from "three";
import { problemScroll, smoothstep } from "@/lib/problem";
import { pointerOnLake } from "@/lib/surface";
import { useLake, type DeviceTier } from "@/store/lake";

const counts: Record<DeviceTier, number> = {
  high: 100000,
  mid: 48000,
  low: 14000,
};

const vertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uSize;
  uniform float uFade;
  varying float vAlpha;

  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z
    );
  }

  vec3 curl(vec3 p) {
    float e = 0.18;
    float n1 = noise(p + vec3(0.0, e, 0.0));
    float n2 = noise(p - vec3(0.0, e, 0.0));
    float n3 = noise(p + vec3(0.0, 0.0, e));
    float n4 = noise(p - vec3(0.0, 0.0, e));
    float n5 = noise(p + vec3(e, 0.0, 0.0));
    float n6 = noise(p - vec3(e, 0.0, 0.0));
    return vec3((n1 - n2) - (n3 - n4), n5 - n6, n3 - n4);
  }

  void main() {
    float speed = 0.18 + aSeed * 0.07;
    float life = fract(aSeed * 2.7 + uTime * speed);
    float y = mix(6.4, 0.05, life);
    float ang = aSeed * 6.2831853;
    float rad = (0.18 + hash(vec3(aSeed, 1.7, 4.2)) * 0.72) * mix(1.0, 0.72, smoothstep(0.0, 0.7, life));
    vec3 p = vec3(cos(ang) * rad, y, sin(ang) * rad - 0.15);
    p.x += (hash(vec3(aSeed, 8.1, 2.4)) - 0.5) * 0.22;
    p.z += (hash(vec3(aSeed, 3.3, 9.6)) - 0.5) * 0.22;
    vec3 c = curl(vec3(p.x * 0.85, y * 0.28, p.z * 0.85) + uTime * 0.16);
    p.xz += c.xz * 0.32;
    vec2 delta = p.xz - uPointer;
    float dist = length(delta);
    p.xz += delta / max(dist, 0.001) * smoothstep(2.2, 0.0, dist) * 0.85;
    float splash = smoothstep(0.84, 1.0, life);
    vec2 foot = p.xz - vec2(0.0, -0.15);
    p.xz += foot / max(length(foot), 0.001) * splash * 0.42;
    p.y = mix(p.y, 0.05, splash);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + splash);
    vAlpha = smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.94, 1.0, life)) * uFade;
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    if (dot(uv, uv) > 0.25) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
  }
`;

export function Waterfall() {
  const tier = useLake((state) => state.deviceTier);
  const reduced = useLake((state) => state.reduced);
  const loaded = useLake((state) => state.loaded);
  const mobile = useLake((state) => state.mobile);
  const material = useRef<ShaderMaterial>(null);
  const points = useRef<Points>(null);
  const pointer = useMemo(() => new Vector2(0, -0.15), []);
  const seeds = useMemo(() => {
    const count = counts[tier];
    const data = new Float32Array(count);
    for (let index = 0; index < count; index += 1) data[index] = Math.random();
    return data;
  }, [tier]);
  const positions = useMemo(() => new Float32Array(seeds.length * 3), [seeds]);

  useFrame((state) => {
    const shader = material.current;
    if (!shader) return;
    shader.uniforms.uTime.value = reduced ? 0.4 : state.clock.elapsedTime;
    const fade = 1 - smoothstep(0.04, 0.22, problemScroll.p);
    shader.uniforms.uFade.value = fade;
    if (points.current) points.current.visible = fade > 0.03;
    pointer.set(pointerOnLake.x, pointerOnLake.z);
  });

  if (!loaded || reduced) return null;

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={{
          uTime: { value: 0 },
          uPointer: { value: pointer },
          uSize: { value: mobile ? 1.85 : 1.7 },
          uFade: { value: 1 },
        }}
      />
    </points>
  );
}
