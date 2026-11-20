"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { cityOrigin } from "@/lib/explore";
import { journeyFrame, journeySample, journeyScroll } from "@/lib/journey";
import { useLake } from "@/store/lake";

const spot = new Vector3();
const bits = [
  new Vector3(-0.55, 0.18, 0.28),
  new Vector3(0.48, 0.22, 0.12),
  new Vector3(0.12, -0.16, 0.4),
  new Vector3(-0.18, 0.38, -0.08),
];

function smooth(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

export function JourneyWorld() {
  const root = useRef<Group>(null);
  const hero = useRef<Group>(null);
  const shell = useRef<MeshBasicMaterial>(null);
  const lock = useRef<Group>(null);
  const shackle = useRef<Group>(null);
  const body = useRef<MeshBasicMaterial>(null);
  const seal = useRef<Mesh>(null);
  const getFlash = useRef<Mesh>(null);
  const motes = useRef<Array<Mesh | null>>([]);
  const trail = useRef<Array<Mesh | null>>([]);
  const cubes = useRef<Array<Mesh | null>>([]);

  useFrame(() => {
    const node = root.current;
    const event = hero.current;
    if (!node || !event) return;
    const p = journeyScroll.p;
    const show = journeyScroll.live || p > 0.012;
    node.visible = show;
    if (!show) return;
    const reduced = useLake.getState().reduced;
    const { index, local } = journeyFrame(p);
    journeySample(p, spot);
    event.position.copy(spot);
    let scale = 0.26;
    if (index === 0) scale = 0.2 + smooth(0, 0.55, local) * 0.1;
    else if (index === 4) scale = 0.72;
    else if (index === 6) scale = 0.5 + smooth(0.4, 0.9, local) * 0.9;
    event.scale.setScalar(scale);
    shell.current?.color.set(index === 4 ? "#f7f7f8" : "#C9A227");

    motes.current.forEach((mote, moteIndex) => {
      if (!mote) return;
      mote.visible = index === 0 && local < 0.8;
      const along = Math.min(1, local * 1.3 + moteIndex * 0.12);
      mote.position.set(-6.15 + (-5.4 - -6.15) * along, 0.42 + moteIndex * 0.06, 0.35 + along * 0.3);
      mote.scale.setScalar(0.08 * (1 - along));
    });

    if (seal.current) {
      seal.current.visible = index === 1;
      const pulse = reduced ? 1 : 1 + Math.sin(local * Math.PI) * 0.12;
      seal.current.scale.setScalar(pulse);
      const mat = seal.current.material;
      if (!Array.isArray(mat)) mat.opacity = 0.35 + smooth(0.45, 0.8, local) * 0.65;
    }

    if (lock.current && shackle.current) {
      lock.current.visible = index === 3;
      const shut = smooth(0.28, 0.46, local);
      shackle.current.rotation.z = -1.15 * (1 - shut);
      body.current?.color.set("#C9A227");
    }

    trail.current.forEach((bead, beadIndex) => {
      if (!bead) return;
      bead.visible = index === 4;
      if (index !== 4) return;
      journeySample(Math.max(0, p - (beadIndex + 1) * 0.005), spot);
      bead.position.copy(spot);
      bead.scale.setScalar(0.32 - beadIndex * 0.035);
    });
    journeySample(p, spot);
    event.position.copy(spot);

    if (getFlash.current) {
      getFlash.current.visible = index === 5 && local > 0.4;
      getFlash.current.scale.x = 0.2 + smooth(0.4, 0.75, local) * 1.4;
    }

    const merge = index === 6 ? smooth(0.48, 0.98, local) : 0;
    cubes.current.forEach((cube, cubeIndex) => {
      if (!cube) return;
      cube.visible = index === 6 && merge < 0.98;
      const offset = bits[cubeIndex];
      cube.position.set(1.82 + offset.x * (1 - merge) * 1.4, 0.9 + offset.y * (1 - merge) * 1.4, 2.05 + offset.z * (1 - merge));
      cube.scale.setScalar(0.34 * (1 - merge));
    });
  });

  return (
    <group ref={root} position={cityOrigin} visible={false}>
      <group ref={hero}>
        <mesh>
          <boxGeometry args={[0.26, 0.26, 0.26]} />
          <meshBasicMaterial ref={shell} color="#C9A227" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      {[0, 1, 2].map((mote) => (
        <mesh
          key={mote}
          ref={(node) => {
            motes.current[mote] = node;
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh ref={seal} position={[-0.7, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.52, 0.02, 8, 32]} />
        <meshBasicMaterial color="#ffffff" transparent />
      </mesh>
      <group ref={lock} position={[4.05, 0.9, 1.28]} visible={false}>
        <mesh>
          <boxGeometry args={[0.34, 0.28, 0.1]} />
          <meshBasicMaterial ref={body} color="#C9A227" />
        </mesh>
        <mesh position={[0, -0.02, 0.06]}>
          <boxGeometry args={[0.06, 0.07, 0.02]} />
          <meshBasicMaterial color="#141418" />
        </mesh>
        <group ref={shackle} position={[0.11, 0.0, 0]}>
          <mesh position={[-0.11, 0.14, 0]}>
            <torusGeometry args={[0.12, 0.022, 10, 22, Math.PI]} />
            <meshBasicMaterial color="#f4f4f5" />
          </mesh>
        </group>
      </group>
      {[0, 1, 2, 3, 4].map((bead) => (
        <mesh
          key={bead}
          ref={(node) => {
            trail.current[bead] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh ref={getFlash} position={[6.05, 0.42, 0.9]} visible={false}>
        <boxGeometry args={[0.34, 0.06, 0.03]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {bits.map((bit, index) => (
        <mesh
          key={bit.x}
          ref={(node) => {
            cubes.current[index] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={index % 2 === 0 ? "#C9A227" : "#f4f4f5"} />
        </mesh>
      ))}
    </group>
  );
}
