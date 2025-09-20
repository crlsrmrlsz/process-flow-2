export interface ProcessNode {
  id: string;
  type: 'process-node';
  data: {
    label: string;
    count: number;
    isBottleneck: boolean;
  };
  position: { x: number; y: number };
}

export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  type: 'process-edge';
  data: {
    count: number;
    median_time_hours: number;
    mean_time_hours: number;
    thickness: number;
    performer_breakdown?: Record<string, {
      count: number;
      median_time_hours: number;
    }>;
  };
  animated?: boolean;
}