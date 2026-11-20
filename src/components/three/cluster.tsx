"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, ShaderMaterial, Vector3, Group } from "three";
import { problemScroll, smoothstep, visualProgress } from "@/lib/problem";
import { useLake, type DeviceTier } from "@/store/lake";

type Zone = { x: number; y: number; z: number };

const counts: Record<DeviceTier, number> = { high: 1500, mid: 800, low: 360 };
const up = new Vector3(0, 1, 0);
const dir = new Vector3();
const side = new Vector3();
const mid = new Vector3();
const quat = new Quaternion();

function zonesFor(mobile: boolean): Zone[] {
  if (mobile) {
    return [
      { x: 0, y: 2.35, z: 0 },
      { x: 0, y: 0.05, z: 0 },
      { x: 0, y: -2.25, z: 0 },
    ];
  }
  return [
    { x: -2.6, y: 0.2, z: 0 },
    { x: 0, y: 0.2, z: -0.25 },
    { x: 2.6, y: 0.2, z: 0 },
  ];
}

function monolithAt(mobile: boolean) {
  return mobile ? new Vector3(0, -3.85, 0) : new Vector3(0, -1.95, 0.05);
}

function Frame({ w, h, d, color = "#C9A227", thickness = 0.02 }: { w: number; h: number; d: number; color?: string; thickness?: number }) {
  const t = thickness;
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const bars: number[][] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) bars.push([sx * x, 0, sz * z, t, h, t]);
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) bars.push([0, sy * y, sz * z, w, t, t]);
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) bars.push([sx * x, sy * y, 0, t, t, d]);
  }
  return (
    <group>
      {bars.map((bar, index) => (
        <mesh key={index} position={[bar[0], bar[1], bar[2]]}>
          <boxGeometry args={[bar[3], bar[4], bar[5]]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

function Broker({ zone }: { zone: Zone }) {
  const disk = useRef<Group>(null);
  const mobile = useLake((state) => state.mobile);
  const reduced = useLake((state) => state.reduced);
  const slabH = mobile ? 1.5 : 2.45;
  const shell = useMemo(
    () => new MeshStandardMaterial({ color: "#101014", metalness: 0.9, roughness: 0.34, transparent: true }),
    [],
  );
  useFrame((_, delta) => {
    const morph = smoothstep(0.62, 0.96, visualProgress(reduced));
    shell.opacity = 1 - morph;
    shell.depthWrite = morph < 0.85;
    if (!disk.current) return;
    if (!reduced) disk.current.rotation.z += delta * 2.1 * (1 - morph);
    disk.current.scale.setScalar(Math.max(0.001, 1 - morph));
  });
  return (
    <group position={[zone.x, zone.y, zone.z]}>
      <mesh position={[0, 0, -1.05]}>
        <boxGeometry args={[1.85, slabH, 0.045]} />
        <meshBasicMaterial color="#c8c8ce" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <group position={[0, 0, -1.05]}>
        <Frame w={1.85} h={slabH} d={0.045} color="#8B8B93" thickness={0.012} />
      </group>
      <mesh position={[0, 0, -0.36]} material={shell}>
        <boxGeometry args={[1.16, 0.96, 0.04]} />
      </mesh>
      <mesh position={[-0.58, 0, 0]} material={shell}>
        <boxGeometry args={[0.04, 0.96, 0.74]} />
      </mesh>
      <mesh position={[0.58, 0, 0]} material={shell}>
        <boxGeometry args={[0.04, 0.96, 0.74]} />
      </mesh>
      <mesh position={[0, 0.48, 0]} material={shell}>
        <boxGeometry args={[1.16, 0.04, 0.74]} />
      </mesh>
      <mesh position={[0, -0.48, 0]} material={shell}>
        <boxGeometry args={[1.16, 0.04, 0.74]} />
      </mesh>
      <Frame w={1.16} h={0.96} d={0.74} />
      <group ref={disk} position={[0, 0, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.02, 40]} />
          <meshBasicMaterial color="#f3f3f4" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.045]}>
          <cylinderGeometry args={[0.24, 0.24, 0.015, 32]} />
          <meshBasicMaterial color="#d5d5d8" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 16]} />
          <meshBasicMaterial color="#C9A227" />
        </mesh>
        <mesh position={[0.16, 0.12, 0.03]}>
          <boxGeometry args={[0.07, 0.035, 0.02]} />
          <meshBasicMaterial color="#C9A227" />
        </mesh>
      </group>
    </group>
  );
}

const dissolveVertex = /* glsl */ `
  attribute vec3 aOrigin;
  attribute float aSeed;
  uniform float uMorph;
  uniform float uTime;
  uniform vec3 uTarget;
  varying float vAlpha;
  void main() {
    float delay = aSeed * 0.28;
    float flight = smoothstep(delay, delay + 0.62, uMorph);
    vec3 p = mix(aOrigin, uTarget, flight);
    float spin = (1.0 - flight) * (aSeed * 6.2831 + uTime * 1.4);
    p.x += cos(spin) * (1.0 - flight) * 0.16;
    p.z += sin(spin) * (1.0 - flight) * 0.16;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 1.9;
    vAlpha = smoothstep(0.04, 0.16, uMorph) * (1.0 - smoothstep(0.78, 0.98, flight));
  }
`;

const dissolveFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    if (dot(uv, uv) > 0.25) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
  }
`;

function layoutBeams(group: Group, zones: Zone[], mobile: boolean) {
  const pairs = [
    [0, 1],
    [1, 2],
    [0, 2],
  ];
  let index = 0;
  for (const [from, to] of pairs) {
    const a = zones[from];
    const b = zones[to];
    const ax = a.x + (mobile ? 0.78 : 0);
    const ay = a.y + (mobile ? 0 : 0.5);
    const bx = b.x + (mobile ? 0.78 : 0);
    const by = b.y + (mobile ? 0 : 0.5);
    dir.set(bx - ax, by - ay, b.z - a.z);
    const length = Math.max(0.001, dir.length());
    mid.set((ax + bx) / 2, (ay + by) / 2, (a.z + b.z) / 2);
    dir.multiplyScalar(1 / length);
    side.crossVectors(dir, new Vector3(0, 0, 1));
    if (side.lengthSq() < 0.04) side.crossVectors(dir, up);
    side.normalize();
    quat.setFromUnitVectors(up, dir);
    for (let slot = 0; slot < 5; slot += 1) {
      const mesh = group.children[index] as Mesh | undefined;
      index += 1;
      if (!mesh) continue;
      const offset = (slot - 2) * 0.1;
      mesh.position.copy(mid).addScaledVector(side, offset);
      mesh.quaternion.copy(quat);
      mesh.scale.set(1, length, 1);
      mesh.userData.slot = slot;
    }
  }
}

export function Cluster() {
  const mobile = useLake((state) => state.mobile);
  const tier = useLake((state) => state.deviceTier);
  const reduced = useLake((state) => state.reduced);
  const zones = useMemo(() => zonesFor(mobile), [mobile]);
  const monolith = useMemo(() => monolithAt(mobile), [mobile]);
  const beamGroup = useRef<Group>(null);
  const monolithGroup = useRef<Group>(null);
  const dissolve = useRef<ShaderMaterial>(null);
  const beamMat = useMemo(() => new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false }), []);

  const origins = useMemo(() => {
    const count = counts[tier];
    const data = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const per = Math.floor(count / zones.length);
    let write = 0;
    zones.forEach((zone) => {
      for (let index = 0; index < per; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * 0.3;
        data[write * 3] = zone.x + Math.cos(angle) * radius;
        data[write * 3 + 1] = zone.y + Math.sin(angle) * radius;
        data[write * 3 + 2] = zone.z + 0.1;
        seeds[write] = Math.random();
        write += 1;
      }
    });
    return { data, seeds, count: write };
  }, [tier, zones]);
  const dummy = useMemo(() => new Float32Array(origins.count * 3), [origins]);

  useLayoutEffect(() => {
    if (beamGroup.current) layoutBeams(beamGroup.current, zones, mobile);
  }, [zones, mobile]);

  useFrame((state) => {
    const p = visualProgress(reduced);
    const morph = smoothstep(0.62, 0.96, p);
    const multiply = smoothstep(0.28, 0.64, p);
    const beamFade = 1 - smoothstep(0.56, 0.74, p);
    const shown = 1 + Math.round(multiply * 4);
    const time = reduced ? 0 : state.clock.elapsedTime;
    beamMat.opacity = (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 3.4))) * beamFade;
    beamGroup.current?.children.forEach((child) => {
      const mesh = child as Mesh;
      mesh.visible = Number(mesh.userData.slot) < shown && beamFade > 0.03;
    });
    const mono = smoothstep(0.64, 0.9, p);
    if (monolithGroup.current) {
      const scale = 0.08 + mono * 0.92;
      monolithGroup.current.scale.setScalar(scale);
      monolithGroup.current.visible = mono > 0.02;
    }
    const shader = dissolve.current;
    if (shader) {
      shader.uniforms.uMorph.value = reduced ? (morph > 0.5 ? 1 : 0) : morph;
      shader.uniforms.uTime.value = time;
      shader.uniforms.uTarget.value.copy(monolith).setY(monolith.y + 0.62);
    }
  });

  const size = mobile ? [2.15, 1.12, 1.15] : [3.3, 1.28, 1.45];

  return (
    <group position={[0, -6.55, -0.15]} rotation={[0.08, mobile ? 0 : 0.42, 0]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 1.4, 4.5]} intensity={28} distance={18} decay={2} color="#ffffff" />
      {zones.map((zone, index) => (
        <Broker key={index} zone={zone} />
      ))}
      <group ref={beamGroup}>
        {Array.from({ length: 15 }, (_, index) => (
          <mesh key={index} material={beamMat} frustumCulled={false}>
            <cylinderGeometry args={[0.028, 0.028, 1, 8]} />
          </mesh>
        ))}
      </group>
      <group ref={monolithGroup} position={monolith} visible={false}>
        <mesh>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <meshBasicMaterial color="#141418" />
        </mesh>
        <Frame w={size[0]} h={size[1]} d={size[2]} thickness={0.028} />
      </group>
      {reduced ? null : (
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dummy, 3]} />
            <bufferAttribute attach="attributes-aOrigin" args={[origins.data, 3]} />
            <bufferAttribute attach="attributes-aSeed" args={[origins.seeds, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={dissolve}
            transparent
            depthWrite={false}
            vertexShader={dissolveVertex}
            fragmentShader={dissolveFragment}
            uniforms={{
              uMorph: { value: 0 },
              uTime: { value: 0 },
              uTarget: { value: monolith.clone() },
            }}
          />
        </points>
      )}
    </group>
  );
}
