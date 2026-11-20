"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, Group, MeshBasicMaterial, Object3D, Raycaster, Vector2 } from "three";
import { hubScroll, library, openVolume, resetLibrary, volumes, type VolumeId } from "@/lib/library";
import { useLake } from "@/store/lake";

const raycaster = new Raycaster();
const ndc = new Vector2();
const origin: [number, number, number] = [0, -9.35, -72];

function spineTexture(title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#C9A227";
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = "#14120a";
  ctx.font = "500 42px monospace";
  ctx.textAlign = "center";
  ctx.translate(128, 256);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(title.toUpperCase(), 0, 12);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function bookOf(object: Object3D | null) {
  let current = object;
  while (current) {
    if (typeof current.userData.book === "string") return current.userData.book as VolumeId;
    current = current.parent;
  }
  return null;
}

function Book({ id, title, x }: { id: VolumeId; title: string; x: number }) {
  const group = useRef<Group>(null);
  const spine = useRef<MeshBasicMaterial>(null);
  const map = useMemo(() => spineTexture(title), [title]);

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    const hot = library.hover === id || library.open === id;
    const opening = library.open === id;
    const yaw = opening ? 0.7 : hot ? 0.16 : 0;
    const lift = opening ? 0.24 : hot ? 0.08 : 0;
    node.rotation.y += (yaw - node.rotation.y) * 0.12;
    node.position.y += (0.62 + lift - node.position.y) * 0.12;
    spine.current?.color.set(hot ? "#f0d56a" : "#C9A227");
  });

  return (
    <group ref={group} position={[x, 0.62, 0]} userData={{ book: id }}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[0.78, 1.18, 0.5]} />
        <meshBasicMaterial color="#0c0c0f" />
      </mesh>
      <mesh position={[0, 0, 0.23]}>
        <planeGeometry args={[0.7, 1.08]} />
        <meshBasicMaterial ref={spine} color="#C9A227" map={map ?? undefined} />
      </mesh>
    </group>
  );
}

export function Shelf() {
  const root = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const sent = useRef(false);

  useEffect(() => () => resetLibrary(), []);

  useEffect(() => {
    const active = () => hubScroll.p > 0.62 && !library.open;
    const overUi = (event: Event) => event.target instanceof Element && Boolean(event.target.closest("a, button, header, input, label, aside, nav"));
    const pick = (event: PointerEvent) => {
      if (!active() || overUi(event)) return null;
      ndc.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      const hits = root.current ? raycaster.intersectObject(root.current, true) : [];
      return hits.map((hit) => bookOf(hit.object)).find((id) => id) ?? null;
    };
    const move = (event: PointerEvent) => {
      if (useLake.getState().mobile || !active()) return;
      library.hover = overUi(event) ? null : pick(event);
    };
    const up = (event: PointerEvent) => {
      if (!active() || overUi(event)) return;
      const id = pick(event);
      if (id) openVolume(id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [camera]);

  useFrame(() => {
    const node = root.current;
    if (!node) return;
    const show = hubScroll.live || hubScroll.p > 0.02;
    node.visible = show;
    if (!show) return;
    const target = library.open ? 1 : 0;
    library.cover += (target - library.cover) * (useLake.getState().reduced ? 1 : 0.1);
    if (library.open && library.cover > 0.72 && !sent.current) {
      sent.current = true;
      const href = volumes.find((volume) => volume.id === library.open)?.href;
      if (href) window.dispatchEvent(new CustomEvent("lakewire-open", { detail: href }));
    }
  });

  return (
    <group ref={root} position={origin} visible={false}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[5.4, 0.08, 1.5]} />
        <meshBasicMaterial color="#141418" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <planeGeometry args={[5.2, 1.35]} />
        <meshBasicMaterial color="#1a1a20" />
      </mesh>
      {volumes.map((volume, index) => (
        <Book key={volume.id} id={volume.id} title={volume.title} x={(index - (volumes.length - 1) / 2) * 1.35} />
      ))}
    </group>
  );
}
