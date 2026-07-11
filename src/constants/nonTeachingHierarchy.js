export const NON_TEACHING_ROLES = [
  "non_teaching_staff",
  "reporting_officer",
  "registrar",
];

export const NON_TEACHING_ROLE_LABELS = {
  non_teaching_staff: "Non-Teaching Staff",
  reporting_officer: "Reporting Officer",
  registrar: "Registrar",
};

export const NON_TEACHING_ROLE_ALIASES = {
  staff: "non_teaching_staff",
  "non teaching staff": "non_teaching_staff",
  "non-teaching staff": "non_teaching_staff",
  non_teaching_staff: "non_teaching_staff",
  "non teaching": "non_teaching_staff",
  "reporting officer": "reporting_officer",
  "reporting-officer": "reporting_officer",
  reporting_officer: "reporting_officer",
  "reporting head": "reporting_officer",
  registrar: "registrar",
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const normalizeNonTeachingRole = (role, fallback = "") => {
  const normalized = normalizeText(role);
  return NON_TEACHING_ROLE_ALIASES[normalized] || fallback;
};

export const isNonTeachingRole = (role) =>
  NON_TEACHING_ROLES.includes(normalizeNonTeachingRole(role, role));

