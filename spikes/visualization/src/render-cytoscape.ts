import cytoscape from 'cytoscape';
import type { View } from './data';
import { animate, type Handlers, nextFrame, type Renderer } from './renderer';

export function createCytoscapeRenderer(webgl: boolean): Renderer {
  let cy: cytoscape.Core | undefined;
  let frames = 0;

  return {
    async mount(container, view: View, handlers: Handlers) {
      // Cytoscape sizes are in model units: scale them to the spread of the positions so nodes stay visible after fit.
      const xs = view.nodes.map((n) => n.x);
      const ys = view.nodes.map((n) => n.y);
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
      const unit = extent / 700;
      const big = view.edges.length > 3000;

      cy = cytoscape({
        container,
        elements: {
          nodes: view.nodes.map((n) => ({
            data: { id: n.id, label: n.label, color: n.color, size: n.size * unit * 1.6 },
            position: { x: n.x, y: n.y },
          })),
          edges: view.edges.map((e) => ({ data: { id: e.id, source: e.source, target: e.target, weight: e.weight } })),
        },
        layout: { name: 'preset', fit: true, padding: 20 },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              width: 'data(size)',
              height: 'data(size)',
              label: view.showAllLabels ? 'data(label)' : '',
              'font-size': unit * 10,
              'min-zoomed-font-size': 8,
              color: '#0f172a',
              'text-valign': 'center',
              'text-halign': 'right',
              'text-margin-x': unit * 4,
            },
          },
          {
            selector: 'edge',
            style: {
              width: view.scenario === 'projects' ? `mapData(weight, 1, 4000, ${unit * 0.6}, ${unit * 6})` : unit * 0.6,
              'line-color': '#94a3b8',
              'curve-style': big ? 'haystack' : 'straight',
              'target-arrow-shape': view.directed && !big ? 'triangle' : 'none',
              'target-arrow-color': '#94a3b8',
              'arrow-scale': 0.6,
            },
          },
          { selector: '.faded', style: { 'background-color': '#e2e8f0', 'line-color': '#f1f5f9', 'target-arrow-color': '#f1f5f9', label: '' } },
          { selector: 'node.hl', style: { label: 'data(label)' } },
          { selector: 'edge.hl', style: { 'line-color': '#334155', 'target-arrow-color': '#334155' } },
        ],
        // The WebGL renderer is an option of the canvas renderer (Cytoscape >= 3.31).
        renderer: { name: 'canvas', webgl } as never,
        pixelRatio: 'auto',
      } as cytoscape.CytoscapeOptions);

      cy.on('render', () => frames++);
      cy.on('tap', 'node', (event) => handlers.onNodeClick(event.target.id()));
      cy.on('mouseover', 'node', (event) => handlers.onNodeHover(event.target.id()));
      cy.on('mouseout', 'node', () => handlers.onNodeHover(null));
      await nextFrame();
      await nextFrame();
    },

    highlight(ids) {
      if (!cy) return;
      cy.batch(() => {
        cy!.elements().removeClass('faded hl');
        if (!ids) return;
        cy!.nodes().forEach((n) => {
          n.addClass(ids.has(n.id()) ? 'hl' : 'faded');
        });
        cy!.edges().forEach((e) => {
          e.addClass(ids.has(e.source().id()) && ids.has(e.target().id()) ? 'hl' : 'faded');
        });
      });
    },

    async benchmark(ms) {
      const core = cy!;
      const start = frames;
      const zoom = core.zoom();
      const pan = { ...core.pan() }; // cy.pan() returns the live object
      const { w, h } = { w: core.width(), h: core.height() };
      const delivered = await animate(ms, (t) => {
        const ratio = 0.4 + (0.5 * (1 + Math.sin(t * 5))) / 2;
        core.viewport({
          zoom: zoom / ratio,
          pan: { x: pan.x + w * 0.2 * Math.sin(t * 6) - (w / 2) * (1 / ratio - 1), y: pan.y + h * 0.2 * Math.cos(t * 4) - (h / 2) * (1 / ratio - 1) },
        });
      });
      core.viewport({ zoom, pan });
      return { frames: delivered, drawn: webgl ? null : frames - start };
    },

    destroy() {
      cy?.destroy();
      cy = undefined;
    },
  };
}
