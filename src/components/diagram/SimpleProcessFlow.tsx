import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  addEdge
} from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';

import type { Variant } from '../../types/Variant';

interface SimpleProcessFlowProps {
  variant: Variant | null;
}

export const SimpleProcessFlow: React.FC<SimpleProcessFlowProps> = ({ variant }) => {
  // Create simple nodes and edges from variant
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!variant) return { initialNodes: [], initialEdges: [] };

    console.log('Creating nodes/edges for variant:', variant.variant_id);

    const nodes: Node[] = variant.sequence.map((state, index) => ({
      id: state,
      type: 'default',
      position: { x: index * 200, y: 100 },
      data: { label: state }
    }));

    const edges: Edge[] = variant.transitions.map((transition) => ({
      id: `${transition.from}-${transition.to}`,
      source: transition.from,
      target: transition.to,
      label: `${transition.count}`
    }));

    console.log('Created nodes:', nodes.length, 'edges:', edges.length);
    return { initialNodes: nodes, initialEdges: edges };
  }, [variant]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when variant changes
  React.useEffect(() => {
    console.log('Updating nodes/edges from effect');
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!variant) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-medium mb-2">Select a Process Variant</h3>
          <p>Choose a variant from the left panel to visualize its process flow</p>
        </div>
      </div>
    );
  }

  console.log('Rendering ReactFlow with nodes:', nodes.length, 'edges:', edges.length);

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-gray-50"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};