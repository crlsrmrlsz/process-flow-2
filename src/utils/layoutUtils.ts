import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';

export interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth: number;
  nodeHeight: number;
  nodeSpacing: number;
  rankSpacing: number;
}

export const defaultLayoutOptions: LayoutOptions = {
  direction: 'TB', // Top to Bottom (vertical flow)
  nodeWidth: 150,
  nodeHeight: 80,
  nodeSpacing: 50,
  rankSpacing: 100
};

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = defaultLayoutOptions
): { nodes: Node[]; edges: Edge[] } {
  // Custom layout for process mining to handle backward edges better
  const customLayoutedNodes = applyProcessMiningLayout(nodes, edges, options);

  if (customLayoutedNodes) {
    return {
      nodes: customLayoutedNodes,
      edges
    };
  }

  // Fallback to standard Dagre layout
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing,
    ranksep: options.rankSpacing,
    marginx: 50,
    marginy: 50
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: options.nodeWidth,
      height: options.nodeHeight
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply layout
  dagre.layout(dagreGraph);

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - options.nodeWidth / 2,
        y: nodeWithPosition.y - options.nodeHeight / 2
      }
    };
  });

  return {
    nodes: layoutedNodes,
    edges
  };
}


// Custom layout function optimized for process mining workflows
function applyProcessMiningLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] | null {
  // Only apply custom layout for permit process nodes
  const permitNodes = [
    'submitted', 'intake_validation', 'assigned_to_reviewer',
    'review_in_progress', 'request_additional_info', 'applicant_provided_info',
    'health_inspection', 'approved', 'rejected', 'withdrawn'
  ];

  const nodeIds = nodes.map(n => n.id);
  const isPermitProcess = permitNodes.some(id => nodeIds.includes(id));

  if (!isPermitProcess) return null;

  // Custom positioning for permit process with extra space for edge labels
  const positions: Record<string, { x: number; y: number }> = {
    'submitted': { x: 300, y: 20 }, // Align with panel tops
    'intake_validation': { x: 300, y: 200 }, // More spacing for labels
    'assigned_to_reviewer': { x: 300, y: 350 }, // More spacing for labels
    'review_in_progress': { x: 300, y: 500 }, // More spacing for labels
    'request_additional_info': { x: 580, y: 650 }, // Move further right and down
    'applicant_provided_info': { x: 580, y: 800 }, // Move further right and down
    'health_inspection': { x: 300, y: 800 }, // Same position as final_review
    'approved': { x: 100, y: 950 }, // Final outcome after health_inspection
    'rejected': { x: 400, y: 950 }, // Final outcome after health_inspection
    'withdrawn': { x: 750, y: 800 } // Directly after request_additional_info, same level as applicant_provided_info
  };

  // Apply custom positions to nodes
  const layoutedNodes = nodes.map(node => {
    const customPos = positions[node.id];
    if (customPos) {
      return {
        ...node,
        position: customPos
      };
    }

    // Fallback positioning for any unknown nodes
    const index = nodes.indexOf(node);
    return {
      ...node,
      position: {
        x: 400 + (index % 3) * 200,
        y: 100 + Math.floor(index / 3) * 150
      }
    };
  });

  return layoutedNodes;
}

export function centerLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Find bounds
  const minX = Math.min(...nodes.map(n => n.position.x));
  const maxX = Math.max(...nodes.map(n => n.position.x + (n.width || 150)));
  const minY = Math.min(...nodes.map(n => n.position.y));
  const maxY = Math.max(...nodes.map(n => n.position.y + (n.height || 80)));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Center the layout
  const centeredNodes = nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x - centerX + 400, // 400 is half of typical diagram width
      y: node.position.y - centerY + 200  // 200 is half of typical diagram height
    }
  }));

  return {
    nodes: centeredNodes,
    edges
  };
}

export function detectOverlaps(nodes: Node[]): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];

      const overlap = !(
        node1.position.x + (node1.width || 150) < node2.position.x ||
        node2.position.x + (node2.width || 150) < node1.position.x ||
        node1.position.y + (node1.height || 80) < node2.position.y ||
        node2.position.y + (node2.height || 80) < node1.position.y
      );

      if (overlap) return true;
    }
  }
  return false;
}

export function saveLayoutToSession(variantId: string, nodes: Node[]) {
  const layoutKey = `process-flow-layout-${variantId}`;
  const positions = nodes.map(node => ({
    id: node.id,
    position: node.position
  }));
  sessionStorage.setItem(layoutKey, JSON.stringify(positions));
}

export function loadLayoutFromSession(variantId: string): Record<string, { x: number; y: number }> | null {
  const layoutKey = `process-flow-layout-${variantId}`;
  const stored = sessionStorage.getItem(layoutKey);

  if (!stored) return null;

  try {
    const positions = JSON.parse(stored) as Array<{ id: string; position: { x: number; y: number } }>;
    const positionMap: Record<string, { x: number; y: number }> = {};

    positions.forEach(({ id, position }) => {
      positionMap[id] = position;
    });

    return positionMap;
  } catch {
    return null;
  }
}