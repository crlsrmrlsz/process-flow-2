export interface Event {
  case_id: string;
  state: string;
  timestamp: string; // ISO8601
  performer: string | null;
}

export interface EventLog {
  events: Event[];
  metadata: {
    generated_at: string;
    total_cases: number;
    seed: number;
  };
}

export interface ProcessCase {
  case_id: string;
  events: Event[];
  sequence: string[];
  start_time: string;
  end_time: string;
  total_duration_hours: number;
}