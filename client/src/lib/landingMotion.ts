export function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function getScrollProgress(scrollY: number, documentHeight: number, viewportHeight: number) {
  const scrollableHeight = Math.max(1, documentHeight - viewportHeight);
  return clampUnit(scrollY / scrollableHeight);
}

export function getSceneOffset(progress: number, distance: number) {
  return Math.round(clampUnit(progress) * distance);
}
