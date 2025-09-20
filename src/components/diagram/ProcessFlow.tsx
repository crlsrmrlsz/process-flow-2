import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel
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
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import type { Variant } from '../../types/Variant';
import { applyDagreLayout, saveLayoutToSession, loadLayoutFromSession, detectOverlaps } from '../../utils/layoutUtils';
import { aggregateVariants, type AggregatedVariant } from '../../utils/variantAggregator';
import { VariantSelectionPanel } from '../variant-panel/VariantSelectionPanel';
import { VARIANT_DEFINITIONS } from '../../constants/permitStates';

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
  onVariantSelect
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasManualLayout, setHasManualLayout] = useState(false);
  const [showHappyPath, setShowHappyPath] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    targetType: 'node' | 'edge' | null;
    targetId: string | null;
    targetData: any;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    targetType: null,
    targetId: null,
    targetData: null
  });

  // Track split transitions
  const [splitTransitions, setSplitTransitions] = useState<Set<string>>(new Set());

  // Generate aggregated variant data
  const aggregatedVariant = useMemo(() => {
    if (!variants || variants.length === 0) return null;
    return aggregateVariants(variants);
  }, [variants]);

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

    // Get happy path sequence for comparison
    const happyPathSequence = VARIANT_DEFINITIONS.happy_path.sequence;

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
      const isHappyPath = happyPathSequence.includes(state);

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
          showHappyPath
        }
      };
    });

    // Create edges for transitions (with performer splitting support)
    const variantEdges: Edge<CustomEdgeData>[] = [];

    // Get happy path transitions for comparison
    const happyPathTransitions = [];
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

      // Check if this transition is split by performer
      if (splitTransitions.has(transitionKey) && transition.performer_breakdown) {
        console.log(`Splitting transition ${transitionKey}:`, transition.performer_breakdown);

        // Create separate edges for each performer
        const performerEntries = Object.entries(transition.performer_breakdown);
        performerEntries.forEach(([performer, perfData], index) => {
          const performerColor = performerColors.get(performer) || '#6B7280';

          console.log(`Creating edge for performer ${performer}:`, perfData);

          // For multiple edges, use different sourceHandle/targetHandle positions
          let sourceHandle = 'bottom';
          let targetHandle = 'top';

          // For multiple performers, spread them across different handle positions
          if (performerEntries.length > 1) {
            const handlePositions = ['bottom-a', 'bottom-b', 'bottom-c', 'bottom-d', 'bottom-e'];
            const targetPositions = ['top-a', 'top-b', 'top-c', 'top-d', 'top-e'];
            sourceHandle = handlePositions[index % handlePositions.length];
            targetHandle = targetPositions[index % targetPositions.length];
          }

          variantEdges.push({
            id: `${transitionKey}-${performer}`,
            source: transition.from,
            target: transition.to,
            sourceHandle,
            targetHandle,
            type: 'custom',
            animated: isBottleneck,
            style: {
              stroke: performerColor,
              strokeWidth: 3
            },
            data: {
              count: perfData.count,
              medianTime: perfData.median_time_hours,
              meanTime: perfData.mean_time_hours,
              isBottleneck,
              contributingVariants: transition.contributing_variants,
              performer, // Add performer info for split edges
              originalTransition: transitionKey,
              performerIndex: index, // Store index for positioning
              totalPerformers: performerEntries.length,
              isHappyPath,
              showHappyPath
            }
          });
        });

        console.log(`Created ${Object.keys(transition.performer_breakdown).length} edges for ${transitionKey}`);
      } else {
        // Create single aggregated edge
        variantEdges.push({
          id: transitionKey,
          source: transition.from,
          target: transition.to,
          type: 'custom',
          animated: isBottleneck,
          data: {
            count: transition.count,
            medianTime: transition.median_time_hours,
            meanTime: transition.mean_time_hours,
            isBottleneck,
            contributingVariants: transition.contributing_variants,
            performer_breakdown: transition.performer_breakdown, // Include for splitting
            isHappyPath,
            showHappyPath
          }
        });
      }
    });

    return {
      initialNodes: variantNodes,
      initialEdges: variantEdges
    };
  }, [aggregatedVariant, bottlenecks, splitTransitions, performerColors]);

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

    // Always apply automatic layout with TB direction for now
    const layouted = applyDagreLayout(initialNodes, initialEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setHasManualLayout(false);
  }, [initialNodes, initialEdges, variants, setNodes, setEdges]);

  // Update node and edge styles when showHappyPath changes (without changing positions)
  useEffect(() => {
    if (nodes.length === 0) return;

    // Update nodes with new showHappyPath state
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          showHappyPath
        }
      }))
    );

    // Update edges with new showHappyPath state
    setEdges(currentEdges =>
      currentEdges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          showHappyPath
        }
      }))
    );
  }, [showHappyPath, setNodes, setEdges]);

  // Handle real-time node dragging for smooth movement
  const onNodeDrag = useCallback(() => {
    // This enables real-time position updates during drag
    // No action needed here as onNodesChange handles the position updates
  }, []);

  // Handle manual node position changes
  const onNodeDragStop = useCallback(() => {
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

  // Reset to automatic layout
  const resetLayout = useCallback(() => {
    if (initialNodes.length > 0) {
      const layouted = applyDagreLayout(initialNodes, initialEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setHasManualLayout(false);

      // Clear saved layout
      if (variants && variants.length > 0) {
        const variantKey = variants.map(v => v.variant_id).sort().join(',');
        sessionStorage.removeItem(`process-flow-layout-${variantKey}`);
      }
    }
  }, [initialNodes, initialEdges, variants, setNodes, setEdges]);

  // Context menu handlers
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY },
      targetType: 'node',
      targetId: node.id,
      targetData: node.data
    });
  }, []);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY },
      targetType: 'edge',
      targetId: edge.id,
      targetData: edge.data
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({
      isVisible: false,
      position: { x: 0, y: 0 },
      targetType: null,
      targetId: null,
      targetData: null
    });
  }, []);

  // Handle splitting by worker
  const handleSplitByWorker = useCallback(() => {
    if (contextMenu.targetType === 'edge' && contextMenu.targetId) {
      const edgeId = contextMenu.targetId;
      const edgeData = contextMenu.targetData as CustomEdgeData;

      // Extract base transition key using the same logic as context menu
      let baseTransitionKey = edgeId;

      if (edgeData?.originalTransition) {
        // This is a split edge, use the original transition key
        baseTransitionKey = edgeData.originalTransition;
      } else {
        // This might be a regular edge, check if it has performer suffix
        const hyphenCount = (edgeId.match(/-/g) || []).length;
        if (hyphenCount >= 2) {
          // Multiple hyphens suggest performer suffix
          baseTransitionKey = edgeId.substring(0, edgeId.lastIndexOf('-'));
        }
      }

      setSplitTransitions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(baseTransitionKey)) {
          // Un-split: remove from split set
          newSet.delete(baseTransitionKey);
        } else {
          // Split: add to split set
          newSet.add(baseTransitionKey);
        }
        return newSet;
      });

      console.log('Toggled worker split for transition:', baseTransitionKey);
    }
  }, [contextMenu]);

  // Generate context menu items based on target
  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu.isVisible) return [];

    if (contextMenu.targetType === 'edge') {
      const edgeData = contextMenu.targetData as CustomEdgeData;

      // Debug logging
      console.log('Context menu for edge:', contextMenu.targetId);
      console.log('Edge data:', edgeData);
      console.log('Performer breakdown:', edgeData?.performer_breakdown);

      // Check if this transition is currently split
      const edgeId = contextMenu.targetId || '';

      // Extract base transition key: for "submitted-intake_validation-clerk_001" -> "submitted-intake_validation"
      // For regular transitions like "submitted-intake_validation" -> keep as is
      let baseTransitionKey = edgeId;

      // If this is a split edge (has performer suffix), extract the base transition
      if (edgeData?.originalTransition) {
        // This is a split edge, use the original transition key
        baseTransitionKey = edgeData.originalTransition;
      } else {
        // This might be a regular edge, check if it has performer suffix
        // State names use underscores, edge separators use hyphens
        // So "submitted-intake_validation-clerk_001" has base "submitted-intake_validation"
        const hyphenCount = (edgeId.match(/-/g) || []).length;
        if (hyphenCount >= 2) {
          // Multiple hyphens suggest performer suffix
          baseTransitionKey = edgeId.substring(0, edgeId.lastIndexOf('-'));
        }
      }

      const isSplit = splitTransitions.has(baseTransitionKey);

      // Determine if splitting is possible:
      // 1. For regular edges: check if they have performer_breakdown
      // 2. For split edges: always allow unsplitting
      const hasPerformers = edgeData?.performer_breakdown &&
        Object.keys(edgeData.performer_breakdown).length > 0;
      const canSplit = hasPerformers || isSplit; // Allow unsplit even without performer_breakdown

      console.log('Edge ID:', edgeId);
      console.log('Base transition key:', baseTransitionKey);
      console.log('Is split:', isSplit);
      console.log('Has performers:', hasPerformers);
      console.log('Can split:', canSplit);
      console.log('Split transitions:', Array.from(splitTransitions));

      return [
        {
          id: 'split-by-worker',
          label: isSplit ? 'Unsplit Workers' : 'Split by Worker',
          icon: isSplit ? '📊' : '👥',
          disabled: !canSplit,
          onClick: handleSplitByWorker
        },
        {
          id: 'view-details',
          label: 'View Details',
          icon: '📊',
          onClick: () => {
            console.log('Edge details:', contextMenu.targetData);
            // TODO: Implement details view
          }
        }
      ];
    }

    if (contextMenu.targetType === 'node') {
      return [
        {
          id: 'view-cases',
          label: 'View Cases',
          icon: '📋',
          onClick: () => {
            console.log('Node cases:', contextMenu.targetData);
            // TODO: Implement cases view
          }
        },
        {
          id: 'highlight-path',
          label: 'Highlight Path',
          icon: '🔍',
          onClick: () => {
            console.log('Highlight path for:', contextMenu.targetId);
            // TODO: Implement path highlighting
          }
        }
      ];
    }

    return [];
  }, [contextMenu, handleSplitByWorker, splitTransitions]);

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-white"
      >
        {/* Clean white background */}
        <Background color="#fafafa" gap={20} size={0.3} />

        {/* Modern controls with design guide styling */}
        <Controls className="bg-white/95 shadow border border-zinc-200 rounded" />


        {/* Happy Path Toggle - Top Left */}
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 9999
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'white',
              border: '2px solid #d1d5db',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="checkbox"
              checked={showHappyPath}
              onChange={(e) => setShowHappyPath(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#22c55e'
              }}
            />
            <span>Show Happy Path</span>
          </label>
        </div>


      </ReactFlow>

      {/* Variant Selection Panel */}
      <VariantSelectionPanel
        variants={allVariants}
        selectedVariants={selectedVariants}
        onVariantSelect={onVariantSelect}
        showHappyPath={showHappyPath}
        onHappyPathToggle={setShowHappyPath}
      />

      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
};