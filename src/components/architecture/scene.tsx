"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, PMREMGenerator, Vector3, type Mesh } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ChapterId } from "@/components/architecture/content";
import { nodeById, statusLabel } from "@/components/architecture/content";
import { produceSteps } from "@/components/architecture/produce-scenario";
import { fetchSteps, type CacheBranch } from "@/components/architecture/fetch-scenario";
import { bindStudioEnvironment, BrokerChassis, CoordinationCore, HtmlLabel, MachinedBroker, Plate, StorageStack, Terminal, groundMaterial, packetMaterial } from "@/components/architecture/models";

export type Vec = [number, number, number];

const INITIAL_CAMERA: Vec = [6.6, 5.8, 12.4];
const INITIAL_TARGET: Vec = [0.35, -0.55, 0];
const SCENE_CAMERA = { position: INITIAL_CAMERA, fov: 34, near: 0.1, far: 80 };
const SCENE_GL = { antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 };

const MODULES: { id: string; label: string; position: Vec }[] = [
  { id: "buffer", label: "Buffer", position: [-0.62, 0.38, 0.28] },
  { id: "uploader", label: "Uploader", position: [0.62, 0.38, 0.28] },
  { id: "commit", label: "Commit", position: [-0.62, -0.08, 0.28] },
  { id: "fetch", label: "Fetch", position: [0.62, -0.08, 0.28] },
  { id: "workers", label: "Workers", position: [0, -0.5, 0.28] },
];

function emphasis(chapter: ChapterId, id: string) {
  if (chapter === "later") return id === "groups" || id === "peer" || id === "jepsen" || id === "shard" ? "on" : "dim";
  if (chapter === "produce") return ["clients", "broker", "buffer", "uploader", "commit", "postgres", "storage"].includes(id) ? "on" : "dim";
  if (chapter === "fetch") return ["clients", "broker", "fetch", "postgres", "storage"].includes(id) ? "on" : "dim";
  if (chapter === "retry") return ["clients", "broker", "commit", "postgres"].includes(id) ? "on" : "dim";
  if (chapter === "fence") return ["broker", "commit", "postgres"].includes(id) ? "on" : "dim";
  if (chapter === "lifecycle") return ["workers", "storage", "postgres", "broker"].includes(id) ? "on" : "dim";
  return "on";
}

function edgeColor(mode: "on" | "dim" | "alert") {
  if (mode === "alert") return "#EF4444";
  if (mode === "dim") return "#3a3a3a";
  return "#A3A3A3";
}

function Block({
  position,
  size,
  selected,
  dim,
  hot,
  alert,
  onSelect,
}: {
  position?: Vec;
  size: Vec;
  selected?: boolean;
  dim: boolean;
  hot?: boolean;
  alert?: boolean;
  onSelect: () => void;
}) {
  return <Plate position={position} size={size} dim={dim && !hot} hot={Boolean(hot || selected)} alert={alert} onSelect={onSelect} />;
}

function Tag({ position, title, dim }: { position: Vec; title: string; dim?: boolean; kicker?: string }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span data-label="" data-priority={1} className="whitespace-nowrap bg-[#080808]/80 px-1.5 py-0.5 text-[13px] font-medium leading-none" style={{ color: dim ? "#6b6b6b" : "#F5F5F5" }}>
        {title}
      </span>
    </Html>
  );
}

function LinkLine({ points, color, label, labelAt, hideLabel }: { points: Vec[]; color: string; label: string; labelAt: Vec; hideLabel?: boolean }) {
  return (
    <group>
      <Line points={points} color={color} lineWidth={1} />
      {hideLabel ? null : (
        <Html position={labelAt} center zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
          <span data-label="" data-priority={3} className="relative whitespace-nowrap bg-[#080808]/85 px-1 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color }}>
            <span className="absolute left-1/2 top-full h-2 w-px -translate-x-1/2 bg-[#3a3a3a]" />
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}

function Broker({
  position,
  chapter,
  selected,
  hot,
  quiet,
  crafted = false,
  onSelect,
}: {
  position: Vec;
  chapter: ChapterId;
  selected: string;
  hot: ReadonlySet<string>;
  quiet?: boolean;
  crafted?: boolean;
  onSelect: (id: string) => void;
}) {
  const playing = hot.size > 0;
  const mode = emphasis(chapter, "broker");
  const dim = Boolean(quiet) || (playing ? !hot.has("broker") : mode === "dim");
  const modules = MODULES.map((module) => ({
    id: module.id,
    dim: Boolean(quiet) || (playing ? !hot.has(module.id) : emphasis(chapter, module.id) === "dim"),
    hot: !quiet && (hot.has(module.id) || selected === module.id),
    alert: !quiet && !playing && chapter === "fence" && module.id === "commit",
    onSelect: () => onSelect(module.id),
  }));
  return (
    <group position={position}>
      {crafted ? (
        <MachinedBroker dim={dim} hot={!quiet && (selected === "broker" || hot.has("broker"))} bays={modules} onSelect={() => onSelect("broker")} />
      ) : (
        <>
          <BrokerChassis dim={dim} hot={!quiet && (selected === "broker" || hot.has("broker"))} onSelect={() => onSelect("broker")} />
          {MODULES.map((module) => {
            const state = modules.find((item) => item.id === module.id);
            return (
              <Block
                key={module.id}
                position={module.position}
                size={module.id === "workers" ? [2.2, 0.28, 0.08] : [1.05, 0.32, 0.08]}
                selected={false}
                dim={Boolean(state?.dim)}
                hot={Boolean(state?.hot)}
                alert={Boolean(state?.alert)}
                onSelect={() => onSelect(module.id)}
              />
            );
          })}
        </>
      )}
      <Tag position={[0, 1.78, 0.7]} kicker={statusLabel["planned-v0.1"]} title="Stateless broker" dim={dim} />
      {MODULES.map((module) => {
        const reveal = !quiet && (hot.has(module.id) || (hot.size === 0 && chapter === "fence" && module.id === "commit") || (hot.size === 0 && chapter === "lifecycle" && module.id === "workers") || (hot.size === 0 && chapter !== "fence" && chapter !== "lifecycle" && selected === module.id));
        if (!reveal) return null;
        return <HtmlLabel key={`${module.id}-label`} position={[module.position[0], module.position[1], 0.46]} text={module.label} priority={2} />;
      })}
    </group>
  );
}

function pointOnPath(points: Vec[], t: number): Vec {
  if (points.length === 1) return points[0];
  const spans: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    spans.push(length);
    total += length;
  }
  if (total === 0) return points[0];
  let remain = Math.min(1, Math.max(0, t)) * total;
  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index];
    if (remain <= span || index === spans.length - 1) {
      const amount = span === 0 ? 1 : Math.min(1, remain / span);
      const from = points[index];
      const to = points[index + 1];
      return [from[0] + (to[0] - from[0]) * amount, from[1] + (to[1] - from[1]) * amount, from[2] + (to[2] - from[2]) * amount];
    }
    remain -= span;
  }
  return points[points.length - 1];
}

function Packets({ path, frozen, reduced, gather }: { path: Vec[] | null; frozen: boolean; reduced: boolean; gather: boolean }) {
  const meshes = useRef<Array<Mesh | null>>([]);
  const progress = useRef(1);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const signature = path?.map((point) => point.join(",")).join("|") ?? "";
  const count = gather ? 3 : 1;

  useLayoutEffect(() => {
    if (!path) return;
    progress.current = reduced ? 1 : 0;
  }, [path, reduced, signature]);

  useFrame((_, delta) => {
    if (!path) return;
    if (!frozenRef.current && !reduced && progress.current < 1) progress.current = Math.min(1, progress.current + delta / 1.6);
    const t = reduced ? 1 : progress.current;
    const eased = t * t * (3 - 2 * t);
    const point = pointOnPath(path, eased);
    meshes.current.forEach((mesh, index) => {
      if (!mesh) return;
      const spread = gather ? (1 - Math.min(1, eased / 0.55)) * (index - 1) * 0.16 : 0;
      mesh.position.set(point[0], point[1] + spread, point[2] + 0.28);
    });
  });

  if (!path) return null;
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index} ref={(node) => { meshes.current[index] = node; }} material={packetMaterial} castShadow dispose={null}>
          <boxGeometry args={[0.22, 0.09, 0.14]} />
          <Edges color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function MapScene({
  chapter,
  selected,
  step,
  branch,
  compact,
  onSelect,
}: {
  chapter: ChapterId;
  selected: string;
  step: number;
  branch: CacheBranch;
  compact: boolean;
  onSelect: (id: string) => void;
}) {
  const producePlay = chapter === "produce" && step > 0;
  const fetchPlay = chapter === "fetch" && step > 0;
  const scenario = producePlay ? produceSteps[step - 1] : fetchPlay ? fetchSteps(branch)[step - 1] : null;
  const hot = useMemo(() => new Set(scenario?.focus ?? []), [scenario]);
  const laterDim = chapter !== "later";
  const produceOn = chapter === "overview" || chapter === "produce" || chapter === "retry";
  const fetchOn = chapter === "overview" || chapter === "fetch";
  const coordOn = chapter !== "later";
  const fence = chapter === "fence" && !scenario;
  const links = useMemo(() => {
    const soft = "#3a3a3a";
    const line = "#A3A3A3";
    const red = "#EF4444";
    const bright = "#F5F5F5";
    if (scenario) {
      return {
        produce: scenario.line === "produce" ? bright : soft,
        fetch: scenario.line === "fetch" ? bright : soft,
        commit: scenario.line === "commit" ? bright : soft,
        object: scenario.line === "object" ? bright : soft,
      };
    }
    return {
      produce: produceOn ? line : soft,
      fetch: fetchOn ? line : soft,
      commit: fence ? red : coordOn ? line : soft,
      object: chapter === "lifecycle" || chapter === "produce" || chapter === "fetch" || chapter === "overview" ? line : soft,
    };
  }, [produceOn, fetchOn, coordOn, fence, chapter, scenario]);

  return (
    <group>
      <group position={[-3.85, 0.05, 0]}>
        <Terminal position={[0, 0.55, 0]} title="Producer" dim={producePlay ? !hot.has("clients") : fetchPlay ? true : !produceOn && !fetchOn} hot={(!producePlay && !fetchPlay && selected === "clients") || (producePlay && hot.has("clients"))} onSelect={() => onSelect("clients")} />
        <Terminal position={[0, -0.55, 0]} title="Consumer" dim={fetchPlay ? !hot.has("clients") : producePlay ? true : !produceOn && !fetchOn} hot={(!producePlay && !fetchPlay && selected === "clients") || (fetchPlay && hot.has("clients"))} onSelect={() => onSelect("clients")} />
        {compact ? null : <Tag position={[0, 1.2, 0]} title="Kafka clients" dim={producePlay ? !hot.has("clients") : fetchPlay ? !hot.has("clients") : chapter === "later" || chapter === "lifecycle"} />}
      </group>

      <Broker position={[0.15, 1.35, 0.15]} chapter={chapter} selected={selected} hot={hot} quiet={fetchPlay} crafted onSelect={onSelect} />
      <Broker position={[0.15, -1.65, -0.15]} chapter={chapter} selected={selected} hot={hot} quiet={producePlay} onSelect={onSelect} />

      <group position={[3.7, 1.4, 0]}>
        <CoordinationCore dim={scenario ? !hot.has("postgres") : !coordOn} hot={hot.has("postgres") || selected === "postgres"} alert={fence} onSelect={() => onSelect("postgres")} />
        {compact ? null : <Tag position={[0, 1.05, 0.15]} title="PostgreSQL" dim={scenario ? !hot.has("postgres") : !coordOn} />}
      </group>
      <group position={[3.7, -1.7, 0]}>
        <StorageStack dim={scenario ? !hot.has("storage") : links.object === "#3a3a3a"} hot={hot.has("storage") || selected === "storage"} onSelect={() => onSelect("storage")} />
        {compact ? null : <Tag position={[0, 1.08, 0.2]} title="Object storage" dim={scenario ? !hot.has("storage") : links.object === "#3a3a3a"} />}
      </group>

      <LinkLine points={[[-2.9, 0.6, 0], [-1.35, 1.35, 0.15]]} color={links.produce} label="Produce" labelAt={[-2.35, 1.15, 0.3]} hideLabel={compact} />
      <LinkLine points={[[-2.9, -0.5, 0], [-1.35, -1.65, -0.15]]} color={links.fetch} label="Fetch" labelAt={[-2.4, -0.85, 0.3]} hideLabel={compact} />
      <LinkLine points={[[1.65, 1.35, 0.15], [2.55, 1.4, 0]]} color={links.commit} label={fence ? "Epoch rejected" : "Commit"} labelAt={[2.15, 2.05, 0.2]} hideLabel={compact} />
      <LinkLine points={[[1.65, -1.65, -0.15], [2.55, -1.7, 0]]} color={links.object} label="PUT / GET" labelAt={[2.15, -2.35, 0.2]} hideLabel={compact} />

      {fetchPlay && step >= 2 ? (
        <group position={[4.95, -2.48, 0.8]}>
          <mesh>
            <boxGeometry args={[0.18, 0.18, 0.08]} />
            <meshBasicMaterial color="#141414" />
            <Edges color="#5c5c5c" />
          </mesh>
          <Html position={[0, -0.22, 0]} center zIndexRange={[14, 0]} style={{ pointerEvents: "none" }}>
            <span data-label="" data-priority={3} className="whitespace-nowrap bg-[#080808]/85 px-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5c5c5c]">Not visible</span>
          </Html>
        </group>
      ) : null}

      <group position={[0, -4.05, 0]}>
        {(
          [
            ["groups", "Groups", -2.55],
            ["peer", "Peer cache", -0.85],
            ["jepsen", "Jepsen", 0.85],
            ["shard", "Sharding", 2.55],
          ] as const
        ).map(([id, title, x]) => {
          const node = nodeById(id);
          return (
            <group key={id} position={[x, 0, 0]}>
              <Block position={[0, 0, 0]} size={[1.55, 0.55, 0.24]} selected={selected === id} dim={laterDim} onSelect={() => onSelect(id)} />
              {compact ? null : (
                <Html position={[0, 0.55, 0]} center zIndexRange={[16, 0]} style={{ pointerEvents: "none" }}>
                  <div data-label="" data-priority={4} className="w-16 text-center font-mono text-[10px] uppercase leading-tight tracking-[0.08em]" style={{ color: laterDim ? "#5c5c5c" : "#A3A3A3" }}>
                    <div>{statusLabel[node.status].replace("Planned ", "")}</div>
                    <div>{title}</div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
}

function LabelGuard() {
  const gl = useThree((state) => state.gl);
  const tick = useRef(0);
  useFrame(() => {
    tick.current += 1;
    if (tick.current % 2) return;
    const root = gl.domElement.parentElement;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-label]")];
    nodes.forEach((node) => {
      node.style.visibility = "visible";
      node.style.marginTop = "0px";
    });
    const items = nodes
      .map((node) => ({ node, priority: Number(node.dataset.priority ?? "3"), rect: node.getBoundingClientRect() }))
      .filter((item) => item.rect.width > 2)
      .sort((a, b) => a.priority - b.priority);
    const kept: DOMRect[] = [];
    const rootTop = root.getBoundingClientRect().top;
    items.forEach((item) => {
      if (!kept.some((rect) => overlaps(rect, item.rect))) {
        kept.push(item.rect);
        return;
      }
      if (item.priority > 1) {
        item.node.style.visibility = "hidden";
        return;
      }
      const shifts = [-22, 24, -44, 48];
      for (const shift of shifts) {
        item.node.style.marginTop = `${shift}px`;
        const rect = item.node.getBoundingClientRect();
        const clear = rect.top > rootTop + 8 && !kept.some((other) => overlaps(rect, other));
        if (clear) {
          kept.push(rect);
          return;
        }
      }
      item.node.style.marginTop = "0px";
      item.node.style.visibility = "hidden";
    });
  });
  return null;
}

function StudioEnvironment({ enabled }: { enabled: boolean }) {
  const gl = useThree((state) => state.gl);
  useLayoutEffect(() => {
    if (!enabled) {
      bindStudioEnvironment(null);
      return;
    }
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.12).texture;
    bindStudioEnvironment(environment);
    return () => {
      bindStudioEnvironment(null);
      environment.dispose();
      pmrem.dispose();
    };
  }, [enabled, gl]);
  return null;
}

function poseFor(chapter: ChapterId, step: number): { position: Vec; target: Vec } {
  const home = { position: INITIAL_CAMERA, target: INITIAL_TARGET };
  if (step <= 0) return home;
  if (chapter === "produce") {
    const shots: Record<number, { position: Vec; target: Vec }> = {
      1: { position: [4.4, 4.6, 11.2], target: [-1.4, 0.7, 0] },
      2: { position: [4.8, 5.1, 10.4], target: [0.2, 1.15, 0] },
      3: { position: [6.8, 4.8, 9.6], target: [2.1, 1.15, 0] },
      4: { position: [6.4, 4.2, 10.2], target: [2.2, -0.4, 0] },
      5: { position: [6.8, 4.8, 9.6], target: [2.1, 1.15, 0] },
      6: { position: [4.2, 4.4, 11.4], target: [-1.5, 0.55, 0] },
    };
    return shots[step] ?? home;
  }
  if (chapter === "fetch") {
    const shots: Record<number, { position: Vec; target: Vec }> = {
      1: { position: [4.2, 4.2, 11.4], target: [-1.6, -0.7, 0] },
      2: { position: [6.6, 4.6, 10], target: [1.8, 0.2, 0] },
      3: { position: [6.2, 4.1, 10.4], target: [1.6, -1.1, 0] },
      4: { position: [5.2, 4.4, 10.6], target: [0.4, -1.2, 0] },
      5: { position: [4.2, 4.2, 11.4], target: [-1.6, -0.7, 0] },
    };
    return shots[step] ?? home;
  }
  return home;
}

function Rig({ token, guided, home, chapter, step, reduced }: { token: number; guided: boolean; home: boolean; chapter: ChapterId; step: number; reduced: boolean }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const guidedRef = useRef(guided);
  guidedRef.current = guided;
  const goal = useMemo(() => poseFor(chapter, step), [chapter, step]);
  const position = useMemo(() => new Vector3(...INITIAL_CAMERA), []);
  const look = useMemo(() => new Vector3(...INITIAL_TARGET), []);

  useEffect(() => {
    camera.position.set(...INITIAL_CAMERA);
    const orbit = controls as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null;
    orbit?.target?.set(...INITIAL_TARGET);
    orbit?.update?.();
  }, [token, camera, controls]);

  useFrame(() => {
    if (!guidedRef.current) return;
    const orbit = controls as { target?: Vector3; update?: () => void } | null;
    if (!orbit?.target) return;
    const amount = reduced ? 1 : 0.07;
    const shot = home ? { position: INITIAL_CAMERA, target: INITIAL_TARGET } : goal;
    position.set(...shot.position);
    look.set(...shot.target);
    camera.position.lerp(position, amount);
    orbit.target.lerp(look, amount);
    orbit.update?.();
  });
  return null;
}

export function ArchitectureCanvas({
  chapter,
  selected,
  step,
  branch,
  frozen,
  reduced,
  guided,
  home,
  compact,
  onInteract,
  onSelect,
  resetToken,
  controlsEnabled = true,
}: {
  chapter: ChapterId;
  selected: string;
  step: number;
  branch: CacheBranch;
  frozen: boolean;
  reduced: boolean;
  guided: boolean;
  home: boolean;
  compact: boolean;
  onInteract: () => void;
  onSelect: (id: string) => void;
  resetToken: number;
  controlsEnabled?: boolean;
}) {
  const path =
    chapter === "produce" && step > 0
      ? produceSteps[step - 1].path
      : chapter === "fetch" && step > 0
        ? fetchSteps(branch)[step - 1].path
        : null;
  return (
    <Canvas
      camera={SCENE_CAMERA}
      gl={SCENE_GL}
      dpr={compact ? [1, 1] : [1, 1.5]}
      shadows={!compact}
      onPointerMissed={() => onSelect("broker")}
    >
      <color attach="background" args={["#080808"]} />
      <StudioEnvironment enabled={!compact} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[9, 11, 10]}
        intensity={1.65}
        castShadow={!compact}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.04}
        shadow-camera-near={2}
        shadow-camera-far={36}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[2, 4, 12]} intensity={0.5} />
      <directionalLight position={[-8, 7, -5]} intensity={0.34} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, -4.85, 0]} material={groundMaterial} receiveShadow dispose={null}>
        <planeGeometry args={[28, 18]} />
      </mesh>
      {compact ? null : <ContactShadows position={[0.4, -4.82, 0]} opacity={0.35} scale={22} blur={1.6} far={4.5} resolution={128} color="#000000" />}
      <MapScene chapter={chapter} selected={selected} step={step} branch={branch} compact={compact} onSelect={onSelect} />
      <Packets path={path} frozen={frozen} reduced={reduced} gather={chapter === "produce" && step === 2} />
      <LabelGuard />
      {chapter === "fence" ? (
        <mesh position={[2.15, 1.5, 0.45]} material={packetMaterial} dispose={null}>
          <boxGeometry args={[0.2, 0.08, 0.12]} />
          <Edges color="#EF4444" />
        </mesh>
      ) : null}
      <OrbitControls
        makeDefault
        enableDamping={false}
        enablePan
        minDistance={7}
        maxDistance={26}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.15}
        enabled={controlsEnabled}
        onStart={onInteract}
      />
      <Rig token={resetToken} guided={guided} home={home} chapter={chapter} step={step} reduced={reduced} />
    </Canvas>
  );
}
