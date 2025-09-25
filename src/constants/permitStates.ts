export const PERMIT_STATES = [
  'submitted',
  'intake_validation',
  'assigned_to_reviewer',
  'review_in_progress',
  'request_additional_info',
  'applicant_provided_info',
  'health_inspection',
  'approved',
  'rejected',
  'withdrawn'
] as const;

export type PermitState = typeof PERMIT_STATES[number];

export const FINAL_STATES: PermitState[] = ['approved', 'rejected', 'withdrawn'];

export const HUMAN_STATES: PermitState[] = [
  'intake_validation',
  'review_in_progress',
  'health_inspection'
];

export const AUTOMATIC_STATES: PermitState[] = [
  'submitted',
  'assigned_to_reviewer',
  'request_additional_info',
  'applicant_provided_info'
];

export const VARIANT_DEFINITIONS = {
  direct_approval: {
    sequence: ['submitted', 'intake_validation', 'assigned_to_reviewer', 'review_in_progress', 'health_inspection', 'approved'] as PermitState[],
    probability: 0.6,
    name: 'Direct Approval'
  },
  info_loop: {
    sequence: ['submitted', 'intake_validation', 'assigned_to_reviewer', 'review_in_progress', 'request_additional_info', 'applicant_provided_info', 'review_in_progress', 'health_inspection', 'approved'] as PermitState[],
    probability: 0.25,
    name: 'Request More Info'
  },
  rejected: {
    sequence: ['submitted', 'intake_validation', 'assigned_to_reviewer', 'review_in_progress', 'health_inspection', 'rejected'] as PermitState[],
    probability: 0.1,
    name: 'Rejected at Final'
  },
  withdrawn: {
    sequence: ['submitted', 'intake_validation', 'assigned_to_reviewer', 'review_in_progress', 'request_additional_info', 'withdrawn'] as PermitState[],
    probability: 0.05,
    name: 'Withdrawn'
  }
} as const;

// Separate configuration for happy path concept
// This defines which sequence represents the ideal process flow
// Can be mapped to any variant - currently matches direct_approval
export const HAPPY_PATH_CONFIG = {
  // Currently using direct_approval sequence as the ideal path
  sequence: VARIANT_DEFINITIONS.direct_approval.sequence,
  // Alternative: could reference by variant key if desired
  // variantKey: 'direct_approval' as keyof typeof VARIANT_DEFINITIONS
} as const;

/**
 * TRANSITION_TIME_RANGES - Expected Time Configuration for Process Bottleneck Detection
 *
 * PURPOSE:
 * This configuration defines the expected minimum and maximum processing times (in hours)
 * for each state transition in the process. The system uses these values to:
 * - Detect bottlenecks by comparing actual vs expected times
 * - Display expected times in edge labels when bottlenecks are shown
 * - Provide business-logic driven process analysis
 *
 * FORMAT:
 * 'source_state->target_state': { min: number, max: number }
 * - Key: State transition in format "from->to" (note the -> arrow)
 * - min: Expected minimum processing time in hours
 * - max: Expected maximum processing time in hours (used for bottleneck threshold)
 *
 * BOTTLENECK DETECTION:
 * A transition is considered a bottleneck when:
 * - Actual mean time > (max * 1.2) // 20% tolerance above expected maximum
 * - AND transition affects 5+ cases (significant impact)
 *
 * CUSTOMIZATION GUIDE:
 * 1. Times are in HOURS (24 = 1 day, 168 = 1 week, 720 = 1 month)
 * 2. Add new transitions by following the exact "state1->state2" format
 * 3. Update existing times based on your business requirements
 * 4. Remove transitions that don't apply to your process
 *
 * EXAMPLES:
 * - Fast automated process: { min: 0.1, max: 0.5 } (6-30 minutes)
 * - Daily human review: { min: 8, max: 24 } (8 hours to 1 day)
 * - Weekly inspection: { min: 24, max: 168 } (1 day to 1 week)
 * - Known bottleneck: { min: 48, max: 336 } (2 days to 2 weeks)
 */
export const TRANSITION_TIME_RANGES = {
  // Initial processing - automated intake with some delay for batching
  'submitted->intake_validation': { min: 24, max: 48 }, // 1-2 days - workers process in batches

  // Quick automated assignment
  'intake_validation->assigned_to_reviewer': { min: 0.1, max: 0.5 }, // 6-30 minutes - automatic assignment

  // Human reviewer picks up case - depends on workload
  'assigned_to_reviewer->review_in_progress': { min: 48, max: 120 }, // 2-5 days - reviewers have multiple cases

  // Main review to final decision paths
  'review_in_progress->health_inspection': { min: 24, max: 168 }, // 1-7 days - scheduling dependent
  'review_in_progress->request_additional_info': { min: 24, max: 168 }, // 1-7 days - complex cases need more info

  // Applicant response time - external dependency
  'request_additional_info->applicant_provided_info': { min: 48, max: 72 }, // 2-3 days - applicants gather documents

  // Re-review after additional info - KNOWN BOTTLENECK
  'applicant_provided_info->review_in_progress': { min: 48, max: 336 }, // 2-14 days - reviewers prioritize new cases over re-reviews

  // Final inspection and approval
  'health_inspection->approved': { min: 24, max: 120 }, // 1-5 days - final paperwork
  'health_inspection->rejected': { min: 24, max: 120 }, // 1-5 days - rejection documentation

  // Early withdrawal
  'request_additional_info->withdrawn': { min: 12, max: 48 } // 12 hours - 2 days - applicant gives up
} as const;

export const PERFORMERS = {
  clerks: ['clerk_001', 'clerk_002', 'clerk_003'],
  reviewers: ['reviewer_001', 'reviewer_002', 'reviewer_003', 'reviewer_004'],
  health_inspectors: ['inspector_001', 'inspector_002', 'inspector_003']
} as const;