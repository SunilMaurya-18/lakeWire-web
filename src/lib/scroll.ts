import type Lenis from "lenis";

let current: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  current = lenis;
}

export function getLenis() {
  return current;
}

export function scrollToId(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(node, { offset: 0, duration: 0.9, force: true });
  else node.scrollIntoView();
}

export function scrollToY(y: number) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { duration: 0.9, force: true });
  else window.scrollTo({ top: y });
}
