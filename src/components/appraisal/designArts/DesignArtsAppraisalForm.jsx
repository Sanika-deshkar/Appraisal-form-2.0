/* eslint-disable no-unused-vars, react-hooks/preserve-manual-memoization, react-refresh/only-export-components */
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, LogoutConfirmModal, ScoreBar, StatusBadge } from "../../dashboard/dashboardPrimitives";
import { getSchoolByValue, getSchoolKey } from "../../../constants/universityHierarchy";
import { api } from "../../../services/api";
import {
 ACR_DETAIL_POINTS,
 APP_INFO,
 createAcrRows,
 FORM_SCHOOL_CODES,
 FORM_TYPES,
 fetchSavedAppraisal,
 loadAppraisalDocuments,
 loadSavedAppraisal,
 mergeFacultyInfo,
 saveAppraisalDraftSection,
 submitAppraisal,
 fetchReviewQueueForRole,
 loadReviewerDraft,
 saveReviewerDraft,
 submitWorkflowReview,
 buildReviewRemarks,
 openFullFormReport,
 generateMediaCommReport,
 INNOVATIVE_METHODS,
 SCORE_LIMITS,
 averageSectionScore,
 clampScore,
 courseFileRowScore,
 effectiveMaxScore,
 feedbackAverage,
 feedbackRowScore,
 feedbackSectionScore,
 innovativeSelectionsFromDetails,
 innovativeTeachingScore,
 isValidDDMMYYYY,
 maskDateDDMMYYYY,
 normalizeAutoScores,
 projectGuidanceRowMax,
 researchGuidanceRowMax,
 researchGuidanceScore,
 clampReviewScore,
 reviewRowMaxForSection,
 reviewSectionScore,
 rowHasReviewableData,
 scoreSectionRows,
 selfEffectivePartAMax,
 societyRowLocked,
 societyRowScore,
 sumSectionScore,
 toggleInnovativeMethod,
 validateCompleteRows,
 AppraisalHeaderImage,
 SummaryOtherInfoField,
 summaryOtherInfoValueFrom,
 RejectionNotice,
 DocCell,
 ViewCell,
 SectionSaveFooter,
 RowButtons as RowBtns,
} from "../../../features/faculty-appraisal";
import { canReviewerRejectProfile, getReviewChain, pendingStatusFor, profileFromsessionStorage, reviewedStatusFor, roleLabel, visiblePreviousReviewRoles, workflowValidationError, isAppraisalFinalisedByVc, isRejectedStatus, isPendingReviewStatusFor, hasActiveRejection, reviewListFrom } from "../../../utils/hierarchy";
import { n, pct, RO, TI } from "../../../features/faculty-appraisal/shared";
import SectionShell from "./common/SectionShell";
import { thStyle, tdStyle, tdCenter } from "./common/TableStyles";

export const ACCENT = "#9d174d";
export const ACCENT2 = "#4338ca";
const VERIFY_TEXT = "I have verified all the details and confirm that the information provided is correct. I am responsible for the accuracy of this data.";
const smallButton = (background) => ({ padding: "8px 14px", background, color: "#fff", border: "none", borderRadius: 7, cursor: background === "#94a3b8" ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit" });
export const PART_A_MAX = 150;
export const PART_B_MAX = 350;
export const PART_C_MAX = 150;
export const PART_D_MAX = 50;
export const GRAND_MAX = 700;

export const titleCase = (value) => String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);

export const designArtsSchoolName = (schoolValue = "") => {
  const schoolObj = getSchoolByValue(schoolValue);
  return schoolObj ? schoolObj.label : "School of Design & Applied Arts";
};

export const isReviewerReviewComplete = (item = {}, reviewerRole = "") => {
  const status = String(item?.status || item?.workflowStatus || item?.workflow_status || "");
  if (isPendingReviewStatusFor([item?.status, item?.workflowStatus, item?.workflow_status], reviewerRole)) return false;
  const reviewerLabel = roleLabel(reviewerRole);
  return (
    n(item?.[`${reviewerRole}Total`]) > 0 ||
    String(item?.[`${reviewerRole}Remarks`] ?? "").trim() !== "" ||
    status === reviewedStatusFor(reviewerRole) ||
    new RegExp(`${reviewerLabel}\\s*(Reviewed|Approved|Rejected)`, "i").test(status)
  );
};

export const userInitials = (name) =>
  String(name || "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const defaultObeRows = () => [
  { component: "1. CO-PO mapping sheet (5 Marks)", evidence: "", score: "", max: 5 },
  { component: "2. Attainment calculation (10 Marks)", evidence: "", score: "", max: 10 },
  { component: "3. Corrective action plan (5 Marks)", evidence: "", score: "", max: 5 },
];

export const defaultMentoringRows = () => [
  { activity: "1. Mentoring meetings conducted (min. 2/semester)", evidence: "", score: "", max: 4 },
  { activity: "2. Mentoring register maintained", evidence: "", score: "", max: 3 },
  { activity: "3. Documented academic/career counselling outcomes", evidence: "", score: "", max: 3 },
];

export const emptyDesignArtsForm = () => ({
  info: {
    name: sessionStorage.getItem("name") || "",
    qual: sessionStorage.getItem("qualification") || "",
    desig: sessionStorage.getItem("designation") || "",
    experience: sessionStorage.getItem("experience") || "",
    ay: sessionStorage.getItem("academicYear") || APP_INFO.DEFAULT_AY,
    school: sessionStorage.getItem("school") || "SoD - School of Design",
  },
  lectures: [{ sem: "", code: "", planned: "", conducted: "", score: "" }],
  courseFile: [{ course: "", title: "", details: "", score: "" }],
  innovDetails: "",
  innovScore: "",
  innovRows: [{ method: "", details: "", score: "" }],
  obeRows: defaultObeRows(),
  mentoringRows: defaultMentoringRows(),
  projects: [{ label: "", score: "" }],
  quals: [{ label: "", score: "" }],
  feedback: [{ code: "", fb1: "", fb2: "", score: "" }],
  uniActs: [{ activity: "", durationCat: "", period: "", score: "" }],
  deptActs: [{ activity: "", durationCat: "", period: "", score: "" }],
  events: [{ event: "", role: "", date: "", level: "", score: "" }],
  society: [{ activity: "", details: "", date: "", score: "" }],
  industry: [{ activity: "", partner: "", date: "", score: "" }],
  alumni: [{ activity: "", details: "", date: "", score: "" }],
  placements: [{ type: "", name: "", date: "", score: "" }],
  acr: createAcrRows(),
  journals: [{ title: "", journal: "", doi: "", index: "", impact: "", coAuthors: "", firstAuthor: "", score: "" }],
  books: [{ title: "", book: "", isbn: "", publisher: "", coAuthors: "", first: "", score: "" }],
  ipr: [{ title: "", scope: "", status: "", fileNo: "", score: "" }],
  externalProjects: [{ title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }],
  research: [{ degree: "", name: "", thesis: "", score: "" }],
  consultancy: [{ title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }],
  confs: [{ title: "", type: "", org: "", level: "", score: "" }],
  fdps: [{ program: "", duration: "", org: "", score: "" }],
  awards: [{ title: "", date: "", agency: "", level: "", score: "" }],
  innovation: [{ title: "", details: "", impact: "", score: "" }],
  ict: [{ title: "", desc: "", type: "", quad: "", score: "" }],
  exhibitions: [{ title: "", type: "", venueLevel: "", date: "", score: "" }],
  summaryOtherInfo: "",
});

export const SECTION_OPTIONS = [
  { value: "partA", label: "Part A — Teaching & Learning (Max: 150)" },
  { value: "partB", label: "Part B — Research & Creative Output (Max: 350)" },
  { value: "partC", label: "Part C — Administrative Role & Contribution (Max: 150)" },
  { value: "partD", label: "Part D — Annual Confidential Report (Max: 50)" },
  { value: "summary", label: "Summary & Verification (Grand Total: 700)" },
];

export const PART_A_SECTIONS = [
  { key: "lectures", title: "A1. Course Delivery & Classroom Engagement", max: 40, rowMax: 10, doc: "lec", fields: [["sem", "Semester"], ["code", "Course Code / Name"], ["planned", "Classes (as per course structure)"], ["conducted", "Classes Actually Conducted"], ["pctConducted", "% Conducted"]] },
  { key: "courseFile", title: "A2. Course File & Curriculum Documentation", max: 20, doc: "cf", rowMax: SCORE_LIMITS.courseFileRow, fields: [["course", "Course / Paper"], ["title", "Title"], ["details", "IQAC Index Compliance (Yes/No, with proof)"]] },
  { key: "projects", title: "A6. Student Project Guidance", max: 20, doc: "proj", rowMax: projectGuidanceRowMax, fields: [["label", "Project Category"]] },
  { key: "quals", title: "A8. Qualification Enhancement", max: 10, doc: "qual", rowMax: SCORE_LIMITS.qualificationRow, fields: [["label", "Category"]] },
  { key: "feedback", title: "A4. Student Feedback Score", max: 10, doc: "fb", fields: [["code", "Course Code / Name"], ["fb1", "First Feedback(%)"], ["fb2", "Second Feedback(%)"]] },
];

export const PART_B_SECTIONS = [
  { key: "journals", title: "B1. Journal Publications / Academic Research Papers", max: 60, doc: "jour", fields: [["title", "Title (with page nos.)"], ["journal", "Journal Details"], ["doi", "DOI No."], ["index", "Indexing (Q1/Q2/Q3/Q4)"], ["impact", "Impact Factor"], ["coAuthors", "Co-authors"], ["firstAuthor", "First Author?"]] },
  { key: "books", title: "B2. Books, Book Chapters & Edited Volumes", max: 30, doc: "book", fields: [["title", "Title"], ["publisher", "Publisher & ISBN"], ["type", "Type (Book/Chapter/Editor/Translation)"], ["level", "Level (Intl./National/Local)"], ["coAuthors", "Co-authors from DYPIU"]] },
  { key: "ipr", title: "B3. Patents, Copyrights, IP & Creative Product Development", max: 40, doc: "ipr", fields: [["title", "Title"], ["scope", "National / International"], ["status", "Status (Published/Granted)"], ["fileNo", "Filing / Grant No. & Date"]] },
  { key: "externalProjects", title: "B4. Funded Research / Creative Projects & Grants", max: 20, doc: "ext", fields: [["title", "Title of Project / Grant"], ["agency", "Funding Agency"], ["date", "Sanction Date"], ["amount", "Amount (₹)"], ["role", "PI / Co-PI"], ["status", "Status"]] },
  { key: "research", title: "B5. Research / Creative Guidance", max: 20, doc: "res", rowMax: researchGuidanceRowMax, fields: [["degree", "Degree (PhD/PG)"], ["name", "Name of Student / Scholar"], ["status", "Status (Ongoing/Awarded)"], ["date", "Date"]] },
  { key: "consultancy", title: "B6. Consultancy, Training & Creative Commissions", max: 30, doc: "con", fields: [["client", "Client / Organisation"], ["nature", "Nature of Engagement"], ["amount", "Revenue Generated (₹)"]] },
  { key: "confs", title: "B7. Conference / FDP / Festival Contributions — Organised", max: 20, doc: "conf", fields: [["title", "Event / Session Title"], ["role", "Role"], ["date", "Date"], ["level", "Level (Intl./National)"]] },
  { key: "fdps", title: "B8. Conference / FDP / Industry-Studio Training Attended", max: 20, doc: "fdp", fields: [["program", "Programme / Event"], ["duration", "Duration"], ["org", "Organised By"]] },
  { key: "awards", title: "B9. Research Awards, Fellowships, Reviewer & Citations", max: 20, doc: "awd", fields: [["title", "Title of Award / Fellowship / Metric"], ["agency", "Awarding Agency"], ["level", "Level"], ["date", "Date"]] },
  { key: "innovation", title: "B10. Innovation, Start-ups & Technology Transfer", max: 20, doc: "inn", fields: [["title", "Title / Start-up / Product"], ["role", "Role"], ["status", "Status"]] },
  { key: "ict", title: "B11. ICT Content, MOOCs & E-Learning", max: 40, doc: "ict", fields: [["title", "Title"], ["platform", "Platform / Type"], ["reach", "Reach / Views (if available)"]] },
  { key: "exhibitions", title: "B12. Exhibitions — Photography, Design & Applied Arts, Documentaries, Films & Audio-Visual Productions", max: 30, doc: "exh", fields: [["title", "Title of Work / Exhibition"], ["type", "Type (Solo/Group/Curated)"], ["venueLevel", "Venue & Level (Institutional/National/Intl.)"], ["date", "Date"]] },
];

export const PART_C_SECTIONS = [
  { key: "uniActs", title: "C1. Administration at University Level", max: 50, doc: "uni", fields: [["activity", "Activity / Responsibility"], ["durationCat", "Duration Category"], ["period", "Period"]] },
  { key: "deptActs", title: "C2. Administration at School Level", max: 30, doc: "dept", fields: [["activity", "Activity / Responsibility"], ["durationCat", "Duration Category"], ["period", "Period"]] },
  { key: "events", title: "C3. Event Organisation & Institutional Visibility", max: 20, doc: "evt", fields: [["event", "Event / Contribution"], ["role", "Role"], ["date", "Date"], ["level", "Level"]] },
  { key: "society", title: "C4. Mentoring Student Clubs, Outreach, Extension & Social Responsibility", max: 10, doc: "soc", fields: [["activity", "Activity"], ["details", "Details"], ["date", "Date"]] },
  { key: "industry", title: "C5. Industry Interaction & Linkages", max: 10, doc: "ind", fields: [["activity", "Activity (MOU / CoE / Drive / Programme)"], ["partner", "Industry Partner"], ["date", "Date"]] },
  { key: "alumni", title: "C6. Alumni Engagement & Networking", max: 10, doc: "alm", fields: [["activity", "Activity"], ["details", "Details"], ["date", "Date"]] },
  { key: "placements", title: "C7. Student Placement Mentoring & Career Development", max: 20, doc: "plc", fields: [["type", "Activity Type"], ["name", "Student / Company Name"], ["date", "Date"]] },
];

export const PART_D_SECTIONS = [
  { key: "acr", title: "Part D — Annual Confidential Report (ACR) - Max 50 marks", max: 50, doc: "acr", rowMax: SCORE_LIMITS.acrRow, fields: [["label", "Attribute", true]], selfReadOnlyScore: true },
];

export const ALL_ARRAY_KEYS = [...PART_A_SECTIONS, ...PART_B_SECTIONS, ...PART_C_SECTIONS, ...PART_D_SECTIONS, { key: "obeRows" }, { key: "mentoringRows" }].map((section) => section.key);
const SECTION_MAX_BY_KEY = Object.fromEntries([...PART_A_SECTIONS, ...PART_B_SECTIONS, ...PART_C_SECTIONS, ...PART_D_SECTIONS, { key: "obeRows", max: 20 }, { key: "mentoringRows", max: 10 }].map((section) => [section.key, section.max]));
const REVIEW_SCORE_FIELDS = ["hod", "director", "dean", "vc"];
export const preserveSavedReviewScores = (form = {}, source = {}) =>{
 const merged = { ...form };
 merged.info = mergeFacultyInfo(form.info, source, form);
 ALL_ARRAY_KEYS.forEach((key) =>{
 if (!Array.isArray(form[key])) return;
 const sourceRows = Array.isArray(source[key]) ? source[key] : [];
 merged[key] = form[key].map((row, index) =>{
 const sourceRow = sourceRows[index] || {};
 const next = { ...row };
 REVIEW_SCORE_FIELDS.forEach((field) =>{
 if (String(next[field] ?? "").trim() === "" && String(sourceRow[field] ?? "").trim() !== "") next[field] = sourceRow[field];
 });
 return next;
 });
 });
 ["innovHod", "innovDirector", "innovDean", "innovVc"].forEach((field) =>{
 if (String(merged[field] ?? "").trim() === "" && String(source[field] ?? "").trim() !== "") merged[field] = source[field];
 });
 if (Array.isArray(form.innovRows)) {
 const sourceRows = Array.isArray(source.innovRows) ? source.innovRows : [];
 merged.innovRows = form.innovRows.map((row, index) =>{
 const sourceRow = sourceRows[index] || {};
 const next = { ...row };
 REVIEW_SCORE_FIELDS.forEach((field) =>{
 if (String(next[field] ?? "").trim() === "" && String(sourceRow[field] ?? "").trim() !== "") next[field] = sourceRow[field];
 });
 return next;
 });
 }
 return merged;
};

const scoreKeyForInnov = (role) =>({
 hod: "innovHod",
 director: "innovDirector",
 dean: "innovDean",
 vc: "innovVc",
}[role] || "innovScore");

export const calculateDesignArtsTotals = (form, scoreKey = "score") =>{
  const maxScores = getDesignArtsEffectiveMaxScores(form, { self: scoreKey === "score" });
  const rowSum = (key, max) =>scoreSectionRows(key, form[key] || [], max, scoreKey);
  const lecturesScore = scoreSectionRows("lectures", form.lectures || [], 40, scoreKey);
  const courseFileScore = scoreSectionRows("courseFile", form.courseFile || [], 20, scoreKey);
  const innovativeScore = scoreKey === "score" && Array.isArray(form.innovRows)
    ? clampScore(form.innovRows.reduce((total, row) =>total + clampScore(row.score, SCORE_LIMITS.innovativeRow), 0), 20)
    : scoreKey === "score" ? innovativeTeachingScore(form.innovDetails, form.innovScore, 20) : clampScore(form[scoreKeyForInnov(scoreKey)], 20);
  const obeScore = scoreSectionRows("obeRows", form.obeRows || [], 20, scoreKey);
  const mentoringScore = scoreSectionRows("mentoringRows", form.mentoringRows || [], 10, scoreKey);

  const partA = clampScore(
    lecturesScore + courseFileScore + innovativeScore + obeScore + mentoringScore +
    rowSum("projects", 20) + rowSum("quals", 10) +
    (scoreKey === "score" ? feedbackSectionScore(form.feedback, 10) : reviewSectionScore("feedback", form.feedback || [], 10, scoreKey)),
    maxScores.partA,
  );

  const b8Score = rowSum("fdps", 20);
  const partB = clampScore(
    PART_B_SECTIONS
      .reduce((total, section) =>total + rowSum(section.key, section.max), 0),
    maxScores.partB,
  );

  const partC = clampScore(
    rowSum("uniActs", 50) + rowSum("deptActs", 30) + rowSum("events", 20) +
    rowSum("society", 10) + rowSum("industry", 10) + rowSum("alumni", 10) + rowSum("placements", 20),
    maxScores.partC,
  );

  const partD = scoreKey === "score" ? 0 : clampScore(rowSum("acr", 50), maxScores.partD);
  const total = clampScore(partA + partB + partC + partD, maxScores.grand);

  return { partA, partB, partC, partD, total, maxScores };
};

export const getDesignArtsEffectiveMaxScores = (form = {}, { self = false } = {}) =>{
  return { partA: PART_A_MAX, partB: PART_B_MAX, partC: PART_C_MAX, partD: PART_D_MAX, grand: GRAND_MAX };
};

export const summaryRow = (applicability = {}, key, row) =>
 [row];

export const b8summaryRow = (applicability = {}, row) =>
 [row];

const ensureIds = (rows) =>Array.isArray(rows) ? rows.map((row) =>(row._id ? row : { ...row, _id: uid() })) : rows;

export const mergeForm = (base, incoming = {}) =>{
 const merged = { ...base, ...incoming };
 ALL_ARRAY_KEYS.forEach((key) =>{
  merged[key] = ensureIds(
   Array.isArray(incoming[key]) && incoming[key].length > 0
    ? incoming[key]
    : (Array.isArray(base[key]) && base[key].length > 0 ? base[key] : [{ _id: uid() }])
  );
 });
 merged.info = { ...base.info, ...(incoming.info || {}) };
 merged.acr = createAcrRows(incoming.acr || base.acr);
 return merged;
};

export const normalizeScoresForSubmit = (form) =>normalizeAutoScores(form);

export const validateDesignArtsBeforeSubmit = (form, docs = {}, sectionView = "all") =>{
 const sectionsToValidate = sectionView === "partA" ? PART_A_SECTIONS : sectionView === "partB" ? PART_B_SECTIONS : [...PART_A_SECTIONS, ...PART_B_SECTIONS];
 const rowSections = sectionsToValidate.map((section) =>({
 label: section.title,
 rows: form[section.key] || [],
 fields: [
 ...section.fields.filter(([, , readOnly]) =>!readOnly).map(([key]) =>key),
 ...(section.selfReadOnlyScore || section.autoScore || section.key === "feedback" ? [] : ["score"]),
 ],
 rowMax: section.rowMax,
 maxScore: section.key === "feedback" ? undefined : section.max,
 docPrefix: section.key !== "acr" ? section.doc : "",
 }));
 const errors = validateCompleteRows(rowSections, docs);

 if (sectionView !== "partA") ["internalProjects", "externalProjects"].forEach((key) =>{
 (form[key] || []).forEach((row, index) =>{
 if (row.date && !isValidDDMMYYYY(row.date)) {
 errors.push(`${key === "internalProjects" ? "B4(b)" : "B4(c)"}, row ${index + 1}: date must be DD/MM/YYYY.`);
 }
 });
 });

 if (sectionView !== "partB") {
 const innovRows = Array.isArray(form.innovRows) && form.innovRows.length
 ? form.innovRows
 : [{ method: form.innovDetails, details: form.innovDetails, score: form.innovScore }];
 errors.push(...validateCompleteRows([{
 label: "A(iii). Innovative Teaching Methods",
 rows: innovRows,
 fields: ["method", "details", "score"],
 docPrefix: "innov",
 rowMax: SCORE_LIMITS.innovativeRow,
 maxScore: 10,
 }], docs));
 }

 return errors;
};

const NUMERIC_KEYS = new Set(["planned", "conducted", "fb1", "fb2", "amount"]);
const TEXT_ONLY_KEYS = new Set(["title", "course", "name", "degree", "thesis", "agency", "role", "status", "type", "level", "activity", "nature", "journal", "book", "publisher", "org", "program", "company", "desc", "coAuthors", "media", "film"]);

function SectionTable({ section, form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles }) {
 const rows = form[section.key] || [];
 const reviewRows = reviewData?.[section.key] || [];
 const editableSelf = mode === "self" && !locked;
 const reviewLocked = mode === "review" && locked;
 const currentRole = reviewerRole;
 const selfLocked = mode === "self" && section.key === "acr";
 const earned = scoreSectionRows(section.key, rows, section.max);
 const hideIndividualB8Summary = section.key === "fdps" || section.key === "training";
 const totalLabel = ["feedback"].includes(section.key)
 ? `Average Score (Max ${section.max})`
 : `Total Score (Max ${section.max})`;
 const totalLabelColSpan = 1 + section.fields.length + (section.key === "feedback" ? 1 : 0) + 2;
 const sectionTotalScore = (sourceRows = rows, scoreKey = "score") =>{
 if (scoreKey !== "score") return reviewSectionScore(section.key, sourceRows, section.max, scoreKey);
 if (section.key === "feedback" && scoreKey === "score") return feedbackSectionScore(sourceRows, section.max);
 return scoreSectionRows(section.key, sourceRows, section.max, scoreKey);
 };

 if (section.key === "acr" && mode === "self") {
 const acrRows = createAcrRows(rows);
 const acrTotal = scoreSectionRows(section.key, acrRows, section.max);
return (
<SectionShell title="(xi) Annual Confidential Report (ACR) - Max 25 marks" max={section.max} earned={acrTotal} accent="#ef4444" showScoreSummary={false}>
<div style={{ overflowX: "auto" }}>
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
<thead>
<tr>
<th style={thStyle}>SN</th>
<th style={thStyle}>Parameter</th>
<th style={thStyle}>Assessment Points</th>
<th style={thStyle}>Self Score</th>
</tr>
</thead>
<tbody>
 {acrRows.map((row, index) =>(
<tr key={row.label}>
<td style={tdCenter}>{index + 1}</td>
<td style={tdStyle}>{row.label}</td>
<td style={tdStyle}>
<ul style={{ margin: "0 0 0 16px", padding: 0, color: "#64748b", fontSize: 10, lineHeight: 1.5 }}>
 {(ACR_DETAIL_POINTS[row.label] || []).map((point) =><li key={point}>{point}</li>)}
</ul>
</td>
<td style={tdCenter}>-</td>
</tr>
 ))}
</tbody>
</table>
</div>
</SectionShell>
 );
 }

  const rowSelfScore = (row) => {
    if (section.key === "feedback") return feedbackRowScore(row, section.max);
    if (section.key === "courseFile") return courseFileRowScore(row);
    if (section.key === "research") return String(row.score ?? "").trim() !== "" ? clampScore(row.score, researchGuidanceRowMax(row)) : researchGuidanceScore(row);
    if (section.key === "society") return societyRowScore(row);
    return clampScore(row.score, section.rowMax ? (typeof section.rowMax === "function" ? section.rowMax(row) : section.rowMax) : section.max);
  };

  const updateRow = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section.key]: (prev[section.key] || []).map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const rowMax = section.rowMax ? (typeof section.rowMax === "function" ? section.rowMax(row) : section.rowMax) : section.max;
        const nextValue = key === "date" ? maskDateDDMMYYYY(value) : key === "score" ? (value === "" ? "" : clampScore(value, rowMax)) : value;
        const nextRow = { ...row, [key]: nextValue };
        if (section.key === "lectures" && (key === "planned" || key === "conducted")) {
          const planned = Number(nextRow.planned);
          const conducted = Number(nextRow.conducted);
          if (planned > 0 && conducted >= 0) {
            const pct = (conducted / planned) * 100;
            nextRow.pctConducted = `${pct.toFixed(1)}%`;
          } else {
            nextRow.pctConducted = "";
          }
        }
        if (section.key === "research" && ["degree", "name", "thesis"].includes(key)) return { ...nextRow, score: researchGuidanceScore(nextRow) ? String(researchGuidanceScore(nextRow)) : "" };
        return nextRow;
      }),
    }));
  };

 const updateReview = (index, value) =>{
 setReviewData((prev) =>{
 const source = prev[section.key] || cloneRows(rows);
 const nextRows = source.map((row, rowIndex) =>{
 if (rowIndex !== index) return row;
 const sourceRow = rows[rowIndex] || row;
 return { ...row, [currentRole]: clampReviewScore(section.key, sourceRow, value, section.max) };
 });
 return { ...prev, [section.key]: nextRows };
 });
 };

  const addRow = () => {
    if (section.maxRows && rows.length >= section.maxRows) {
      alert(`${section.title} allows a maximum of ${section.maxRows} rows.`);
      return;
    }
    if (section.key === "lectures" && rows.length >= 4) {
      alert("A1. Course Delivery & Classroom Engagement allows a maximum of 4 courses (4 rows).");
      return;
    }
    const blank = Object.fromEntries(section.fields.map(([key]) => [key, ""]));
    setForm((prev) => ({
      ...prev,
      [section.key]: [...(prev[section.key] || []), { ...blank, score: "", _id: Date.now() + Math.random() }],
    }));
  };

  const deleteRow = () => {
    if (rows.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      [section.key]: prev[section.key].slice(0, -1),
    }));
  };

 return (
<SectionShell title={section.title} max={section.max} earned={earned} accent={section.key === "acr" ? "#ef4444" : section.key === "society" ? "#10b981" : section.doc?.startsWith("j") || section.doc?.startsWith("p") || section.doc?.startsWith("b") || section.doc?.startsWith("i") || section.doc?.startsWith("e") ? ACCENT2 : ACCENT} showScoreSummary={!hideIndividualB8Summary}>
 <>
<div style={{ overflowX: "auto" }}>
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
<thead>
<tr>
<th style={thStyle}>SN</th>
 {section.fields.map(([, label]) =><th key={label} style={thStyle}>{label}</th>)}
 {section.key === "feedback" &&<th style={thStyle}>Average</th>}
<th style={thStyle}>Attachment</th>
<th style={thStyle}>View Docs</th>
<th style={thStyle}>Faculty Score</th>
 {mode === "review" && previousRoles.map((role) =><th key={role} style={thStyle}>{roleLabel(role)} Score</th>)}
 {mode === "review" &&<th style={thStyle}>{roleLabel(currentRole)} Score</th>}
</tr>
</thead>
<tbody>
 {rows.map((row, index) =>{
 const socRowLocked = section.key === "society" && societyRowLocked(row);
 const rowReviewable = rowHasReviewableData(section.key, row);
 const currentRowMax = reviewRowMaxForSection(section.key, row, section.max);
 const displayScore = (value) =>rowReviewable && String(value ?? "").trim() ? clampScore(value, currentRowMax) : "";
 return (
<tr key={row._id ?? `${section.key}-${index}`} style={socRowLocked ? { background: "#f1f5f9", opacity: 0.65 } : {}}>
<td style={tdCenter}>{index + 1}</td>
 {section.fields.map(([key, , readOnlyField]) =>(
<td key={key} style={tdStyle}>
 {mode !== "self" ?<RO value={row[key]} />: key === "first" ? (
<select
 value={row[key] || ""}
 disabled={!editableSelf || readOnlyField || selfLocked}
 onChange={(event) =>updateRow(index, key, event.target.value)}
 style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}
 >
<option value="">Select</option>
<option value="Yes">Yes</option>
<option value="No">No</option>
</select>
 ) : section.key === "research" && key === "degree" ? (
<select
 value={row[key] || ""}
 disabled={!editableSelf || readOnlyField || selfLocked}
 onChange={(event) =>updateRow(index, key, event.target.value)}
 style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}
 >
<option value="">Select</option>
<option value="PhD">PhD</option>
<option value="PG">PG</option>
</select>
 ) : section.key === "courseFile" && key === "details" ? (
<select
 value={row[key] || ""}
 disabled={!editableSelf || selfLocked}
 onChange={(event) =>updateRow(index, key, event.target.value)}
 style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}
 >
<option value="">Select</option>
<option value="1.Available">1.Available</option>
<option value="2.Partially Available">2.Partially Available</option>
<option value="3.Not Available">3.Not Available</option>
</select>
 ) : key === "pctConducted" ? (
 <RO value={row.pctConducted || (Number(row.planned) > 0 && Number(row.conducted) >= 0 ? `${((Number(row.conducted) / Number(row.planned)) * 100).toFixed(1)}%` : "")} placeholder="%" center />
 ) : (
<>
<TI value={row[key]} type={NUMERIC_KEYS.has(key) ? "number" : "text"} center={section.key === "courseFile" && key === "title"} max={key === "fb1" || key === "fb2" ? SCORE_LIMITS.feedbackAverage : undefined} deferClampWhileTyping={key === "fb1" || key === "fb2"} textOnly={TEXT_ONLY_KEYS.has(key) && !(section.key === "courseFile" && key === "title")} readOnly={!editableSelf || readOnlyField || selfLocked || socRowLocked} onChange={(value) =>updateRow(index, key, value)} />
 {section.key === "acr" && key === "label" && ACR_DETAIL_POINTS[row[key]] && (
<ul style={{ margin: "5px 0 0 16px", padding: 0, color: "#64748b", fontSize: 10, lineHeight: 1.5 }}>
 {ACR_DETAIL_POINTS[row[key]].map((point) =><li key={point}>{point}</li>)}
</ul>
 )}
 {key === "date" && row[key] && !isValidDDMMYYYY(row[key]) && (
<div style={{ color: "#dc2626", fontSize: 10, marginTop: 3 }}>Use DD/MM/YYYY</div>
 )}
</>
 )}
</td>
 ))}
 {section.key === "feedback" &&<td style={tdCenter}>{row.fb1 || row.fb2 ? feedbackAverage(row).toFixed(2) : ""}</td>}
<td style={tdStyle}><DocCell id={`${section.doc}-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf || selfLocked || socRowLocked} /></td>
<td style={tdStyle}><ViewCell id={`${section.doc}-${index}`} docs={docs} /></td>
<td style={tdCenter}>
 {mode === "self"
 ? section.key === "feedback"
 ?<RO value={row.fb1 || row.fb2 ? feedbackRowScore(row, section.max).toFixed(1) : ""} center />
 : section.autoScore
 ?<RO value={rowSelfScore(row) ? rowSelfScore(row).toFixed(1) : ""} center />
 :<TI value={row.score} type="number" center max={section.rowMax ? (typeof section.rowMax === "function" ? section.rowMax(row) : section.rowMax) : section.max} readOnly={!editableSelf || section.selfReadOnlyScore || selfLocked || socRowLocked} onChange={(value) =>updateRow(index, "score", value)} />
 :<RO value={rowSelfScore(row) ? rowSelfScore(row).toFixed(1) : ""} center />}
</td>
 {mode === "review" && previousRoles.map((role) =><td key={role} style={tdCenter}><RO value={socRowLocked ? "0" : displayScore(row[role])} center /></td>)}
 {mode === "review" && (
<td style={tdCenter}>
<TI type="number" center max={currentRowMax} readOnly={reviewLocked || socRowLocked || !rowReviewable} value={socRowLocked ? "0" : displayScore(reviewRows[index]?.[currentRole] ?? row[currentRole] ?? "")} onChange={(value) =>updateReview(index, value)} />
</td>
 )}
</tr>
 );
 })}
 {!hideIndividualB8Summary && (
<tr style={{ background: "#f5f3ff", borderTop: "1px solid #e0e7ff" }}>
<td style={{ ...tdCenter, fontWeight: "bold", color: "#3730a3", fontSize: 12, padding: "10px 12px" }} colSpan={totalLabelColSpan}>{totalLabel}</td>
<td style={{ ...tdCenter, fontWeight: "bold", color: "#3730a3", fontSize: 13, padding: "10px 12px" }}>{earned.toFixed(1)}</td>
 {mode === "review" && previousRoles.map((role) =>(
<td key={role} style={{ ...tdCenter, fontWeight: "bold" }}>
 {sectionTotalScore(rows, role).toFixed(1)}
</td>
 ))}
 {mode === "review" && (
<td style={{ ...tdCenter, fontWeight: "bold" }}>
 {sectionTotalScore(reviewRows.length ? reviewRows : rows, currentRole).toFixed(1)}
</td>
 )}
</tr>
 )}
</tbody>
</table>
</div>
 {editableSelf && !section.selfReadOnlyScore && section.key !== "acr" && (
    <RowBtns onAdd={addRow} onDel={deleteRow} canDel={rows.length > 1} />
  )}
 {section.key === "training" && (
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 8 }}>
<tbody>
<tr style={{ background: "#f3e8ff" }}>
<td style={{ ...tdCenter, fontWeight: "bold" }} colSpan={section.fields.length + 3}>Total B8 Score (Max 20)</td>
<td style={{ ...tdCenter, fontWeight: "bold" }}>
 {clampScore(scoreSectionRows("fdps", form.fdps || [], 20) + scoreSectionRows("training", form.training || [], 20), 20).toFixed(1)}
</td>
 {mode === "review" && previousRoles.map((role) =>(
<td key={role} style={{ ...tdCenter, fontWeight: "bold" }}>
 {clampScore(scoreSectionRows("fdps", form.fdps || [], 20, role) + scoreSectionRows("training", form.training || [], 20, role), 20).toFixed(1)}
</td>
 ))}
 {mode === "review" && (
<td style={{ ...tdCenter, fontWeight: "bold" }}>
 {clampScore(
 scoreSectionRows("fdps", reviewData?.fdps || form.fdps || [], 20, reviewerRole) +
 scoreSectionRows("training", reviewData?.training || form.training || [], 20, reviewerRole),
 20
 ).toFixed(1)}
</td>
 )}
</tr>
</tbody>
</table>
 )}
</>
</SectionShell>
 );
}

const INNOVATIVE_METHOD_OPTIONS = [
  { value: "Blended learning", label: "Blended learning" },
  { value: "Virtual Lab", label: "Virtual Lab" },
  { value: "Conceptual videos (with class photo)", label: "Conceptual videos (with class photo)" },
  { value: "Use of Learning Management System (LMS)", label: "Use of Learning Management System (LMS)" },
  { value: "Project-Based Learning", label: "Project-Based Learning" },
  { value: "Open Course Ware (OCW) assignment", label: "Open Course Ware (OCW) assignment" },
  { value: "Quiz", label: "Quiz" },
  { value: "Group Discussion (with photo & report)", label: "Group Discussion (with photo & report)" },
  { value: "Flip classroom (with proof of material shared)", label: "Flip classroom (with proof of material shared)" },
  { value: "Any other innovative method", label: "Any other innovative method" },
];

const LEGACY_INNOVATIVE_METHODS = new Set(INNOVATIVE_METHOD_OPTIONS.map((method) => method.value));

function InnovativeSection({ form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles }) {
  const currentScore = scoreKeyForInnov(reviewerRole);
  const editableSelf = mode === "self" && !locked;
  const reviewLocked = mode === "review" && locked;
  const innovRows = Array.isArray(form.innovRows) && form.innovRows.length ? form.innovRows : [{ method: form.innovDetails || "", details: form.innovDetails || "", score: form.innovScore || "" }];
  const visibleInnovRows = innovRows;
  const selectedInnovativeMethods = new Set(visibleInnovRows.map((row) => String(row.method ?? "").trim()).filter(Boolean));
  const innovativeMethodOptionsForRow = (currentMethod) =>
    INNOVATIVE_METHOD_OPTIONS.filter((option) => option.value === currentMethod || !selectedInnovativeMethods.has(option.value));
  const facultyScore = clampScore(innovRows.reduce((total, row) => total + clampScore(row.score, SCORE_LIMITS.innovativeRow), 0), 10);
  const rowReviewScore = (role, row, index) => {
    if (!rowHasReviewableData("innovRows", row)) return "";
    const value = reviewData.innovRows?.[index]?.[role] ?? row[role] ?? "";
    return String(value ?? "").trim() ? clampScore(value, SCORE_LIMITS.innovativeRow) : "";
  };
  const roleInnovTotal = (role) => {
    const total = reviewSectionScore("innovRows", visibleInnovRows.map((row, index) => ({
      ...row,
      [role]: reviewData.innovRows?.[index]?.[role] ?? row[role] ?? "",
    })), 10, role);
    return total || form[scoreKeyForInnov(role)] || "";
  };
  const currentInnovTotal = () => reviewSectionScore("innovRows", visibleInnovRows.map((row, index) => ({
    ...row,
    [reviewerRole]: reviewData.innovRows?.[index]?.[reviewerRole] ?? row[reviewerRole] ?? "",
  })), 10, reviewerRole);
  const updateReview = (index, value) => {
    const sourceRow = visibleInnovRows[index] || {};
    const nextValue = clampReviewScore("innovRows", sourceRow, value, 10);
    setReviewData((prev) => {
      const sourceRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : cloneRows(visibleInnovRows);
      const nextRows = sourceRows.map((row, rowIndex) => rowIndex === index ? { ...row, [reviewerRole]: nextValue } : row);
      const total = reviewSectionScore("innovRows", nextRows.map((row, rowIndex) => ({
        ...visibleInnovRows[rowIndex],
        ...row,
      })), 10, reviewerRole);
      return {
        ...prev,
        innovRows: nextRows,
        innovativeTeaching: { ...(prev.innovativeTeaching || {}), [reviewerRole]: total ? String(total) : "" },
      };
    });
  };
  const updateSelfRow = (index, field, value) => {
    setForm((prev) => {
      const baseRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : [{ method: prev.innovDetails || "", details: prev.innovDetails || "", score: prev.innovScore || "" }];
      const nextRows = baseRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
      const hasAnyScore = nextRows.some((row) => String(row.score ?? "").trim() !== "");
      const nextScore = hasAnyScore
        ? String(clampScore(nextRows.reduce((total, row) => total + clampScore(row.score, SCORE_LIMITS.innovativeRow), 0), 10))
        : "";
      return { ...prev, innovRows: nextRows, innovDetails: nextRows.map((row) => row.method).filter(Boolean).join(", "), innovScore: nextScore };
    });
  };
  const addInnovRow = () => setForm((prev) => {
    const baseRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : [{ method: prev.innovDetails || "", details: prev.innovDetails || "", score: prev.innovScore || "" }];
    return { ...prev, innovRows: [...baseRows, { method: "", details: "", score: "" }] };
  });
  const deleteInnovRow = () => setForm((prev) => {
    const baseRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : [{ method: prev.innovDetails || "", details: prev.innovDetails || "", score: prev.innovScore || "" }];
    return { ...prev, innovRows: baseRows.length > 1 ? baseRows.slice(0, -1) : baseRows };
  });

  return (
    <SectionShell title="A3. Innovative Teaching-Learning Methodologies - Max 10 marks" max={10} earned={facultyScore}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 42 }}>SN</th>
            <th style={thStyle}>Methods Used</th>
            <th style={thStyle}>Proof Attached (Yes/No)</th>
            <th style={thStyle}>Attachment</th>
            <th style={thStyle}>View Docs</th>
            <th style={thStyle}>{mode === "self" ? "Score" : "Faculty Score"}</th>
            {mode === "review" && previousRoles.map((role) => <th key={role} style={thStyle}>{roleLabel(role)} Score</th>)}
            {mode === "review" && <th style={thStyle}>{roleLabel(reviewerRole)} Score</th>}
          </tr>
        </thead>
        <tbody>
          {visibleInnovRows.map((row, index) => {
            const rowReviewable = rowHasReviewableData("innovRows", row);
            return (
              <tr key={index}>
                <td style={tdCenter}>{index + 1}</td>
                <td style={tdStyle}>
                  {mode === "self" ? (
                    <select
                      value={row.method || ""}
                      disabled={!editableSelf}
                      onChange={(e) => updateSelfRow(index, "method", e.target.value)}
                      style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}
                    >
                      <option value="">Select Method</option>
                      {row.method && !LEGACY_INNOVATIVE_METHODS.has(row.method) && <option value={row.method}>{row.method}</option>}
                      {innovativeMethodOptionsForRow(row.method).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <RO value={row.method || form.innovDetails} />
                  )}
                </td>
                <td style={tdStyle}>
                  {mode === "self" ? (
                    <TI value={row.details} textOnly readOnly={!editableSelf} onChange={(value) => updateSelfRow(index, "details", value)} placeholder="Yes / No (with details)" />
                  ) : (
                    <RO value={row.details} />
                  )}
                </td>
                <td style={tdStyle}><DocCell id={`innov-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf} /></td>
                <td style={tdStyle}><ViewCell id={`innov-${index}`} docs={docs} /></td>
                <td style={tdCenter}>{mode === "self" ? <TI type="number" center max={SCORE_LIMITS.innovativeRow} readOnly={!editableSelf} value={row.score} onChange={(value) => updateSelfRow(index, "score", value)} /> : <RO value={row.score || form.innovScore} center />}</td>
                {mode === "review" && previousRoles.map((role) => <td key={role} style={tdCenter}><RO value={rowReviewScore(role, row, index)} center /></td>)}
                {mode === "review" && <td style={tdCenter}><TI type="number" center max={SCORE_LIMITS.innovativeRow} readOnly={reviewLocked || !rowReviewable} value={rowReviewScore(reviewerRole, row, index)} onChange={(value) => updateReview(index, value)} /></td>}
              </tr>
            );
          })}
<tr style={{ background: "#eff6ff" }}>
<td style={{ ...tdCenter, fontWeight: 800 }} colSpan={5}>Total Score (Max 10)</td>
<td style={{ ...tdCenter, fontWeight: 800 }}>{facultyScore.toFixed(1)}</td>
 {mode === "review" && previousRoles.map((role) =><td key={role} style={{ ...tdCenter, fontWeight: 800 }}><RO value={roleInnovTotal(role)} center /></td>)}
 {mode === "review" &&<td style={{ ...tdCenter, fontWeight: 800 }}><RO value={currentInnovTotal() || reviewData.innovativeTeaching?.[reviewerRole] || form[currentScore]} center /></td>}
</tr>
</tbody>
</table>
  {mode === "self" && !locked && (
    <RowBtns onAdd={addInnovRow} onDel={deleteInnovRow} canDel={visibleInnovRows.length > 1} />
  )}
</SectionShell>
  );
}
function PartCardContainer({ title, subtitle, max, score, accent = "#4f46e5", children }) {
  return (
    <div className="fa-section-card appraisal-section-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 18px 50px rgba(17,24,39,0.08)", marginBottom: 24, overflow: "hidden", border: "1px solid #e5e7eb", borderTop: `3px solid ${accent}` }}>
      <div className="appraisal-part-header" style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "linear-gradient(180deg,#ffffff 0%,#fbfbff 100%)" }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span className="appraisal-part-icon" style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}14`, color: accent, border: `1px solid ${accent}2e`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 3 7l9 4 9-4-9-4Z" />
              <path d="M5 10v5c2 2 12 2 14 0v-5" />
              <path d="M12 11v8" />
            </svg>
          </span>
          <div className="appraisal-part-title" style={{ fontWeight: 800, fontSize: 18, color: accent, letterSpacing: 0 }}>
            {title}
          </div>
        </div>
        {score !== undefined && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700, color: "#475569" }}>
            <span>Total Score</span>
            <span style={{ color: accent, fontWeight: 900 }}>{n(score).toFixed(1)} / {max}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "20px 24px" }}>
        {subtitle && (
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 18, fontWeight: 600 }}>{subtitle}</div>
        )}
        {children}
      </div>
    </div>
  );
}

function ObeSection({ form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles }) {
  const editableSelf = mode === "self" && !locked;
  const reviewLocked = mode === "review" && locked;
  const obeRows = Array.isArray(form.obeRows) && form.obeRows.length ? form.obeRows : defaultObeRows();
  const visibleObeRows = obeRows;

  const facultyScore = clampScore(
    obeRows.reduce((total, row) => total + clampScore(row.score, row.max || 20), 0),
    20
  );

  const rowReviewScore = (role, row, index) => {
    if (!rowHasReviewableData("obeRows", row)) return "";
    const value = reviewData.obeRows?.[index]?.[role] ?? row[role] ?? "";
    return String(value ?? "").trim() ? clampScore(value, row.max || 20) : "";
  };

  const roleObeTotal = (role) => {
    const total = reviewSectionScore("obeRows", visibleObeRows.map((row, index) => ({
      ...row,
      [role]: reviewData.obeRows?.[index]?.[role] ?? row[role] ?? "",
    })), 20, role);
    return total || "";
  };

  const currentObeTotal = () => reviewSectionScore("obeRows", visibleObeRows.map((row, index) => ({
    ...row,
    [reviewerRole]: reviewData.obeRows?.[index]?.[reviewerRole] ?? row[reviewerRole] ?? "",
  })), 20, reviewerRole);

  const updateReview = (index, value) => {
    const sourceRow = visibleObeRows[index] || {};
    const nextValue = clampReviewScore("obeRows", sourceRow, value, sourceRow.max || 20);
    setReviewData((prev) => {
      const sourceRows = Array.isArray(prev.obeRows) && prev.obeRows.length ? prev.obeRows : cloneRows(visibleObeRows);
      const nextRows = sourceRows.map((row, rowIndex) => rowIndex === index ? { ...row, [reviewerRole]: nextValue } : row);
      return { ...prev, obeRows: nextRows };
    });
  };

  const updateSelfRow = (index, field, value) => {
    setForm((prev) => {
      const baseRows = Array.isArray(prev.obeRows) && prev.obeRows.length ? prev.obeRows : defaultObeRows();
      const nextRows = baseRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
      return { ...prev, obeRows: nextRows };
    });
  };

  const addObeRow = () => setForm((prev) => {
    const baseRows = Array.isArray(prev.obeRows) && prev.obeRows.length ? prev.obeRows : defaultObeRows();
    return { ...prev, obeRows: [...baseRows, { component: "", evidence: "", score: "", max: 20 }] };
  });

  const deleteObeRow = () => setForm((prev) => {
    const baseRows = Array.isArray(prev.obeRows) && prev.obeRows.length ? prev.obeRows : defaultObeRows();
    return { ...prev, obeRows: baseRows.length > 3 ? baseRows.slice(0, -1) : baseRows };
  });

  return (
    <SectionShell title="A5. Learning Outcomes Attainment & OBE Practice (Max: 20)" max={20} earned={facultyScore}>
      <div style={{ fontSize: 11, fontStyle: "italic", color: "#475569", marginBottom: 8 }}>
        CO-PO mapping — 5 marks; attainment computation — 10 marks; corrective action taken — 5 marks.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 42 }}>SN</th>
            <th style={thStyle}>Component</th>
            <th style={thStyle}>Evidence Attached (Yes/No)</th>
            <th style={thStyle}>Attachment</th>
            <th style={thStyle}>View Docs</th>
            <th style={thStyle}>{mode === "self" ? "Score" : "Faculty Score"}</th>
            {mode === "review" && previousRoles.map((role) => <th key={role} style={thStyle}>{roleLabel(role)} Score</th>)}
            {mode === "review" && <th style={thStyle}>{roleLabel(reviewerRole)} Score</th>}
          </tr>
        </thead>
        <tbody>
          {visibleObeRows.map((row, index) => {
            const rowReviewable = rowHasReviewableData("obeRows", row);
            return (
              <tr key={index}>
                <td style={tdCenter}>{index + 1}</td>
                <td style={tdStyle}>
                  {mode === "self" && index >= 3 ? (
                    <TI value={row.component} textOnly readOnly={!editableSelf} onChange={(value) => updateSelfRow(index, "component", value)} />
                  ) : (
                    <RO value={row.component} />
                  )}
                </td>
                <td style={tdStyle}>
                  {mode === "self" ? (
                    <TI value={row.evidence} textOnly readOnly={!editableSelf} onChange={(value) => updateSelfRow(index, "evidence", value)} placeholder="Yes / No" />
                  ) : (
                    <RO value={row.evidence} />
                  )}
                </td>
                <td style={tdStyle}><DocCell id={`obe-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf} /></td>
                <td style={tdStyle}><ViewCell id={`obe-${index}`} docs={docs} /></td>
                <td style={tdCenter}>
                  {mode === "self" ? (
                    <TI type="number" center max={row.max || 20} readOnly={!editableSelf} value={row.score} onChange={(value) => updateSelfRow(index, "score", value)} />
                  ) : (
                    <RO value={row.score} center />
                  )}
                </td>
                {mode === "review" && previousRoles.map((role) => <td key={role} style={tdCenter}><RO value={rowReviewScore(role, row, index)} center /></td>)}
                {mode === "review" && <td style={tdCenter}><TI type="number" center max={row.max || 20} readOnly={reviewLocked || !rowReviewable} value={rowReviewScore(reviewerRole, row, index)} onChange={(value) => updateReview(index, value)} /></td>}
              </tr>
            );
          })}
          <tr style={{ background: "#eff6ff" }}>
            <td style={{ ...tdCenter, fontWeight: 800 }} colSpan={5}>Total (Max: 20)</td>
            <td style={{ ...tdCenter, fontWeight: 800 }}>{facultyScore.toFixed(1)}</td>
            {mode === "review" && previousRoles.map((role) => <td key={role} style={{ ...tdCenter, fontWeight: 800 }}><RO value={roleObeTotal(role)} center /></td>)}
            {mode === "review" && <td style={{ ...tdCenter, fontWeight: 800 }}><RO value={currentObeTotal()} center /></td>}
          </tr>
        </tbody>
      </table>
      {mode === "self" && !locked && (
        <RowBtns onAdd={addObeRow} onDel={deleteObeRow} canDel={visibleObeRows.length > 3} />
      )}
    </SectionShell>
  );
}

function MentoringSection({ form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles }) {
  const editableSelf = mode === "self" && !locked;
  const reviewLocked = mode === "review" && locked;
  const mentoringRows = Array.isArray(form.mentoringRows) && form.mentoringRows.length ? form.mentoringRows : defaultMentoringRows();
  const visibleMentoringRows = mentoringRows;

  const facultyScore = clampScore(
    mentoringRows.reduce((total, row) => total + clampScore(row.score, row.max || 10), 0),
    10
  );

  const rowReviewScore = (role, row, index) => {
    if (!rowHasReviewableData("mentoringRows", row)) return "";
    const value = reviewData.mentoringRows?.[index]?.[role] ?? row[role] ?? "";
    return String(value ?? "").trim() ? clampScore(value, row.max || 10) : "";
  };

  const roleMentoringTotal = (role) => {
    const total = reviewSectionScore("mentoringRows", visibleMentoringRows.map((row, index) => ({
      ...row,
      [role]: reviewData.mentoringRows?.[index]?.[role] ?? row[role] ?? "",
    })), 10, role);
    return total || "";
  };

  const currentMentoringTotal = () => reviewSectionScore("mentoringRows", visibleMentoringRows.map((row, index) => ({
    ...row,
    [reviewerRole]: reviewData.mentoringRows?.[index]?.[reviewerRole] ?? row[reviewerRole] ?? "",
  })), 10, reviewerRole);

  const updateReview = (index, value) => {
    const sourceRow = visibleMentoringRows[index] || {};
    const nextValue = clampReviewScore("mentoringRows", sourceRow, value, sourceRow.max || 10);
    setReviewData((prev) => {
      const sourceRows = Array.isArray(prev.mentoringRows) && prev.mentoringRows.length ? prev.mentoringRows : cloneRows(visibleMentoringRows);
      const nextRows = sourceRows.map((row, rowIndex) => rowIndex === index ? { ...row, [reviewerRole]: nextValue } : row);
      return { ...prev, mentoringRows: nextRows };
    });
  };

  const updateSelfRow = (index, field, value) => {
    setForm((prev) => {
      const baseRows = Array.isArray(prev.mentoringRows) && prev.mentoringRows.length ? prev.mentoringRows : defaultMentoringRows();
      const nextRows = baseRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
      return { ...prev, mentoringRows: nextRows };
    });
  };

  const addMentoringRow = () => setForm((prev) => {
    const baseRows = Array.isArray(prev.mentoringRows) && prev.mentoringRows.length ? prev.mentoringRows : defaultMentoringRows();
    return { ...prev, mentoringRows: [...baseRows, { activity: "", evidence: "", score: "", max: 10 }] };
  });

  const deleteMentoringRow = () => setForm((prev) => {
    const baseRows = Array.isArray(prev.mentoringRows) && prev.mentoringRows.length ? prev.mentoringRows : defaultMentoringRows();
    return { ...prev, mentoringRows: baseRows.length > 3 ? baseRows.slice(0, -1) : baseRows };
  });

  return (
    <SectionShell title="A7. Student Mentoring & Counselling (Max: 10)" max={10} earned={facultyScore}>
      <div style={{ fontSize: 11, fontStyle: "italic", color: "#475569", marginBottom: 8 }}>
        Regular mentoring meetings (min. 2/semester) — 4 marks; mentoring register maintained — 3 marks; documented counselling outcomes — 3 marks.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 42 }}>SN</th>
            <th style={thStyle}>Activity</th>
            <th style={thStyle}>Evidence Attached (Yes/No)</th>
            <th style={thStyle}>Attachment</th>
            <th style={thStyle}>View Docs</th>
            <th style={thStyle}>{mode === "self" ? "Score" : "Faculty Score"}</th>
            {mode === "review" && previousRoles.map((role) => <th key={role} style={thStyle}>{roleLabel(role)} Score</th>)}
            {mode === "review" && <th style={thStyle}>{roleLabel(reviewerRole)} Score</th>}
          </tr>
        </thead>
        <tbody>
          {visibleMentoringRows.map((row, index) => {
            const rowReviewable = rowHasReviewableData("mentoringRows", row);
            return (
              <tr key={index}>
                <td style={tdCenter}>{index + 1}</td>
                <td style={tdStyle}>
                  {mode === "self" && index >= 3 ? (
                    <TI value={row.activity} textOnly readOnly={!editableSelf} onChange={(value) => updateSelfRow(index, "activity", value)} />
                  ) : (
                    <RO value={row.activity} />
                  )}
                </td>
                <td style={tdStyle}>
                  {mode === "self" ? (
                    <TI value={row.evidence} textOnly readOnly={!editableSelf} onChange={(value) => updateSelfRow(index, "evidence", value)} placeholder="Yes / No" />
                  ) : (
                    <RO value={row.evidence} />
                  )}
                </td>
                <td style={tdStyle}><DocCell id={`mentor-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf} /></td>
                <td style={tdStyle}><ViewCell id={`mentor-${index}`} docs={docs} /></td>
                <td style={tdCenter}>
                  {mode === "self" ? (
                    <TI type="number" center max={row.max || 10} readOnly={!editableSelf} value={row.score} onChange={(value) => updateSelfRow(index, "score", value)} />
                  ) : (
                    <RO value={row.score} center />
                  )}
                </td>
                {mode === "review" && previousRoles.map((role) => <td key={role} style={tdCenter}><RO value={rowReviewScore(role, row, index)} center /></td>)}
                {mode === "review" && <td style={tdCenter}><TI type="number" center max={row.max || 10} readOnly={reviewLocked || !rowReviewable} value={rowReviewScore(reviewerRole, row, index)} onChange={(value) => updateReview(index, value)} /></td>}
              </tr>
            );
          })}
          <tr style={{ background: "#eff6ff" }}>
            <td style={{ ...tdCenter, fontWeight: 800 }} colSpan={5}>Total (Max: 10)</td>
            <td style={{ ...tdCenter, fontWeight: 800 }}>{facultyScore.toFixed(1)}</td>
            {mode === "review" && previousRoles.map((role) => <td key={role} style={{ ...tdCenter, fontWeight: 800 }}><RO value={roleMentoringTotal(role)} center /></td>)}
            {mode === "review" && <td style={{ ...tdCenter, fontWeight: 800 }}><RO value={currentMentoringTotal()} center /></td>}
          </tr>
        </tbody>
      </table>
      {mode === "self" && !locked && (
        <RowBtns onAdd={addMentoringRow} onDel={deleteMentoringRow} canDel={visibleMentoringRows.length > 3} />
      )}
    </SectionShell>
  );
}

function PartA({ sections, SectionTable, InnovativeSection, ObeSection, MentoringSection, sectionTableProps }) {
  return (
    <PartCardContainer
      title={`Part A - Teaching & Academic Activities (Max ${PART_A_MAX})`}
      subtitle="Fill in your teaching and academic activities for the appraisal period. Enter scores for each item."
      max={PART_A_MAX}
      accent="#4f46e5"
    >
      <SectionTable key={sections[0].key} section={sections[0]} {...sectionTableProps} />
      <SectionTable key={sections[1].key} section={sections[1]} {...sectionTableProps} />
      <InnovativeSection {...sectionTableProps} />
      <SectionTable key={sections[2].key} section={sections[2]} {...sectionTableProps} />
      <ObeSection {...sectionTableProps} />
      <SectionTable key={sections[3].key} section={sections[3]} {...sectionTableProps} />
      <MentoringSection {...sectionTableProps} />
      <SectionTable key={sections[4].key} section={sections[4]} {...sectionTableProps} />
    </PartCardContainer>
  );
}

function PartB({ sections, SectionTable, sectionTableProps }) {
  return (
    <PartCardContainer
      title={`Part B - Research, Publications & Creative Output (Max ${PART_B_MAX})`}
      subtitle="Fill in your research papers, books, creative projects, consultancy, and patents. Enter scores for each item."
      max={PART_B_MAX}
      accent="#4f46e5"
    >
      {sections.map((section) => (
        <SectionTable key={section.key} section={section} {...sectionTableProps} />
      ))}
    </PartCardContainer>
  );
}

function PartC({ sections, SectionTable, sectionTableProps }) {
  return (
    <PartCardContainer
      title={`Part C - Administrative Role & University Development (Max ${PART_C_MAX})`}
      subtitle="Fill in your university/school administrative roles, event organization, student mentoring, and placement activities."
      max={PART_C_MAX}
      accent="#4f46e5"
    >
      {sections.map((section) => (
        <SectionTable key={section.key} section={section} {...sectionTableProps} />
      ))}
    </PartCardContainer>
  );
}

function PartD({ sections, SectionTable, sectionTableProps }) {
  return (
    <PartCardContainer
      title={`Part D - Annual Confidential Report (ACR) (Max ${PART_D_MAX})`}
      subtitle="Evaluated by Director/Dean/VC on leadership, target compliance, competence, and adaptability."
      max={PART_D_MAX}
      accent="#4f46e5"
    >
      {sections.map((section) => (
        <SectionTable key={section.key} section={section} {...sectionTableProps} />
      ))}
      <PartDRubricInfoCard />
    </PartCardContainer>
  );
}

export function PartDRubricInfoCard() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginTop: 10 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#0f172a" }}>Suggested Rubric Scale for Part D Evaluation</h4>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#f1f5f9", color: "#334155" }}>
            <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", width: 60 }}>Rating</th>
            <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Performance Benchmark</th>
            <th style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#166534" }}>5</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>Outstanding</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Consistently exceeds targets, demonstrates exceptional leadership, initiative, and work quality.</td>
          </tr>
          <tr style={{ background: "#f8fafc" }}>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#2563eb" }}>4</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>Very Good</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Meets all key targets with high quality, demonstrates strong competence and proactiveness.</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#d97706" }}>3</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>Good / Satisfactory</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Meets expected job requirements satisfactorily with minimal supervision.</td>
          </tr>
          <tr style={{ background: "#f8fafc" }}>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#ea580c" }}>2</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>Needs Improvement</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Occasionally falls short of targets; requires guidance and monitoring to complete tasks.</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#dc2626" }}>1</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", fontWeight: 700 }}>Unsatisfactory</td>
            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px" }}>Fails to meet basic expectations or targets; significant performance deficiencies noted.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function DesignArtsForm({ form, setForm, docs, setDocs, mode = "self", locked = false, reviewerRole = "", reviewData = {}, setReviewData = () => { }, previousRoles = [], sectionView = "partA" }) {
 const sectionTableProps = { form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles };
 return (
<>
 {(sectionView === "partA" || sectionView === "all") && (
 <PartA sections={PART_A_SECTIONS} SectionTable={SectionTable} InnovativeSection={InnovativeSection} ObeSection={ObeSection} MentoringSection={MentoringSection} sectionTableProps={sectionTableProps} />
 )}
 {(sectionView === "partB" || sectionView === "all") && (
<PartB sections={PART_B_SECTIONS} SectionTable={SectionTable} sectionTableProps={sectionTableProps} />
 )}
 {(sectionView === "partC" || sectionView === "all") && (
<PartC sections={PART_C_SECTIONS} SectionTable={SectionTable} sectionTableProps={sectionTableProps} />
 )}
 {(sectionView === "partD" || sectionView === "all") && (
<PartD sections={PART_D_SECTIONS} SectionTable={SectionTable} sectionTableProps={sectionTableProps} />
 )}
</>
 );
}

export function AccuracyCheckbox({ checked, onChange, disabled = false }) {
 return (
<label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "#334155", lineHeight: 1.5, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
<input type="checkbox" checked={checked} disabled={disabled} onChange={(event) =>onChange(event.target.checked)} style={{ marginTop: 3 }} />
<span>{VERIFY_TEXT}</span>
</label>
 );
}

export function SummaryBox({ totals, roleScoreLabel = "Score", maxScores = { partA: PART_A_MAX, partB: PART_B_MAX, partC: PART_C_MAX, partD: PART_D_MAX, grand: GRAND_MAX } }) {
  const rows = [
    ["Part A", totals.partA, maxScores.partA, ACCENT],
    ["Part B", totals.partB, maxScores.partB, ACCENT2],
    ["Part C", totals.partC, maxScores.partC, "#0284c7"],
    ["Part D", totals.partD, maxScores.partD, "#dc2626"],
    ["Grand Total", totals.total, maxScores.grand, "#059669"],
  ];
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, display: "grid", gap: 12 }}>
      {rows.map(([label, value, max, color]) => (
        <div key={label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <strong>{label}</strong><span style={{ color, fontWeight: 900 }}>{n(value).toFixed(1)} / {max}</span>
          </div>
          <ScoreBar score={value} max={max} color={color} />
        </div>
      ))}
      <div style={{ fontSize: 11, color: "#64748b" }}>{roleScoreLabel}</div>
    </div>
  );
}

export function CompactAuthoritySummaryCard({ title, subtitle, totals, maxScores, accent = ACCENT, remarksTitle, remarksContent }) {
  const rows = [
    ["Part A", totals.partA, maxScores.partA, ACCENT],
    ["Part B", totals.partB, maxScores.partB, ACCENT2],
    ["Part C", totals.partC, maxScores.partC, "#0284c7"],
    ["Part D", totals.partD, maxScores.partD, "#dc2626"],
    ["Total", totals.total, maxScores.grand, "#059669"],
  ];
  const hasRemarks = Boolean(remarksContent);
  return (
    <div style={{ background: "#fff", border: "1px solid #dbe3ef", borderRadius: 8, padding: 12, display: "grid", gridTemplateColumns: hasRemarks ? "minmax(300px, 0.95fr) minmax(280px, 1.05fr)" : "1fr", gap: 12, alignItems: "stretch", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "grid", gap: 9, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{title}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
          </div>
          <div style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}33`, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>
            {n(totals.total).toFixed(1)} / {maxScores.grand}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
          {rows.map(([label, value, max, color]) => (
            <div key={label} style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 7, padding: "8px 9px", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>{label}</span>
                <span style={{ fontSize: 11, color, fontWeight: 900, whiteSpace: "nowrap" }}>{n(value).toFixed(1)} / {max}</span>
              </div>
              <ScoreBar score={value} max={max} color={color} />
            </div>
          ))}
        </div>
      </div>
      {hasRemarks && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 10px", minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: accent, fontSize: 12, marginBottom: 5 }}>{remarksTitle}</div>
          {remarksContent}
        </div>
      )}
    </div>
  );
}

export function SectionSelector({ value, onChange, label = "Appraisal Section", isOptionDisabled = () =>false }) {
 return (
<label style={{ display: "inline-grid", gap: 6, fontSize: 11, color: "#475569", fontWeight: 800, minWidth: 230 }}>
 {label}
<select
 value={value}
 onChange={(event) =>{
 onChange(event.target.value);
 requestAnimationFrame(() =>{
 window.scrollTo({ top: 0, left: 0, behavior: "auto" });
 });
 }}
 style={{ height: 36, border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", color: "#0f172a", padding: "0 10px", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
 >
 {SECTION_OPTIONS.map((option) =><option key={option.value} value={option.value} disabled={isOptionDisabled(option.value)}>{option.label}</option>)}
</select>
</label>
 );
}

export function WorkflowTracker({ declaration, reviews, profile }) {
 const chain = getReviewChain(profile);
  if (!declaration) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: "18px 24px",
          fontSize: 14,
          color: "#374151",
          boxShadow: "0 10px 28px rgba(17,24,39,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", background: "#eef2ff", color: "#4338ca", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0, fontSize: 16 }}>i</span>
        <span>Submit the appraisal to see the approval route and live authority status here.</span>
      </div>
    );
  }
 const reviewList = reviewListFrom(reviews);
 const reviewed = new Map(reviewList.map((review) =>[review.reviewer_role, review]));
 const next = chain.find((role) =>!reviewed.has(role));
 return (
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
<div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
<strong style={{ fontSize: 13 }}>Approval Status Tracker</strong>
<StatusBadge status={next ? pendingStatusFor(next) : "VC Reviewed"} />
</div>
<div style={{ display: "grid", gridTemplateColumns: `repeat(${chain.length + 1}, minmax(130px, 1fr))`, gap: 8, overflowX: "auto" }}>
 {[{ label: "Submitted", state: "Done", time: declaration.submitted_at }, ...chain.map((role) =>{
 const review = reviewed.get(role);
 return { label: roleLabel(role), state: review ? "Reviewed" : next === role ? "Pending" : "Waiting", time: review?.reviewed_at };
 })].map((step) =>(
<div key={step.label} style={{ border: "1px solid #e2e8f0", borderRadius: 7, padding: 9, background: step.state === "Reviewed" || step.state === "Done" ? "#ecfdf5" : step.state === "Pending" ? "#fffbeb" : "#f8fafc" }}>
<div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>{step.state}</div>
<div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>{step.label}</div>
<div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{step.time ? new Date(step.time).toLocaleString() : "No timestamp yet"}</div>
</div>
 ))}
</div>
</div>
 );
}

function buildDesignArtsSectionScores(person, reviewData, reviewerRole) {
 const payload = {};
 ALL_ARRAY_KEYS.forEach((key) =>{
 const rows = Array.isArray(person[key]) ? person[key] : [];
 const reviewRows = Array.isArray(reviewData[key]) ? reviewData[key] : [];
 payload[key] = rows.map((row, index) =>({
 ...row,
 [reviewerRole]: key === "society" && societyRowLocked(row)
 ? "0"
 : key === "acr"
 ? (String(reviewRows[index]?.[reviewerRole] ?? row[reviewerRole] ?? "").trim() ? String(clampScore(reviewRows[index]?.[reviewerRole] ?? row[reviewerRole], SCORE_LIMITS.acrRow)) : "")
 : reviewRows[index]?.[reviewerRole] ?? row[reviewerRole] ?? "",
 }));
 });
 const innovRows = Array.isArray(person.innovRows) ? person.innovRows : [];
 const reviewInnovRows = Array.isArray(reviewData.innovRows) ? reviewData.innovRows : [];
 const mergedInnovRows = innovRows.map((row, index) =>({
 ...row,
 [reviewerRole]: clampReviewScore("innovRows", row, reviewInnovRows[index]?.[reviewerRole] ?? row[reviewerRole] ?? "", 10),
 }));
 const innovTotal = reviewSectionScore("innovRows", mergedInnovRows, 10, reviewerRole);
 payload.innovRows = mergedInnovRows;
 payload.innovativeTeaching = {
 [reviewerRole]: innovTotal ? String(innovTotal) : reviewData.innovativeTeaching?.[reviewerRole] ?? person[scoreKeyForInnov(reviewerRole)] ?? "",
 };
 return payload;
}

function GuideSection({ title, accent = ACCENT, children }) {
 return (
<div className="fa-section-card" style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(15,23,42,0.07)", marginBottom: 14, overflow: "hidden", border: "1px solid #e8ecf0", borderTop: `3px solid ${accent}` }}>
<div style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 13, color: accent }}>{title}</div>
<div style={{ padding: "13px 15px" }}>{children}</div>
</div>
 );
}

export function DesignArtsAuthorityReviewPanel({ person, reviewerRole, onBack, onSubmit, readOnly = false, showReport = false }) {
 const [sectionView, setSectionView] = useState("partA");
 const [reviewData, setReviewData] = useState({});
 const [remarks, setRemarks] = useState(person?.[`${reviewerRole}Remarks`] || "");
 const [confirmed, setConfirmed] = useState(false);
 const [draftStatus, setDraftStatus] = useState("");
 const [savingDraft, setSavingDraft] = useState(false);
 const form = mergeForm(emptyDesignArtsForm(), person || {});
 const [docs, setDocs] = useState(form.docs || {});
 const subjectProfile = { school: person?.school || form.info?.school, department: person?.department, appraisal_role: person?.appraisalRole };
 const visiblePreviousRoles = visiblePreviousReviewRoles(reviewerRole, subjectProfile);
 const schoolDisplayName = designArtsSchoolName(person, form);
 const finalisedByVc = isAppraisalFinalisedByVc(person);
 const [editingFinalised, setEditingFinalised] = useState(false);
 const finalisedVcReadOnly = reviewerRole === "vc" && finalisedByVc && !editingFinalised;
 const panelReadOnly = reviewerRole === "vc" ? finalisedVcReadOnly : (readOnly || finalisedByVc);
 const canReject = canReviewerRejectProfile(reviewerRole, person);
 const subjectEmail = person?.email || person?.faculty_email || person?.facultyEmail;
 const academicYear = person?.academicYear || person?.academic_year || person?.info?.ay || APP_INFO.DEFAULT_AY || "2026-2027";

 const reviewerForm = useMemo(() =>{
 const merged = { ...form };
 ALL_ARRAY_KEYS.forEach((key) =>{
 merged[key] = (form[key] || []).map((row, index) =>({
 ...row,
 [reviewerRole]: key === "society" && societyRowLocked(row) ? "0" : clampReviewScore(key, row, reviewData[key]?.[index]?.[reviewerRole] ?? row[reviewerRole] ?? "", SECTION_MAX_BY_KEY[key] || 0),
 }));
 });
 merged.innovRows = (form.innovRows || []).map((row, index) =>({
 ...row,
 [reviewerRole]: clampReviewScore("innovRows", row, reviewData.innovRows?.[index]?.[reviewerRole] ?? row[reviewerRole] ?? "", 10),
 }));
 const innovTotal = reviewSectionScore("innovRows", merged.innovRows, 10, reviewerRole);
 merged[scoreKeyForInnov(reviewerRole)] = innovTotal ? String(innovTotal) : reviewData.innovativeTeaching?.[reviewerRole] ?? form[scoreKeyForInnov(reviewerRole)] ?? "";
 return merged;
 }, [form, reviewData, reviewerRole]);
 const facultyTotals = calculateDesignArtsTotals(form, "score");
 const totals = calculateDesignArtsTotals(reviewerForm, reviewerRole);
 const reviewCompleted = panelReadOnly || isReviewerReviewComplete(person, reviewerRole);
 const savedReviewerTotalKeys = [`${reviewerRole}PartA`, `${reviewerRole}PartB`, `${reviewerRole}Total`];
 const hasSavedReviewerTotals = savedReviewerTotalKeys.some((key) =>String(person?.[key] ?? "").trim() !== "");
 const reviewerSummaryTotals = panelReadOnly && hasSavedReviewerTotals ? {
 ...totals,
 partA: String(person?.[`${reviewerRole}PartA`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}PartA`]) : totals.partA,
 partB: String(person?.[`${reviewerRole}PartB`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}PartB`]) : totals.partB,
 total: String(person?.[`${reviewerRole}Total`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}Total`]) : totals.total,
 } : totals;
 const roleSummaryTotalsFor = (role) =>{
 const prefix = role === "center_head" ? "hod" : role;
 const rawTotal = person?.[`${prefix}Total`];
 return {
 partA: n(person?.[`${prefix}PartA`]),
 partB: n(person?.[`${prefix}PartB`]),
 total: n(rawTotal),
 maxScores: totals.maxScores,
 hasTotal: rawTotal !== undefined && rawTotal !== null && String(rawTotal).trim() !== "",
 };
 };
 const previousSummaryCards = reviewerRole === "vc" ? visiblePreviousRoles.map((role) =>{
 const prefix = role === "center_head" ? "hod" : role;
 const label = role === "center_head" ? "Center Head" : roleLabel(role);
 return {
 role,
 label,
 totals: roleSummaryTotalsFor(role),
 remarks: person?.[`${prefix}Remarks`],
 };
 }) : [];
 const subjectRole = person?.appraisalRole || person?.appraisal_role || person?.role || "";
 const averageSourceTotals = [
 facultyTotals,
 ...previousSummaryCards
 .filter((item) =>item.role !== subjectRole && item.totals.hasTotal)
 .map((item) =>item.totals),
 ];
 const averageSummaryTotals = averageSourceTotals.length ? {
 partA: averageSourceTotals.reduce((sum, item) =>sum + n(item.partA), 0) / averageSourceTotals.length,
 partB: averageSourceTotals.reduce((sum, item) =>sum + n(item.partB), 0) / averageSourceTotals.length,
 total: averageSourceTotals.reduce((sum, item) =>sum + n(item.total), 0) / averageSourceTotals.length,
 maxScores: totals.maxScores,
 } : { partA: 0, partB: 0, total: 0, maxScores: totals.maxScores };
 useEffect(() =>{
 let active = true;
 if (panelReadOnly || !subjectEmail) return undefined;
 loadReviewerDraft({ subjectEmail, academicYear, reviewerRole })
 .then((draft) =>{
 if (!active || !draft?.payload) return;
 setReviewData(draft.payload.section_scores || {});
 setRemarks(draft.payload.remarks ?? "");
 setDraftStatus(draft.updated_at ? `Last saved: ${new Date(draft.updated_at).toLocaleString()}` : "Draft loaded");
 })
 .catch((err) =>{
 if (!active) return;
 console.error("Could not load reviewer draft:", err);
 setDraftStatus(err?.message || "Could not load draft.");
 });
 return () =>{ active = false; };
 }, [academicYear, panelReadOnly, reviewerRole, subjectEmail]);

 const handleSaveDraft = async () =>{
 try {
 setSavingDraft(true);
 await saveReviewerDraft({
 subjectEmail,
 academicYear,
 reviewerRole,
 partAScore: totals.partA,
 partBScore: totals.partB,
 totalScore: totals.total,
 remarks,
 sectionScores: buildDesignArtsSectionScores(form, reviewData, reviewerRole),
 });
 setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
 } catch (err) {
 console.error("Could not save reviewer draft:", err);
 alert(err?.message || "Unable to save draft.");
 } finally {
 setSavingDraft(false);
 }
 };

 const generateReviewReport = () =>{
 if (!reviewCompleted) return;
 const applicability = {};
 const rowSum = (key, max) =>scoreSectionRows(key, reviewerForm[key] || [], max, "score");
 const lecScore = scoreSectionRows("lectures", reviewerForm.lectures || [], 40, "score");
 const cfScore = scoreSectionRows("courseFile", reviewerForm.courseFile || [], 20, "score");
 const innovScore = clampScore(Array.isArray(reviewerForm.innovRows) ? reviewerForm.innovRows.reduce((t, r) =>t + clampScore(r.score, SCORE_LIMITS.innovativeRow), 0) : innovativeTeachingScore(reviewerForm.innovDetails, reviewerForm.innovScore, 10), 10);
 const maxScores = getDesignArtsEffectiveMaxScores(reviewerForm);
 const partATotal = panelReadOnly && String(person?.[`${reviewerRole}PartA`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}PartA`]) : totals.partA;
 const partBTotal = panelReadOnly && String(person?.[`${reviewerRole}PartB`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}PartB`]) : totals.partB;
 const grandTotal = panelReadOnly && String(person?.[`${reviewerRole}Total`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}Total`]) : totals.total;
 const b8Score = clampScore(rowSum("fdps", 20) + rowSum("training", 20), 20);
 generateMediaCommReport({
 title: `${schoolDisplayName} Appraisal Report`,
 subtitle: `${roleLabel(reviewerRole)} review`,
 form: reviewerForm,
 docs,
 partASections: PART_A_SECTIONS,
 partBSections: PART_B_SECTIONS,
 totals: { partA: partATotal, partB: partBTotal, total: grandTotal },
 maxScores,
 generatedBy: sessionStorage.getItem("name") || roleLabel(reviewerRole),
 remarksSections: buildReviewRemarks({
 source: person,
 currentRole: reviewerRole,
 currentRemarks: remarks,
 roleLabels: { hod: visiblePreviousRoles.includes("center_head") ? "Center Head Remarks" : "HOD Remarks" },
 }),
 detailedSummaryRows: [
 { isHeader: true, label: "Part A - Teaching Process & Academic Activities" },
 ...summaryRow(applicability, "lectures", { id: "A(i)", label: "Lectures / Tutorials / Practicals", max: 40, score: lecScore }),
 ...summaryRow(applicability, "courseFile", { id: "A(ii)", label: "Course File", max: 20, score: cfScore }),
 { id: "A(iii)", label: "Innovative Teaching-Learning Methodologies", max: 10, score: innovScore },
 ...summaryRow(applicability, "projects", { id: "A(iv)", label: "Project Guidance", max: 20, score: rowSum("projects", 20) }),
 ...summaryRow(applicability, "quals", { id: "A(v)", label: "Qualification Enhancement", max: 10, score: rowSum("quals", 10) }),
 ...summaryRow(applicability, "feedback", { id: "A(vi)", label: "Students' Feedback", max: 10, score: feedbackSectionScore(reviewerForm.feedback || [], 10) }),
 ...summaryRow(applicability, "deptActs", { id: "A(vii)", label: "Departmental / School Activities", max: 20, score: rowSum("deptActs", 20) }),
 ...summaryRow(applicability, "uniActs", { id: "A(viii)", label: "University Level Activities", max: 30, score: rowSum("uniActs", 30) }),
 ...summaryRow(applicability, "society", { id: "A(ix)", label: "Contribution to Society", max: 10, score: rowSum("society", 10) }),
 ...summaryRow(applicability, "industry", { id: "A(x)", label: "Industry Connect", max: 5, score: rowSum("industry", 5) }),
 ...summaryRow(applicability, "acr", { id: "A(xi)", label: "Annual Confidential Report (ACR)", max: 25, score: rowSum("acr", 25) }),
 { isTotal: true, label: "Part A Total", max: maxScores.partA, score: partATotal },
 { isHeader: true, label: "Part B - Research & Academic Contributions" },
 ...summaryRow(applicability, "journals", { id: "B1(i)", label: "Published Papers in Journals", max: 80, score: rowSum("journals", 80) }),
 ...summaryRow(applicability, "books", { id: "B2", label: "Articles / Chapters in Books", max: 60, score: rowSum("books", 60) }),
 ...summaryRow(applicability, "ict", { id: "B3", label: "ICT Mediated Teaching-Learning Pedagogy", max: 50, score: rowSum("ict", 50) }),
 ...summaryRow(applicability, "research", { id: "B4(a)", label: "Research Guidance - PhD / PG", max: 30, score: rowSum("research", 30) }),
 ...summaryRow(applicability, "internalProjects", { id: "B4(b)", label: "Internal Research Projects", max: 15, score: rowSum("internalProjects", 15) }),
 ...summaryRow(applicability, "externalProjects", { id: "B4(c)", label: "External Research / Consultancy Projects", max: 30, score: rowSum("externalProjects", 30) }),
 ...summaryRow(applicability, "ipr", { id: "B3", label: "Patents, Copyrights, IP & Creative Product Development", max: 40, score: rowSum("ipr", 40) }),
 ...summaryRow(applicability, "awards", { id: "B5(b)", label: "Research Awards", max: 10, score: rowSum("awards", 10) }),
 ...summaryRow(applicability, "confs", { id: "B6", label: "Conferences / Seminars / Workshops", max: 30, score: rowSum("confs", 30) }),
 ...summaryRow(applicability, "proposals", { id: "B7", label: "Research Proposals", max: 10, score: rowSum("proposals", 10) }),
 ...b8summaryRow(applicability, { id: "B8", label: "FDP / Self Development + Industrial Training", max: 20, score: b8Score }),
 ...summaryRow(applicability, "exhibitions", { id: "B12", label: "Exhibitions — Photography, Design & Applied Arts, Documentaries, Films & Audio-Visual Productions", max: 30, score: rowSum("exhibitions", 30) }),
 { isTotal: true, label: "Part B Total", max: maxScores.partB, score: partBTotal },
 { isGrandTotal: true, label: "Grand Total (Part A + Part B)", max: maxScores.grand, score: grandTotal },
 ],
 });
 };

 return (
<div style={{ display: "grid", gap: 14 }}>
<div style={{ background: "#0f172a", color: "#f8fafc", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
<button onClick={onBack} style={smallButton("#1e293b")}>Back</button>
<div style={{ flex: 1 }}>
<div style={{ fontWeight: 900 }}>{person?.name || person?.email}</div>
<div style={{ color: "#94a3b8", fontSize: 12 }}>{person?.designation || titleCase(person?.appraisalRole)} - {schoolDisplayName}</div>
</div>
<StatusBadge status={person?.status} />
</div>
<div style={{ display: "flex", justifyContent: "flex-end" }}>
<SectionSelector value={sectionView} onChange={setSectionView} label="Review Section" />
</div>
 {finalisedVcReadOnly && (
<div style={{ display: "flex", justifyContent: "flex-end" }}>
<button onClick={() =>{ setEditingFinalised(true); setConfirmed(false); }} style={smallButton("#4c1d95")}>
 Edit Form
</button>
</div>
 )}
 {finalisedByVc && reviewerRole !== "vc" && (
<div style={{ background: "#ecfdf5", border: "1px solid #86efac", color: "#065f46", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontWeight: 700 }}>
 This appraisal has been finalised by the VC.
</div>
 )}
 {(sectionView === "partA" || sectionView === "partB") && (
<DesignArtsForm
 form={form}
 setForm={() =>{ }}
 docs={docs}
 setDocs={setDocs}
 mode="review"
 locked={panelReadOnly}
 reviewerRole={reviewerRole}
 reviewData={reviewData}
 setReviewData={setReviewData}
 previousRoles={visiblePreviousRoles}
 sectionView={sectionView}
 />
 )}
 {(sectionView === "partA" || sectionView === "partB") && !panelReadOnly && (
<div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, margin: "12px 0 14px", flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{draftStatus}</span>
<button
 onClick={handleSaveDraft}
 disabled={savingDraft}
 style={smallButton(savingDraft ? "#94a3b8" : "#2563eb")}
>
 {savingDraft ? "Saving..." : "Save Draft"}
</button>
</div>
 )}
 {sectionView === "summary" && (
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 10 }}>
<CompactAuthoritySummaryCard title="Faculty Score" totals={facultyTotals} maxScores={facultyTotals.maxScores} accent="#0ea5e9" subtitle={`Faculty submitted score for the ${schoolDisplayName} appraisal form.`} />
<SummaryOtherInfoField value={summaryOtherInfoValueFrom(person)} readOnly rows={4} />
 {previousSummaryCards.map(({ role, label, totals: roleTotals, remarks: roleRemarks }) =>(
<CompactAuthoritySummaryCard key={role} title={`${label} Score`} totals={roleTotals} maxScores={roleTotals.maxScores} accent="#334155" subtitle={`${label} score for the ${schoolDisplayName} appraisal form.`} remarksTitle={`${label} Remarks`} remarksContent={<div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap", maxHeight: 74, overflow: "auto" }}>{String(roleRemarks || "").trim() || "-"}</div>} />
 ))}
 {reviewerRole === "vc" &&<CompactAuthoritySummaryCard title="Average Score" totals={averageSummaryTotals} maxScores={averageSummaryTotals.maxScores} accent="#f59e0b" subtitle="Average score before VC review." />}
<CompactAuthoritySummaryCard
 title={`${roleLabel(reviewerRole)} Score`}
 totals={reviewerSummaryTotals}
 maxScores={totals.maxScores}
 accent="#134e4a"
 subtitle={`${roleLabel(reviewerRole)} score for the ${schoolDisplayName} appraisal form.`}
 remarksTitle={reviewerRole === "vc" ? "Vice Chancellor Remarks and Grade" : `${roleLabel(reviewerRole)} Remarks`}
 remarksContent={<textarea value={remarks} readOnly={panelReadOnly} onChange={(event) =>setRemarks(event.target.value)} rows={4} style={{ width: "100%", border: "none", padding: 0, fontFamily: "inherit", fontSize: 12, color: "#334155", resize: "vertical", background: "transparent", outline: "none" }} />}
/>
 {!panelReadOnly &&<AccuracyCheckbox checked={confirmed} onChange={setConfirmed} />}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{draftStatus}</span>
<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
<button onClick={onBack} style={smallButton("#64748b")}>Close</button>
 {showReport && (
<button onClick={generateReviewReport} disabled={!reviewCompleted} style={smallButton(reviewCompleted ? "#4c1d95" : "#94a3b8")}>
 Generate Report
</button>
 )}
 {!panelReadOnly && (
<>
<button
 onClick={handleSaveDraft}
 disabled={savingDraft}
 style={smallButton(savingDraft ? "#94a3b8" : "#2563eb")}
>
 {savingDraft ? "Saving..." : "Save Draft"}
</button>
 {canReject && (
<button
 onClick={() =>{
 if (window.confirm("Reject this appraisal and send it back to the user for editing?")) {
 onSubmit(person.id, { partA: totals.partA, partB: totals.partB, total: totals.total }, remarks, buildDesignArtsSectionScores(form, reviewData, reviewerRole), confirmed, "rejected");
 }
 }}
 disabled={!confirmed || !remarks.trim()}
 style={smallButton((confirmed && remarks.trim()) ? "#dc2626" : "#94a3b8")}
>
 Reject Form
</button>
 )}
<button
 onClick={() =>onSubmit(person.id, { partA: totals.partA, partB: totals.partB, total: totals.total }, remarks, buildDesignArtsSectionScores(form, reviewData, reviewerRole), confirmed)}
 disabled={!confirmed || !remarks.trim()}
 style={smallButton((confirmed && remarks.trim()) ? "#059669" : "#94a3b8")}
 >
 {reviewerRole === "vc" && finalisedByVc ? "Edit & Resubmit" : `Submit ${roleLabel(reviewerRole)} Review`}
</button>
</>
 )}
</div>
</div>
</div>
 )}
</div>
 );
}






