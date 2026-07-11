import { SCHOOL_OPTIONS, SOEMR_SCHOOL } from "./universityHierarchy";

export const SOCIETY_LABELS = [
  "Induction Program",
  "Unnat Bharat Abhiyan",
  "Yoga Classes",
  "Blood Donation",
  "Techno Social activities",
  "NSS",
  "Social visits",
  "Project of Social Impact",
  "Any other activity"
];

export const ACR_LABELS = [
  "Self-motivation and Proactiveness",
  "Punctuality",
  "Target based work",
  "Effectiveness",
  "Obedience"
];

export const ACR_DETAIL_POINTS = {
  "Self-motivation and Proactiveness": [
    "List the activities or initiatives other than regular load/duties.",
  ],
  Punctuality: [
    "Number of late marks - Office report.",
    "Punctuality in lecture/practical - To be observed by HOD.",
    "Timely completion and weekly checking of daily report - To be observed by HOD.",
    "Number of absentee without intimation and/or load adjustment - To be observed by HOD.",
  ],
  "Target based work": [
    "List the tasks allotted to you.",
    "Timely completion of allotted work - To be observed by HOD.",
  ],
  Effectiveness: [
    "Work done without errors & least follow-up - To be observed by HOD.",
  ],
  Obedience: [
    "To be observed by HOD and Director.",
  ],
};

export const createAcrRows = (rows = []) => {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return ACR_LABELS.map((label, index) => {
    const savedRow = sourceRows.find((row) => row?.label === label) || sourceRows[index] || {};
    return { ...savedRow, label };
  });
};

export const MAX_SCORES = {
  PART_A: 200,
  PART_B: 375,
  GRAND_TOTAL: 575,
  TEACHING_PROCESS: 100,
  STUDENT_FEEDBACK: 10,
  DEPT_ACTIVITIES: 20,
  UNI_ACTIVITIES: 30,
  SOCIETY_CONTRIBUTION: 10,
  INDUSTRY_CONNECT: 5,
  ACR: 25,
  JOURNALS: 120,
  BOOKS: 50,
  ICT: 20,
  RESEARCH_GUIDANCE: 30,
  RESEARCH_INTERNAL_PROJECTS: 15,
  RESEARCH_EXTERNAL_PROJECTS: 30,
  RESEARCH_PROJECTS: 15,
  PATENTS: 40,
  AWARDS: 10,
  CONFERENCES: 30,
  PROPOSALS: 10,
  PRODUCTS: 10,
  SELF_DEV: 5
};

export const TEACHING_SCORE_RULES = [
  { condition: (p) => p === 100, score: 50 },
  { condition: (p) => p >= 91, score: 47.5 },
  { condition: (p) => p >= 81, score: 42.5 },
  { condition: (p) => p >= 70, score: 37.5 },
  { condition: (p) => p < 70, score: 0 },
];

export const RESEARCH_MULTIPLIERS = {
  PAPER: 10,
  BOOK: 5
};

export const APP_INFO = {
  UNIVERSITY_NAME: "University Name",
  UNIVERSITY_LOCATION: "City, Country",
  DEFAULT_AY: "2025-2026",
  PORTAL_NAME: "Faculty Appraisal Portal",
  SHORT_NAME: "UNI"
};

export const SCORING_RULES = {
  RESEARCH_PAPER: 10,
  BOOK: 5,
  ICT: 10,
  GUIDE: 15,
  PATENT: 10,
  CONFERENCE: 5,
  PROPOSAL: 5,
  SELF_DEV: 5,
  SOCIETY_MULTIPLIER: 5,
  DEPT_ACTIVITY_MULTIPLIER: 3,
  UNI_ACTIVITY_MULTIPLIER: 10,
  INDUSTRY_CONNECT_MULTIPLIER: 5,
  FEEDBACK_DIVISOR: 10,
  TEACHING: {
    MIN_PERCENT: 70,
    THRESHOLDS: [
      { min: 100, score: 50 },
      { min: 91, score: 47.5 },
      { min: 81, score: 42.5 },
      { min: 71, score: 37.5 }
    ]
  }
};

export const SCHOOL_CONFIG = Object.fromEntries(
  SCHOOL_OPTIONS.map((school) => [
    school.value,
    { hasHod: school.value === SOEMR_SCHOOL.label },
  ])
);
