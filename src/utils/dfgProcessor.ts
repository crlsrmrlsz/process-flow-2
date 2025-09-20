import type { ProcessCase } from '../types/EventLog';
import type { DirectlyFollowsGraph, DFGNode, DFGEdge } from '../types/DFG';

export function buildDirectlyFollowsGraph(cases: ProcessCase[]): DirectlyFollowsGraph {
  const nodes = new Map<string, DFGNode>();
  const edgeMap = new Map<string, DFGEdge>();
  const startActivities = new Set<string>();
  const endActivities = new Set<string>();

  // Initialize nodes and collect start/end activities
  for (const processCase of cases) {
    if (processCase.sequence.length === 0) continue;

    startActivities.add(processCase.sequence[0]);
    endActivities.add(processCase.sequence[processCase.sequence.length - 1]);

    for (const activity of processCase.sequence) {
      if (!nodes.has(activity)) {
        nodes.set(activity, {
          activity,
          frequency: 0,
          cases: new Set(),
          incomingEdges: [],
          outgoingEdges: []
        });
      }

      const node = nodes.get(activity)!;
      node.frequency++;
      node.cases.add(processCase.case_id);
    }
  }

  // Build edges from directly-follows relationships
  for (const processCase of cases) {
    const { sequence, events, case_id } = processCase;

    for (let i = 0; i < sequence.length - 1; i++) {
      const from = sequence[i];
      const to = sequence[i + 1];
      const edgeKey = `${from}->${to}`;

      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from,
          to,
          count: 0,
          cases: [],
          durations: [],
          performers: []
        });
      }

      const edge = edgeMap.get(edgeKey)!;
      edge.count++;
      edge.cases.push(case_id);

      // Calculate transition duration
      const fromEvent = events.find(e => e.state === from);
      const toEvent = events.find(e => e.state === to);

      if (fromEvent && toEvent) {
        const durationHours = (new Date(toEvent.timestamp).getTime() - new Date(fromEvent.timestamp).getTime()) / (1000 * 60 * 60);
        edge.durations.push(durationHours);
      }

      // Collect performer information
      const toEventPerformer = events.find(e => e.state === to)?.performer;
      if (toEventPerformer && !edge.performers.includes(toEventPerformer)) {
        edge.performers.push(toEventPerformer);
      }
    }
  }

  // Link edges to nodes
  const edges = Array.from(edgeMap.values());
  for (const edge of edges) {
    const fromNode = nodes.get(edge.from)!;
    const toNode = nodes.get(edge.to)!;

    fromNode.outgoingEdges.push(edge);
    toNode.incomingEdges.push(edge);
  }

  return {
    nodes,
    edges,
    totalCases: cases.length,
    startActivities: Array.from(startActivities),
    endActivities: Array.from(endActivities)
  };
}

export function validateDFGConsistency(dfg: DirectlyFollowsGraph): {
  isConsistent: boolean;
  errors: string[];
  nodeChecks: Record<string, { incoming: number; outgoing: number; isBalanced: boolean }>;
} {
  const errors: string[] = [];
  const nodeChecks: Record<string, { incoming: number; outgoing: number; isBalanced: boolean }> = {};

  for (const [activity, node] of dfg.nodes) {
    const incomingCount = node.incomingEdges.reduce((sum, edge) => sum + edge.count, 0);
    const outgoingCount = node.outgoingEdges.reduce((sum, edge) => sum + edge.count, 0);

    // For start activities, incoming should be 0
    // For end activities, outgoing should be 0
    // For intermediate activities, incoming should equal outgoing
    let isBalanced = false;
    let expectedBalance = '';

    if (dfg.startActivities.includes(activity) && dfg.endActivities.includes(activity)) {
      // Activity that is both start and end (single-activity cases)
      isBalanced = true;
      expectedBalance = 'start/end activity';
    } else if (dfg.startActivities.includes(activity)) {
      isBalanced = incomingCount === 0;
      expectedBalance = 'start activity (incoming = 0)';
    } else if (dfg.endActivities.includes(activity)) {
      isBalanced = outgoingCount === 0;
      expectedBalance = 'end activity (outgoing = 0)';
    } else {
      isBalanced = incomingCount === outgoingCount;
      expectedBalance = 'intermediate activity (incoming = outgoing)';
    }

    nodeChecks[activity] = {
      incoming: incomingCount,
      outgoing: outgoingCount,
      isBalanced
    };

    if (!isBalanced) {
      errors.push(`Activity "${activity}" is unbalanced (${expectedBalance}): incoming=${incomingCount}, outgoing=${outgoingCount}`);
    }
  }

  return {
    isConsistent: errors.length === 0,
    errors,
    nodeChecks
  };
}

export function getDFGStatistics(dfg: DirectlyFollowsGraph) {
  const totalTransitions = dfg.edges.reduce((sum, edge) => sum + edge.count, 0);
  const averagePathLength = totalTransitions / dfg.totalCases;

  const edgeFrequencies = dfg.edges.map(edge => edge.count).sort((a, b) => b - a);
  const mostFrequentEdge = dfg.edges.find(edge => edge.count === edgeFrequencies[0]);

  const nodeFrequencies = Array.from(dfg.nodes.values()).map(node => node.frequency).sort((a, b) => b - a);
  const mostFrequentActivity = Array.from(dfg.nodes.values()).find(node => node.frequency === nodeFrequencies[0]);

  return {
    totalActivities: dfg.nodes.size,
    totalTransitions: dfg.edges.length,
    totalTransitionInstances: totalTransitions,
    averagePathLength,
    mostFrequentEdge: mostFrequentEdge ? `${mostFrequentEdge.from} → ${mostFrequentEdge.to}` : null,
    mostFrequentActivity: mostFrequentActivity?.activity || null,
    startActivities: dfg.startActivities,
    endActivities: dfg.endActivities
  };
}