import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import type {
  Node,
  Edge,
  Connection,
  NodeTypes,
  EdgeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './CustomEdge';
import type { Variant } from '../../types/Variant';
import { applyDagreLayout, refineLayoutWithOverlapResolution, saveLayoutToSession, loadLayoutFromSession, detectOverlaps } from '../../utils/layoutUtils';
import { aggregateVariants, type AggregatedVariant, type TotalFlowData } from '../../utils/variantAggregator';
import { VariantSelectionPanel } from '../variant-panel/VariantSelectionPanel';
import { HAPPY_PATH_CONFIG } from '../../constants/permitStates';

interface ProcessFlowProps {
  variant: Variant[] | null;
  bottlenecks: Array<{
    type: 'transition' | 'performer';
    identifier: string;
    score: number;
  }>;
  variants: Variant[];
  selectedVariants: string[];
  onVariantSelect: (variantId: string) => void;
  showHappyPath: boolean;
  showBottlenecks: boolean;
  onResetLayout?: () => void;
  resetLayoutTrigger?: number;
  totalFlowData?: TotalFlowData | null;
}

const nodeTypes: NodeTypes = {
  custom: CustomNode
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge
};

export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  variant: variants,
  bottlenecks,
  variants: allVariants,
  selectedVariants,
  onVariantSelect,
  showHappyPath,
  showBottlenecks,
  onResetLayout,
  resetLayoutTrigger,
  totalFlowData
}) => {
  const [nodes, setNodes, onNodesChangeOriginal] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasManualLayout, setHasManualLayout] = useState(false);

  // Add missing refs for drag tracking
  const isDragging = useRef(false);
  const dragUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const isStyleUpdate = useRef(false);

  // Drag sensitivity factor - makes nodes feel "heavier"
  const DRAG_SENSITIVITY = 0.7; // Reduce to 70% of normal speed

  // Custom onNodesChange that preserves positions during style updates
  const onNodesChange = useCallback((changes: any[]) => {
    // If we're in the middle of a style update, preserve positions
    if (isStyleUpdate.current) {
      // Filter out position changes during style updates
      const filteredChanges = changes.filter(change =>
        change.type !== 'position' || change.dragging
      );
      onNodesChangeOriginal(filteredChanges);
    } else {
      // Normal operation - allow all changes
      onNodesChangeOriginal(changes);
    }
  }, [onNodesChangeOriginal]);



  // Generate aggregated variant data with total flow data for topology vs volume separation
  const aggregatedVariant = useMemo(() => {
    if (!variants || variants.length === 0) return null;
    return aggregateVariants(variants, totalFlowData || undefined);
  }, [variants, totalFlowData]);

  // Generate performer colors
  const performerColors = useMemo(() => {
    if (!aggregatedVariant) return new Map<string, string>();

    const allPerformers = new Set<string>();
    aggregatedVariant.transitions.forEach(transition => {
      Object.keys(transition.performer_breakdown || {}).forEach(performer => {
        allPerformers.add(performer);
      });
    });

    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
    ];

    const colorMap = new Map<string, string>();
    Array.from(allPerformers).forEach((performer, index) => {
      colorMap.set(performer, colors[index % colors.length]);
    });

    return colorMap;
  }, [aggregatedVariant]);

  // Generate nodes and edges from aggregated variant data
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!aggregatedVariant) return { initialNodes: [], initialEdges: [] };

    // Get happy path sequence for comparison (now decoupled from specific variant)
    const happyPathSequence = HAPPY_PATH_CONFIG.sequence;

    // Create nodes for each state in the aggregated sequence
    const variantNodes: Node<CustomNodeData>[] = aggregatedVariant.sequence.map((state, index) => {
      // Find bottlenecks for this state
      const isBottleneck = bottlenecks.some(b =>
        b.type === 'transition' && b.identifier.includes(state)
      );

      // FIX: Determine start/end states from transition graph, not sequence position
      const incomingTransitions = aggregatedVariant.transitions.filter(t => t.to === state);
      const outgoingTransitions = aggregatedVariant.transitions.filter(t => t.from === state);

      const isStart = incomingTransitions.length === 0; // No incoming transitions = start state
      const isEnd = outgoingTransitions.length === 0;   // No outgoing transitions = end state

      // FIX: Use proper state occupancy instead of summing transitions (which double-counts loops)
      const stateOccupancy = aggregatedVariant.state_occupancy.find(so => so.state === state);
      const count = stateOccupancy ? stateOccupancy.unique_case_count : 0;

      // Check if this state is part of the happy path
      const isHappyPath = happyPathSequence.includes(state as any);

      return {
        id: state,
        type: 'custom',
        position: { x: index * 200, y: 100 }, // Default positions
        data: {
          label: state,
          count,
          isBottleneck,
          isStart,
          isEnd,
          isHappyPath,
          showHappyPath: false // Will be set by useEffect to avoid layout reset
        }
      };
    });

    // Create edges for transitions (with performer splitting support)
    const variantEdges: Edge<CustomEdgeData>[] = [];

    // Get happy path transitions for comparison
    const happyPathTransitions: string[] = [];
    for (let i = 0; i < happyPathSequence.length - 1; i++) {
      happyPathTransitions.push(`${happyPathSequence[i]}-${happyPathSequence[i + 1]}`);
    }

    aggregatedVariant.transitions.forEach((transition) => {
      const transitionKey = `${transition.from}-${transition.to}`;
      const isBottleneck = bottlenecks.some(b =>
        b.type === 'transition' && b.identifier === `${transition.from} → ${transition.to}`
      );

      // Check if this transition is part of the happy path
      const isHappyPath = happyPathTransitions.includes(transitionKey);

      // Handle selection for horizontal flow
      let sourceHandle = 'right'; // Default: exit from right
      let targetHandle = 'left';   // Default: enter from left

      // For horizontal flow, edges naturally flow from left to right
      // ReactFlow will handle edge routing with the actual node positions after layout

      // Create single aggregated edge with smart handle selection
      variantEdges.push({
          id: transitionKey,
          source: transition.from,
          target: transition.to,
          sourceHandle,
          targetHandle,
          type: 'custom',
          animated: false, // Will be set by useEffect to avoid layout reset
          data: {
            count: transition.count,
            medianTime: transition.median_time_hours,
            meanTime: transition.mean_time_hours,
            isBottleneck,
            contributingVariants: transition.contributing_variants,
            performer_breakdown: transition.performer_breakdown, // Include for splitting
            isHappyPath,
            showHappyPath: false, // Will be set by useEffect to avoid layout reset
            showBottlenecks: false // Will be set by useEffect to avoid layout reset
          }
    });
  });

    return {
      initialNodes: variantNodes,
      initialEdges: variantEdges
    };
  }, [aggregatedVariant, bottlenecks, performerColors]);

  // Apply layout when variant changes
  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      setHasManualLayout(false);
      return;
    }

    // FORCE vertical layout - clear any cached horizontal layouts
    const variantKey = variants && variants.length > 0 ? variants.map(v => v.variant_id).sort().join(',') : null;

    // Clear old horizontal layout cache
    if (variantKey) {
      sessionStorage.removeItem(`process-flow-layout-${variantKey}`);
    }

    // Apply refined layout with automatic overlap resolution
    const layouted = refineLayoutWithOverlapResolution(initialNodes, initialEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setHasManualLayout(false);

    // Fit view after layout is applied to ensure all nodes are visible
    setTimeout(() => {
      if (fitViewRef.current) {
        fitViewRef.current();
      }
    }, 100);
  }, [variants]); // Only reset layout when variants actually change, not on styling updates

  // Update node and edge styles when showHappyPath or showBottlenecks changes (without changing positions)
  useEffect(() => {
    if (nodes.length === 0) return;

    // Mark that we're doing a style update to prevent position resets
    isStyleUpdate.current = true;

    // Update nodes with new showHappyPath state (onNodesChange will filter position changes)
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          showHappyPath
        }
      }))
    );

    // Update edges with new showHappyPath and showBottlenecks state
    setEdges(currentEdges =>
      currentEdges.map(edge => ({
        ...edge,
        animated: showBottlenecks && edge.data?.isBottleneck, // Set animation here to avoid layout reset
        data: {
          ...edge.data,
          showHappyPath,
          showBottlenecks
        }
      }))
    );

    // Clear the style update flag after React has processed the changes
    setTimeout(() => {
      isStyleUpdate.current = false;
    }, 0);
  }, [showHappyPath, showBottlenecks, setNodes, setEdges]);

  // Custom drag handler with reduced sensitivity for "heavier" feel
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);
  const [nodeStartPos, setNodeStartPos] = useState<{ [nodeId: string]: { x: number; y: number } }>({});

  const onNodeDragStart = useCallback((event: any, node: any) => {
    isDragging.current = true;
    setLastMousePos({ x: event.clientX, y: event.clientY });
    setNodeStartPos(prev => ({
      ...prev,
      [node.id]: { x: node.position.x, y: node.position.y }
    }));
  }, []);

  const onNodeDrag = useCallback((event: any, node: any) => {
    if (!lastMousePos || !nodeStartPos[node.id]) return;

    // Calculate mouse movement delta
    const mouseDeltaX = event.clientX - lastMousePos.x;
    const mouseDeltaY = event.clientY - lastMousePos.y;

    // Apply sensitivity factor to make nodes feel heavier
    const scaledDeltaX = mouseDeltaX * DRAG_SENSITIVITY;
    const scaledDeltaY = mouseDeltaY * DRAG_SENSITIVITY;

    // Calculate new position based on start position + scaled delta
    const newX = nodeStartPos[node.id].x + scaledDeltaX;
    const newY = nodeStartPos[node.id].y + scaledDeltaY;

    // Update node position with reduced sensitivity
    setNodes(currentNodes =>
      currentNodes.map(n =>
        n.id === node.id
          ? { ...n, position: { x: newX, y: newY } }
          : n
      )
    );
  }, [lastMousePos, nodeStartPos, DRAG_SENSITIVITY, setNodes]);

  // Handle manual node position changes
  const onNodeDragStop = useCallback(() => {
    isDragging.current = false;

    // Clear drag tracking state
    setLastMousePos(null);
    setNodeStartPos({});

    // Clear any pending timer
    if (dragUpdateTimer.current) {
      clearTimeout(dragUpdateTimer.current);
      dragUpdateTimer.current = null;
    }

    if (variants && variants.length > 0) {
      const variantKey = variants.map(v => v.variant_id).sort().join(',');
      saveLayoutToSession(variantKey, nodes);
      setHasManualLayout(true);
    }
  }, [nodes, variants]);

  // Handle new connections (if needed in future)
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Ref to store fitView function from inner component
  const fitViewRef = useRef<(() => void) | null>(null);

  // Internal reset function without callback
  const doResetLayout = useCallback(() => {
    if (initialNodes.length > 0) {
      const layouted = refineLayoutWithOverlapResolution(initialNodes, initialEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setHasManualLayout(false);

      // Clear saved layout
      if (variants && variants.length > 0) {
        const variantKey = variants.map(v => v.variant_id).sort().join(',');
        sessionStorage.removeItem(`process-flow-layout-${variantKey}`);
      }

      // Fit view after layout reset
      setTimeout(() => {
        if (fitViewRef.current) {
          fitViewRef.current();
        }
      }, 100); // Small delay to ensure nodes are rendered
    }
  }, [initialNodes, initialEdges, variants, setNodes, setEdges]);

  // Reset to automatic layout (with callback for external use)
  const resetLayout = useCallback(() => {
    doResetLayout();

    // Call external callback if provided
    if (onResetLayout) {
      onResetLayout();
    }
  }, [doResetLayout, onResetLayout]);

  // Watch for reset layout trigger from parent
  useEffect(() => {
    if (resetLayoutTrigger && resetLayoutTrigger > 0) {
      console.log('Reset layout triggered, calling internal reset function');
      doResetLayout(); // Use internal function to avoid callback loop
    }
  }, [resetLayoutTrigger, doResetLayout]);




  // Check for overlapping nodes
  const hasOverlaps = useMemo(() => detectOverlaps(nodes), [nodes]);

  if (!variants || variants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-medium mb-2">Select Process Variants</h3>
          <p>Choose one or more variants from the left panel to visualize their combined process flow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ReactFlowProvider>
        <ProcessFlowInner
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitViewRef={fitViewRef}
        />
      </ReactFlowProvider>
    </div>
  );
};

// Inner component that uses ReactFlow hooks
const ProcessFlowInner: React.FC<{
  nodes: any[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onNodeDragStart: any;
  onNodeDrag: any;
  onNodeDragStop: any;
  nodeTypes: any;
  edgeTypes: any;
  fitViewRef: any;
}> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  nodeTypes,
  edgeTypes,
  fitViewRef
}) => {
  const reactFlowInstance = useReactFlow();

  // Set up custom fitView function that aligns top node with Happy Path button
  useEffect(() => {
    fitViewRef.current = () => {
      const nodes = reactFlowInstance.getNodes();
      if (nodes.length === 0) return;

      // Find the topmost node (first node in the flow)
      const topNode = nodes.reduce((top, node) =>
        node.position.y < top.position.y ? node : top
      );

      // Calculate bounds of all nodes including labels
      const bounds = {
        minX: Math.min(...nodes.map(n => n.position.x)),
        maxX: Math.max(...nodes.map(n => n.position.x + (n.width || 150))),
        minY: Math.min(...nodes.map(n => n.position.y)),
        maxY: Math.max(...nodes.map(n => n.position.y + (n.height || 80) + 60)) // +60 for final node labels
      };

      const viewport = reactFlowInstance.getViewport();
      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();

      if (!reactFlowBounds) return;

      // Calculate zoom to fit content with padding
      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;
      const padding = 40;

      const zoomX = (reactFlowBounds.width - padding * 2) / contentWidth;
      const zoomY = (reactFlowBounds.height - padding * 2) / contentHeight;
      const zoom = Math.min(zoomX, zoomY, 1.5); // Cap at 1.5x

      // Position so top node aligns with Happy Path button (around y=40)
      const targetTopNodeY = 40;
      const currentTopNodeY = topNode.position.y;

      const x = reactFlowBounds.width / 2 - (bounds.minX + contentWidth / 2) * zoom;
      const y = targetTopNodeY - currentTopNodeY * zoom;

      reactFlowInstance.setViewport({ x, y, zoom }, { duration: 300 });
    };
  }, [reactFlowInstance, fitViewRef]);

  // Enhanced node drag handler without fitView to prevent flicker
  const handleNodeDrag = useCallback((event: any, node: any) => {
    // Call original handler
    onNodeDrag(event, node);
  }, [onNodeDrag]);
  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-white"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        snapToGrid={false}
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        elevateNodesOnSelect={true}
        elevateEdgesOnSelect={true}
      >
        {/* Clean white background */}
        <Background color="#fafafa" gap={20} size={0.3} />
      </ReactFlow>

    </>
  );
};