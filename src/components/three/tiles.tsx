"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, Object3D, Raycaster, Vector2, Vector3 } from "three";
import { tiles, type TileId } from "@/content/gap";
import { explore, gapScroll, ringOrigin, setOpenTile, systemScroll } from "@/lib/explore";
import { useLake } from "@/store/lake";

const raycaster = new Raycaster();
const ndc = new Vector2();
const goal = new Vector3();
const forward = new Vector3();
const ring = new Vector3();
const camLocal = new Vector3();

function family(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, line: number) {
  const words = text.split(" ");
  let row = "";
  let top = y;
  words.forEach((word) => {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > width && row) {
      ctx.fillText(row, x, top);
      row = word;
      top += line;
    } else row = next;
  });
  if (row) ctx.fillText(row, x, top);
}

function makeLabel(problem: string, answer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const tight = family("--font-tight", "sans-serif");
  const mono = family("--font-mono", "monospace");
  ctx.fillStyle = "#0c0c0f";
  ctx.fillRect(0, 0, 512, 640);
  ctx.strokeStyle = "#C9A227";
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 480, 608);
  ctx.fillStyle = "#C9A227";
  ctx.font = `500 26px ${mono}`;
  ctx.fillText("PROBLEM", 40, 92);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 42px ${tight}`;
  wrap(ctx, problem, 40, 168, 430, 52);
  ctx.fillStyle = "#C9A227";
  ctx.font = `500 26px ${mono}`;
  ctx.fillText("LAKEWIRE", 40, 360);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 42px ${tight}`;
  wrap(ctx, answer, 40, 428, 430, 50);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function Glyph({ id }: { id: TileId }) {
  if (id === "cost") {
    return (
      <group position={[0, 0.05, 0.08]}>
        <mesh position={[-0.24, 0, 0]}><boxGeometry args={[0.16, 0.16, 0.16]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh position={[0.24, 0, 0]}><boxGeometry args={[0.16, 0.16, 0.16]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh><boxGeometry args={[0.28, 0.03, 0.03]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    );
  }
  if (id === "coupled") {
    return (
      <group position={[0, 0.02, 0.08]}>
        <mesh><boxGeometry args={[0.32, 0.32, 0.32]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.48, 24]} /><meshBasicMaterial color="#f2f2f3" /></mesh>
      </group>
    );
  }
  if (id === "scale") {
    return (
      <group position={[0, -0.1, 0.08]}>
        <mesh><boxGeometry args={[0.42, 0.1, 0.16]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh position={[0, 0.16, 0]}><boxGeometry args={[0.3, 0.1, 0.16]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.16, 0.1, 0.16]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    );
  }
  if (id === "latency") {
    return (
      <group position={[0, 0.05, 0.08]} rotation={[0, 0, 0.32]}>
        <mesh><boxGeometry args={[0.68, 0.035, 0.06]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[-0.28, 0.1, 0]}><sphereGeometry args={[0.09, 16, 16]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh position={[0.28, -0.02, 0]}><sphereGeometry args={[0.07, 16, 16]} /><meshBasicMaterial color="#8B8B93" /></mesh>
      </group>
    );
  }
  if (id === "correct") {
    return (
      <group position={[0, 0.04, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.028, 10, 28]} /><meshBasicMaterial color="#C9A227" /></mesh>
        <mesh position={[0.16, -0.16, 0]}><boxGeometry args={[0.08, 0.08, 0.08]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    );
  }
  return (
    <group position={[0, 0.02, 0.08]}>
      <mesh><boxGeometry args={[0.14, 0.14, 0.14]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {[[-0.22, 0.18], [0.22, 0.16], [-0.18, -0.2], [0.2, -0.18]].map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#C9A227" />
        </mesh>
      ))}
    </group>
  );
}

function paint(node: Group, glyph: Group | null, label: Mesh | null, selected: boolean, fade: number) {
  if (glyph) glyph.visible = !selected;
  if (label) label.visible = selected;
  node.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material) || mesh.userData.label) return;
    const mat = mesh.material as MeshBasicMaterial;
    mat.transparent = true;
    mat.opacity = mesh.userData.glass && selected ? 0 : fade;
  });
}

function Tile({ id, index }: { id: TileId; index: number }) {
  const group = useRef<Group>(null);
  const glyph = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const mobile = useLake((state) => state.mobile);
  const reduced = useLake((state) => state.reduced);
  const spec = tiles[index];
  const map = useMemo(() => makeLabel(spec.problem, spec.answer), [spec.answer, spec.problem]);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;
    const selected = explore.openTile === id;
    const open = Boolean(explore.openTile);
    const count = tiles.length;
    if (mobile) {
      let delta = index - explore.stack;
      delta -= count * Math.round(delta / count);
      ring.set(0, -delta * 1.72, Math.min(1.1, Math.abs(delta) * 0.4));
      if (selected) {
        state.camera.getWorldDirection(forward);
        goal.copy(state.camera.position).addScaledVector(forward, 3.1);
        node.parent?.worldToLocal(goal);
      }
      node.position.lerp(selected ? goal : ring, 0.1);
      const spot = selected ? goal : ring;
      let facing = selected ? Math.PI : 0;
      if (node.parent) {
        camLocal.copy(state.camera.position);
        node.parent.worldToLocal(camLocal);
        facing = Math.atan2(camLocal.x - spot.x, camLocal.z - spot.z);
        if (selected) facing += Math.PI;
      }
      let turn = facing - node.rotation.y;
      turn -= Math.PI * 2 * Math.round(turn / (Math.PI * 2));
      node.rotation.y += turn * 0.1;
      const fade = selected ? 1 : Math.max(0.15, 1 - Math.abs(delta) * 0.5);
      node.scale.setScalar(selected ? 1.05 : Math.max(0.62, 1 - Math.abs(delta) * 0.16));
      paint(node, glyph.current, label.current, selected, fade);
      return;
    }
    const angle = explore.spin + (index / count) * Math.PI * 2;
    const bob = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.6 + index) * 0.05;
    ring.set(Math.sin(angle) * 2.45, bob, Math.cos(angle) * 2.45);
    if (selected) {
      state.camera.getWorldDirection(forward);
      goal.copy(state.camera.position).addScaledVector(forward, 3.05);
      node.parent?.worldToLocal(goal);
    }
    node.position.lerp(selected ? goal : ring, 0.1);
    const spot = selected ? goal : ring;
    let facing = angle + Math.PI;
    if (node.parent) {
      camLocal.copy(state.camera.position);
      node.parent.worldToLocal(camLocal);
      facing = Math.atan2(camLocal.x - spot.x, camLocal.z - spot.z);
      if (selected) facing += Math.PI;
    }
    let turn = facing - node.rotation.y;
    turn -= Math.PI * 2 * Math.round(turn / (Math.PI * 2));
    node.rotation.y += turn * 0.1;
    const dim = open && !selected;
    node.scale.setScalar(dim ? 0.72 : 1);
    paint(node, glyph.current, label.current, selected, dim ? 0.2 : 1);
  });

  return (
    <group ref={group} userData={{ tile: id }}>
      <mesh userData={{ glass: true }}>
        <boxGeometry args={[1.22, 1.52, 0.05]} />
        <meshBasicMaterial color="#141418" transparent depthWrite />
      </mesh>
      <mesh ref={label} userData={{ label: true }} position={[0, 0, -0.045]} rotation={[0, Math.PI, 0]} visible={false}>
        <planeGeometry args={[1.14, 1.42]} />
        <meshBasicMaterial color="#ffffff" map={map ?? undefined} />
      </mesh>
      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[1.22, 0.02, 0.07]} />
        <meshBasicMaterial color="#C9A227" transparent />
      </mesh>
      <mesh position={[0, -0.76, 0]}><boxGeometry args={[1.22, 0.02, 0.07]} /><meshBasicMaterial color="#C9A227" /></mesh>
      <mesh position={[-0.61, 0, 0]}><boxGeometry args={[0.02, 1.52, 0.07]} /><meshBasicMaterial color="#C9A227" /></mesh>
      <mesh position={[0.61, 0, 0]}><boxGeometry args={[0.02, 1.52, 0.07]} /><meshBasicMaterial color="#C9A227" /></mesh>
      <group ref={glyph}>
        <Glyph id={id} />
      </group>
    </group>
  );
}

function tileOf(object: Object3D | null) {
  let current = object;
  while (current) {
    if (typeof current.userData.tile === "string") return current.userData.tile;
    current = current.parent;
  }
  return null;
}

export function Tiles() {
  const root = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const moved = useRef(0);
  const armed = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const active = () => gapScroll.p > 0.62 && systemScroll.p < 0.45;
    const down = (event: PointerEvent) => {
      if (!active()) return;
      if (event.target instanceof Element && event.target.closest("a, button, header, input, aside")) return;
      explore.dragging = false;
      moved.current = 0;
      last.current = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!active()) return;
      armed.current = true;
      if (!(event.buttons & 1)) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      moved.current += Math.abs(dx) + Math.abs(dy);
      if (moved.current < 8) return;
      explore.dragging = true;
      if (useLake.getState().mobile) explore.stackV += dy * 0.012;
      else explore.spinV += dx * 0.005;
    };
    const up = (event: PointerEvent) => {
      if (!active()) return;
      const dragged = moved.current > 10;
      explore.dragging = false;
      if (dragged) {
        setOpenTile(null);
        return;
      }
      ndc.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      const hit = root.current ? raycaster.intersectObject(root.current, true)[0] : undefined;
      const id = tileOf(hit?.object ?? null);
      if (!id) {
        setOpenTile(null);
        return;
      }
      setOpenTile(explore.openTile === id ? null : id);
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const { reduced, mobile, pointer } = useLake.getState();
    if (root.current) root.current.visible = gapScroll.p > 0.08;
    if (!explore.dragging && !explore.openTile && !reduced && !mobile && gapScroll.p > 0.5) explore.spin += delta * 0.12;
    explore.spin += explore.spinV;
    explore.spinV *= 0.92;
    if (mobile) {
      explore.stack += explore.stackV;
      explore.stackV *= 0.9;
      if (Math.abs(explore.stackV) < 0.0015 && !explore.dragging) explore.stack += (Math.round(explore.stack) - explore.stack) * 0.14;
    }
    if (gapScroll.p < 0.45 && explore.openTile) setOpenTile(null);
    if (!armed.current || mobile || explore.dragging || gapScroll.p < 0.62 || systemScroll.p > 0.45) return;
    ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(ndc, camera);
    const hit = root.current ? raycaster.intersectObject(root.current, true)[0] : undefined;
    const id = tileOf(hit?.object ?? null);
    if (id) setOpenTile(id);
  });

  return (
    <group ref={root} position={ringOrigin}>
      {tiles.map((tile, index) => (
        <Tile key={tile.id} id={tile.id} index={index} />
      ))}
    </group>
  );
}
