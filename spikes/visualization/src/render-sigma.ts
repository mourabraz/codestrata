import Graph from 'graphology';
import Sigma from 'sigma';
import { extremityArrow, pathLine } from 'sigma/rendering';
import type { View } from './data';
import { animate, type Handlers, nextFrame, type Renderer } from './renderer';

export function createSigmaRenderer(): Renderer {
  let sigma: Sigma | undefined;
  let graph: Graph | undefined;
  let frames = 0;

  return {
    async mount(container, view: View, handlers: Handlers) {
      graph = new Graph({ type: 'directed', multi: false });
      for (const n of view.nodes) graph.addNode(n.id, { x: n.x, y: n.y, size: n.size, color: n.color, label: n.label, focus: n.id === view.focus });
      for (const e of view.edges) if (!graph.hasEdge(e.source, e.target)) graph.addEdgeWithKey(e.id, e.source, e.target, { weight: e.weight });

      const edgeSize = view.scenario === 'projects' ? { attribute: 'weight', minValue: 1, maxValue: 4000, min: 0.5, max: 6 } : 0.6;
      sigma = new Sigma(graph, container, {
        primitives: view.directed ? { edges: { paths: [pathLine()], extremities: [extremityArrow()] } } : undefined,
        styles: {
          nodes: [
            {
              x: { attribute: 'x' },
              y: { attribute: 'y' },
              size: { attribute: 'size' },
              color: { attribute: 'color' },
              label: { attribute: 'label' },
              // 'auto' lets sigma drop labels that would overlap (label grid); the focused node always keeps its label.
              labelVisibility: 'auto',
            },
            { whenData: { focus: true }, then: { labelVisibility: 'visible' } },
            { when: (_a, state, graphState) => graphState.hasHighlighted && !state.isHighlighted, then: { color: '#e2e8f0', labelVisibility: 'hidden' } },
            { whenState: 'isHighlighted', then: { labelVisibility: 'visible' } },
          ],
          edges: [
            { color: '#94a3b8', size: edgeSize, ...(view.directed ? { head: 'arrow' } : {}) },
            { when: (_a, state, graphState) => graphState.hasHighlighted && !state.isHighlighted, then: { color: '#f1f5f9' } },
            { whenState: 'isHighlighted', then: { color: '#334155' } },
          ],
        },
        settings: {
          hideEdgesOnMove: false,
          itemSizesReference: 'screen', // sizes in screen pixels, whatever the spread of the positions
          labelRenderedSizeThreshold: view.showAllLabels ? 0 : 8,
          labelDensity: view.showAllLabels ? 1 : 0.1,
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
      if (!sigma || !graph) return;
      const nodes = graph.nodes();
      sigma.setNodesState(nodes, { isHighlighted: false });
      sigma.setEdgesState(graph.edges(), { isHighlighted: false });
      if (ids) {
        sigma.setNodesState([...ids], { isHighlighted: true });
        sigma.setEdgesState(
          graph.edges().filter((e) => ids.has(graph!.source(e)) && ids.has(graph!.target(e))),
          { isHighlighted: true },
        );
      }
      sigma.setGraphState({ hasHighlighted: ids !== null });
    },

    async benchmark(ms) {
      const camera = sigma!.getCamera();
      const start = frames;
      const delivered = await animate(ms, (t) => {
        camera.setState({ x: 0.5 + 0.2 * Math.sin(t * 6), y: 0.5 + 0.2 * Math.cos(t * 4), ratio: 0.4 + 0.5 * (1 + Math.sin(t * 5)) / 2 });
      });
      camera.setState({ x: 0.5, y: 0.5, ratio: 1 });
      return { frames: delivered, drawn: frames - start };
    },

    destroy() {
      sigma?.kill();
      sigma = undefined;
      graph = undefined;
    },
  };
}
