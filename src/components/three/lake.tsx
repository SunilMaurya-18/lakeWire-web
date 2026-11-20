"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Plane, Raycaster, ShaderMaterial, Vector2, Vector3 } from "three";
import { pointerOnLake, RIPPLE_SLOTS, ripples, spawnRipple } from "@/lib/surface";
import { useLake } from "@/store/lake";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uRipples[${RIPPLE_SLOTS * 3}];
  varying vec3 vWorld;

  float ring(vec2 p, float x, float z, float born) {
    if (born < 0.0) return 0.0;
    float age = uTime - born;
    if (age < 0.0 || age > 2.5) return 0.0;
    float radius = age * 3.1;
    float dist = distance(p, vec2(x, z));
    float band = smoothstep(2.2, 0.0, abs(dist - radius));
    return band * (1.0 - age / 2.5);
  }

  void main() {
    vec2 lake = vec2(position.x, -position.y);
    float h = sin(lake.x * 0.09 + uTime * 0.22) * cos(lake.y * 0.08 - uTime * 0.16) * 0.016;
    for (int i = 0; i < ${RIPPLE_SLOTS}; i++) {
      h += ring(lake, uRipples[i * 3], uRipples[i * 3 + 1], uRipples[i * 3 + 2]) * 0.012;
    }
    vec3 p = position;
    p.z += h;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uRipples[${RIPPLE_SLOTS * 3}];
  varying vec3 vWorld;

  void main() {
    vec2 lake = vWorld.xz;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float facing = clamp(dot(vec3(0.0, 1.0, 0.0), viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 5.0);
    float horizon = pow(clamp(1.0 - facing * 22.0, 0.0, 1.0), 2.0);
    vec3 ink = vec3(0.003, 0.003, 0.004);
    vec3 silver = vec3(0.78, 0.78, 0.8);
    vec3 brass = vec3(0.788, 0.635, 0.153);
    float rings = 0.0;
    for (int i = 0; i < ${RIPPLE_SLOTS}; i++) {
      float born = uRipples[i * 3 + 2];
      if (born < 0.0) continue;
      float age = uTime - born;
      if (age < 0.0 || age > 2.5) continue;
      float dist = distance(lake, vec2(uRipples[i * 3], uRipples[i * 3 + 1]));
      rings += smoothstep(0.08, 0.0, abs(dist - age * 3.1)) * (1.0 - age / 2.5);
    }
    vec3 color = ink;
    color += silver * fresnel * 0.05;
    color += brass * horizon * 1.15;
    color += vec3(0.92) * rings * 0.7;
    float fade = 1.0 - smoothstep(28.0, 70.0, length(lake));
    gl_FragColor = vec4(color * fade, uReveal);
  }
`;

const plane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const ndc = new Vector2();
const raycaster = new Raycaster();

export function Lake() {
  const material = useRef<ShaderMaterial>(null);
  const camera = useThree((state) => state.camera);
  const lastAuto = useRef(0);
  const reveal = useRef(0);

  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("a, button, header, nav")) return;
      if (!useLake.getState().loaded) return;
      ndc.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      spawnRipple(hit.x, hit.z, material.current?.uniforms.uTime.value ?? 0);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [camera]);

  useFrame((state) => {
    const shader = material.current;
    if (!shader) return;
    const { reduced, loaded, falling, pointer } = useLake.getState();
    const time = reduced ? 1.2 : state.clock.elapsedTime;
    const target = falling || loaded ? 1 : 0;
    reveal.current += (target - reveal.current) * 0.08;
    shader.uniforms.uTime.value = time;
    shader.uniforms.uReveal.value = reveal.current;
    shader.depthWrite = reveal.current > 0.35;
    shader.uniforms.uRipples.value = ripples;
    ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      pointerOnLake.x = hit.x;
      pointerOnLake.z = hit.z;
    }
    if (loaded && !reduced && time - lastAuto.current > 0.85) {
      lastAuto.current = time;
      spawnRipple(0, -0.15, time);
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[220, 220, 120, 120]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={{
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uRipples: { value: ripples },
        }}
      />
    </mesh>
  );
}
