/**
 * Form-type routing for the 8 schools of the university.
 *
 * School list (from institutional diagram):
 *   1. SoCSEA — School of Computer Science, Engineering & Applications
 *   2. SoCM   — School of Commerce & Management
 *   3. SoBB   — School of Bio-Engineering & Bio Science
 *   4. SoMCS  — School of Media & Communication Studies
 *   5. SoD    — School of Design
 *   6. SoAA   — School of Applied Arts
 *   7. SoCE   — School of Continual Education
 *   8. SoEMR  — School of Engineering Management & Research
 *
 * Form-type assignment:
 *   FORM_A — 5 schools: SoCSEA (1), SoCM (2), SoBB (3), SoCE (7), SoEMR (8)
 *   FORM_B — 1 school : SoMCS (4)
 *   FORM_C — 2 schools: SoD (5), SoAA (6)
 *
 * CISR uses FORM_A (engineering-equivalent appraisal structure).
 */
export const FORM_TYPES = {
  DEFAULT: "FORM_A",
  MEDIA_COMM: "FORM_B",
  DESIGN_ARTS: "FORM_C",
};

export const FORM_SCHOOL_CODES = {
  [FORM_TYPES.DEFAULT]:    ["SoCSEA", "SoCM", "SoBB", "SoCE", "SoEMR", "CISR"],
  [FORM_TYPES.MEDIA_COMM]: ["SoMCS"],
  [FORM_TYPES.DESIGN_ARTS]: ["SoD", "SoAA"],
};

export const formTypeForSchool = (schoolCode) => {
  const code = String(schoolCode || "").trim();
  return (
    Object.entries(FORM_SCHOOL_CODES).find(([, codes]) => codes.includes(code))?.[0] || ""
  );
};
