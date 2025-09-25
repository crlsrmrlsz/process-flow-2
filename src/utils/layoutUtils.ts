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
  nodeSpacing: 40,  // Reduced from 50
  rankSpacing: 70   // Reduced from 100 for shorter edges
};

// Text measurement utility for dynamic node sizing
function measureTextWidth(text: string, fontSize: number = 14, fontFamily: string = 'system-ui, sans-serif'): number {
  // Create a temporary canvas element for accurate text measurement
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    // Fallback: estimate width based on character count
    return text.length * fontSize * 0.6;
  }

  context.font = `${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  return metrics.width;
}

// Calculate optimal node width based on text content
function calculateNodeWidth(nodeLabel: string, minWidth: number = 120, padding: number = 32): number {
  const textWidth = measureTextWidth(nodeLabel, 14, 'system-ui, sans-serif');
  return Math.max(textWidth + padding, minWidth);
}

// Analyze graph complexity for systematic spacing
function analyzeGraphComplexity(nodes: Node[], edges: Edge[]): {
  maxBranchingFactor: number;
  avgBranchingFactor: number;
  maxDepth: number;
  densityFactor: number;
  complexityScore: number;
} {
  // Build adjacency lists
  const outgoing: Record<string, string[]> = {};
  const incoming: Record<string, string[]> = {};

  edges.forEach(edge => {
    if (!outgoing[edge.source]) outgoing[edge.source] = [];
    if (!incoming[edge.target]) incoming[edge.target] = [];
    outgoing[edge.source].push(edge.target);
    incoming[edge.target].push(edge.source);
  });

  // Calculate branching factors
  const branchingFactors = nodes.map(node => outgoing[node.id]?.length || 0);
  const maxBranchingFactor = Math.max(...branchingFactors);
  const avgBranchingFactor = branchingFactors.reduce((sum, bf) => sum + bf, 0) / branchingFactors.length;

  // Calculate maximum depth using BFS
  const roots = nodes.filter(node => !incoming[node.id] || incoming[node.id].length === 0);
  let maxDepth = 0;

  if (roots.length > 0) {
    const visited = new Set<string>();
    const queue: Array<{nodeId: string; depth: number}> = roots.map(root => ({nodeId: root.id, depth: 0}));

    while (queue.length > 0) {
      const {nodeId, depth} = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      maxDepth = Math.max(maxDepth, depth);

      if (outgoing[nodeId]) {
        outgoing[nodeId].forEach(childId => {
          if (!visited.has(childId)) {
            queue.push({nodeId: childId, depth: depth + 1});
          }
        });
      }
    }
  }

  // Calculate density factor (edges / possible edges)
  const maxPossibleEdges = nodes.length * (nodes.length - 1);
  const densityFactor = maxPossibleEdges > 0 ? edges.length / maxPossibleEdges : 0;

  // Calculate overall complexity score
  const complexityScore = (maxBranchingFactor * 0.4) + (maxDepth * 0.3) + (densityFactor * 100 * 0.3);

  return {
    maxBranchingFactor,
    avgBranchingFactor,
    maxDepth,
    densityFactor,
    complexityScore
  };
}

// Advanced systematic spacing calculation based on graph complexity
function calculateOptimalSpacingConfig(
  nodeWidths: number[],
  nodes: Node[],
  edges: Edge[]
): {
  nodesep: number;
  ranksep: number;
  edgesep: number;
} {
  const maxWidth = Math.max(...nodeWidths);
  const avgWidth = nodeWidths.reduce((sum, width) => sum + width, 0) / nodeWidths.length;

  // Analyze graph complexity
  const complexity = analyzeGraphComplexity(nodes, edges);

  // Base spacing calculations - optimized for horizontal layout
  let baseNodeSep = Math.max(maxWidth * 0.4, 80);  // Increased vertical spacing between nodes
  let baseRankSep = Math.max(avgWidth * 0.6, 100); // Increased horizontal spacing between ranks
  let baseEdgeSep = Math.max(avgWidth * 0.15, 15);

  // Apply complexity-based multipliers
  const branchingMultiplier = 1 + (complexity.maxBranchingFactor - 1) * 0.3; // Increase for high branching
  const depthMultiplier = 1 + Math.min(complexity.maxDepth * 0.1, 0.5); // Moderate increase for depth
  const densityMultiplier = 1 + complexity.densityFactor * 2; // Increase for dense graphs

  // Apply systematic spacing adjustments
  const nodesep = baseNodeSep * branchingMultiplier * densityMultiplier;
  const ranksep = baseRankSep * depthMultiplier;
  const edgesep = baseEdgeSep * densityMultiplier;

  // Ensure reasonable bounds - optimized for horizontal layout
  return {
    nodesep: Math.min(Math.max(nodesep, 80), 300), // 80-300px vertical spacing between nodes
    ranksep: Math.min(Math.max(ranksep, 100), 250), // 100-250px horizontal spacing between ranks
    edgesep: Math.min(Math.max(edgesep, 15), 45)   // 15-45px range
  };
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = defaultLayoutOptions
): { nodes: Node[]; edges: Edge[] } {
  // Use standard Dagre layout for systematic positioning
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Calculate dynamic node widths based on text content
  const nodeWidths = nodes.map(node => {
    const label = node.data?.label || node.id;
    return calculateNodeWidth(label);
  });

  // Calculate optimal spacing configuration based on actual node sizes and graph complexity
  const spacingConfig = calculateOptimalSpacingConfig(nodeWidths, nodes, edges);

  dagreGraph.setGraph({
    rankdir: options.direction,
    nodesep: spacingConfig.nodesep,
    ranksep: spacingConfig.ranksep,
    edgesep: spacingConfig.edgesep,
    marginx: 30, // Reduced from 50
    marginy: 30  // Reduced from 50
  });

  // Add nodes to dagre graph with dynamic widths
  nodes.forEach((node, index) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidths[index],
      height: options.nodeHeight
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply layout
  dagre.layout(dagreGraph);

  // Update node positions with dynamic widths
  const layoutedNodes = nodes.map((node, index) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const nodeWidth = nodeWidths[index];

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - options.nodeHeight / 2
      },
      // Store the calculated width in the node data for the component to use
      data: {
        ...node.data,
        calculatedWidth: nodeWidth
      }
    };
  });

  return {
    nodes: layoutedNodes,
    edges
  };
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

// Enhanced overlap detection with detailed information
export function detectOverlaps(nodes: Node[]): {
  hasOverlaps: boolean;
  overlappingPairs: Array<{
    node1: Node;
    node2: Node;
    overlapAmount: { x: number; y: number };
  }>;
} {
  const overlappingPairs: Array<{
    node1: Node;
    node2: Node;
    overlapAmount: { x: number; y: number };
  }> = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];

      // Get node dimensions - use calculated width if available
      const node1Width = node1.data?.calculatedWidth || node1.width || 150;
      const node2Width = node2.data?.calculatedWidth || node2.width || 150;
      const nodeHeight = 80; // Standard height

      // Calculate bounds
      const node1Bounds = {
        left: node1.position.x,
        right: node1.position.x + node1Width,
        top: node1.position.y,
        bottom: node1.position.y + nodeHeight
      };

      const node2Bounds = {
        left: node2.position.x,
        right: node2.position.x + node2Width,
        top: node2.position.y,
        bottom: node2.position.y + nodeHeight
      };

      // Check for overlap
      const hasOverlap = !(
        node1Bounds.right < node2Bounds.left ||
        node2Bounds.right < node1Bounds.left ||
        node1Bounds.bottom < node2Bounds.top ||
        node2Bounds.bottom < node1Bounds.top
      );

      if (hasOverlap) {
        // Calculate overlap amount
        const xOverlap = Math.min(node1Bounds.right, node2Bounds.right) -
                        Math.max(node1Bounds.left, node2Bounds.left);
        const yOverlap = Math.min(node1Bounds.bottom, node2Bounds.bottom) -
                        Math.max(node1Bounds.top, node2Bounds.top);

        overlappingPairs.push({
          node1,
          node2,
          overlapAmount: { x: xOverlap, y: yOverlap }
        });
      }
    }
  }

  return {
    hasOverlaps: overlappingPairs.length > 0,
    overlappingPairs
  };
}

// Layout refinement system that automatically adjusts spacing when overlaps are detected
export function refineLayoutWithOverlapResolution(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = defaultLayoutOptions,
  maxIterations: number = 3
): { nodes: Node[]; edges: Edge[] } {
  let currentLayout = applyDagreLayout(nodes, edges, options);
  let iteration = 0;

  while (iteration < maxIterations) {
    const overlapAnalysis = detectOverlaps(currentLayout.nodes);

    if (!overlapAnalysis.hasOverlaps) {
      // No overlaps found, layout is good
      break;
    }

    // Calculate required spacing adjustment
    const maxXOverlap = Math.max(
      ...overlapAnalysis.overlappingPairs.map(pair => pair.overlapAmount.x)
    );

    // Create new options with increased spacing
    const adjustedOptions: LayoutOptions = {
      ...options,
      nodeSpacing: options.nodeSpacing + maxXOverlap + 20, // Add buffer
      rankSpacing: options.rankSpacing + 20 // Also increase vertical spacing slightly
    };

    // Recalculate layout with adjusted spacing
    currentLayout = applyDagreLayout(nodes, edges, adjustedOptions);
    iteration++;
  }

  return currentLayout;
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