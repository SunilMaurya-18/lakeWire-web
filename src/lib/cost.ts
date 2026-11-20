import { Vector3 } from "three";

/** Public list prices. The monthly model and the part bars both read these. */
export const prices = {
  diskPerGbMonth: 0.08,
  crossAzPerGb: 0.02,
  objectPerGbMonth: 0.023,
  putPerGb: 0.005,
  getPerGb: 0.0004,
};

export const metrics = [
  { id: "disk", label: "Disk" },
  { id: "transfer", label: "Cross-AZ" },
  { id: "object", label: "Object" },
  { id: "put", label: "PUT" },
  { id: "get", label: "GET" },
] as const;

export type PartId = (typeof metrics)[number]["id"];

export const costScroll = { p: 0, live: false };

export const costView = {
  metric: 0,
  hover: null as "classic" | "lake" | null,
  mbps: 50,
  days: 7,
  zones: 3,
};

let version = 0;
const listeners = new Set<() => void>();

export function subscribeCost(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function costVersion() {
  return version;
}

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function setMetric(index: number) {
  if (costView.metric === index) return;
  costView.metric = index;
  emit();
}

export function setHover(id: "classic" | "lake" | null) {
  if (costView.hover === id) return;
  costView.hover = id;
  emit();
}

export function footprintGb(mbps: number, days: number) {
  return (mbps * 86400 * days) / 1024;
}

export function ingestGb(mbps: number) {
  return (mbps * 86400 * 30) / 1024;
}

export function classicParts(mbps: number, days: number, zones: number) {
  const copies = Math.max(1, zones);
  return {
    disk: footprintGb(mbps, days) * copies * prices.diskPerGbMonth,
    transfer: ingestGb(mbps) * Math.max(0, copies - 1) * prices.crossAzPerGb,
    object: 0,
    put: 0,
    get: 0,
  };
}

export function lakeParts(mbps: number, days: number, zones: number) {
  return {
    disk: 0,
    transfer: 0,
    object: footprintGb(mbps, days) * prices.objectPerGbMonth,
    put: ingestGb(mbps) * prices.putPerGb,
    get: ingestGb(mbps) * prices.getPerGb * Math.max(1, zones),
  };
}

export function classicMonthly(mbps: number, days: number, zones: number) {
  const parts = classicParts(mbps, days, zones);
  return parts.disk + parts.transfer;
}

export function lakeMonthly(mbps: number, days: number, zones: number) {
  const parts = lakeParts(mbps, days, zones);
  return parts.object + parts.put + parts.get;
}

export function metricBars(index: number) {
  const id = metrics[index]?.id ?? "disk";
  const classic = classicParts(costView.mbps, costView.days, costView.zones);
  const lake = lakeParts(costView.mbps, costView.days, costView.zones);
  return [
    { id: "classic" as const, name: "Classic", value: classic[id] },
    { id: "lake" as const, name: "LakeWire", value: lake[id] },
  ];
}

export function stackUnits(amount: number) {
  return Math.min(12, Math.max(0.22, amount / 1800));
}

export function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatMetric(_metric: number, value: number) {
  if (value >= 100) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
}

export function costPose(mobile: boolean, pos: Vector3, look: Vector3) {
  if (mobile) {
    pos.set(0.05, -5.35, -45.2);
    look.set(0.05, -8.55, -54);
    return;
  }
  pos.set(1.35, -6.55, -49.2);
  look.set(0.05, -8.2, -54);
}
