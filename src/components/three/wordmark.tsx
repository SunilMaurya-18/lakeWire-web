"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { NormalBlending, ShaderMaterial } from "three";
import { sampleWordmark, type WordmarkData } from "@/lib/wordmark";
import { useLake } from "@/store/lake";

const DRAW = 2.2;
const FALL = 1.05;

const vertex = /* glsl */ `
  attribute float aOrder;
  uniform float uDraw;
  uniform float uFall;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    float visible = step(aOrder, uDraw);
    float fall = uFall * uFall;
    vec3 p = position;
    p.y -= fall * (3.2 + aOrder * 1.6);
    p.x += (aOrder - 0.5) * fall * 0.45;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = visible * uSize;
    vAlpha = visible * (1.0 - smoothstep(0.72, 1.0, uFall));
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

export function Wordmark() {
  const loaded = useLake((state) => state.loaded);
  const reduced = useLake((state) => state.reduced);
  const width = useThree((state) => state.size.width);
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const [cloud, setCloud] = useState<WordmarkData | null>(null);
  const uniforms = useMemo(() => ({ uDraw: { value: 0 }, uFall: { value: 0 }, uSize: { value: 2.5 } }), []);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      if (cancel) return;
      const sampled = sampleWordmark();
      if (!sampled) {
        useLake.getState().setLoaded(true);
        return;
      }
      setCloud(sampled);
    };
    void run();
    return () => {
      cancel = true;
    };
  }, []);

  useFrame((_, delta) => {
    const shader = material.current;
    if (!shader || !cloud) return;
    elapsed.current += reduced ? delta * 4 : delta;
    const draw = Math.min(1, elapsed.current / (reduced ? 0.35 : DRAW));
    const fallClock = Math.max(0, elapsed.current - (reduced ? 0.35 : DRAW));
    const fall = Math.min(1, fallClock / (reduced ? 0.25 : FALL));
    shader.uniforms.uDraw.value = draw;
    shader.uniforms.uFall.value = fall;
    shader.uniforms.uSize.value = width < 768 ? 1.6 : 2.15;
    const next = Math.round(draw * 100);
    const store = useLake.getState();
    if (next !== store.loadProgress) store.setLoadProgress(next);
    if (draw >= 1 && !store.falling) store.setFalling(true);
    if (fall >= 1 && !store.loaded) store.setLoaded(true);
  });

  if (loaded || !cloud) return null;
  const scale = width < 768 ? 0.56 : width < 1024 ? 0.78 : 1;

  return (
    <points scale={scale} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aOrder" args={[cloud.order, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
        blending={NormalBlending}
      />
    </points>
  );
}
