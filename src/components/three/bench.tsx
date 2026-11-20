"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Mesh, MeshBasicMaterial, Object3D, Raycaster, Vector2 } from "three";
import { classicMonthly, costScroll, costView, lakeMonthly, metricBars, setHover, stackUnits } from "@/lib/cost";
import { useLake } from "@/store/lake";

const raycaster = new Raycaster();
const ndc = new Vector2();
const origin: [number, number, number] = [0, -9.15, -54];

function growOf(reduced: boolean) {
  if (reduced) return 1;
  const t = Math.min(1, Math.max(0, (costScroll.p - 0.06) / 0.7));
  return t * t * (3 - 2 * t);
}

function barOf(object: Object3D | null) {
  let current = object;
  while (current) {
    if (current.userData.bar === "classic" || current.userData.bar === "lake") return current.userData.bar;
    current = current.parent;
  }
  return null;
}

function Bar({ index, x }: { index: number; x: number }) {
  const body = useRef<Mesh>(null);
  const cap = useRef<Mesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const height = useRef(0.04);
  const id = index === 0 ? "classic" : "lake";

  useFrame(() => {
    const series = metricBars(costView.metric);
    const max = Math.max(series[0].value, series[1].value, 0.01);
    const goal = Math.max(0.03, (series[index].value / max) * 1.35 * growOf(useLake.getState().reduced));
    const step = useLake.getState().reduced ? 1 : 0.08;
    height.current += (goal - height.current) * step;
    const h = height.current;
    if (body.current) {
      body.current.scale.y = h;
      body.current.position.y = h / 2;
    }
    if (cap.current) cap.current.position.y = h + 0.03;
    const hot = costView.hover === id;
    mat.current?.color.set(id === "lake" ? (hot ? "#f0d56a" : "#C9A227") : hot ? "#ffffff" : "#a0a0a8");
  });

  return (
    <group position={[x, 0, 0.45]} userData={{ bar: id }}>
      <mesh ref={body}>
        <boxGeometry args={[0.62, 1, 0.62]} />
        <meshBasicMaterial ref={mat} color={id === "lake" ? "#C9A227" : "#a0a0a8"} />
      </mesh>
      <mesh ref={cap} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.68, 0.045, 0.68]} />
        <meshBasicMaterial color="#f4f4f5" />
      </mesh>
    </group>
  );
}

function Stack({ kind, x }: { kind: "classic" | "lake"; x: number }) {
  const coins = useRef<Array<Mesh | null>>([]);
  const fill = useRef(1);

  useFrame(() => {
    const amount = kind === "classic" ? classicMonthly(costView.mbps, costView.days, costView.zones) : lakeMonthly(costView.mbps, costView.days, costView.zones);
    const goal = stackUnits(amount);
    const step = useLake.getState().reduced ? 1 : 0.1;
    fill.current += (goal - fill.current) * step;
    coins.current.forEach((coin, index) => {
      if (!coin) return;
      const local = fill.current - index;
      const shown = local > 0.05;
      coin.visible = shown;
      const scale = shown ? Math.min(1, local) : 0;
      coin.scale.y = Math.max(0.001, scale);
      coin.position.y = 0.08 + index * 0.16 + 0.045 * scale;
    });
  });

  return (
    <group position={[x, 0, -0.35]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.86, 0.04, 0.86]} />
        <meshBasicMaterial color="#141418" />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            coins.current[index] = node;
          }}
        >
          <boxGeometry args={[0.56, 0.09, 0.56]} />
          <meshBasicMaterial color={kind === "lake" ? "#C9A227" : "#d0d0d6"} />
        </mesh>
      ))}
    </group>
  );
}

export function Bench() {
  const root = useRef<Group>(null);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const active = () => costScroll.p > 0.2 || costScroll.live;
    const overUi = (event: Event) => event.target instanceof Element && Boolean(event.target.closest("a, button, header, input, label, aside, nav"));
    const pick = (event: PointerEvent) => {
      if (!active() || overUi(event)) return null;
      ndc.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      const hits = root.current ? raycaster.intersectObject(root.current, true) : [];
      return hits.map((hit) => barOf(hit.object)).find(Boolean) ?? null;
    };
    const move = (event: PointerEvent) => {
      if (useLake.getState().mobile || !active()) return;
      if (overUi(event)) return;
      setHover(pick(event));
    };
    const up = (event: PointerEvent) => {
      if (!useLake.getState().mobile || !active() || overUi(event)) return;
      const id = pick(event);
      if (id) setHover(id);
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
    const show = costScroll.live || costScroll.p > 0.01;
    node.visible = show;
    if (!show) return;
    node.scale.setScalar(useLake.getState().mobile ? 0.72 : 1);
  });

  return (
    <group ref={root} position={origin} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, -0.01, 0]}>
        <planeGeometry args={[8.5, 4.2]} />
        <meshBasicMaterial color="#070709" />
      </mesh>
      <Bar index={0} x={-1.7} />
      <Bar index={1} x={-0.62} />
      <Stack kind="classic" x={0.72} />
      <Stack kind="lake" x={1.85} />
    </group>
  );
}
