import { APP_INFO } from "../constants/formConfig";
import {
  NON_TEACHING_ROLE_LABELS,
  isNonTeachingRole,
  normalizeNonTeachingRole,
} from "../constants/nonTeachingHierarchy";
import { profileFromsessionStorage } from "../utils/hierarchy";
import { clampScore } from "../utils/appraisalFormUtils";
import {
  WORKFLOW_STATUSES,
  normalizeApprovalWorkflow,
  workflowSourceFrom,
} from "../utils/workflow";
import { api } from "./api";

export const NON_TEACHING_STATUS = {
  DRAFT: "Draft",
  PENDING_RO_REVIEW: "Pending RO Review",
  PENDING_REGISTRAR_REVIEW: "Pending Registrar Review",
  PENDING_VC_REVIEW: "Pending VC Review",
  RO_REVIEWED: "Reporting Officer Reviewed",
  REPORTING_OFFICER_REVIEWED: "Reporting Officer Reviewed",
  REGISTRAR_REVIEWED: "Registrar Reviewed",
  VC_APPROVED: "VC Approved",
};

NON_TEACHING_STATUS.SUBMITTED = NON_TEACHING_STATUS.PENDING_RO_REVIEW;

export const NON_TEACHING_MAX = {
  partA: 25,
  partB: 105,
  grand: 130,
};

export const SELF_ITEMS = [
  { key: "selfResp", label: "Current Responsibilities", max: 10 },
  { key: "selfContrib", label: "Other Useful Contributions", max: 10 },
  { key: "selfAchieve", label: "Achievements", max: 5 },
];

export const RATING_SCALE = [
  { value: 5, label: "Excellent", color: "#059669", bg: "#d1fae5" },
  { value: 4, label: "Very Good", color: "#0284c7", bg: "#dbeafe" },
  { value: 3, label: "Good", color: "#7c3aed", bg: "#ede9fe" },
  { value: 2, label: "Average", color: "#d97706", bg: "#fef3c7" },
  { value: 1, label: "Below Average", color: "#dc2626", bg: "#fee2e2" },
];

export const RATING_SECTIONS = [
  {
    key: "profComp",
    title: "Professional Competence",
    max: 25,
    accent: "#1d4ed8",
    params: [
      "Knowledge of rules, regulations and procedures",
      "Ability to organize work and carry it out",
      "Ability and willingness to take up additional assignments in exigencies",
      "Creativity and innovation",
      "Ability to learn and perform new duties",
    ],
  },
  {
    key: "quality",
    title: "Quality of Work",
    max: 25,
    accent: "#0891b2",
    params: [
      "Ability to maintain files and office records",
      "Accuracy and speed of work",
      "Neatness and tidiness of work",
      "Completion of work on time",
      "Diligence and sense of responsibility",
    ],
  },
  {
    key: "personal",
    title: "Personal Characteristics",
    max: 30,
    accent: "#7c3aed",
    params: [
      "Reliability",
      "Attitude and respect",
      "Discipline",
      "Team work spirit",
      "Integrity and behavior",
      "Interpersonal relations",
    ],
  },
  {
    key: "regular",
    title: "Regularity",
    max: 25,
    accent: "#059669",
    params: [
      "Attendance consistency and punctuality",
      "Leave planning and approval discipline",
      "Communication and intimation",
      "Adherence to working hours",
      "Responsibility during absence",
    ],
  },
];

const n = (value) => parseFloat(value) || 0;
const clean = (value) => String(value ?? "").trim();
const DEFAULT_WORKFLOW_TITLE = "Approval Workflow";
const clampOptionalScore = (value, max) =>
  clean(value) === "" ? "" : clampScore(value, max);
const clampOptionalRating = (value) => {
  if (clean(value) === "") return "";
  const rating = n(value);
  if (rating < 1) return "";
  return Math.min(5, rating);
};
const firstNonEmpty = (...values) =>
  values.find((value) => clean(value) !== "") || "";
const firstPositiveNumber = (...values) => {
  const found = values.find((value) => n(value) > 0);
  return found === undefined ? 0 : n(found);
};
const emailKey = (value) => clean(value).toLowerCase();
const pickFirstNonEmpty = (source = {}, keys = []) =>
  firstNonEmpty(...keys.map((key) => source?.[key]));
const normalizeStatusText = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
const NON_TEACHING_STATUS_ALIASES = {
  draft: NON_TEACHING_STATUS.DRAFT,
  submitted: NON_TEACHING_STATUS.PENDING_RO_REVIEW,
  "pending ro review": NON_TEACHING_STATUS.PENDING_RO_REVIEW,
  "pending reporting officer review": NON_TEACHING_STATUS.PENDING_RO_REVIEW,
  "pending vc review": NON_TEACHING_STATUS.PENDING_VC_REVIEW,
  "pending vice chancellor review": NON_TEACHING_STATUS.PENDING_VC_REVIEW,
  "reporting officer reviewed": NON_TEACHING_STATUS.RO_REVIEWED,
  "ro reviewed": NON_TEACHING_STATUS.RO_REVIEWED,
  "pending registrar review": NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW,
  "registrar reviewed": NON_TEACHING_STATUS.REGISTRAR_REVIEWED,
  "vc approved": NON_TEACHING_STATUS.VC_APPROVED,
  "vc reviewed": NON_TEACHING_STATUS.VC_APPROVED,
  reviewed: NON_TEACHING_STATUS.VC_APPROVED,
};
export const normalizeNonTeachingStatus = (status) =>
  NON_TEACHING_STATUS_ALIASES[normalizeStatusText(status)] || clean(status);
export const isNonTeachingRejectedStatus = (status) =>
  normalizeStatusText(status).includes("rejected");
const isTruthyFlag = (value) => {
  if (value === true || value === 1) return true;
  const normalized = clean(value).toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
};
const academicYear = (value) =>
  clean(value) || APP_INFO.DEFAULT_AY || "2025-2026";
const initialsFor = (name = "", fallback = "U") =>
  clean(name || fallback)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

const normalizeDocsMap = (docs = {}) => {
  if (!docs || typeof docs !== "object") return {};
  return Object.fromEntries(
    Object.entries(docs).map(([key, value]) => [
      key,
      (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean),
    ]),
  );
};

export const nonTeachingRoleLabel = (role) =>
  role === "vc"
    ? "Vice Chancellor"
    : NON_TEACHING_ROLE_LABELS[normalizeNonTeachingRole(role, role)] || role;

const workflowDesignationForRole = (role) =>{
  const normalizedRole = normalizeNonTeachingRole(role, role);
  if (normalizedRole === "non_teaching_staff" || normalizedRole === "self") return "Staff";
  if (normalizedRole === "reporting_officer" || normalizedRole === "ro") return nonTeachingRoleLabel("reporting_officer");
  return nonTeachingRoleLabel(normalizedRole);
};

const workflowStepStatusForRole = (status, role) =>{
  const normalizedStatus = normalizeNonTeachingStatus(status);
  if (normalizedStatus === NON_TEACHING_STATUS.VC_APPROVED) return WORKFLOW_STATUSES.APPROVED;
  if (role === "ro") {
    return [
      NON_TEACHING_STATUS.RO_REVIEWED,
      NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW,
      NON_TEACHING_STATUS.REGISTRAR_REVIEWED,
    ].includes(normalizedStatus)
      ? WORKFLOW_STATUSES.APPROVED
      : normalizedStatus === NON_TEACHING_STATUS.PENDING_RO_REVIEW
        ? WORKFLOW_STATUSES.PENDING
        : WORKFLOW_STATUSES.WAITING;
  }
  if (role === "registrar") {
    return normalizedStatus === NON_TEACHING_STATUS.REGISTRAR_REVIEWED
      ? WORKFLOW_STATUSES.APPROVED
      : [
          NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW,
          NON_TEACHING_STATUS.RO_REVIEWED,
        ].includes(normalizedStatus)
        ? WORKFLOW_STATUSES.PENDING
        : WORKFLOW_STATUSES.WAITING;
  }
  if (role === "vc") {
    return [
      NON_TEACHING_STATUS.REGISTRAR_REVIEWED,
      NON_TEACHING_STATUS.PENDING_VC_REVIEW,
    ].includes(normalizedStatus)
      ? WORKFLOW_STATUSES.PENDING
      : WORKFLOW_STATUSES.WAITING;
  }
  return WORKFLOW_STATUSES.WAITING;
};

export const createEmptyPartB = () =>
  Object.fromEntries(RATING_SECTIONS.map((section) => [section.key, {}]));

const reportingHeadFor = (source = {}) =>
  firstNonEmpty(
    source.reportingHead,
    source.reporting_head,
    source.reportingOfficer,
    source.reporting_officer,
    source.reportingOfficerName,
    source.reporting_officer_name,
    source.profile?.reportingHead,
    source.profile?.reporting_head,
    source.profile?.reportingOfficer,
    source.profile?.reporting_officer,
    source.profile?.reportingOfficerName,
    source.profile?.reporting_officer_name,
    source.info?.reportingHead,
    source.info?.reporting_head,
    source.form?.info?.reportingHead,
    source.form?.info?.reporting_head,
    source.payload?.info?.reportingHead,
    source.payload?.info?.reporting_head,
  );

const subjectRoleFor = (source = {}) =>
  normalizeNonTeachingRole(
    firstNonEmpty(
      source.appraisalRole,
      source.appraisal_role,
      source.role,
      source.submittedByRole,
      source.profile?.appraisal_role,
      source.profile?.role,
      source.form?.submittedByRole,
      source.form?.appraisalRole,
      source.form?.appraisal_role,
      source.payload?.submittedByRole,
      source.payload?.appraisalRole,
      source.payload?.appraisal_role,
    ),
    "",
  );

const hasReportingOfficerReviewData = (source = {}) => {
  const form = source.form || source.payload || source;
  if (!form || typeof form !== "object") return false;
  if (clean(form.roRemarks)) return true;
  if (n(source.roTotal || source.ro_total) > 0) return true;

  const hasPartAMarks = SELF_ITEMS.some(({ key }) => clean(form[key]?.roMarks));
  if (hasPartAMarks) return true;

  return RATING_SECTIONS.some(({ key, params }) => {
    const rows = form.partB?.[key] || {};
    return params.some((_label, index) => clean(rows[`p${index}_ro`]));
  });
};

const statusSkippedReportingOfficer = (source = {}) =>
  [
    NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW,
    NON_TEACHING_STATUS.REGISTRAR_REVIEWED,
    NON_TEACHING_STATUS.VC_APPROVED,
  ].includes(normalizeNonTeachingStatus(
    firstNonEmpty(source.status, source.form?.status, source.payload?.status),
  ));

export const nonTeachingReportsToRegistrar = (source = {}) => {
  const explicitDirectToRegistrar = isTruthyFlag(firstNonEmpty(
    source.reports_to_registrar,
    source.reportsToRegistrar,
    source.direct_to_registrar,
    source.directToRegistrar,
    source.profile?.reports_to_registrar,
    source.profile?.reportsToRegistrar,
    source.form?.reports_to_registrar,
    source.form?.reportsToRegistrar,
    source.form?.direct_to_registrar,
    source.form?.directToRegistrar,
    source.payload?.reports_to_registrar,
    source.payload?.reportsToRegistrar,
    source.payload?.direct_to_registrar,
    source.payload?.directToRegistrar,
    source.info?.reports_to_registrar,
    source.info?.reportsToRegistrar,
    source.form?.info?.reports_to_registrar,
    source.form?.info?.reportsToRegistrar,
    source.payload?.info?.reports_to_registrar,
    source.payload?.info?.reportsToRegistrar,
  ));
  if (explicitDirectToRegistrar) return true;

  const subjectRole = subjectRoleFor(source);
  return (
    subjectRole === "non_teaching_staff" &&
    !clean(reportingHeadFor(source)) &&
    statusSkippedReportingOfficer(source) &&
    !hasReportingOfficerReviewData(source)
  );
};

export const emptyNonTeachingForm = (
  profile = profileFromsessionStorage(),
  role = "non_teaching_staff",
) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  const name =
    profile.full_name || profile.name || sessionStorage.getItem("name") || "";
  const email = emailKey(
    profile.email || sessionStorage.getItem("username") || "",
  );

  return {
    appraisalType: "non-teaching",
    submittedByRole: normalizedRole,
    reports_to_registrar: normalizedRole === "non_teaching_staff" && nonTeachingReportsToRegistrar({
      ...profile,
      appraisal_role: normalizedRole,
      reports_to_registrar: firstNonEmpty(
        profile.reports_to_registrar,
        profile.reportsToRegistrar,
        sessionStorage.getItem("reports_to_registrar"),
        sessionStorage.getItem("reportsToRegistrar"),
      ),
    }),
    status: NON_TEACHING_STATUS.DRAFT,
    info: {
      name,
      email,
      employeeId:
        profile.employee_id ||
        profile.employeeId ||
        sessionStorage.getItem("employeeId") ||
        "",
      designation:
        profile.designation ||
        sessionStorage.getItem("designation") ||
        nonTeachingRoleLabel(normalizedRole),
      department:
        profile.department || sessionStorage.getItem("department") || "",
      reportingHead: reportingHeadFor(profile),
      ay: academicYear(
        profile.academic_year || profile.ay || APP_INFO.DEFAULT_AY,
      ),
    },
    selfResp: { text: "", marks: "" },
    selfContrib: { text: "", marks: "" },
    selfAchieve: { text: "", marks: "" },
    partB: createEmptyPartB(),
    docs: {},
    remarks: "",
    summaryOtherInfo: "",
    roRemarks: "",
    registrarRemarks: "",
    vcRemarks: "",
  };
};

export const normalizeNonTeachingForm = (
  payload = {},
  profile = {},
  role = "non_teaching_staff",
) => {
  const base = emptyNonTeachingForm(profile, role);
  const form = payload && typeof payload === "object" ? payload : {};
  const partBPayload = form.partB || {};
  const merged = {
    ...base,
    ...form,
    info: {
      ...base.info,
      ...(form.info || {}),
    },
    partB: {
      ...base.partB,
      ...partBPayload,
      profComp:
        partBPayload.profComp ||
        partBPayload.professional_competence ||
        partBPayload.professionalCompetence ||
        base.partB.profComp,
      quality:
        partBPayload.quality ||
        partBPayload.quality_of_work ||
        partBPayload.qualityOfWork ||
        base.partB.quality,
      personal:
        partBPayload.personal ||
        partBPayload.personal_characteristics ||
        partBPayload.personalCharacteristics ||
        base.partB.personal,
      regular:
        partBPayload.regular ||
        partBPayload.regularity ||
        base.partB.regular,
    },
    docs: normalizeDocsMap(form.docs || base.docs),
    workflow: workflowSourceFrom({ ...profile, ...form, form, payload: form }) || base.workflow,
  };

  merged.status = normalizeNonTeachingStatus(form.status || base.status);
  merged.submittedByRole = normalizeNonTeachingRole(
    form.submittedByRole,
    normalizeNonTeachingRole(role, role),
  );
  const reportsToRegistrar =
    merged.submittedByRole === "non_teaching_staff" &&
    nonTeachingReportsToRegistrar({
      ...profile,
      ...form,
      form,
      payload: form,
      info: merged.info,
    });
  merged.reports_to_registrar = reportsToRegistrar;
  merged.reportsToRegistrar = reportsToRegistrar;
  merged.info.ay = academicYear(merged.info.ay || profile.academic_year);
  merged.info.email = emailKey(
    merged.info.email || profile.email || sessionStorage.getItem("username"),
  );

  SELF_ITEMS.forEach(({ key, max }) => {
    const sourceRow =
      form[key] ||
      (key === "selfResp" ? (form.current_responsibilities || form.currentResponsibilities) : null) ||
      (key === "selfContrib" ? (form.other_contributions || form.otherContributions || form.useful_contributions || form.usefulContributions) : null) ||
      (key === "selfAchieve" ? (form.achievements || form.achievement) : null);
    merged[key] = {
      ...(base[key] || {}),
      ...(sourceRow || {}),
    };
    const row = merged[key];
    row.marks = pickFirstNonEmpty(row, ["marks", "selfMarks", "self_marks", "self_score", "selfScore"]);
    row.roMarks = pickFirstNonEmpty(row, ["roMarks", "ro_marks", "reportingOfficerMarks", "reporting_officer_marks", "reportingOfficerScore", "reporting_officer_score"]);
    row.regMarks = pickFirstNonEmpty(row, ["regMarks", "reg_marks", "registrarMarks", "registrar_marks", "registrarScore", "registrar_score"]);
    row.vcMarks = pickFirstNonEmpty(row, ["vcMarks", "vc_marks", "vcScore", "vc_score"]);
    ["marks", "roMarks", "regMarks", "vcMarks"].forEach((field) => {
      merged[key][field] = clampOptionalScore(merged[key][field], max);
    });
  });

  RATING_SECTIONS.forEach(({ key }) => {
    merged.partB[key] = {
      ...(base.partB[key] || {}),
      ...(form.partB?.[key] || {}),
    };
  });

  RATING_SECTIONS.forEach(({ key, params }) => {
    const rows = merged.partB[key] || {};
    params.forEach((_label, index) => {
      const roValue = pickFirstNonEmpty(rows, [
        `p${index}_ro`,
        `p${index}_reporting_officer`,
        `p${index}_reportingOfficer`,
        `p${index}_ro_score`,
        `p${index}_reporting_officer_score`,
      ]);
      const regValue = pickFirstNonEmpty(rows, [
        `p${index}_reg`,
        `p${index}_registrar`,
        `p${index}_reg_score`,
        `p${index}_registrar_score`,
      ]);
      const vcValue = pickFirstNonEmpty(rows, [
        `p${index}_vc`,
        `p${index}_vc_score`,
      ]);
      if (clean(roValue) !== "") rows[`p${index}_ro`] = roValue;
      if (clean(regValue) !== "") rows[`p${index}_reg`] = regValue;
      if (clean(vcValue) !== "") rows[`p${index}_vc`] = vcValue;
      ["self", "ro", "reg", "vc"].forEach((suffix) => {
        const field = `p${index}_${suffix}`;
        rows[field] = clampOptionalRating(rows[field]);
      });
    });
    merged.partB[key] = rows;
  });

  return merged;
};

const valueForAuthority = (row = {}, authority) => {
  if (authority === "self") return row.marks;
  if (authority === "reporting_officer") return row.roMarks;
  if (authority === "registrar") return row.regMarks;
  if (authority === "vc") return row.vcMarks;
  return "";
};

const ratingForAuthority = (section = {}, index, authority) => {
  const suffix =
    authority === "reporting_officer"
      ? "ro"
      : authority === "registrar"
        ? "reg"
        : authority;
  return section[`p${index}_${suffix}`];
};

export const calculateNonTeachingTotals = (form = {}, authority = "self") => {
  const normalized = normalizeNonTeachingForm(form);
  const partA = clampScore(SELF_ITEMS.reduce(
    (total, item) =>
      total + n(clampOptionalScore(valueForAuthority(normalized[item.key], authority), item.max)),
    0,
  ), NON_TEACHING_MAX.partA);
  const partB =
    authority === "self"
      ? 0
      : clampScore(RATING_SECTIONS.reduce((sectionTotal, section) => {
          const rows = normalized.partB?.[section.key] || {};
          const sectionScore = section.params.reduce(
            (total, _label, index) =>
              total + n(clampOptionalRating(ratingForAuthority(rows, index, authority))),
            0,
          );
          return sectionTotal + clampScore(sectionScore, section.max);
        }, 0), NON_TEACHING_MAX.partB);

  return {
    partA,
    partB,
    total: clampScore(partA + partB, NON_TEACHING_MAX.grand),
  };
};

export const statusAfterSelfSubmit = (role, source = {}) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  if (normalizedRole === "registrar")
    return NON_TEACHING_STATUS.REGISTRAR_REVIEWED;
  if (normalizedRole === "reporting_officer")
    return NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW;
  if (
    normalizedRole === "non_teaching_staff" &&
    nonTeachingReportsToRegistrar(source)
  ) {
    return NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW;
  }
  return NON_TEACHING_STATUS.PENDING_RO_REVIEW;
};

export const reviewerStatus = (role) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  if (normalizedRole === "reporting_officer")
    return NON_TEACHING_STATUS.RO_REVIEWED;
  if (normalizedRole === "registrar")
    return NON_TEACHING_STATUS.REGISTRAR_REVIEWED;
  if (normalizedRole === "vc") return NON_TEACHING_STATUS.VC_APPROVED;
  return NON_TEACHING_STATUS.SUBMITTED;
};

export const expectedPendingStatus = (role) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  if (normalizedRole === "reporting_officer")
    return NON_TEACHING_STATUS.PENDING_RO_REVIEW;
  if (normalizedRole === "registrar")
    return NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW;
  if (normalizedRole === "vc") return NON_TEACHING_STATUS.PENDING_VC_REVIEW;
  return NON_TEACHING_STATUS.DRAFT;
};

export const expectedPendingStatuses = (role) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  if (normalizedRole === "registrar") {
    return [
      NON_TEACHING_STATUS.PENDING_REGISTRAR_REVIEW,
      NON_TEACHING_STATUS.RO_REVIEWED,
    ];
  }
  if (normalizedRole === "vc") {
    return [
      NON_TEACHING_STATUS.PENDING_VC_REVIEW,
      NON_TEACHING_STATUS.REGISTRAR_REVIEWED,
    ];
  }
  return [expectedPendingStatus(normalizedRole)];
};

export const isPendingForNonTeachingReviewer = (statusOrItem = {}, role) => {
  const status = typeof statusOrItem === "string"
    ? statusOrItem
    : statusOrItem.status || statusOrItem.form?.status;
  return expectedPendingStatuses(role).includes(normalizeNonTeachingStatus(status));
};

const roleKeyForWorkflowStep = (step = {}, index = 0, steps = []) =>{
  const explicit = firstNonEmpty(step.roleKey, step.role_key, step.reviewerRole, step.reviewer_role, step.role);
  const normalizedExplicit = normalizeNonTeachingRole(explicit, explicit);
  if (normalizedExplicit === "reporting_officer") return "ro";
  if (normalizedExplicit === "registrar") return "registrar";
  if (normalizedExplicit === "vc") return "vc";

  const normalizedDesignation = normalizeStatusText(step.designation);
  if (normalizedDesignation.includes("reporting officer")) return "ro";
  if (["vc", "vice chancellor"].some((value) =>normalizedDesignation.includes(value))) return "vc";
  if (normalizedDesignation.includes("department head") || normalizedDesignation.includes("dept head")) return "ro";
  if (normalizedDesignation.includes("head") && !normalizedDesignation.includes("registrar")) return "ro";
  if (normalizedDesignation.includes("registrar")) return "registrar";
  if (index === steps.length - 1) return "vc";
  return index === 0 && steps.length >2 ? "ro" : "registrar";
};

export const nonTeachingWorkflowFor = (itemOrForm = {}, { includeInitial = true } = {}) =>{
  const workflowSource = workflowSourceFrom(itemOrForm);
  if (workflowSource) {
    return normalizeApprovalWorkflow(workflowSource, {
      includeInitial,
      initialDesignation: "Staff",
      status: firstNonEmpty(itemOrForm.status, itemOrForm.form?.status, itemOrForm.payload?.status),
    });
  }

  const flow = nonTeachingReviewFlow({ ...itemOrForm, workflow: null });
  const status = firstNonEmpty(itemOrForm.status, itemOrForm.form?.status, itemOrForm.payload?.status);
  const steps = flow
    .filter((role) =>role !== "self")
    .map((role, index) =>({
      stepNo: index + 1,
      designation: workflowDesignationForRole(role),
      status: workflowStepStatusForRole(status, role),
      roleKey: role,
    }));

  return normalizeApprovalWorkflow({ steps, status }, { includeInitial, initialDesignation: "Staff" });
};

export const workflowDesignationForNonTeachingRole = (itemOrForm = {}, role) =>{
  const normalizedRole = role === "self" ? "self" : normalizeNonTeachingRole(role, role);
  const workflow = nonTeachingWorkflowFor(itemOrForm, { includeInitial: true });
  if (normalizedRole === "self" || normalizedRole === "non_teaching_staff") return workflow.steps[0]?.designation || "Staff";
  const approvalSteps = workflow.approvalSteps || [];
  const match = approvalSteps.find((step, index) =>roleKeyForWorkflowStep(step, index, approvalSteps) === (normalizedRole === "reporting_officer" ? "ro" : normalizedRole));
  return match?.designation || workflowDesignationForRole(normalizedRole);
};

export const nonTeachingReviewFlow = (itemOrForm = {}) => {
  const workflowSource = workflowSourceFrom(itemOrForm);
  if (workflowSource) {
    const workflow = normalizeApprovalWorkflow(workflowSource, { includeInitial: false });
    return ["self", ...workflow.approvalSteps.map((step, index) =>roleKeyForWorkflowStep(step, index, workflow.approvalSteps))];
  }

  const rawRole = firstNonEmpty(
    itemOrForm.appraisalRole,
    itemOrForm.appraisal_role,
    itemOrForm.submittedByRole,
    itemOrForm.form?.submittedByRole,
    itemOrForm.payload?.submittedByRole,
  );
  const subjectRole = normalizeNonTeachingRole(rawRole, rawRole || "non_teaching_staff");

  if (subjectRole === "registrar") return ["self", "vc"];
  if (subjectRole === "reporting_officer") return ["self", "registrar", "vc"];
  if (
    subjectRole === "non_teaching_staff" &&
    nonTeachingReportsToRegistrar(itemOrForm)
  ) {
    return ["self", "registrar", "vc"];
  }
  if (subjectRole === "non_teaching_staff")
    return ["self", "ro", "registrar", "vc"];
  return ["self"];
};

export const visibleNonTeachingReviewRoles = (role, itemOrForm = {}) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  const flow = nonTeachingReviewFlow(itemOrForm);
  if (normalizedRole === "vc") return flow;
  if (normalizedRole === "registrar") {
    return flow.includes("registrar") ? ["self", "registrar"] : ["self"];
  }
  if (normalizedRole === "reporting_officer") {
    const index = flow.indexOf("ro");
    return index >= 0 ? flow.slice(0, index + 1) : ["self"];
  }
  return ["self"];
};

export const canReviewNonTeachingItem = (item = {}, reviewerRole) => {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  const subjectRole = normalizeNonTeachingRole(
    item.appraisalRole || item.appraisal_role || item.form?.submittedByRole || item.payload?.submittedByRole,
    item.appraisalRole || item.appraisal_role || item.form?.submittedByRole || item.payload?.submittedByRole,
  );

  if (role === "vc")
    return subjectRole !== "vc" && isNonTeachingRole(subjectRole);
  if (role === "registrar")
    return (
      subjectRole === "non_teaching_staff" ||
      subjectRole === "reporting_officer"
    );
  if (role === "reporting_officer")
    return (
      subjectRole === "non_teaching_staff" &&
      !nonTeachingReportsToRegistrar(item)
    );
  return false;
};

export const isNonTeachingReviewComplete = (item = {}) =>
  normalizeNonTeachingStatus(item.status) === NON_TEACHING_STATUS.VC_APPROVED || n(item.vcTotal) > 0;

const validateMarks = (form, authority) => {
  for (const { key, label, max } of SELF_ITEMS) {
    if (n(valueForAuthority(form[key], authority)) > max) {
      throw new Error(`${label} exceeds the maximum of ${max} marks.`);
    }
  }
};

export const validateNonTeachingForm = (
  form,
  authority = "self",
  requireRatings = false,
) => {
  validateMarks(form, authority);

  if (!requireRatings || authority === "self") return;

  for (const section of RATING_SECTIONS) {
    for (let index = 0; index < section.params.length; index += 1) {
      const value = n(
        ratingForAuthority(form.partB?.[section.key], index, authority),
      );
      if (value < 1 || value > 5) {
        throw new Error(`Please fill all ratings in ${section.title}.`);
      }
    }
  }
};

const stripSelfPartBRatings = (form) => {
  const nextForm = normalizeNonTeachingForm(form);
  RATING_SECTIONS.forEach((section) => {
    const rows = nextForm.partB?.[section.key] || {};
    section.params.forEach((_label, index) => {
      delete rows[`p${index}_self`];
    });
    nextForm.partB[section.key] = rows;
  });
  return nextForm;
};

export const loadNonTeachingAppraisal = async ({
  email = sessionStorage.getItem("username"),
  academicYear: ay = APP_INFO.DEFAULT_AY,
  profile = profileFromsessionStorage(),
  role = sessionStorage.getItem("role"),
} = {}) => {
  const staffEmail = emailKey(email);
  if (!staffEmail) return null;

  try {
    const data = await api.get("/non-teaching/appraisal", {
      params: { academic_year: ay },
    });
    if (!data) return null;
    return {
      ...data,
      form: normalizeNonTeachingForm(data.payload, { ...profile, ...data }, role),
    };
  } catch {
    return null;
  }
};

export const loadNonTeachingWorkflow = async ({
  email = sessionStorage.getItem("username"),
  academicYear: ay = APP_INFO.DEFAULT_AY,
  includeInitial = true,
} = {}) => {
  const staffEmail = emailKey(email);
  if (!staffEmail) {
    return normalizeApprovalWorkflow(
      { workflowName: DEFAULT_WORKFLOW_TITLE, status: "NOT_STARTED", steps: [] },
      { includeInitial, initialDesignation: "Staff" },
    );
  }

  const data = await api.get(`/non-teaching/workflow/${encodeURIComponent(staffEmail)}`, {
    params: { academic_year: academicYear(ay) },
  });
  return normalizeApprovalWorkflow(data || {}, {
    includeInitial,
    initialDesignation: "Staff",
    workflowName: data?.workflowName || data?.workflow_name || DEFAULT_WORKFLOW_TITLE,
  });
};

export const saveNonTeachingDraft = async ({
  form,
  role = sessionStorage.getItem("role"),
  profile = profileFromsessionStorage(),
} = {}) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  const draftForm = normalizeNonTeachingForm(
    { ...form, status: NON_TEACHING_STATUS.DRAFT, submittedByRole: normalizedRole },
    profile,
    normalizedRole,
  );
  const ay = academicYear(draftForm.info.ay);
  const data = await api.put("/non-teaching/appraisal", {
    academic_year: ay,
    payload: draftForm,
    status: NON_TEACHING_STATUS.DRAFT,
  });
  return {
    ...data,
    form: normalizeNonTeachingForm(data?.payload, { ...profile, ...data }, normalizedRole),
  };
};

export const submitNonTeachingSelfAppraisal = async ({
  form,
  role = sessionStorage.getItem("role"),
  profile = profileFromsessionStorage(),
} = {}) => {
  const normalizedRole = normalizeNonTeachingRole(role, role);
  const normalizedForm = normalizeNonTeachingForm(
    { ...form, submittedByRole: normalizedRole },
    profile,
    normalizedRole,
  );
  const status = NON_TEACHING_STATUS.PENDING_RO_REVIEW;
  const finalForm = stripSelfPartBRatings(
    normalizeNonTeachingForm(
      { ...normalizedForm, status },
      profile,
      normalizedRole,
    ),
  );

  validateNonTeachingForm(finalForm, "self", false);

  const ay = academicYear(finalForm.info.ay);
  const requestPayload = {
    academic_year: ay,
    payload: finalForm,
    status,
  };

  const data = await api.put("/non-teaching/appraisal", requestPayload);

  return {
    ...data,
    form: normalizeNonTeachingForm(data?.payload, { ...profile, ...data }, normalizedRole),
  };
};

export const decorateNonTeachingRow = (row, profile = {}) => {
  const form = normalizeNonTeachingForm(
    row.payload,
    profile,
    profile.appraisal_role,
  );
  const role = normalizeNonTeachingRole(
    profile.appraisal_role,
    normalizeNonTeachingRole(form.submittedByRole, "non_teaching_staff"),
  );
  const name = profile.full_name || form.info?.name || row.staff_email;
  const selfTotals = calculateNonTeachingTotals(form, "self");
  const roTotals = calculateNonTeachingTotals(form, "reporting_officer");
  const registrarTotals = calculateNonTeachingTotals(form, "registrar");
  const vcTotals = calculateNonTeachingTotals(form, "vc");
  const reportsToRegistrar = nonTeachingReportsToRegistrar({
    ...profile,
    ...row,
    form,
    payload: row.payload,
  });
  const workflowSource = workflowSourceFrom(row);

  return {
    id: `${row.staff_email}:${row.academic_year}`,
    email: row.staff_email,
    staff_email: row.staff_email,
    academicYear: row.academic_year,
    form,
    name,
    employeeId: profile.employee_id || form.info?.employeeId || "",
    designation:
      profile.designation ||
      form.info?.designation ||
      nonTeachingRoleLabel(role),
    department: profile.department || form.info?.department || "",
    appraisalRole: role,
    roleLabel: nonTeachingRoleLabel(role),
    reports_to_registrar: reportsToRegistrar,
    reportsToRegistrar,
    avatar: initialsFor(name, row.staff_email),
    avatarColor:
      role === "registrar"
        ? "#7c3aed"
        : role === "reporting_officer"
          ? "#0891b2"
          : "#1d4ed8",
    status: row.status || form.status,
    workflow: workflowSource
      ? nonTeachingWorkflowFor({ workflow: workflowSource, status: row.status || form.status }, { includeInitial: true })
      : null,
    submittedOn: row.submitted_at
      ? new Date(row.submitted_at).toLocaleDateString()
      : "",
    selfTotal: firstPositiveNumber(row.self_total, row.selfTotal, selfTotals.total),
    roTotal: firstPositiveNumber(row.ro_total, row.roTotal, roTotals.total),
    registrarTotal: firstPositiveNumber(row.registrar_total, row.registrarTotal, registrarTotals.total),
    vcTotal: firstPositiveNumber(row.vc_total, row.vcTotal, vcTotals.total),
    declaration: row,
  };
};

const normalizeNonTeachingQueueItem = (item = {}) => {
  const rawRole = firstNonEmpty(
    item.appraisalRole,
    item.appraisal_role,
    item.role,
    item.form?.submittedByRole,
    item.payload?.submittedByRole,
  );
  const role = normalizeNonTeachingRole(rawRole, rawRole || "non_teaching_staff");
  const form = normalizeNonTeachingForm(
    item.form || item.payload || {},
    item,
    role,
  );
  const staffEmail = emailKey(firstNonEmpty(
    item.email,
    item.staff_email,
    item.staffEmail,
    form.info?.email,
  ));
  const ay = academicYear(firstNonEmpty(item.academicYear, item.academic_year, form.info?.ay));
  const name = firstNonEmpty(item.name, item.full_name, item.fullName, form.info?.name, staffEmail);
  let status = normalizeNonTeachingStatus(firstNonEmpty(item.status, form.status, NON_TEACHING_STATUS.DRAFT));
  const selfTotals = calculateNonTeachingTotals(form, "self");
  const roTotals = calculateNonTeachingTotals(form, "reporting_officer");
  const registrarTotals = calculateNonTeachingTotals(form, "registrar");
  const vcTotals = calculateNonTeachingTotals(form, "vc");
  const reportsToRegistrar = nonTeachingReportsToRegistrar({
    ...item,
    form,
    payload: item.payload,
  });
  const workflowSource = workflowSourceFrom(item);
  return {
    ...item,
    id: firstNonEmpty(item.id, `${staffEmail}:${ay}`),
    email: staffEmail,
    staff_email: staffEmail,
    academicYear: ay,
    academic_year: ay,
    form: { ...form, status },
    name,
    employeeId: firstNonEmpty(item.employeeId, item.employee_id, form.info?.employeeId),
    designation: firstNonEmpty(item.designation, form.info?.designation, nonTeachingRoleLabel(role)),
    department: firstNonEmpty(item.department, form.info?.department),
    appraisalRole: role,
    appraisal_role: role,
    roleLabel: nonTeachingRoleLabel(role),
    reports_to_registrar: reportsToRegistrar,
    reportsToRegistrar,
    avatar: item.avatar || initialsFor(name, staffEmail),
    avatarColor: item.avatarColor ||
      (role === "registrar" ? "#7c3aed" : role === "reporting_officer" ? "#0891b2" : "#1d4ed8"),
    status,
    workflow: workflowSource
      ? nonTeachingWorkflowFor({ workflow: workflowSource, status }, { includeInitial: true })
      : null,
    selfTotal: firstPositiveNumber(item.selfTotal, item.self_total, selfTotals.total),
    roTotal: firstPositiveNumber(item.roTotal, item.ro_total, roTotals.total),
    registrarTotal: firstPositiveNumber(item.registrarTotal, item.registrar_total, registrarTotals.total),
    vcTotal: firstPositiveNumber(item.vcTotal, item.vc_total, vcTotals.total),
  };
};

export const fetchNonTeachingQueueForRole = async ({
  reviewerRole,
  academicYear: ay = APP_INFO.DEFAULT_AY,
} = {}) => {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  if (!role || role === "non_teaching_staff") return [];

  try {
    const params = { academic_year: academicYear(ay) };

    const items = await api.get("/non-teaching/subordinates", { params });
    return (items || []).map(normalizeNonTeachingQueueItem);
  } catch (err) {
    throw new Error(err?.message || "Could not load non-teaching review queue.", { cause: err });
  }
};

export const primeFormForReviewer = (form = {}, reviewerRole) => {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  const nextForm = normalizeNonTeachingForm(form);

  const partBTarget =
    role === "vc" ? "vc" : role === "registrar" ? "reg" : "ro";

  SELF_ITEMS.forEach(({ key }) => {
    const item = nextForm[key] || {};
    const targetKey =
      role === "vc" ? "vcMarks" : role === "registrar" ? "regMarks" : "roMarks";
    if (!clean(item[targetKey])) {
      item[targetKey] = "";
    }
    nextForm[key] = item;
  });

  RATING_SECTIONS.forEach((section) => {
    const rows = nextForm.partB[section.key] || {};
    section.params.forEach((_label, index) => {
      const targetKey = `p${index}_${partBTarget}`;
      if (!clean(rows[targetKey])) {
        rows[targetKey] = "";
      }
    });
    nextForm.partB[section.key] = rows;
  });

  return nextForm;
};

export const submitNonTeachingReview = async ({
  item,
  form,
  reviewerRole,
  remarks = "",
} = {}) => {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  const authority = role === "vc" ? "vc" : role;
  const finalForm = normalizeNonTeachingForm(
    {
      ...form,
      roRemarks: role === "reporting_officer" ? remarks : form.roRemarks,
      registrarRemarks: role === "registrar" ? remarks : form.registrarRemarks,
      vcRemarks: role === "vc" ? remarks : form.vcRemarks,
    },
    item?.form?.info || {},
    item?.appraisalRole,
  );

  validateNonTeachingForm(finalForm, authority, true);

  const staffEmail = emailKey(item?.email || finalForm.info.email);
  const ay = academicYear(item?.academicYear || finalForm.info.ay);
  const requestPayload = {
    academic_year: ay,
    total_score: calculateNonTeachingTotals(finalForm, authority).total,
    payload: finalForm,
  };

  const data = await api.put(
    `/non-teaching/review/${encodeURIComponent(staffEmail)}`,
    requestPayload,
  );

  return decorateNonTeachingRow(data || {}, {
    email: staffEmail,
    full_name: item?.name || finalForm.info.name,
    employee_id: item?.employeeId,
    designation: item?.designation,
    department: item?.department,
    appraisal_role: item?.appraisalRole,
    reports_to_registrar: item?.reports_to_registrar,
    reportsToRegistrar: item?.reportsToRegistrar,
  });
};

const escapeHtml = (value) =>
  clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ratingLabel = (value) => {
  const match = RATING_SCALE.find((rating) => rating.value === n(value));
  return match ? `${value} - ${match.label}` : value || "";
};

const summaryOtherInfoBlock = (value) =>
  clean(value)
    ? `<h2>Any other information not covered above</h2><div class="box">${escapeHtml(value)}</div>`
    : "";

export const openNonTeachingReport = ({
  item = {},
  form = item.form,
  generatedBy = localStorage.getItem("name") || "Authority",
  visibleRoles = ["self", "ro", "registrar", "vc"],
  includePartB = true,
} = {}) => {
  const reportForm = normalizeNonTeachingForm(
    form || item.form,
    item,
    item.appraisalRole,
  );
  const totals = {
    self: calculateNonTeachingTotals(reportForm, "self"),
    ro: calculateNonTeachingTotals(reportForm, "reporting_officer"),
    registrar: calculateNonTeachingTotals(reportForm, "registrar"),
    vc: calculateNonTeachingTotals(reportForm, "vc"),
  };
  const normalizeReportRole = (role) =>
    ({
      reporting_officer: "ro",
      reg: "registrar",
    })[role] || role;
  const reportRoles = Array.from(
    new Set(["self", ...(visibleRoles || []).map(normalizeReportRole)]),
  ).filter((role) => ["self", "ro", "registrar", "vc"].includes(role));
  const partBRoles = reportRoles.filter((role) => role !== "self");
  const maxForRole = (role) =>
    role === "self" ? NON_TEACHING_MAX.partA : NON_TEACHING_MAX.grand;
  const labelForRole = (role) =>workflowDesignationForNonTeachingRole({ ...item, form: reportForm }, role);
  const reportColumns = {
    self: {
      label: labelForRole("self"),
      total: totals.self.total,
      partA: (key) => reportForm[key]?.marks,
      remarks: reportForm.remarks,
      remarksLabel: labelForRole("self"),
    },
    ro: {
      label: labelForRole("reporting_officer"),
      total: totals.ro.total,
      partA: (key) => reportForm[key]?.roMarks,
      partB: (row, index) => row[`p${index}_ro`],
      remarks: reportForm.roRemarks,
      remarksLabel: labelForRole("reporting_officer"),
    },
    registrar: {
      label: labelForRole("registrar"),
      total: totals.registrar.total,
      partA: (key) => reportForm[key]?.regMarks,
      partB: (row, index) => row[`p${index}_reg`],
      remarks: reportForm.registrarRemarks,
      remarksLabel: labelForRole("registrar"),
    },
    vc: {
      label: labelForRole("vc"),
      total: totals.vc.total,
      partA: (key) => reportForm[key]?.vcMarks,
      partB: (row, index) => row[`p${index}_vc`],
      remarks: reportForm.vcRemarks,
      remarksLabel: "Vice Chancellor Remarks and Grade",
    },
  };
  const docsFor = (key) =>
    (reportForm.docs?.[key] || [])
      .map(
        (file) =>
          `<a href="${escapeHtml(file.url)}" target="_blank">${escapeHtml(file.name || file.url)}</a>`,
      )
      .join("<br>") || "-";

  const partARows = SELF_ITEMS.map(
    ({ key, label, max }) => `
    <tr>
      <td>${escapeHtml(label)}</td>
      <td>${escapeHtml(reportForm[key]?.text)}</td>
      <td>${docsFor(key)}</td>
      <td>${max}</td>
      ${reportRoles.map((role) => `<td>${escapeHtml(reportColumns[role].partA(key))}</td>`).join("")}
    </tr>
  `,
  ).join("");

  const partBRows = RATING_SECTIONS.map(
    (section) => `
    <h3>${escapeHtml(section.title)} (Max ${section.max})</h3>
    <table>
      <thead>
        <tr><th>Parameter</th>${partBRoles.map((role) => `<th>${escapeHtml(reportColumns[role].label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${section.params
          .map((param, index) => {
            const row = reportForm.partB?.[section.key] || {};
            return `<tr>
            <td>${escapeHtml(param)}</td>
            ${partBRoles.map((role) => `<td>${escapeHtml(ratingLabel(reportColumns[role].partB(row, index)))}</td>`).join("")}
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  `,
  ).join("");

  const reportWindow = window.open("", "_blank", "width=1100,height=800");
  if (!reportWindow) return;

  reportWindow.document.write(`
    <html>
      <head>
        <title>Non-Teaching Appraisal Report</title>
        <style>
          body { font-family: Georgia, serif; color: #0f172a; padding: 28px; }
          h1 { margin: 0 0 4px; font-size: 24px; }
          h2 { margin: 22px 0 8px; font-size: 16px; color: #1d4ed8; }
          h3 { margin: 18px 0 8px; font-size: 14px; color: #155e75; }
          .muted { color: #64748b; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 18px; margin: 18px 0; }
          .box { border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px; }
          .label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
          th { background: #0f172a; color: #e2e8f0; text-align: left; }
          .totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
          .total { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
          .score { font-size: 18px; font-weight: 800; color: #1d4ed8; }
          .report-header { position: relative; }
          .report-logo { position: absolute; top: 0; right: 0; width: 64px; max-height: 52px; object-fit: contain; }
          .print-action { position: fixed; top: 12px; left: 12px; padding: 8px 14px; }
          @media print { button { display: none; } body { padding: 10px; } }
        </style>
      </head>
      <body>
        <button class="print-action" onclick="window.print()">Print</button>
        <header class="report-header">
          <img class="report-logo" src="${window.location.origin}/dypiu.jpeg" alt="DYPIU Logo" />
          <h1>Non-Teaching Staff Appraisal Report</h1>
          <div class="muted">${escapeHtml(APP_INFO.UNIVERSITY_NAME)} | Academic Year ${escapeHtml(reportForm.info?.ay || item.academicYear)}</div>
        </header>

        <div class="grid">
          ${[
            ["Name", reportForm.info?.name || item.name],
            ["Employee ID", reportForm.info?.employeeId || item.employeeId],
            [
              "Role",
              nonTeachingRoleLabel(
                item.appraisalRole || reportForm.submittedByRole,
              ),
            ],
            ["Designation", reportForm.info?.designation || item.designation],
            ["Department", reportForm.info?.department || item.department],
            ["Status", reportForm.status || item.status],
          ]
            .map(
              ([label, value]) =>
                `<div class="box"><div class="label">${label}</div><div>${escapeHtml(value)}</div></div>`,
            )
            .join("")}
        </div>

        <div class="totals" style="grid-template-columns: repeat(${reportRoles.length}, 1fr);">
          ${reportRoles.map((role) => `<div class="total"><div class="label">${escapeHtml(reportColumns[role].label)}</div><div class="score">${reportColumns[role].total.toFixed(1)} / ${maxForRole(role)}</div></div>`).join("")}
        </div>

        <h2>Part A - Self Appraisal</h2>
        <table>
          <thead>
            <tr><th>Particular</th><th>Description</th><th>Documents</th><th>Max</th>${reportRoles.map((role) => `<th>${escapeHtml(reportColumns[role].label)}</th>`).join("")}</tr>
          </thead>
          <tbody>${partARows}</tbody>
        </table>

        ${includePartB && partBRoles.length ? `<h2>Part B - Authority Ratings</h2>${partBRows}` : ""}

        ${summaryOtherInfoBlock(reportForm.summaryOtherInfo)}
        <h2>Remarks</h2>
        <table>
          <tbody>
            ${reportRoles.map((role) => `<tr><th>${escapeHtml(reportColumns[role].remarksLabel)}</th><td>${escapeHtml(reportColumns[role].remarks)}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="muted">Generated by ${escapeHtml(generatedBy)} on ${new Date().toLocaleString()}</div>
      </body>
    </html>
  `);
  reportWindow.document.close();
};
