import { useEffect } from "react";
import { hasActiveRejection, isRejectedStatus, reviewListFrom, roleLabel } from "../utils/hierarchy";

const clean = (value) => String(value ?? "").trim();

const ROLE_MATCHERS = [
  ["center_head", /\bcent(?:er|re)\s+head\b/i],
  ["reporting_officer", /\breporting\s+officer\b|\bro\b/i],
  ["registrar", /\bregistrar\b/i],
  ["director", /\bdirector\b/i],
  ["dean", /\bdean\b/i],
  ["hod", /\bhod\b|\bhead\s+of\s+department\b/i],
  ["vc", /\bvc\b|\bvice\s+chancellor\b/i],
];

const camelRole = (role) => clean(role).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const roleFromStatus = (status) => {
  const text = clean(status);
  const match = ROLE_MATCHERS.find(([, pattern]) => pattern.test(text));
  return match?.[0] || "";
};

const normalizedRole = (role) => {
  const text = clean(role).toLowerCase().replace(/[\s-]+/g, "_");
  if (!text) return "";
  if (text === "ro") return "reporting_officer";
  if (text === "vice_chancellor") return "vc";
  if (text === "center_head" || text === "centre_head") return "center_head";
  return text;
};

const roleRemarksFrom = (source = {}, role = "") => {
  const normalized = normalizedRole(role);
  const camel = camelRole(normalized);
  return clean(
    source[`${normalized}Remarks`] ||
    source[`${normalized}_remarks`] ||
    source[`${camel}Remarks`] ||
    source[`${camel}_remarks`] ||
    source[`${normalized}Remark`] ||
    source[`${normalized}_remark`] ||
    source[`${camel}Remark`] ||
    source.remarks
  );
};

const reviewRole = (review = {}) =>
  normalizedRole(review.reviewer_role || review.reviewerRole || review.role || review.authority_role || review.authorityRole);

const reviewStatus = (review = {}) =>
  review.status || review.review_status || review.reviewStatus || review.workflow_status || review.workflowStatus;

const reviewRemarks = (review = {}) =>
  clean(review.remarks || review.remark || review.comments || review.comment || review.reason || review.rejection_reason || review.rejectionReason);

const buildRejectionNotice = ({ declaration, reviews = [], form = {}, item = {}, status } = {}) => {
  const reviewList = reviewListFrom(reviews);
  const statusCandidates = [
    status,
    declaration?.status,
    declaration?.workflow_status,
    declaration?.workflowStatus,
    form?.status,
    form?.workflowStatus,
    form?.workflow_status,
    item?.status,
    item?.workflowStatus,
    item?.workflow_status,
    item?.declaration?.status,
  ];
  const rejectedStatus = statusCandidates.find((candidate) => isRejectedStatus(candidate));
  const activeRejection = hasActiveRejection(declaration, reviewList);
  const rejectedReview = [...reviewList].reverse().find((review) => isRejectedStatus(reviewStatus(review)));
  const role = normalizedRole(reviewRole(rejectedReview) || roleFromStatus(rejectedStatus));

  if (!rejectedStatus && !activeRejection) return null;

  const matchingReview = role
    ? [...reviewList].reverse().find((review) => reviewRole(review) === role && reviewRemarks(review))
    : [...reviewList].reverse().find((review) => reviewRemarks(review));

  const sources = [
    rejectedReview,
    matchingReview,
    form,
    form?.form,
    form?.payload,
    form?.payload?.form,
    item,
    item?.form,
    item?.payload,
    item?.payload?.form,
    declaration,
  ];

  const reason = sources
    .map((source) => reviewRemarks(source) || roleRemarksFrom(source, role))
    .find(Boolean) || "No reason provided by the superior.";

  const reviewer = role ? roleLabel(role) : "Superior";
  return {
    key: `${clean(rejectedStatus || reviewStatus(rejectedReview))}:${role}:${reason}`,
    reviewer,
    reason,
    message: `Your form has been rejected. Reason: "${reason}". Please edit the form and resubmit again.`,
  };
};

export default function RejectionNotice({ declaration, reviews, form, item, status, alertOnceKey }) {
  const notice = buildRejectionNotice({ declaration, reviews, form, item, status });

  useEffect(() => {
    if (!notice) return;
    const storageKey = `rejection-notice:${alertOnceKey || "default"}:${notice.key}`;
    if (sessionStorage.getItem(storageKey) === "shown") return;
    window.alert(notice.message);
    sessionStorage.setItem(storageKey, "shown");
  }, [alertOnceKey, notice]);

  if (!notice) return null;

  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 9, padding: "12px 14px", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 900 }}>Your form has been rejected by {notice.reviewer}.</div>
      <div style={{ marginTop: 4 }}>Reason: {notice.reason}</div>
      <div style={{ marginTop: 4 }}>Please edit the form and resubmit again.</div>
    </div>
  );
}
