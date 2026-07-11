/**
 * Shared pure helper functions used across multiple dashboard pages.
 * Import from here instead of redefining in each dashboard file.
 */

/** Parse a value as a float, returning 0 for null/undefined/NaN. */
export const n = (v) => parseFloat(v) || 0;

/** Compute a percentage clamped to [0, 100]. */
export const pct = (v, m) => Math.min(100, Math.round((n(v) / m) * 100)) || 0;

/** Return a grade label + colour for a given score / max. */
export const grade = (score, max) => {
  const p = (score / max) * 100;
  if (p >= 85) return { label: "Outstanding", color: "#059669", bg: "#d1fae5" };
  if (p >= 70) return { label: "Very Good", color: "#0284c7", bg: "#dbeafe" };
  if (p >= 55) return { label: "Good", color: "#7c3aed", bg: "#ede9fe" };
  if (p >= 40) return { label: "Satisfactory", color: "#d97706", bg: "#fef3c7" };
  return { label: "Needs Improvement", color: "#dc2626", bg: "#fee2e2" };
};

/** Safely stringify a value for report HTML; returns "&nbsp;" when blank. */
export const reportValue = (value) => String(value ?? "").trim() || "&nbsp;";

/** HTML-escape a text value for report output; returns "&nbsp;" when blank. */
export const reportTextValue = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "&nbsp;";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

/** Resolve a faculty qualification string from several possible sources. */
export const reportQualification = (info = {}) =>
  reportValue(info.qual || info.qualification || sessionStorage.getItem("qualification"));

/**
 * Resolve a faculty experience string from several possible sources.
 * Supports both single-field and split DYPIU/Previous/Total format.
 */
export const reportExperience = (info = {}) => {
  const single = [
    info.experience,
    info.teaching_experience,
    info.teachingExperience,
    info.expTotal,
    sessionStorage.getItem("experience"),
  ].find((value) => String(value ?? "").trim() !== "");

  if (single) {
    const text = String(single).trim();
    return /year/i.test(text) ? text : `${text} years`;
  }

  const parts = [
    ["DYPIU", info.expDyp],
    ["Previous", info.expPrev],
    ["Total", info.expTotal],
  ].filter(([, value]) => String(value ?? "").trim() !== "");

  return parts.length
    ? `${parts.map(([label, value]) => `${label}: ${String(value).trim()}`).join(" / ")} years`
    : "&nbsp;";
};
