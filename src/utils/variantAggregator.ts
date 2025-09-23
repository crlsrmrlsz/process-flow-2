import type { Variant, StateOccupancy } from '../types/Variant';
import type { ProcessCase } from '../types/EventLog';

export interface AggregatedStateOccupancy {
  state: string;
  unique_case_count: number;
  unique_cases: string[];
  contributing_variants: Array<{
    variant_id: string;
    unique_case_count: number;
    unique_cases: string[];
  }>;
}

export interface TotalFlowData {
  transitions: Map<string, {
    count: number;
    times: number[];
    performer_data: Map<string, number[]>;
    cases: Set<string>; // Track which cases used this transition
  }>;
  state_occupancy: Map<string, {
    cases: Set<string>;
    unique_case_count: number;
  }>;
}

export interface AggregatedVariant {
  variant_ids: string[];
  sequence: string[];
  total_case_count: number;
  state_occupancy: AggregatedStateOccupancy[]; // NEW: Properly aggregated state occupancy
  transitions: Array<{
    from: string;
    to: string;
    count: number;
    median_time_hours: number;
    mean_time_hours: number;
    percentile_95_hours: number;
    performer_breakdown: Record<string, { count: number; median_time_hours: number; mean_time_hours: number }>;
    contributing_variants: Array<{
      variant_id: string;
      count: number;
      median_time_hours: number;
    }>;
  }>;
  total_median_hours: number;
  total_mean_hours: number;
  total_percentile_95_hours: number;
}

// Calculate total flow data from ALL individual cases
export function calculateTotalFlow(cases: ProcessCase[]): TotalFlowData {
  const transitions = new Map<string, {
    count: number;
    times: number[];
    performer_data: Map<string, number[]>;
    cases: Set<string>;
  }>();

  const state_occupancy = new Map<string, {
    cases: Set<string>;
    unique_case_count: number;
  }>();

  // Process each individual case
  cases.forEach(processCase => {
    const { case_id, sequence, events } = processCase;

    // Track state occupancy for each state in this case
    sequence.forEach(state => {
      if (!state_occupancy.has(state)) {
        state_occupancy.set(state, {
          cases: new Set(),
          unique_case_count: 0
        });
      }
      const stateData = state_occupancy.get(state)!;
      stateData.cases.add(case_id);
      stateData.unique_case_count = stateData.cases.size;
    });

    // Extract transitions from this case's sequence
    for (let i = 0; i < sequence.length - 1; i++) {
      const fromState = sequence[i];
      const toState = sequence[i + 1];
      const transitionKey = `${fromState} → ${toState}`;

      // Initialize transition data if not exists
      if (!transitions.has(transitionKey)) {
        transitions.set(transitionKey, {
          count: 0,
          times: [],
          performer_data: new Map(),
          cases: new Set()
        });
      }

      const transitionData = transitions.get(transitionKey)!;
      transitionData.count += 1;
      transitionData.cases.add(case_id);

      // Find the timing data for this transition from events
      const fromEvent = events.find(e => e.state === fromState);
      const toEvent = events.find(e => e.state === toState);

      if (fromEvent && toEvent) {
        const transitionTime = (new Date(toEvent.timestamp).getTime() - new Date(fromEvent.timestamp).getTime()) / (1000 * 60 * 60); // hours
        transitionData.times.push(transitionTime);

        // Track performer data if available
        const performer = toEvent.performer || 'system';
        if (!transitionData.performer_data.has(performer)) {
          transitionData.performer_data.set(performer, []);
        }
        transitionData.performer_data.get(performer)!.push(transitionTime);
      }
    }
  });

  return {
    transitions,
    state_occupancy
  };
}

export function aggregateVariants(variants: Variant[], totalFlowData?: TotalFlowData): AggregatedVariant | null {
  if (variants.length === 0) return null;

  // Get all unique states from all variants
  const allStates = new Set<string>();
  variants.forEach(variant => {
    variant.sequence.forEach(state => allStates.add(state));
  });

  // For multi-variant aggregation, don't create a linear sequence!
  // Instead, collect all unique states and determine start/end from transitions
  const allStatesArray = Array.from(allStates);

  // Aggregate state occupancy - use total flow data when available
  const aggregatedStateOccupancy: AggregatedStateOccupancy[] = [];

  if (totalFlowData) {
    // Use total flow data for all states that appear in selected variants
    allStatesArray.forEach(state => {
      const totalStateData = totalFlowData.state_occupancy.get(state);
      if (totalStateData) {
        // Get contributing variants for this state from selected variants only
        const contributingVariants: Array<{ variant_id: string; unique_case_count: number; unique_cases: string[] }> = [];
        variants.forEach(variant => {
          const variantStateOcc = variant.state_occupancy.find(so => so.state === state);
          if (variantStateOcc) {
            contributingVariants.push({
              variant_id: variant.variant_id,
              unique_case_count: variantStateOcc.unique_case_count,
              unique_cases: variantStateOcc.unique_cases
            });
          }
        });

        aggregatedStateOccupancy.push({
          state,
          unique_case_count: totalStateData.unique_case_count, // TOTAL count from all processes
          unique_cases: Array.from(totalStateData.cases), // TOTAL cases from all processes
          contributing_variants: contributingVariants // Only from selected variants
        });
      }
    });
  } else {
    // Fallback to original logic when totalFlowData not available
    const stateOccupancyMap = new Map<string, {
      uniqueCases: Set<string>;
      contributingVariants: Array<{ variant_id: string; unique_case_count: number; unique_cases: string[] }>;
    }>();

    variants.forEach(variant => {
      variant.state_occupancy.forEach(stateOcc => {
        if (!stateOccupancyMap.has(stateOcc.state)) {
          stateOccupancyMap.set(stateOcc.state, {
            uniqueCases: new Set(),
            contributingVariants: []
          });
        }

        const stateData = stateOccupancyMap.get(stateOcc.state)!;
        stateOcc.unique_cases.forEach(caseId => stateData.uniqueCases.add(caseId));
        stateData.contributingVariants.push({
          variant_id: variant.variant_id,
          unique_case_count: stateOcc.unique_case_count,
          unique_cases: stateOcc.unique_cases
        });
      });
    });

    // Convert to final format
    Array.from(stateOccupancyMap.entries()).forEach(([state, data]) => {
      aggregatedStateOccupancy.push({
        state,
        unique_case_count: data.uniqueCases.size,
        unique_cases: Array.from(data.uniqueCases),
        contributing_variants: data.contributingVariants
      });
    });
  }

  // Aggregate transitions - separate topology from volume
  const transitionMap = new Map<string, {
    count: number;
    times: number[];
    performer_data: Map<string, number[]>;
    contributing_variants: Array<{ variant_id: string; count: number; median_time_hours: number }>;
  }>();

  if (totalFlowData) {
    // Step 1: Determine topology from selected variants (which transitions to show)
    const selectedTransitions = new Set<string>();
    variants.forEach(variant => {
      variant.transitions.forEach(transition => {
        const key = `${transition.from} → ${transition.to}`;
        selectedTransitions.add(key);
      });
    });

    // Step 2: For each transition in topology, use total flow data for volume
    selectedTransitions.forEach(transitionKey => {
      const totalTransitionData = totalFlowData.transitions.get(transitionKey);
      if (totalTransitionData) {
        // Get contributing variants info from selected variants only
        const contributingVariants: Array<{ variant_id: string; count: number; median_time_hours: number }> = [];
        variants.forEach(variant => {
          const variantTransition = variant.transitions.find(t => `${t.from} → ${t.to}` === transitionKey);
          if (variantTransition) {
            contributingVariants.push({
              variant_id: variant.variant_id,
              count: variantTransition.count,
              median_time_hours: variantTransition.median_time_hours
            });
          }
        });

        // Use TOTAL volume data but selected variants for contributing info
        transitionMap.set(transitionKey, {
          count: totalTransitionData.count, // TOTAL count from all processes
          times: [...totalTransitionData.times], // TOTAL timing data from all processes
          performer_data: new Map(totalTransitionData.performer_data), // TOTAL performer data
          contributing_variants: contributingVariants // Only from selected variants
        });
      }
    });
  } else {
    // Fallback to original logic when totalFlowData not available
    variants.forEach(variant => {
      variant.transitions.forEach(transition => {
        const key = `${transition.from} → ${transition.to}`;

        if (!transitionMap.has(key)) {
          transitionMap.set(key, {
            count: 0,
            times: [],
            performer_data: new Map(),
            contributing_variants: []
          });
        }

        const transitionData = transitionMap.get(key)!;
        transitionData.count += transition.count;

        // Add timing data (weighted by count)
        for (let i = 0; i < transition.count; i++) {
          transitionData.times.push(transition.median_time_hours);
        }

        // Aggregate performer data
        Object.entries(transition.performer_breakdown).forEach(([performer, perfData]) => {
          if (!transitionData.performer_data.has(performer)) {
            transitionData.performer_data.set(performer, []);
          }
          const perfTimes = transitionData.performer_data.get(performer)!;
          for (let i = 0; i < perfData.count; i++) {
            perfTimes.push(perfData.median_time_hours);
          }
        });

        // Track contributing variants
        transitionData.contributing_variants.push({
          variant_id: variant.variant_id,
          count: transition.count,
          median_time_hours: transition.median_time_hours
        });
      });
    });
  }

  // Convert aggregated transitions to final format
  const aggregatedTransitions = Array.from(transitionMap.entries()).map(([key, data]) => {
    const [from, to] = key.split(' → ');

    // Calculate aggregated timing metrics
    data.times.sort((a, b) => a - b);
    const median = data.times[Math.floor(data.times.length / 2)] || 0;
    const mean = data.times.reduce((sum, t) => sum + t, 0) / data.times.length || 0;
    const p95 = data.times[Math.floor(data.times.length * 0.95)] || 0;

    // Calculate aggregated performer breakdown
    const performer_breakdown: Record<string, { count: number; median_time_hours: number; mean_time_hours: number }> = {};
    data.performer_data.forEach((times, performer) => {
      times.sort((a, b) => a - b);
      performer_breakdown[performer] = {
        count: times.length,
        median_time_hours: times[Math.floor(times.length / 2)] || 0,
        mean_time_hours: times.reduce((sum, t) => sum + t, 0) / times.length || 0
      };
    });

    return {
      from,
      to,
      count: data.count,
      median_time_hours: median,
      mean_time_hours: mean,
      percentile_95_hours: p95,
      performer_breakdown,
      contributing_variants: data.contributing_variants
    };
  });

  // Calculate total metrics
  const totalCaseCount = variants.reduce((sum, v) => sum + v.case_count, 0);
  const allTotalTimes = variants.flatMap(v =>
    Array(v.case_count).fill(v.total_median_hours)
  );
  allTotalTimes.sort((a, b) => a - b);

  const totalMedian = allTotalTimes[Math.floor(allTotalTimes.length / 2)] || 0;
  const totalMean = allTotalTimes.reduce((sum, t) => sum + t, 0) / allTotalTimes.length || 0;
  const totalP95 = allTotalTimes[Math.floor(allTotalTimes.length * 0.95)] || 0;

  return {
    variant_ids: variants.map(v => v.variant_id),
    sequence: allStatesArray, // FIX: Just list all unique states, don't force linear sequence
    total_case_count: totalCaseCount,
    state_occupancy: aggregatedStateOccupancy, // NEW: Include aggregated state occupancy
    transitions: aggregatedTransitions,
    total_median_hours: totalMedian,
    total_mean_hours: totalMean,
    total_percentile_95_hours: totalP95
  };
}