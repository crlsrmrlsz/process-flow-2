export interface DFGEdge {
  from: string;
  to: string;
  count: number;
  cases: string[];
  durations: number[]; // hours
  performers: string[];
}

export interface DFGNode {
  activity: string;
  frequency: number;
  cases: Set<string>;
  incomingEdges: DFGEdge[];
  outgoingEdges: DFGEdge[];
}

export interface DirectlyFollowsGraph {
  nodes: Map<string, DFGNode>;
  edges: DFGEdge[];
  totalCases: number;
  startActivities: string[];
  endActivities: string[];
}