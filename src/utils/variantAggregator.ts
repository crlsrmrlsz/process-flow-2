import type { Variant, StateOccupancy } from '../types/Variant';

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

export function aggregateVariants(variants: Variant[]): AggregatedVariant | null {
  if (variants.length === 0) return null;

  // Get all unique states from all variants
  const allStates = new Set<string>();
  variants.forEach(variant => {
    variant.sequence.forEach(state => allStates.add(state));
  });

  // For multi-variant aggregation, don't create a linear sequence!
  // Instead, collect all unique states and determine start/end from transitions
  const allStatesArray = Array.from(allStates);

  // Aggregate state occupancy (FIXED: properly handle unique cases across variants)
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

      // Add unique cases from this variant (Set automatically handles deduplication)
      stateOcc.unique_cases.forEach(caseId => stateData.uniqueCases.add(caseId));

      // Track contributing variant
      stateData.contributingVariants.push({
        variant_id: variant.variant_id,
        unique_case_count: stateOcc.unique_case_count,
        unique_cases: stateOcc.unique_cases
      });
    });
  });

  // Convert aggregated state occupancy to final format
  const aggregatedStateOccupancy: AggregatedStateOccupancy[] = Array.from(stateOccupancyMap.entries()).map(([state, data]) => ({
    state,
    unique_case_count: data.uniqueCases.size,
    unique_cases: Array.from(data.uniqueCases),
    contributing_variants: data.contributingVariants
  }));

  // Aggregate transitions
  const transitionMap = new Map<string, {
    count: number;
    times: number[];
    performer_data: Map<string, number[]>;
    contributing_variants: Array<{ variant_id: string; count: number; median_time_hours: number }>;
  }>();

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