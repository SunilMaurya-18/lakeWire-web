export const RIPPLE_SLOTS = 6;

export const ripples = new Float32Array(RIPPLE_SLOTS * 3);
ripples.fill(-1);

let slot = 0;

export function spawnRipple(x: number, z: number, time: number) {
  const index = (slot % RIPPLE_SLOTS) * 3;
  slot += 1;
  ripples[index] = x;
  ripples[index + 1] = z;
  ripples[index + 2] = time;
}

export const pointerOnLake = { x: 0, z: -0.35 };
