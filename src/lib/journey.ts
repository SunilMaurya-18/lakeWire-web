import { Vector3 } from "three";
import { cityOrigin } from "@/lib/explore";

export const journeyScroll = { p: 0, live: false };

const holds = [
  new Vector3(-5.4, 0.46, 0.72),
  new Vector3(-0.7, 0.36, 0),
  new Vector3(1.8, 0.38, 0.82),
  new Vector3(3.55, 0.68, 1.12),
  new Vector3(-5.45, 0.72, 0.78),
  new Vector3(6.05, 0.4, 0.68),
  new Vector3(1.82, 0.9, 2.05),
];

function smooth(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

const beats = 6;

export function journeyFrame(p: number) {
  const scaled = Math.min(beats - 0.001, Math.max(0, p) * beats);
  const index = Math.floor(scaled);
  return { index, local: scaled - index };
}

export function journeySample(p: number, out: Vector3) {
  const { index, local } = journeyFrame(p);
  if (index === 4) {
    const travel = smooth(0.08, 0.86, local);
    out.lerpVectors(holds[3], holds[4], travel);
    out.y += Math.sin(travel * Math.PI) * 0.42;
    return;
  }
  if (index === 5) {
    out.lerpVectors(holds[4], holds[5], smooth(0, 0.42, local));
    return;
  }
  if (index >= 6) {
    out.lerpVectors(holds[5], holds[6], smooth(0, 0.38, local));
    return;
  }
  if (index === 3) {
    out.copy(holds[3]);
    return;
  }
  out.lerpVectors(holds[index], holds[Math.min(6, index + 1)], smooth(0.7, 1, local));
}

export function journeyPose(p: number, mobile: boolean, pos: Vector3, look: Vector3) {
  journeySample(p, look);
  const { index } = journeyFrame(p);
  look.add(cityOrigin);
  let pull = mobile ? 3.2 : 2.55;
  if (index === 3) {
    look.x += 0.38;
    look.y += 0.16;
    pull += mobile ? 1.1 : 0.4;
  }
  pos.set(look.x + (mobile ? 0.12 : 0.62), look.y + (mobile ? 0.95 : 0.78), look.z + pull);
}
