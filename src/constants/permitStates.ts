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

export const TRANSITION_TIME_RANGES = {
  'submitted->intake_validation': { min: 24, max: 48 }, // 1-2 days - workers have other tasks
  'intake_validation->assigned_to_reviewer': { min: 0.1, max: 0.5 },
  'assigned_to_reviewer->review_in_progress': { min: 48, max: 120 }, // 2-5 days - workers have other tasks
  'review_in_progress->health_inspection': { min: 24, max: 168 }, // 1-7 days
  'review_in_progress->request_additional_info': { min: 24, max: 168 },
  'request_additional_info->applicant_provided_info': { min: 48, max: 72 }, // 2-3 days - applicants need time to gather documents
  'applicant_provided_info->review_in_progress': { min: 48, max: 336 }, // 2-14 days (bottleneck)
  'health_inspection->approved': { min: 24, max: 120 }, // 1-5 days
  'health_inspection->rejected': { min: 24, max: 120 },
  'request_additional_info->withdrawn': { min: 12, max: 48 }
} as const;

export const PERFORMERS = {
  clerks: ['clerk_001', 'clerk_002', 'clerk_003'],
  reviewers: ['reviewer_001', 'reviewer_002', 'reviewer_003', 'reviewer_004'],
  health_inspectors: ['inspector_001', 'inspector_002', 'inspector_003']
} as const;