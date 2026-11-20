"use client";

import { useLayoutEffect, useRef } from "react";
import { Edges, Html } from "@react-three/drei";
import { InstancedMesh, LatheGeometry, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector2, type MeshStandardMaterial as Mat, type Texture } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Vec = [number, number, number];

const geos = new Map<string, RoundedBoxGeometry>();

function box(w: number, h: number, d: number, radius = 0.035, segments = 2) {
  const r = Math.min(radius, w / 6, h / 6, d / 6);
  const key = `${w.toFixed(3)}-${h.toFixed(3)}-${d.toFixed(3)}-${r.toFixed(3)}-${segments}`;
  let geo = geos.get(key);
  if (!geo) {
    geo = new RoundedBoxGeometry(w, h, d, segments, r);
    geos.set(key, geo);
  }
  return geo;
}

const lathes = new Map<string, LatheGeometry>();

function puck(radius: number, height: number) {
  const key = `${radius.toFixed(3)}-${height.toFixed(3)}`;
  let geo = lathes.get(key);
  if (!geo) {
    const chamfer = Math.min(0.012, height / 3, radius / 5);
    const y0 = -height / 2;
    const y1 = height / 2;
    geo = new LatheGeometry(
      [
        new Vector2(0, y0),
        new Vector2(radius - chamfer, y0),
        new Vector2(radius, y0 + chamfer),
        new Vector2(radius, y1 - chamfer),
        new Vector2(radius - chamfer, y1),
        new Vector2(0, y1),
      ],
      40,
    );
    lathes.set(key, geo);
  }
  return geo;
}

function finish(color: string, roughness: number, metalness: number) {
  const material = new MeshStandardMaterial({ color, roughness, metalness });
  material.dispose = () => undefined;
  return material;
}

const mat = {
  body: finish("#1c1c1c", 0.78, 0.24),
  bodyHot: finish("#2a2a2a", 0.58, 0.32),
  bodyDim: finish("#141414", 0.88, 0.1),
  core: finish("#cfcfcf", 0.42, 0.48),
  coreDim: finish("#6e6e6e", 0.7, 0.2),
  screen: finish("#303030", 0.52, 0.16),
  ground: finish("#101010", 1, 0),
};

const studio = {
  charcoal: finish("#1b1b1b", 0.86, 0.04),
  charcoalDim: finish("#121212", 0.94, 0.02),
  satin: finish("#454545", 0.52, 0.1),
  satinDim: finish("#262626", 0.74, 0.04),
  satinHot: finish("#5e5e5e", 0.4, 0.12),
  panel: finish("#6a6a6a", 0.48, 0.08),
  panelDim: finish("#242424", 0.82, 0.03),
  panelHot: finish("#8d8d8d", 0.38, 0.1),
  ceramic: finish("#d4d0c6", 0.42, 0.02),
  ceramicDim: finish("#6e6e6e", 0.62, 0.02),
  ceramicHot: finish("#e4e0d6", 0.36, 0.02),
  recess: finish("#101010", 0.92, 0.01),
  alert: finish("#EF4444", 0.52, 0.03),
};
for (const material of Object.values(studio)) material.envMapIntensity = 0.45;
studio.ceramic.envMapIntensity = 0.22;
studio.ceramicHot.envMapIntensity = 0.22;
studio.ceramicDim.envMapIntensity = 0.22;

function shellMaterial(dim: boolean, hot: boolean) {
  if (dim) return studio.charcoalDim;
  if (hot) return studio.satin;
  return studio.charcoal;
}

function bayMaterial(dim: boolean, hot: boolean) {
  if (hot) return studio.panelHot;
  if (dim) return studio.panelDim;
  return studio.panel;
}

export function bindStudioEnvironment(texture: Texture | null) {
  for (const material of Object.values(studio)) {
    material.envMap = texture;
    material.needsUpdate = true;
  }
}

function ceramicMaterial(dim: boolean, hot: boolean) {
  if (dim) return studio.ceramicDim;
  if (hot) return studio.ceramicHot;
  return studio.ceramic;
}

function tone(dim: boolean, hot: boolean): Mat {
  if (hot) return mat.bodyHot;
  if (dim) return mat.bodyDim;
  return mat.body;
}

export function Plate({
  position,
  size,
  dim = false,
  hot = false,
  alert = false,
  onSelect,
}: {
  position?: Vec;
  size: Vec;
  dim?: boolean;
  hot?: boolean;
  alert?: boolean;
  onSelect?: () => void;
}) {
  const geometry = box(size[0], size[1], size[2], Math.min(size[0], size[1], size[2]) < 0.2 ? 0.02 : 0.04);
  const edge = alert ? "#EF4444" : hot ? "#F5F5F5" : dim ? "#3a3a3a" : "#8a8a8a";
  return (
    <mesh
      geometry={geometry}
      material={tone(dim, hot)}
      position={position}
      castShadow
      receiveShadow
      dispose={null}
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect();
            }
          : undefined
      }
    >
      <Edges color={edge} />
    </mesh>
  );
}

export function Terminal({
  position,
  title,
  dim,
  hot,
  onSelect,
}: {
  position: Vec;
  title: string;
  dim: boolean;
  hot: boolean;
  onSelect: () => void;
}) {
  return (
    <group position={position}>
      <Plate position={[0, -0.18, 0]} size={[1.5, 0.1, 0.46]} dim={dim} hot={hot} onSelect={onSelect} />
      <Plate position={[0, 0.06, 0.08]} size={[1.28, 0.4, 0.06]} dim={dim} hot={hot} onSelect={onSelect} />
      <mesh position={[0, 0.06, 0.12]} material={dim ? mat.bodyDim : mat.screen} dispose={null}>
        <planeGeometry args={[1.05, 0.22]} />
      </mesh>
      <HtmlLabel position={[0, 0.06, 0.16]} text={title} dim={dim} />
    </group>
  );
}

export function BrokerChassis({
  dim,
  hot,
  alert,
  onSelect,
}: {
  dim: boolean;
  hot: boolean;
  alert?: boolean;
  onSelect: () => void;
}) {
  return (
    <group>
      <Plate size={[2.9, 1.85, 0.5]} dim={dim} hot={hot} alert={alert} onSelect={onSelect} />
      <Plate position={[0, 0.78, 0.22]} size={[2.35, 0.04, 0.05]} dim={dim} hot={hot} />
    </group>
  );
}

function choose(onSelect: () => void) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect();
  };
}

function Solid({
  geometry,
  material,
  position,
  onSelect,
  shadow = true,
}: {
  geometry: LatheGeometry | RoundedBoxGeometry;
  material: Mat;
  position: Vec;
  onSelect: () => void;
  shadow?: boolean;
}) {
  return (
    <mesh geometry={geometry} material={material} position={position} castShadow={shadow} receiveShadow dispose={null} onClick={choose(onSelect)} />
  );
}

const BAYS: { id: string; position: Vec; size: Vec }[] = [
  { id: "buffer", position: [-0.62, 0.38, 0.18], size: [1.14, 0.4, 0.035] },
  { id: "uploader", position: [0.62, 0.38, 0.18], size: [1.14, 0.4, 0.035] },
  { id: "commit", position: [-0.62, -0.08, 0.18], size: [1.14, 0.32, 0.035] },
  { id: "fetch", position: [0.62, -0.08, 0.18], size: [1.14, 0.32, 0.035] },
  { id: "workers", position: [0, -0.5, 0.18], size: [2.26, 0.24, 0.03] },
];

export function MachinedBroker({
  dim,
  hot,
  bays,
  onSelect,
}: {
  dim: boolean;
  hot: boolean;
  bays: { id: string; dim: boolean; hot: boolean; alert: boolean; onSelect: () => void }[];
  onSelect: () => void;
}) {
  const shell = shellMaterial(dim, hot);
  const rail = dim ? studio.charcoalDim : studio.satinDim;
  const byId = new Map(bays.map((bay) => [bay.id, bay]));
  return (
    <group>
      <Solid geometry={box(3.02, 0.08, 0.72, 0.02, 3)} material={shell} position={[0, -0.94, -0.04]} onSelect={onSelect} />
      <Solid geometry={box(2.86, 1.76, 0.4, 0.03, 4)} material={shell} position={[0, -0.02, -0.12]} onSelect={onSelect} />
      <Solid geometry={box(0.16, 1.46, 0.26, 0.02, 3)} material={rail} position={[-1.32, -0.01, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(0.16, 1.46, 0.26, 0.02, 3)} material={rail} position={[1.32, -0.01, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(2.48, 0.12, 0.24, 0.02, 3)} material={rail} position={[0, 0.8, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(2.48, 0.1, 0.24, 0.02, 3)} material={rail} position={[0, -0.8, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(2.46, 0.05, 0.22, 0.012, 2)} material={rail} position={[0, 0.14, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(2.46, 0.045, 0.22, 0.012, 2)} material={rail} position={[0, -0.32, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(0.05, 0.46, 0.22, 0.01, 2)} material={rail} position={[0, 0.42, 0.2]} onSelect={onSelect} shadow={false} />
      <Solid geometry={box(0.05, 0.34, 0.22, 0.01, 2)} material={rail} position={[0, -0.08, 0.2]} onSelect={onSelect} shadow={false} />
      {BAYS.map((bay) => {
        const state = byId.get(bay.id);
        return (
          <group key={bay.id} position={bay.position}>
            <mesh geometry={box(bay.size[0], bay.size[1], bay.size[2], 0.012, 3)} material={bayMaterial(Boolean(state?.dim), Boolean(state?.hot))} castShadow receiveShadow dispose={null} onClick={state ? choose(state.onSelect) : undefined} />
            {state?.alert ? (
              <mesh geometry={box(0.028, bay.size[1], 0.012, 0.004, 2)} material={studio.alert} position={[-bay.size[0] / 2 + 0.03, 0, 0.02]} dispose={null} />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

const CORE_RINGS: { radius: number; height: number; y: number; kind: "charcoal" | "satin" | "ceramic" }[] = [
  { radius: 0.44, height: 0.06, y: -0.38, kind: "charcoal" },
  { radius: 0.26, height: 0.045, y: -0.3, kind: "satin" },
  { radius: 0.4, height: 0.05, y: -0.21, kind: "charcoal" },
  { radius: 0.2, height: 0.07, y: -0.12, kind: "charcoal" },
  { radius: 0.34, height: 0.04, y: -0.04, kind: "satin" },
  { radius: 0.16, height: 0.08, y: 0.05, kind: "charcoal" },
  { radius: 0.2, height: 0.08, y: 0.16, kind: "ceramic" },
  { radius: 0.06, height: 0.035, y: 0.24, kind: "charcoal" },
];

export function CoordinationCore({
  dim,
  hot,
  alert,
  onSelect,
}: {
  dim: boolean;
  hot: boolean;
  alert?: boolean;
  onSelect: () => void;
}) {
  return (
    <group>
      <Solid geometry={box(1.62, 0.1, 1.02, 0.02, 3)} material={shellMaterial(dim, hot)} position={[0, -0.48, 0]} onSelect={onSelect} />
      {CORE_RINGS.map((ring) => (
        <Solid
          key={`${ring.kind}-${ring.y}`}
          geometry={puck(ring.radius, ring.height)}
          material={ring.kind === "ceramic" ? ceramicMaterial(dim, hot) : ring.kind === "satin" ? bayMaterial(dim, hot) : shellMaterial(dim, hot)}
          position={[0, ring.y, 0]}
          onSelect={onSelect}
          shadow={ring.radius > 0.35 || ring.kind === "ceramic"}
        />
      ))}
      {alert ? <mesh geometry={puck(0.21, 0.012)} material={studio.alert} position={[0, 0.215, 0]} dispose={null} /> : null}
    </group>
  );
}

const SLOT_Y = [-0.24, 0.02, 0.28];
const shelfGeo = box(1.64, 0.028, 0.64, 0.008, 2);
const wallGeo = box(0.07, 0.78, 0.74, 0.016, 3);

function ShelfRow({ material, onSelect }: { material: Mat; onSelect: () => void }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    SLOT_Y.forEach((y, index) => {
      dummy.position.set(0, y, -0.02);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[shelfGeo, studio.satinDim, SLOT_Y.length]} material={material} receiveShadow dispose={null} onClick={choose(onSelect)} />;
}

function StorageWalls({ material, onSelect }: { material: Mat; onSelect: () => void }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    [-0.9, 0.9].forEach((x, index) => {
      dummy.position.set(x, 0.02, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[wallGeo, studio.satinDim, 2]} material={material} castShadow receiveShadow dispose={null} onClick={choose(onSelect)} />;
}

export function StorageStack({ dim, hot, onSelect }: { dim: boolean; hot: boolean; onSelect: () => void }) {
  const shell = shellMaterial(dim, hot);
  const frame = dim ? studio.charcoalDim : studio.satinDim;
  const widths = [1.02, 1.28, 0.86];
  return (
    <group>
      <Solid geometry={box(2.08, 0.08, 1.02, 0.02, 3)} material={shell} position={[0, -0.42, 0]} onSelect={onSelect} />
      <Solid geometry={box(1.7, 0.74, 0.05, 0.012, 2)} material={shell} position={[0, 0.02, -0.42]} onSelect={onSelect} />
      <StorageWalls material={frame} onSelect={onSelect} />
      <ShelfRow material={frame} onSelect={onSelect} />
      <Solid geometry={box(1.62, 0.045, 0.06, 0.01, 2)} material={frame} position={[0, 0.4, 0.28]} onSelect={onSelect} />
      {SLOT_Y.map((y, index) => (
        <Solid
          key={y}
          geometry={box(widths[index], 0.055, 0.3, 0.01, 3)}
          material={bayMaterial(dim, hot)}
          position={[0, y + 0.046, 0.08]}
          onSelect={onSelect}
          shadow={false}
        />
      ))}
    </group>
  );
}

export function HtmlLabel({ position, text, dim, priority = 1 }: { position: Vec; text: string; dim?: boolean; priority?: number }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span
        data-label=""
        data-priority={priority}
        className="whitespace-nowrap bg-[#080808]/85 px-1 font-mono text-[10px] uppercase tracking-[0.12em]"
        style={{ color: dim ? "#5c5c5c" : "#F5F5F5" }}
      >
        {text}
      </span>
    </Html>
  );
}

const activePacket = new MeshBasicMaterial({ color: "#F5F5F5" });
activePacket.dispose = () => undefined;
export const packetMaterial = activePacket;
export const groundMaterial = mat.ground;
