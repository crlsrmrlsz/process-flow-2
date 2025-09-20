export interface Transition {
  from: string;
  to: string;
  count: number;
  median_time_hours: number;
  mean_time_hours: number;
  percentile_95_hours: number;
  performer_breakdown: Record<string, {
    count: number;
    median_time_hours: number;
    mean_time_hours: number;
  }>;
}

export interface StateOccupancy {
  state: string;
  unique_case_count: number;
  unique_cases: string[];
}

export interface Variant {
  variant_id: string;
  sequence: string[];
  case_count: number;
  cases: string[];
  transitions: Transition[];
  state_occupancy: StateOccupancy[];  // NEW: Track unique cases per state
  total_median_hours: number;
  total_mean_hours: number;
  total_percentile_95_hours: number;
}

export interface ConservationCheck {
  node: string;
  variant: string;
  incoming_count: number;
  outgoing_counts: Record<string, number>;
  total_outgoing: number;
  is_balanced: boolean;
  error_message: string | null;
}