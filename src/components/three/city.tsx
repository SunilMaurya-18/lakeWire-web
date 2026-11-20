"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferAttribute, CanvasTexture, Group, Mesh, Object3D, Raycaster, Vector2, Vector3 } from "three";
import { parts } from "@/content/system";
import { cityOrigin, explore, flyToPart, gapScroll, setOpenPart, systemScroll } from "@/lib/explore";
import { useLake, type DeviceTier } from "@/store/lake";

const counts: Record<DeviceTier, number> = { high: 640, mid: 360, low: 160 };
const raycaster = new Raycaster();
const ndc = new Vector2();
const path = [
  new Vector3(-6.2, 0.35, 0),
  new Vector3(-3.3, 0.7, 0),
  new Vector3(-0.7, 0.4, 0),
  new Vector3(1.8, 0.25, 0),
  new Vector3(4.1, 0.45, 0),
  new Vector3(6.3, 0.3, 0),
];
const sample = new Vector3();
const look = new Vector3();
const aim = new Vector3();

function pointOnPath(t: number, out: Vector3) {
  const span = path.length - 1;
  const x = Math.min(span - 0.0001, Math.max(0, t * span));
  const index = Math.floor(x);
  const frac = x - index;
  out.lerpVectors(path[index], path[index + 1], frac);
}

function numberTexture(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = "#C9A227";
  ctx.font = "500 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 34);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function partOf(object: Object3D | null) {
  let current = object;
  while (current) {
    if (typeof current.userData.part === "string") return current.userData.part;
    current = current.parent;
  }
  return null;
}

function overUi(event: Event) {
  return event.target instanceof Element && Boolean(event.target.closest("a, button, header, input, aside, nav"));
}

export function City() {
  const root = useRef<Group>(null);
  const lake = useRef<Group>(null);
  const classic = useRef<Group>(null);
  const shuttle = useRef<Mesh>(null);
  const lease = useRef<Mesh>(null);
  const batcher = useRef<Mesh>(null);
  const flow = useRef<BufferAttribute>(null);
  const camera = useThree((state) => state.camera);
  const tier = useLake((state) => state.deviceTier);
  const mix = useRef(1);
  const clock = useRef(0);
  const moved = useRef(0);
  const last = useRef({ x: 0, y: 0 });
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const positions = useMemo(() => {
    const data = new Float32Array(counts[tier] * 3);
    for (let index = 0; index < counts[tier]; index += 1) {
      pointOnPath(index / counts[tier], sample);
      data[index * 3] = sample.x;
      data[index * 3 + 1] = sample.y;
      data[index * 3 + 2] = sample.z;
    }
    return data;
  }, [tier]);
  const phases = useMemo(() => {
    const data = new Float32Array(counts[tier]);
    for (let index = 0; index < data.length; index += 1) data[index] = index / data.length;
    return data;
  }, [tier]);
  const numbers = useMemo(() => ["12", "48", "7"].map((label) => numberTexture(label)), []);

  useEffect(() => {
    const active = () => systemScroll.p > 0.55 && gapScroll.p > 0.4;
    const down = (event: PointerEvent) => {
      if (!active() || overUi(event)) return;
      pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      moved.current = 0;
      last.current = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!active() || !pinch.current.has(event.pointerId)) return;
      const before = [...pinch.current.entries()];
      pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch.current.size >= 2 && useLake.getState().mobile) {
        const ids = [...pinch.current.keys()].slice(0, 2);
        const a0 = before.find(([id]) => id === ids[0])?.[1];
        const b0 = before.find(([id]) => id === ids[1])?.[1];
        const a1 = pinch.current.get(ids[0]);
        const b1 = pinch.current.get(ids[1]);
        if (a0 && b0 && a1 && b1) {
          const start = Math.hypot(a0.x - b0.x, a0.y - b0.y);
          const end = Math.hypot(a1.x - b1.x, a1.y - b1.y);
          if (start > 8 && end > 8) explore.orbitRadius = Math.min(24, Math.max(9, explore.orbitRadius * (start / end)));
        }
        return;
      }
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      moved.current += Math.abs(dx) + Math.abs(dy);
      if (useLake.getState().mobile && moved.current > 6) {
        explore.orbitYaw -= dx * 0.006;
        explore.orbitPitch = Math.min(1.05, Math.max(0.18, explore.orbitPitch + dy * 0.004));
      }
    };
    const up = (event: PointerEvent) => {
      pinch.current.delete(event.pointerId);
      if (!active() || overUi(event) || moved.current > 10) return;
      ndc.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      const hits = root.current ? raycaster.intersectObject(root.current, true) : [];
      const id = hits.map((hit) => (hit.object.type === "Mesh" ? partOf(hit.object) : null)).find(Boolean) ?? null;
      if (!id) return;
      const part = parts.find((item) => item.id === id);
      if (!part) return;
      const lakeMode = explore.mode >= 0.5;
      if (lakeMode && !part.lake) return;
      if (!lakeMode && !part.classic) return;
      setOpenPart(id);
      camera.getWorldDirection(aim);
      look.copy(camera.position).addScaledVector(aim, 4);
      flyToPart(camera.position, look, part.at[0], part.at[1], part.at[2]);
    };
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ at: [number, number, number] }>).detail;
      if (!detail) return;
      camera.getWorldDirection(aim);
      look.copy(camera.position).addScaledVector(aim, 4);
      flyToPart(camera.position, look, detail.at[0], detail.at[1], detail.at[2]);
    };
    window.addEventListener("lakewire-focus", onFocus);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("lakewire-focus", onFocus);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [camera]);

  useFrame((state, delta) => {
    const reduced = useLake.getState().reduced;
    const step = reduced ? 0 : delta * explore.speed;
    if (root.current) root.current.visible = systemScroll.p > 0.08;
    mix.current += (explore.mode - mix.current) * 0.08;
    const shown = mix.current;
    if (lake.current) {
      lake.current.visible = shown > 0.04;
      lake.current.scale.setScalar(0.15 + shown * 0.85);
    }
    if (classic.current) {
      classic.current.visible = shown < 0.96;
      classic.current.scale.setScalar(0.15 + (1 - shown) * 0.85);
    }
    if (batcher.current && !reduced) batcher.current.rotation.z += step * 1.4;
    if (lease.current && !reduced) lease.current.rotation.z += step * 0.7;
    root.current?.traverse((node) => {
      if (node.userData.spin) node.rotation.z += step * 2;
    });
    clock.current = (clock.current + step * 0.35) % 1;
    if (shuttle.current) {
      const travel = clock.current;
      pointOnPath(0.28 + travel * 0.62, sample);
      shuttle.current.position.copy(sample);
      shuttle.current.visible = shown > 0.5 && !reduced;
      const squeeze = travel < 0.18 ? 0.2 + travel * 2 : travel > 0.82 ? (1 - travel) * 3 : 0.42;
      shuttle.current.scale.setScalar(Math.max(0.08, squeeze));
    }
    const attr = flow.current;
    if (attr && !reduced) {
      const array = attr.array as Float32Array;
      for (let index = 0; index < phases.length; index += 1) {
        phases[index] = (phases[index] + step * 0.16) % 1;
        pointOnPath(phases[index], sample);
        array[index * 3] = sample.x;
        array[index * 3 + 1] = sample.y + Math.sin(phases[index] * 18 + index) * 0.06;
        array[index * 3 + 2] = sample.z + ((index % 5) - 2) * 0.05;
      }
      attr.needsUpdate = true;
    }
  });

  const vault = useMemo(() => {
    const cells: Array<[number, number, number]> = [];
    for (let z = 0; z < 3; z += 1) {
      for (let y = 0; y < 3; y += 1) {
        for (let x = 0; x < 3; x += 1) cells.push([(x - 1) * 0.24, (y - 1) * 0.24, -z * 0.24]);
      }
    }
    return cells;
  }, []);

  return (
    <group ref={root} position={cityOrigin}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[16, 5]} />
        <meshBasicMaterial color="#070709" />
      </mesh>
      <group userData={{ part: "producers" }} position={[-6.2, 0.2, 0]}>
        <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.42, 0.55, 0.42]} /><meshBasicMaterial color="#141418" /></mesh>
        <mesh position={[0, 0.35, 0.22]}><boxGeometry args={[0.16, 0.08, 0.04]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[0.7, -0.15, 0]}><boxGeometry args={[0.36, 0.42, 0.36]} /><meshBasicMaterial color="#101014" /></mesh>
        <mesh position={[0.7, -0.15, 0.19]}><boxGeometry args={[0.12, 0.06, 0.04]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
      <group userData={{ part: "consumers" }} position={[6.3, 0.15, 0]}>
        <mesh><boxGeometry args={[0.5, 0.7, 0.4]} /><meshBasicMaterial color="#121216" /></mesh>
        <mesh position={[0, 0, 0.22]}><boxGeometry args={[0.22, 0.08, 0.04]} /><meshBasicMaterial color="#C9A227" /></mesh>
      </group>
      <group ref={lake}>
        <group userData={{ part: "agents" }} position={[-3.3, 0, 0]}>
          {[1.5, 2.05, 1.25].map((height, index) => (
            <mesh key={height} position={[(index - 1) * 0.48, height / 2 - 0.4, 0]}>
              <boxGeometry args={[0.28, height, 0.28]} />
              <meshBasicMaterial color="#c8c8ce" transparent opacity={0.28} />
            </mesh>
          ))}
        </group>
        <group userData={{ part: "batcher" }} position={[-0.7, 0.35, 0]}>
          <mesh ref={batcher} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.045, 12, 36]} />
            <meshBasicMaterial color="#C9A227" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.28, 0.02, 8, 28]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
        <group userData={{ part: "storage" }} position={[1.8, 0.15, 0]}>
          <mesh position={[0, 0, -0.48]}>
            <boxGeometry args={[1.2, 1.3, 0.04]} />
            <meshBasicMaterial color="#141418" />
          </mesh>
          {[[-0.58, -0.62], [0.58, -0.62], [-0.58, 0.62], [0.58, 0.62]].map(([x, y]) => (
            <mesh key={`${x}-${y}`} position={[x, y, -0.2]}>
              <boxGeometry args={[0.04, 0.04, 0.7]} />
              <meshBasicMaterial color="#C9A227" />
            </mesh>
          ))}
          {vault.map((cell, index) => (
            <mesh key={cell.join(",")} position={[cell[0], cell[1], cell[2] + 0.12]}>
              <boxGeometry args={[0.16, 0.16, 0.16]} />
              <meshBasicMaterial color={index % 5 === 0 ? "#f4f4f5" : index % 3 === 0 ? "#C9A227" : "#3a3a42"} />
            </mesh>
          ))}
        </group>
        <group userData={{ part: "coordinator" }} position={[4.15, 0.4, 0]}>
          <mesh>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshBasicMaterial color="#C9A227" />
          </mesh>
          <mesh ref={lease} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.52, 0.02, 8, 40]} />
            <meshBasicMaterial color="#f4f4f5" />
          </mesh>
          {numbers.map((map, index) => (
            <mesh key={index} position={[Math.cos(index * 2.1) * 0.72, Math.sin(index * 2.1) * 0.28, Math.sin(index * 2.1) * 0.72]}>
              <planeGeometry args={[0.34, 0.18]} />
              <meshBasicMaterial color="#C9A227" map={map ?? undefined} transparent />
            </mesh>
          ))}
        </group>
        <mesh ref={shuttle}>
          <boxGeometry args={[0.28, 0.28, 0.28]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <group ref={classic} visible={false}>
        <group userData={{ part: "brokers" }}>
          {[-1.5, 0.15, 1.8].map((x) => (
            <group key={x} position={[x, 0.2, 0]}>
              <mesh>
                <boxGeometry args={[0.85, 0.7, 0.55]} />
                <meshBasicMaterial color="#1a1a20" />
              </mesh>
              <mesh>
                <boxGeometry args={[0.87, 0.72, 0.57]} />
                <meshBasicMaterial color="#C9A227" wireframe />
              </mesh>
              <group userData={{ spin: true }} position={[0, 0, 0.42]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.22, 0.22, 0.05, 24]} />
                  <meshBasicMaterial color="#f3f3f4" />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.03]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.04, 16]} />
                  <meshBasicMaterial color="#C9A227" />
                </mesh>
              </group>
            </group>
          ))}
          <mesh position={[-0.68, 0.62, 0]}>
            <boxGeometry args={[1.35, 0.03, 0.03]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.98, 0.62, 0]}>
            <boxGeometry args={[1.35, 0.03, 0.03]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      </group>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute ref={flow} attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={2.4} sizeAttenuation={false} transparent depthWrite={false} />
      </points>
    </group>
  );
}
