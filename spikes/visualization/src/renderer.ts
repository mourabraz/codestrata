import type { View } from './data';

export interface Handlers {
  onNodeClick(id: string): void;
  onNodeHover(id: string | null): void;
}

export interface Renderer {
  /** Mounts the view and resolves once the first frame has been drawn. */
  mount(container: HTMLElement, view: View, handlers: Handlers): Promise<void>;
  /** Highlights these nodes (and the edges between them); null clears it. */
  highlight(ids: Set<string> | null): void;
  /** Animates pan/zoom for `ms`. `frames`: animation frames the browser delivered; `drawn`: redraws the library reported. */
  benchmark(ms: number): Promise<{ frames: number; drawn: number | null }>;
  destroy(): void;
}

export const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Drives a pan/zoom animation on every animation frame for `ms`. */
export async function animate(ms: number, step: (t: number) => void): Promise<number> {
  const start = performance.now();
  let frames = 0;
  while (performance.now() - start < ms) {
    step((performance.now() - start) / ms);
    await nextFrame();
    frames++;
  }
  return frames;
}
