// Layered (left → right) layout for ego views: dependents on the left, dependencies on the right.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { View } from './data';

const elk = new ELK();

export async function layoutLayered(view: View): Promise<void> {
  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '220',
      'elk.spacing.nodeNode': '14',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: view.nodes.map((n) => ({ id: n.id, width: 12, height: 12 })),
    edges: view.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const position = new Map((result.children ?? []).map((c) => [c.id, c]));
  for (const node of view.nodes) {
    const p = position.get(node.id);
    node.x = p?.x ?? 0;
    node.y = p?.y ?? 0;
  }
}
