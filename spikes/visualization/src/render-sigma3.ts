// Same renderer on Sigma 3 (stable since 2024-12), to weigh the brand-new v4 against the established API.
import Graph from 'graphology';
import Sigma from 'sigma3';
import type { View } from './data';
import { animate, type Handlers, nextFrame, type Renderer } from './renderer';

export function createSigma3Renderer(): Renderer {
  let sigma: Sigma | undefined;
  let graph: Graph | undefined;
  let highlighted: Set<string> | null = null;
  let frames = 0;

  return {
    async mount(container, view: View, handlers: Handlers) {
      graph = new Graph({ type: 'directed', multi: false });
      const maxWeight = Math.max(1, ...view.edges.map((e) => e.weight));
      for (const n of view.nodes) {
        graph.addNode(n.id, { x: n.x, y: n.y, size: n.size, color: n.color, label: n.label, forceLabel: n.id === view.focus });
      }
      for (const e of view.edges) {
        if (graph.hasEdge(e.source, e.target)) continue;
        const size = view.scenario === 'projects' ? 0.5 + (5.5 * Math.log1p(e.weight)) / Math.log1p(maxWeight) : 0.6;
        graph.addEdgeWithKey(e.id, e.source, e.target, { size, color: '#94a3b8', type: view.directed ? 'arrow' : 'line' });
      }

      sigma = new Sigma(graph, container, {
        labelRenderedSizeThreshold: view.showAllLabels ? 0 : 8,
        labelDensity: view.showAllLabels ? 1 : 0.1,
        nodeReducer: (node, data) =>
          highlighted && !highlighted.has(node) ? { ...data, color: '#e2e8f0', label: '' } : highlighted ? { ...data, forceLabel: true } : data,
        edgeReducer: (edge, data) => {
          if (!highlighted) return data;
          const inside = highlighted.has(graph!.source(edge)) && highlighted.has(graph!.target(edge));
          return { ...data, color: inside ? '#334155' : '#f1f5f9' };
        },
      });
      sigma.on('afterRender', () => frames++);
      sigma.on('clickNode', ({ node }) => handlers.onNodeClick(node));
      sigma.on('enterNode', ({ node }) => handlers.onNodeHover(node));
      sigma.on('leaveNode', () => handlers.onNodeHover(null));
      await nextFrame();
      await nextFrame();
    },

    highlight(ids) {
      highlighted = ids;
      sigma?.refresh({ skipIndexation: true });
    },

    async benchmark(ms) {
      const camera = sigma!.getCamera();
      const start = frames;
      const delivered = await animate(ms, (t) => {
        camera.setState({ x: 0.5 + 0.2 * Math.sin(t * 6), y: 0.5 + 0.2 * Math.cos(t * 4), ratio: 0.4 + (0.5 * (1 + Math.sin(t * 5))) / 2 });
      });
      camera.setState({ x: 0.5, y: 0.5, ratio: 1 });
      return { frames: delivered, drawn: frames - start };
    },

    destroy() {
      sigma?.kill();
      sigma = undefined;
      graph = undefined;
      highlighted = null;
    },
  };
}
