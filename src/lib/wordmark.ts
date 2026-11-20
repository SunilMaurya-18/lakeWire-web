export type WordmarkData = {
  positions: Float32Array;
  order: Float32Array;
};

export function sampleWordmark(): WordmarkData | null {
  const width = 1600;
  const height = 320;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  const family = getComputedStyle(document.body).fontFamily || "Inter Tight, sans-serif";
  ctx.font = `600 200px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LakeWire", width / 2, height / 2);

  const { data } = ctx.getImageData(0, 0, width, height);
  const pts: { x: number; y: number }[] = [];
  const step = 4;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 140) pts.push({ x, y });
    }
  }
  if (pts.length < 8) return null;
  pts.sort((a, b) => a.x - b.x || a.y - b.y);

  const positions = new Float32Array(pts.length * 3);
  const order = new Float32Array(pts.length);
  const last = Math.max(1, pts.length - 1);
  pts.forEach((point, index) => {
    positions[index * 3] = (point.x / width - 0.5) * 3.4;
    positions[index * 3 + 1] = (0.5 - point.y / height) * 0.68;
    positions[index * 3 + 2] = 0;
    order[index] = index / last;
  });
  return { positions, order };
}
