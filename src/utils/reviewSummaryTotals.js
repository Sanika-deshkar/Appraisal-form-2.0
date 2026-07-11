const clean = (value) => String(value ?? "").trim();
const n = (value) => parseFloat(value) || 0;

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && clean(value) !== "");

const valueFrom = (sources, keys) =>
  firstPresent(...sources.flatMap((source = {}) => keys.map((key) => source?.[key])));

const numericFrom = (sources, keys, fallback = 0) => {
  const value = valueFrom(sources, keys);
  return value === undefined ? n(fallback) : n(value);
};

const sectionApplicabilityFrom = (sources) =>
  sources.find((source = {}) => source?.sectionApplicability)?.sectionApplicability || {};

const effectiveMaxFromApplicability = (baseMax, applicability = {}, sections = []) =>
  Math.max(
    0,
    n(baseMax) - sections.reduce(
      (total, section) => applicability?.[section.key] === "notApplicable" ? total + n(section.max) : total,
      0,
    ),
  );

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["{", "["].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const normalizeReviewRole = (value) => {
  const role = clean(value).toLowerCase().replace(/[-\s]+/g, "_");
  if (role === "centerhead" || role === "centre_head" || role === "centrehead") return "center_head";
  return role;
};

const reviewArrayFrom = (value) => {
  const parsed = parseMaybeJson(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed.map(parseMaybeJson);
  if (typeof parsed !== "object") return [];

  return Object.entries(parsed).map(([role, review]) => {
    const parsedReview = parseMaybeJson(review);
    if (parsedReview && typeof parsedReview === "object" && !Array.isArray(parsedReview)) {
      return { reviewer_role: parsedReview.reviewer_role || parsedReview.reviewerRole || role, ...parsedReview };
    }
    return { reviewer_role: role, total_score: parsedReview };
  });
};

const reviewsFromSources = (sources) =>
  sources.flatMap((source = {}) => [
    ...reviewArrayFrom(source.reviews),
    ...reviewArrayFrom(source.review_history),
    ...reviewArrayFrom(source.reviewHistory),
    ...reviewArrayFrom(source.appraisal_reviews),
    ...reviewArrayFrom(source.appraisalReviews),
    ...reviewArrayFrom(source.payload?.reviews),
    ...reviewArrayFrom(source.payload?.review_history),
    ...reviewArrayFrom(source.payload?.reviewHistory),
    ...reviewArrayFrom(source.payload?.appraisal_reviews),
    ...reviewArrayFrom(source.payload?.appraisalReviews),
    ...reviewArrayFrom(source.form?.reviews),
    ...reviewArrayFrom(source.form?.review_history),
    ...reviewArrayFrom(source.form?.reviewHistory),
  ]);

const reviewSummaryForRole = (review = {}) => {
  const nestedTotals = parseMaybeJson(review.totals) || {};
  return {
    partA: firstPresent(
      review.part_a_score,
      review.partAScore,
      review.part_a_total,
      review.partATotal,
      nestedTotals.partA,
      nestedTotals.part_a_score,
      nestedTotals.part_a_total,
    ),
    partB: firstPresent(
      review.part_b_score,
      review.partBScore,
      review.part_b_total,
      review.partBTotal,
      nestedTotals.partB,
      nestedTotals.part_b_score,
      nestedTotals.part_b_total,
    ),
    total: firstPresent(
      review.total_score,
      review.totalScore,
      review.total,
      review.grand_total,
      review.grandTotal,
      nestedTotals.total,
      nestedTotals.total_score,
      nestedTotals.grand_total,
      nestedTotals.grandTotal,
    ),
    remarks: firstPresent(review.remarks, review.comment, review.comments, review.review_remarks, review.reviewRemarks),
  };
};

export const standardReviewSummary = (...sourceInputs) => {
  const sources = sourceInputs.filter(Boolean);
  const summary = {};
  const assign = (target, keys) => {
    const value = valueFrom(sources, keys);
    if (value !== undefined) summary[target] = value;
  };

  assign("hodTotal", ["centerHeadTotal", "center_head_total", "centerHeadScore", "center_head_score", "centerHeadTotalScore", "center_head_total_score", "centerHeadGrandTotal", "center_head_grand_total", "centerHeadGrandTotalScore", "center_head_grand_total_score", "hodTotal", "hod_total", "hodScore", "hod_score", "hodTotalScore", "hod_total_score"]);
  assign("hodPartA", ["centerHeadPartA", "center_head_part_a", "centerHeadPartAScore", "center_head_part_a_score", "centerHeadPartATotal", "center_head_part_a_total", "hodPartA", "hod_part_a", "hodPartAScore", "hod_part_a_score", "hodPartATotal", "hod_part_a_total"]);
  assign("hodPartB", ["centerHeadPartB", "center_head_part_b", "centerHeadPartBScore", "center_head_part_b_score", "centerHeadPartBTotal", "center_head_part_b_total", "hodPartB", "hod_part_b", "hodPartBScore", "hod_part_b_score", "hodPartBTotal", "hod_part_b_total"]);
  assign("hodRemarks", ["hodRemarks", "hod_remarks", "centerHeadRemarks", "center_head_remarks"]);
  assign("directorTotal", ["directorTotal", "director_total", "directorScore", "director_score", "directorTotalScore", "director_total_score"]);
  assign("directorPartA", ["directorPartA", "director_part_a", "directorPartAScore", "director_part_a_score", "directorPartATotal", "director_part_a_total"]);
  assign("directorPartB", ["directorPartB", "director_part_b", "directorPartBScore", "director_part_b_score", "directorPartBTotal", "director_part_b_total"]);
  assign("directorRemarks", ["directorRemarks", "director_remarks"]);
  assign("deanTotal", ["deanTotal", "dean_total", "deanScore", "dean_score", "deanTotalScore", "dean_total_score"]);
  assign("deanPartA", ["deanPartA", "dean_part_a", "deanPartAScore", "dean_part_a_score", "deanPartATotal", "dean_part_a_total"]);
  assign("deanPartB", ["deanPartB", "dean_part_b", "deanPartBScore", "dean_part_b_score", "deanPartBTotal", "dean_part_b_total"]);
  assign("deanRemarks", ["deanRemarks", "dean_remarks"]);
  assign("vcTotal", ["vcTotal", "vc_total", "vcScore", "vc_score", "vcTotalScore", "vc_total_score"]);
  assign("vcPartA", ["vcPartA", "vc_part_a", "vcPartAScore", "vc_part_a_score", "vcPartATotal", "vc_part_a_total"]);
  assign("vcPartB", ["vcPartB", "vc_part_b", "vcPartBScore", "vc_part_b_score", "vcPartBTotal", "vc_part_b_total"]);
  assign("vcRemarks", ["vcRemarks", "vc_remarks"]);

  reviewsFromSources(sources).forEach((review) => {
    const role = normalizeReviewRole(review.reviewer_role || review.reviewerRole || review.role);
    const prefix = role === "center_head" || role === "hod"
      ? "hod"
      : ["director", "dean", "vc"].includes(role)
      ? role
      : "";
    if (!prefix) return;

    const reviewSummary = reviewSummaryForRole(review);
    const targets = {
      total: `${prefix}Total`,
      partA: `${prefix}PartA`,
      partB: `${prefix}PartB`,
      remarks: `${prefix}Remarks`,
    };
    Object.entries(targets).forEach(([key, target]) => {
      const current = summary[target];
      const incoming = reviewSummary[key];
      const shouldUseIncoming = incoming !== undefined && (
        current === undefined ||
        current === null ||
        clean(current) === "" ||
        (key !== "remarks" && n(current) === 0 && n(incoming) > 0)
      );
      if (shouldUseIncoming) {
        summary[target] = incoming;
      }
    });
  });

  return summary;
};

export const standardSubmittedScoreSummary = (subject = {}, fallback = {}) => {
  const sources = [
    subject,
    subject.declaration,
    subject.totals,
    subject.payload,
    subject.payload?.totals,
    subject.payload?.form,
    subject.form,
    subject.info,
  ].filter(Boolean);

  const sectionApplicability = sectionApplicabilityFrom(sources);
  const inferredSelfPartAMax = effectiveMaxFromApplicability(200, { ...sectionApplicability, acr: "notApplicable" }, [{ key: "projects", max: 10 }, { key: "society", max: 10 }, { key: "acr", max: 25 }]);
  const fallbackPartAMax = n(fallback.partAMax ?? fallback.effectivePartAMax);
  const inferredPartAMax = fallbackPartAMax ? Math.min(fallbackPartAMax, inferredSelfPartAMax) : inferredSelfPartAMax;
  const inferredPartBMax = n(fallback.partBMax ?? fallback.effectivePartBMax) ||
    effectiveMaxFromApplicability(375, sectionApplicability, [{ key: "research", max: 30 }]);

  const storedPartAMax = numericFrom(sources, [
    "partAMax", "part_a_max", "effectivePartAMax", "effective_part_a_max", "maxPartA",
  ], inferredPartAMax);
  const partAMax = Math.min(storedPartAMax || inferredPartAMax, inferredPartAMax);
  const partBMax = numericFrom(sources, [
    "partBMax", "part_b_max", "effectivePartBMax", "effective_part_b_max", "maxPartB",
  ], inferredPartBMax);
  const grandMax = numericFrom(sources, [
    "grandMax", "grand_max", "effectiveGrandMax", "effective_grand_max", "maxGrand", "totalMax",
  ], partAMax + partBMax);

  const rawPartA = numericFrom(sources, [
    "partATotal", "partA", "part_a_total", "part_a_score", "selfPartA", "self_part_a",
    "facultyPartA", "faculty_part_a", "facultyPartAScore", "faculty_part_a_score",
  ], fallback.partA);
  const partA = Math.min(rawPartA, partAMax);
  const rawPartB = numericFrom(sources, [
    "partBTotal", "partB", "part_b_total", "part_b_score", "selfPartB", "self_part_b",
    "facultyPartB", "faculty_part_b", "facultyPartBScore", "faculty_part_b_score",
  ], fallback.partB);
  const partB = Math.min(rawPartB, partBMax);
  const rawTotal = numericFrom(sources, [
    "grandTotal", "grand_total", "totalScore", "total_score", "total", "selfTotal",
    "self_total", "facultyTotal", "faculty_total", "facultyScore", "faculty_score",
  ], fallback.total ?? partA + partB);
  const total = Math.min(rawTotal, partA + partB, grandMax);

  return { partA, partB, total, partAMax, partBMax, grandMax };
};

export const attachSubmittedScoreSummary = (target = {}, ...sources) => {
  const summary = standardSubmittedScoreSummary(Object.assign({}, ...sources, target));
  return {
    ...target,
    partATotal: summary.partA,
    partBTotal: summary.partB,
    grandTotal: summary.total,
    effectivePartAMax: summary.partAMax,
    effectivePartBMax: summary.partBMax,
    effectiveGrandMax: summary.grandMax,
  };
};
