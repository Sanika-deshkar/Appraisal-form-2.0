export const DEAN_TRACKS = {
  ENGINEERING: "engineering",
  NON_ENGINEERING: "non_engineering",
  DIRECT_VC: "direct_vc",
};

export const SOEMR_DEPARTMENTS = [
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Semiconductor Engineering",
];

export const UNIVERSITY_SCHOOLS = [
  {
    code: "SoCSEA",
    name: "School of Computer Science, Engineering & Applications",
    label: "SoCSEA - School of Computer Science, Engineering & Applications",
    deanTrack: DEAN_TRACKS.ENGINEERING,
    hodDepartments: [],
    aliases: [
      "socsea",
      "computer science",
      "school of computer science",
      "school of computer science engineering applications",
      "school of computer science, engineering and applications",
    ],
  },
  {
    code: "SoBB",
    name: "School of Bio-Engineering & Bio Science",
    label: "SoBB - School of Bio-Engineering & Bio Science",
    deanTrack: DEAN_TRACKS.ENGINEERING,
    hodDepartments: [],
    aliases: ["sobb", "bio-engineering", "bio engineering", "bio science"],
  },
  {
    code: "SoCE",
    name: "School of Continual Education",
    label: "SoCE - School of Continual Education",
    deanTrack: DEAN_TRACKS.ENGINEERING,
    hodDepartments: [],
    aliases: ["soce", "continual education"],
  },
  {
    code: "SoEMR",
    name: "School of Engineering Management & Research",
    label: "SoEMR - School of Engineering Management & Research",
    deanTrack: DEAN_TRACKS.ENGINEERING,
    hodDepartments: SOEMR_DEPARTMENTS,
    aliases: ["soemr", "engineering management", "engineering management research"],
  },
  {
    code: "SoCM",
    name: "School of Commerce & Management",
    label: "SoCM - School of Commerce & Management",
    deanTrack: DEAN_TRACKS.NON_ENGINEERING,
    hodDepartments: [],
    aliases: ["socm", "soc", "commerce", "commerce management", "management"],
  },
  {
    code: "SoMCS",
    name: "School of Media & Communication Studies",
    label: "SoMCS - School of Media & Communication Studies",
    deanTrack: DEAN_TRACKS.NON_ENGINEERING,
    hodDepartments: [],
    aliases: ["somcs", "media", "communication studies"],
  },
  {
    code: "SoD",
    name: "School of Design",
    label: "SoD - School of Design",
    deanTrack: DEAN_TRACKS.NON_ENGINEERING,
    hodDepartments: [],
    aliases: ["sod", "ciod", "school of design", "design"],
  },
  {
    code: "SoAA",
    name: "School of Applied Arts",
    label: "SoAA - School of Applied Arts",
    deanTrack: DEAN_TRACKS.NON_ENGINEERING,
    hodDepartments: [],
    aliases: ["soaa", "applied arts"],
  },
  {
    code: "CISR",
    name: "Center for Interdisciplinary Studies and Research",
    label: "CISR - Center for Interdisciplinary Studies and Research",
    deanTrack: DEAN_TRACKS.DIRECT_VC,
    hodDepartments: [],
    aliases: [
      "cisr",
      "center for interdisciplinary studies and research",
      "centre for interdisciplinary studies and research",
      "interdisciplinary studies and research",
    ],
  },
];

export const getSchoolsByDeanTrack = (deanTrack) =>
  UNIVERSITY_SCHOOLS.filter((school) => school.deanTrack === deanTrack);

export const getSchoolCodesByDeanTrack = (deanTrack) =>
  getSchoolsByDeanTrack(deanTrack).map((school) => school.code);

export const getSchoolLabelsByDeanTrack = (deanTrack) =>
  getSchoolsByDeanTrack(deanTrack).map((school) => school.label);

export const SCHOOL_OPTIONS = UNIVERSITY_SCHOOLS.map((school) => ({
  value: school.code,
  label: school.label,
}));

export const SOEMR_SCHOOL = UNIVERSITY_SCHOOLS.find((school) => school.code === "SoEMR");

export const normalizeHierarchyText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/-/g, " ")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const getSchoolByValue = (value) => {
  const normalized = normalizeHierarchyText(value);
  if (!normalized) return null;

  return UNIVERSITY_SCHOOLS.find((school) => {
    const candidates = [
      school.code,
      school.name,
      school.label,
      ...(school.aliases || []),
    ].map(normalizeHierarchyText);

    return candidates.some((candidate) =>
      normalized === candidate ||
      normalized.startsWith(`${candidate} `) ||
      candidate.startsWith(`${normalized} `)
    );
  }) || null;
};

export const getSchoolKey = (school) => getSchoolByValue(school)?.code || "";

export const canonicalSchoolValue = (school) => getSchoolByValue(school)?.code || "";

export const isValidSchool = (school) =>
  SCHOOL_OPTIONS.some((option) => option.value === school);

export const isSoemrSchool = (school) => getSchoolKey(school) === "SoEMR";

export const isCisrSchool = (school) => getSchoolKey(school) === "CISR";

export const getDepartmentByValue = (department) => {
  const normalized = normalizeHierarchyText(department);
  if (!normalized) return "";

  return SOEMR_DEPARTMENTS.find((item) => {
    const candidate = normalizeHierarchyText(item);
    return normalized === candidate ||
      normalized.startsWith(`${candidate} `) ||
      candidate.startsWith(`${normalized} `);
  }) || "";
};

export const canonicalDepartmentValue = (department) =>
  getDepartmentByValue(department) || "";

export const isValidSoemrDepartment = (department) =>
  SOEMR_DEPARTMENTS.includes(department);

