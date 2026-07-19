/* eslint-disable no-unused-vars, react-refresh/only-export-components */
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, LogoutConfirmModal, ScoreBar, StatusBadge } from "../../dashboard/dashboardPrimitives";
import { getSchoolKey } from "../../../constants/universityHierarchy";
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
 rowHasAnyValue,
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
 SectionSaveFooter,
} from "../../../features/faculty-appraisal";
import { canReviewerRejectProfile, getReviewChain, pendingStatusFor, profileFromsessionStorage, reviewedStatusFor, roleLabel, visiblePreviousReviewRoles, workflowValidationError, isAppraisalFinalisedByVc, isRejectedStatus, isPendingReviewStatusFor, hasActiveRejection, reviewListFrom } from "../../../utils/hierarchy";
import { n, pct, RO, TI } from "../../../features/faculty-appraisal/shared";
import PartA from "./PartA/PartA";
import PartB from "./PartB/PartB";
import SectionShell from "./common/SectionShell";
import { thStyle, tdStyle, tdCenter } from "./common/TableStyles";

export const ACCENT = "#b45309";
export const ACCENT2 = "#0f766e";
const VERIFY_TEXT = "I have verified all the details and confirm that the information provided is correct. I am responsible for the accuracy of this data.";
export const PART_A_MAX = 200;
export const PART_B_MAX = 375;
export const GRAND_MAX = 555;
export const SECTION_OPTIONS = [
 { value: "partA", label: "Part-A Section" },
 { value: "partB", label: "Part-B Section" },
 { value: "summary", label: "Summary Section" },
];
const smallButton = (background) =>({ padding: "8px 14px", background, color: "#fff", border: "none", borderRadius: 7, cursor: background === "#94a3b8" ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit" });
export const titleCase = (value) =>String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
export const isReviewerReviewComplete = (item = {}, reviewerRole = "") =>{
 const status = String(item?.status || item?.workflowStatus || item?.workflow_status || "");
 if (isPendingReviewStatusFor([item?.status, item?.workflowStatus, item?.workflow_status], reviewerRole)) return false;
 const reviewerLabel = roleLabel(reviewerRole);
 return (
 n(item?.[`${reviewerRole}Total`]) >0 ||
 String(item?.[`${reviewerRole}Remarks`] ?? "").trim() !== "" ||
 status === reviewedStatusFor(reviewerRole) ||
 new RegExp(`${reviewerLabel}\\s*(Reviewed|Approved|Rejected)`, "i").test(status)
 );
};
export const userInitials = (name) =>
 String(name || "User")
 .split(" ")
 .filter(Boolean)
 .map((part) =>part[0])
 .join("")
 .slice(0, 2)
 .toUpperCase();

const SOCIETY_LABELS = [
 "Induction Program",
 "Unnat Bharat Abhiyan",
 "Yoga Classes",
 "Blood Donation",
 "Techno Social activities",
 "NSS",
 "Social visits",
];

export const emptyMediaForm = () =>({
 info: {
 name: sessionStorage.getItem("name") || "",
 qual: sessionStorage.getItem("qualification") || "",
 desig: sessionStorage.getItem("designation") || "",
 experience: sessionStorage.getItem("experience") || "",
 ay: sessionStorage.getItem("academicYear") || APP_INFO.DEFAULT_AY,
 school: sessionStorage.getItem("school") || "SoMCS - School of Media & Communication Studies",
 },
 lectures: [{ sem: "", code: "", planned: "", conducted: "", score: "" }],
 courseFile: [{ course: "", title: "", details: "", score: "" }],
 innovDetails: "",
 innovScore: "",
 innovRows: [{ method: "", details: "", score: "" }],
 projects: [
 { label: "", score: "" },
 ],
 quals: [
 { label: "", score: "" },
 ],
 feedback: [{ code: "", fb1: "", fb2: "", score: "" }],
 deptActs: [{ activity: "", nature: "", score: "" }],
 uniActs: [{ activity: "", nature: "", score: "" }],
 society: [{ label: "", details: "", score: "" }],
 acr: createAcrRows(),
 journals: [{ title: "", journal: "", issn: "", index: "", score: "" }],
 popularWritings: [{ media: "", film: "", score: "" }],
 books: [{ title: "", book: "", isbn: "", publisher: "", coAuthors: "", first: "", score: "" }],
 ict: [{ title: "", desc: "", type: "", quad: "", score: "" }],
 research: [{ degree: "", name: "", thesis: "", score: "" }],
 internalProjects: [{ title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }],
 externalProjects: [{ title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }],
 awards: [{ title: "", date: "", agency: "", level: "", score: "" }],
 confs: [{ title: "", type: "", org: "", level: "", score: "" }],
 proposals: [{ title: "", duration: "", agency: "", amount: "", score: "" }],
 products: [{ details: "", used: "", score: "" }],
 fdps: [{ program: "", duration: "", org: "", score: "" }],
 training: [{ company: "", duration: "", nature: "", score: "" }],
 summaryOtherInfo: "",
 sectionApplicability: { projects: "applicable", research: "applicable" },
});

const cloneRows = (rows) =>JSON.parse(JSON.stringify(rows || []));

export const PART_A_SECTIONS = [
 { key: "lectures", title: "A(i). Lectures / Tutorials / Practicals", max: 50, doc: "lec", fields: [["sem", "Semester"], ["code", "Course Code / Name"], ["planned", "Planned"], ["conducted", "Conducted"]] },
 { key: "courseFile", title: "A(ii). Course File", max: 20, doc: "cf", rowMax: SCORE_LIMITS.courseFileRow, fields: [["course", "Course / Paper"], ["title", "Program & Semester"], ["details", "Availability as per IQAC format"]] },
 { key: "projects", title: "A(iv). Project Guidance", max: 10, doc: "proj", rowMax: projectGuidanceRowMax, fields: [["label", "Project Category"]] },
 { key: "quals", title: "A(v). Qualification Enhancement", max: 10, doc: "qual", rowMax: SCORE_LIMITS.qualificationRow, fields: [["label", "Category"]] },
 { key: "feedback", title: "Student Feedback", max: 10, doc: "fb", fields: [["code", "Course Code / Name"], ["fb1", "First Feedback(%)"], ["fb2", "Second Feedback(%)"]] },
 { key: "deptActs", title: "Departmental / School Activities", max: 20, doc: "dept", fields: [["activity", "Activity"], ["nature", "Nature"]] },
 { key: "uniActs", title: "University Level Activities", max: 30, doc: "uni", fields: [["activity", "Activity"], ["nature", "Nature"]] },
 { key: "society", title: "(ix) Contribution to Society - Max 10 marks (Max 5 per row)", max: 10, doc: "soc", rowMax: SCORE_LIMITS.societyRow, fields: [["label", "Activity"], ["details", "Details"]] },
 { key: "acr", title: "(xi) Annual Confidential Report (ACR) - Max 25 marks", max: 25, doc: "acr", rowMax: SCORE_LIMITS.acrRow, fields: [["label", "Attribute", true]], selfReadOnlyScore: true },
];

export const PART_B_SECTIONS = [
 { key: "journals", title: "B1(i). Published Papers in Journals", max: 80, doc: "jour", fields: [["title", "Title with Page Nos."], ["journal", "Journal Details"], ["issn", "ISSN No."], ["index", "Journal Indexing"]] },
 { key: "popularWritings", title: "B1(ii). Popular Writings, Film & Documentary", max: 40, doc: "pop", fields: [["media", "Newspaper / Magazine / Website"], ["film", "Film / Documentary"]] },
 { key: "books", title: "B2. Articles / Chapters in Books", max: 60, doc: "book", fields: [["title", "Title"], ["book", "Book & Publisher"], ["isbn", "ISBN"], ["publisher", "Type"], ["coAuthors", "Co-authors"], ["first", "First Author?"]] },
 { key: "ict", title: "B3. ICT Mediated Teaching-Learning Pedagogy / New Curricula", max: 30, doc: "ict", fields: [["title", "Title"], ["desc", "Short Description"], ["type", "Type / Link"], ["quad", "Quadrants"]] },
 { key: "research", title: "B4(a). Research Guidance - PhD / PG", max: 30, doc: "res", rowMax: researchGuidanceRowMax, fields: [["degree", "Degree"], ["name", "Student Name"], ["thesis", "Thesis / Status"]] },
 { key: "internalProjects", title: "B4(b). Internal Research Projects", max: 15, doc: "int", fields: [["title", "Title"], ["agency", "Funding Agency"], ["date", "Sanction Date"], ["amount", "Amount"], ["role", "Role"], ["status", "Status"]] },
 { key: "externalProjects", title: "B4(c). External Research Projects", max: 30, doc: "ext", fields: [["title", "Title"], ["agency", "Funding Agency"], ["date", "Sanction Date"], ["amount", "Amount"], ["role", "Role"], ["status", "Status"]] },
 { key: "awards", title: "B5. Research Awards", max: 10, doc: "awd", fields: [["title", "Title"], ["date", "Date"], ["agency", "Agency"], ["level", "Level"]] },
 { key: "confs", title: "B6. Conferences / Seminars / Workshops", max: 30, doc: "conf", fields: [["title", "Title"], ["type", "Type"], ["org", "Organization"], ["level", "Level"]] },
 { key: "proposals", title: "B7(a). Research Proposals", max: 10, doc: "prop", fields: [["title", "Title"], ["duration", "Duration"], ["agency", "Agency"], ["amount", "Amount"]] },
 { key: "products", title: "B7(b). Products Developed / Used", max: 20, doc: "prod", fields: [["details", "Product Details"], ["used", "Used / Adopted"]] },
 { key: "fdps", title: "B8(a). FDP / Self Development", max: 20, doc: "fdp", rowMax: SCORE_LIMITS.fdpRow, fields: [["program", "Program"], ["duration", "Duration"], ["org", "Organization"]] },
 { key: "training", title: "B8(b). Industrial Training", max: 20, doc: "train", rowMax: SCORE_LIMITS.fdpRow, fields: [["company", "Company"], ["duration", "Duration"], ["nature", "Nature"]] },
];

export const ALL_ARRAY_KEYS = [...PART_A_SECTIONS, ...PART_B_SECTIONS].map((section) =>section.key);
const SECTION_MAX_BY_KEY = Object.fromEntries([...PART_A_SECTIONS, ...PART_B_SECTIONS].map((section) =>[section.key, section.max]));
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
 if (String(next[field] ?? "").trim() === "" && String(sourceRow[field] ?? "").trim() !== "") {
 next[field] = sourceRow[field];
 }
 });
 return next;
 });
 });
 ["innovHod", "innovDirector", "innovDean", "innovVc"].forEach((field) =>{
 if (String(merged[field] ?? "").trim() === "" && String(source[field] ?? "").trim() !== "") {
 merged[field] = source[field];
 }
 });
 if (Array.isArray(form.innovRows)) {
 const sourceRows = Array.isArray(source.innovRows) ? source.innovRows : [];
 merged.innovRows = form.innovRows.map((row, index) =>{
 const sourceRow = sourceRows[index] || {};
 const next = { ...row };
 REVIEW_SCORE_FIELDS.forEach((field) =>{
 if (String(next[field] ?? "").trim() === "" && String(sourceRow[field] ?? "").trim() !== "") {
 next[field] = sourceRow[field];
 }
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

export const calculateMediaTotals = (form, scoreKey = "score") =>{
 const applicability = form.sectionApplicability || {};
 const maxScores = getMediaEffectiveMaxScores(form, { self: scoreKey === "score" });
 const rowSum = (key, max) =>applicability[key] === "notApplicable" ? 0 : scoreSectionRows(key, form[key] || [], max, scoreKey);
 const lecturesScore = applicability["lectures"] === "notApplicable" ? 0 : averageSectionScore(form.lectures || [], 50, scoreKey);
 const courseFileScore = applicability["courseFile"] === "notApplicable" ? 0 : averageSectionScore(form.courseFile || [], 20, scoreKey);
 const partA = clampScore(
 lecturesScore + courseFileScore + (scoreKey === "score" && Array.isArray(form.innovRows) ? clampScore(form.innovRows.reduce((total, row) =>total + clampScore(row.score, SCORE_LIMITS.innovativeRow), 0), 10) : scoreKey === "score" ? innovativeTeachingScore(form.innovDetails, form.innovScore, 10) : clampScore(form[scoreKeyForInnov(scoreKey)], 10)) +
 rowSum("projects", 10) + rowSum("quals", 10) + (scoreKey === "score" ? feedbackSectionScore(form.feedback, 10) : reviewSectionScore("feedback", form.feedback || [], 10, scoreKey)) +
 rowSum("deptActs", 20) + rowSum("uniActs", 30) + rowSum("society", 10) + (scoreKey === "score" ? 0 : rowSum("acr", 25)),
 maxScores.partA,
 );
 const b8Score = clampScore(rowSum("fdps", 20) + rowSum("training", 20), 20);
 const partB = clampScore(
 PART_B_SECTIONS
 .filter((section) =>section.key !== "fdps" && section.key !== "training")
 .reduce((total, section) =>total + rowSum(section.key, section.max), 0) + b8Score,
 maxScores.partB,
 );
 return { partA, partB, total: clampScore(partA + partB, maxScores.grand), maxScores };
};

const effectivePartMax = (baseMax, applicability = {}, sections = []) =>
 effectiveMaxScore(baseMax, applicability, sections.filter((section) =>section.key !== "fdps" && section.key !== "training"));

const effectivePartBMax = (baseMax, applicability = {}) =>{
 const withoutB8 = effectivePartMax(baseMax, applicability, PART_B_SECTIONS);
 return applicability.fdps === "notApplicable" && applicability.training === "notApplicable"
 ? Math.max(0, withoutB8 - 20)
 : withoutB8;
};

export const getMediaEffectiveMaxScores = (form = {}, { self = false } = {}) =>{
 const applicability = form.sectionApplicability || {};
 const partA = self ? selfEffectivePartAMax(PART_A_MAX, applicability, PART_A_SECTIONS) : effectivePartMax(PART_A_MAX, applicability, PART_A_SECTIONS);
 const partB = effectivePartBMax(PART_B_MAX, applicability);
 return { partA, partB, grand: partA + partB };
};

export const summaryRowIfApplicable = (applicability = {}, key, row) =>
 applicability[key] === "notApplicable" ? [] : [row];

export const b8SummaryRowIfApplicable = (applicability = {}, row) =>
 applicability.fdps === "notApplicable" && applicability.training === "notApplicable" ? [] : [row];

export const mergeForm = (base, incoming = {}) =>({
 ...base,
 ...incoming,
 info: { ...base.info, ...(incoming.info || {}) },
 sectionApplicability: { ...base.sectionApplicability, ...(incoming.sectionApplicability || {}) },
 acr: createAcrRows(incoming.acr || base.acr),
});

export const normalizeScoresForSubmit = (form) =>normalizeAutoScores(form);

export const validateMediaBeforeSubmit = (form, docs = {}, sectionView = "all") =>{
 const applicability = form.sectionApplicability || {};
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
 docPrefix: section.key !== "courseFile" && section.key !== "acr" ? section.doc : "",
 skip: applicability[section.key] === "notApplicable",
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
const TEXT_ONLY_KEYS = new Set(["title", "course", "name", "degree", "thesis", "agency", "role", "status", "type", "level", "activity", "nature", "journal", "book", "publisher", "org", "program", "company", "desc", "coAuthors", "media", "film", "used"]);

function SectionTable({ section, form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles }) {
 const rows = form[section.key] || [];
 const reviewRows = reviewData?.[section.key] || [];
 const editableSelf = mode === "self" && !locked;
 const reviewLocked = mode === "review" && locked;
 const currentRole = reviewerRole;
 const applicability = form.sectionApplicability || {};
 const notApplicable = applicability[section.key] === "notApplicable";
 const selfLocked = mode === "self" && section.key === "acr";
 const canToggleApplicability = editableSelf && ["projects", "research", "society"].includes(section.key);
 const earned = notApplicable ? 0 : (section.key === "lectures" || section.key === "courseFile")
 ? averageSectionScore(rows, section.max)
 : scoreSectionRows(section.key, rows, section.max);
 const totalLabel = ["lectures", "courseFile", "feedback"].includes(section.key)
 ? `Average Score (Max ${section.max})`
 : `Total Score (Max ${section.max})`;
 const totalLabelColSpan = 1 + section.fields.length + (section.key === "feedback" ? 1 : 0) + (section.key !== "courseFile" ? 1 : 0);
 const sectionTotalScore = (sourceRows = rows, scoreKey = "score") =>{
 if (notApplicable) return 0;
 if (scoreKey !== "score") return reviewSectionScore(section.key, sourceRows, section.max, scoreKey);
 if (section.key === "lectures" || section.key === "courseFile") return averageSectionScore(sourceRows, section.max, scoreKey);
 if (section.key === "feedback" && scoreKey === "score") return feedbackSectionScore(sourceRows, section.max);
 return scoreSectionRows(section.key, sourceRows, section.max, scoreKey);
 };

 if (section.key === "acr" && mode === "self") {
 const acrRows = createAcrRows(rows);
 const acrTotal = scoreSectionRows(section.key, acrRows, section.max);
 return (
<SectionShell title="(xi) Annual Confidential Report (ACR) - Max 25 marks" max={section.max} earned={acrTotal} accent="#ef4444" showScoreSummary={false}>
<div style={{ fontSize: 11, color: "#b45309", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 5, padding: "6px 10px", marginBottom: 8 }}>
 This section is filled by your superior. It is visible here for reference and is not counted in your self score.
</div>
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

 const rowSelfScore = (row) =>{
 if (section.key === "feedback") return feedbackRowScore(row, section.max);
 if (section.key === "courseFile") return courseFileRowScore(row);
 if (section.key === "research") return String(row.score ?? "").trim() !== "" ? clampScore(row.score, researchGuidanceRowMax(row)) : researchGuidanceScore(row);
 if (section.key === "society") return societyRowScore(row);
 return clampScore(row.score, section.rowMax ? (typeof section.rowMax === "function" ? section.rowMax(row) : section.rowMax) : section.max);
 };

 const updateRow = (index, key, value) =>{
 setForm((prev) =>({
 ...prev,
 [section.key]: (prev[section.key] || []).map((row, rowIndex) =>{
 if (rowIndex !== index) return row;
 const rowMax = section.rowMax ? (typeof section.rowMax === "function" ? section.rowMax(row) : section.rowMax) : section.max;
 const nextValue = key === "date" ? maskDateDDMMYYYY(value) : key === "score" ? (value === "" ? "" : clampScore(value, rowMax)) : value;
 const nextRow = { ...row, [key]: nextValue };
 if (section.key === "research" && ["degree", "name", "thesis"].includes(key)) return { ...nextRow, score: researchGuidanceScore(nextRow) ? String(researchGuidanceScore(nextRow)) : "" };
 return nextRow;
 }),
 }));
 };

 const setApplicability = (value) =>{
 setForm((prev) =>{
 const blankRows = (prev[section.key] || []).map((row) =>({
 ...row,
 ...Object.fromEntries(section.fields.filter(([, , readOnly]) =>!readOnly).map(([key]) =>[key, ""])),
 score: "",
 }));
 return {
 ...prev,
 sectionApplicability: { ...(prev.sectionApplicability || {}), [section.key]: value },
 [section.key]: value === "notApplicable" ? blankRows : prev[section.key],
 };
 });
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

 const addRow = () =>{
 const blank = Object.fromEntries(section.fields.map(([key]) =>[key, ""]));
 setForm((prev) =>({ ...prev, [section.key]: [...(prev[section.key] || []), { ...blank, score: "", _id: Date.now() + Math.random() }] }));
 };

 const deleteRow = () =>{
 setForm((prev) =>({ ...prev, [section.key]: (prev[section.key] || []).length >1 ? prev[section.key].slice(0, -1) : prev[section.key] }));
 };

 return (
<SectionShell title={section.title} max={notApplicable ? 0 : section.max} earned={earned} accent={section.key === "acr" ? "#ef4444" : section.key === "society" ? "#10b981" : section.doc?.startsWith("j") || section.doc?.startsWith("p") || section.doc?.startsWith("b") || section.doc?.startsWith("i") || section.doc?.startsWith("e") ? ACCENT2 : ACCENT}>
 {canToggleApplicability && (
<div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
 {["applicable", "notApplicable"].map((value) =>(
<label key={value} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
<input type="checkbox" checked={(applicability[section.key] || "applicable") === value} onChange={() =>setApplicability(value)} />
 {value === "applicable" ? "Applicable" : "Not Applicable"}
</label>
 ))}
</div>
 )}
 {!notApplicable && (<>
<div style={{ overflowX: "auto" }}>
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
<thead>
<tr>
<th style={thStyle}>SN</th>
 {section.fields.map(([, label]) =><th key={label} style={thStyle}>{label}</th>)}
 {section.key === "feedback" &&<th style={thStyle}>Average</th>}
 {section.key !== "courseFile" &&<th style={thStyle}>Documents</th>}
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
 disabled={!editableSelf || readOnlyField || notApplicable || selfLocked}
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
 disabled={!editableSelf || readOnlyField || notApplicable || selfLocked}
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
 disabled={!editableSelf || notApplicable || selfLocked}
 onChange={(event) =>updateRow(index, key, event.target.value)}
 style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}
 >
<option value="">Select</option>
<option value="1.Available">1.Available</option>
<option value="2.Partially Available">2.Partially Available</option>
<option value="3.Not Available">3.Not Available</option>
</select>
 ) : (
<>
<TI value={row[key]} type={NUMERIC_KEYS.has(key) ? "number" : "text"} center={section.key === "courseFile" && key === "title"} max={key === "fb1" || key === "fb2" ? SCORE_LIMITS.feedbackAverage : undefined} deferClampWhileTyping={key === "fb1" || key === "fb2"} textOnly={TEXT_ONLY_KEYS.has(key) && !(section.key === "courseFile" && key === "title")} readOnly={!editableSelf || readOnlyField || notApplicable || selfLocked || socRowLocked} onChange={(value) =>updateRow(index, key, value)} />
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
 {section.key !== "courseFile" &&<td style={tdStyle}><DocCell id={`${section.doc}-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf || notApplicable || selfLocked || socRowLocked} /></td>}
<td style={tdCenter}>
 {mode === "self"
 ? section.key === "feedback"
 ?<RO value={row.fb1 || row.fb2 ? feedbackRowScore(row, section.max).toFixed(1) : ""} center />
 :<TI value={row.score} type="number" center max={section.rowMax ? (typeof section.rowMax === "function" ? section.rowMax(row) : section.rowMax) : section.max} readOnly={!editableSelf || section.selfReadOnlyScore || notApplicable || selfLocked || socRowLocked} onChange={(value) =>updateRow(index, "score", value)} />
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
<tr style={{ background: "#eff6ff" }}>
<td style={{ ...tdCenter, fontWeight: "bold" }} colSpan={totalLabelColSpan}>{totalLabel}</td>
<td style={{ ...tdCenter, fontWeight: "bold" }}>{earned.toFixed(1)}</td>
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
</tbody>
</table>
</div>
 {editableSelf && !section.selfReadOnlyScore && (
<div style={{ display: "flex", gap: 8, marginTop: 10 }}>
<button type="button" onClick={addRow} style={smallButton("#10b981")}>+ Add Row</button>
<button type="button" onClick={deleteRow} style={smallButton("#ef4444")}>Delete Last</button>
</div>
 )}
</>)}
</SectionShell>
 );
}

function B8SectionTable({ section, form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles, showTotal = false }) {
 const rows = form[section.key] || [];
 const reviewRows = reviewData?.[section.key] || [];
 const editableSelf = mode === "self" && !locked;
 const reviewLocked = mode === "review" && locked;
 const totalB8 = clampScore(scoreSectionRows("fdps", form.fdps || [], 20) + scoreSectionRows("training", form.training || [], 20), 20);

 const updateRow = (index, key, value) =>{
 setForm((prev) =>({
 ...prev,
 [section.key]: (prev[section.key] || []).map((row, rowIndex) =>(
 rowIndex === index
 ? { ...row, [key]: key === "score" ? (value === "" ? "" : clampScore(value, SCORE_LIMITS.fdpRow)) : value }
 : row
 )),
 }));
 };

 const updateReview = (index, value) =>{
 setReviewData((prev) =>{
 const source = prev[section.key] || cloneRows(rows);
 const nextRows = source.map((row, rowIndex) =>(
 rowIndex === index ? { ...row, [reviewerRole]: clampReviewScore(section.key, rows[rowIndex] || row, value, section.max) } : row
 ));
 return { ...prev, [section.key]: nextRows };
 });
 };

 const addRow = () =>{
 const blank = Object.fromEntries(section.fields.map(([key]) =>[key, ""]));
 setForm((prev) =>({ ...prev, [section.key]: [...(prev[section.key] || []), { ...blank, score: "", _id: Date.now() + Math.random() }] }));
 };

 const deleteRow = () =>{
 setForm((prev) =>({ ...prev, [section.key]: (prev[section.key] || []).length >1 ? prev[section.key].slice(0, -1) : prev[section.key] }));
 };

 return (
<SectionShell title={section.title} max={section.max} earned={scoreSectionRows(section.key, rows, section.max)} accent={ACCENT2} showScoreSummary={false}>
<div style={{ overflowX: "auto" }}>
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
<thead>
<tr>
<th style={{ ...thStyle, width: 60 }}>SN</th>
 {section.fields.map(([, label]) =><th key={label} style={thStyle}>{label}</th>)}
<th style={thStyle}>Documents</th>
<th style={thStyle}>Faculty Score</th>
 {mode === "review" && previousRoles.map((role) =><th key={role} style={thStyle}>{roleLabel(role)} Score</th>)}
 {mode === "review" &&<th style={thStyle}>{roleLabel(reviewerRole)} Score</th>}
</tr>
</thead>
<tbody>
 {rows.map((row, index) =>{
 const rowReviewable = rowHasReviewableData(section.key, row);
 return (
<tr key={row._id ?? `${section.key}-${index}`}>
<td style={tdCenter}>{index + 1}</td>
 {section.fields.map(([key]) =>(
<td key={key} style={tdStyle}>
 {mode === "self"
 ?<TI value={row[key]} textOnly={TEXT_ONLY_KEYS.has(key)} readOnly={!editableSelf} onChange={(value) =>updateRow(index, key, value)} />
 :<RO value={row[key]} />}
</td>
 ))}
<td style={tdStyle}><DocCell id={`${section.doc}-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf} /></td>
<td style={tdCenter}>
 {mode === "self"
 ?<TI value={row.score} type="number" center max={SCORE_LIMITS.fdpRow} readOnly={!editableSelf} onChange={(value) =>updateRow(index, "score", value)} />
 :<RO value={row.score} center />}
</td>
 {mode === "review" && previousRoles.map((role) =><td key={role} style={tdCenter}><RO value={rowReviewable ? row[role] : ""} center /></td>)}
 {mode === "review" && (
<td style={tdCenter}>
<TI type="number" center max={SCORE_LIMITS.fdpRow} readOnly={reviewLocked || !rowReviewable} value={rowReviewable ? reviewRows[index]?.[reviewerRole] ?? row[reviewerRole] ?? "" : ""} onChange={(value) =>updateReview(index, value)} />
</td>
 )}
</tr>
 )})}
 {showTotal && (
<tr style={{ background: "#f3e8ff" }}>
<td style={{ ...tdCenter, fontWeight: 900 }} colSpan={section.fields.length + 2}>Total B8 Score (Max 20)</td>
<td style={{ ...tdCenter, fontWeight: 900 }}>{totalB8.toFixed(1)}</td>
 {mode === "review" && previousRoles.map((role) =>(
<td key={role} style={{ ...tdCenter, fontWeight: 900 }}>
 {clampScore(scoreSectionRows("fdps", form.fdps || [], 20, role) + scoreSectionRows("training", form.training || [], 20, role), 20).toFixed(1)}
</td>
 ))}
 {mode === "review" && (
<td style={{ ...tdCenter, fontWeight: 900 }}>
 {clampScore(scoreSectionRows("fdps", reviewData.fdps || form.fdps || [], 20, reviewerRole) + scoreSectionRows("training", reviewData.training || form.training || [], 20, reviewerRole), 20).toFixed(1)}
</td>
 )}
</tr>
 )}
</tbody>
</table>
</div>
 {editableSelf && (
<div style={{ display: "flex", gap: 8, marginTop: 10 }}>
<button type="button" onClick={addRow} style={smallButton("#10b981")}>+ Add Row</button>
<button type="button" onClick={deleteRow} style={smallButton("#ef4444")}>Delete Last</button>
</div>
 )}
</SectionShell>
 );
}

function InnovativeSection({ form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles }) {
 const currentScore = scoreKeyForInnov(reviewerRole);
 const editableSelf = mode === "self" && !locked;
 const reviewLocked = mode === "review" && locked;
 const visibleInnovRows = (form.innovRows || []).length >0
 ? form.innovRows
 : [{ method: form.innovDetails, details: form.innovDetails, score: form.innovScore }];
 const facultyScore = clampScore(
 visibleInnovRows.reduce((total, row) =>total + clampScore(row.score, SCORE_LIMITS.innovativeRow), 0),
 10,
 );
 const rowReviewScore = (role, row, index) =>{
 if (!rowHasReviewableData("innovRows", row)) return "";
 const value = reviewData.innovRows?.[index]?.[role] ?? row[role] ?? "";
 return String(value ?? "").trim() ? clampScore(value, SCORE_LIMITS.innovativeRow) : "";
 };
 const roleInnovTotal = (role, sourceRows = visibleInnovRows) =>{
 const total = reviewSectionScore("innovRows", sourceRows.map((row, index) =>({
 ...row,
 [role]: reviewData.innovRows?.[index]?.[role] ?? row[role] ?? "",
 })), 10, role);
 return total || form[scoreKeyForInnov(role)] || "";
 };
 const currentInnovTotal = () =>reviewSectionScore("innovRows", visibleInnovRows.map((row, index) =>({
 ...row,
 [reviewerRole]: reviewData.innovRows?.[index]?.[reviewerRole] ?? row[reviewerRole] ?? "",
 })), 10, reviewerRole);
 const updateReview = (index, value) =>{
 const sourceRow = visibleInnovRows[index] || {};
 const nextValue = clampReviewScore("innovRows", sourceRow, value, 10);
 setReviewData((prev) =>{
 const sourceRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : cloneRows(visibleInnovRows);
 const nextRows = sourceRows.map((row, rowIndex) =>(
 rowIndex === index ? { ...row, [reviewerRole]: nextValue } : row
 ));
 const total = reviewSectionScore("innovRows", nextRows.map((row, rowIndex) =>({
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
 const updateSelfRow = (index, field, value) =>{
 setForm((prev) =>{
 const baseRows = (prev.innovRows || []).length >0
 ? prev.innovRows
 : [{ method: prev.innovDetails, details: prev.innovDetails, score: prev.innovScore }];
 const nextRows = baseRows.map((row, rowIndex) =>(rowIndex === index ? { ...row, [field]: value } : row));
 const hasAnyScore = nextRows.some((row) =>String(row.score ?? "").trim() !== "");
 const nextScore = hasAnyScore
 ? String(clampScore(nextRows.reduce((total, row) =>total + clampScore(row.score, SCORE_LIMITS.innovativeRow), 0), 10))
 : "";
 return {
 ...prev,
 innovRows: nextRows,
 innovDetails: nextRows.map((row) =>row.method).filter(Boolean).join(", "),
 innovScore: nextScore,
 };
 });
 };
 const addInnovRow = () =>
 setForm((prev) =>({
 ...prev,
 innovRows: [...(prev.innovRows || []), { method: "", details: "", score: "" }],
 }));
 const deleteInnovRow = () =>
 setForm((prev) =>({
 ...prev,
 innovRows: (prev.innovRows || []).length >1 ? (prev.innovRows || []).slice(0, -1) : (prev.innovRows || []),
 }));

 return (
<SectionShell title="(iii) Innovative Teaching-Learning Methodologies - Max 10 marks" max={10} earned={facultyScore}>
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
<thead>
<tr>
<th style={{ ...thStyle, width: 42 }}>SN</th>
<th style={thStyle}>Methods Used</th>
<th style={thStyle}>Details</th>
<th style={thStyle}>Attachment</th>
<th style={thStyle}>View Docs</th>
<th style={thStyle}>{mode === "self" ? "Score" : "Faculty Score"}</th>
 {mode === "review" && previousRoles.map((role) =><th key={role} style={thStyle}>{roleLabel(role)} Score</th>)}
 {mode === "review" &&<th style={thStyle}>{roleLabel(reviewerRole)} Score</th>}
</tr>
</thead>
<tbody>
 {visibleInnovRows.map((row, index) =>{
 const rowReviewable = rowHasReviewableData("innovRows", row);
 return (
<tr key={index}>
<td style={tdCenter}>{index + 1}</td>
<td style={tdStyle}>{mode === "self" ?<TI value={row.method} textOnly readOnly={!editableSelf} onChange={(value) =>updateSelfRow(index, "method", value)} />:<RO value={row.method || form.innovDetails} />}</td>
<td style={tdStyle}>{mode === "self" ?<TI value={row.details} textOnly readOnly={!editableSelf} onChange={(value) =>updateSelfRow(index, "details", value)} />:<RO value={row.details} />}</td>
<td style={tdStyle}><DocCell id={`innov-${index}`} docs={docs} setDocs={setDocs} readOnly={!editableSelf} /></td>
<td style={tdStyle}><DocCell id={`innov-${index}`} docs={docs} setDocs={setDocs} readOnly /></td>
<td style={tdCenter}>{mode === "self" ?<TI type="number" center max={SCORE_LIMITS.innovativeRow} readOnly={!editableSelf} value={row.score} onChange={(value) =>updateSelfRow(index, "score", value)} />:<RO value={row.score || form.innovScore} center />}</td>
 {mode === "review" && previousRoles.map((role) =><td key={role} style={tdCenter}><RO value={rowReviewScore(role, row, index)} center /></td>)}
 {mode === "review" &&<td style={tdCenter}><TI type="number" center max={SCORE_LIMITS.innovativeRow} readOnly={reviewLocked || !rowReviewable} value={rowReviewScore(reviewerRole, row, index)} onChange={(value) =>updateReview(index, value)} /></td>}
</tr>
 )})}
<tr style={{ background: "#eff6ff" }}>
<td style={{ ...tdCenter, fontWeight: 800 }} colSpan={5}>Total Score (Max 10)</td>
<td style={{ ...tdCenter, fontWeight: 800 }}>{facultyScore.toFixed(1)}</td>
 {mode === "review" && previousRoles.map((role) =><td key={role} style={{ ...tdCenter, fontWeight: 800 }}><RO value={roleInnovTotal(role)} center /></td>)}
 {mode === "review" &&<td style={{ ...tdCenter, fontWeight: 800 }}><RO value={currentInnovTotal() || reviewData.innovativeTeaching?.[reviewerRole] || form[currentScore]} center /></td>}
</tr>
</tbody>
</table>
 {mode === "self" && !locked && (
<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
<button type="button" onClick={addInnovRow} style={smallButton("#0f766e")}>Add Row</button>
<button type="button" onClick={deleteInnovRow} disabled={visibleInnovRows.length<= 1} style={smallButton(visibleInnovRows.length<= 1 ? "#94a3b8" : "#ef4444")}>Delete Last</button>
</div>
 )}
</SectionShell>
 );
}

export function MediaForm({ form, setForm, docs, setDocs, mode = "self", locked = false, reviewerRole = "", reviewData = {}, setReviewData = () =>{ }, previousRoles = [], sectionView = "partA" }) {
 const sectionTableProps = { form, setForm, docs, setDocs, mode, locked, reviewerRole, reviewData, setReviewData, previousRoles };
 return (
<>
 {(sectionView === "partA" || sectionView === "all") && (
<PartA sections={PART_A_SECTIONS} SectionTable={SectionTable} InnovativeSection={InnovativeSection} sectionTableProps={sectionTableProps} />
 )}
 {(sectionView === "partB" || sectionView === "all") && (
<PartB sections={PART_B_SECTIONS} SectionTable={SectionTable} B8SectionTable={B8SectionTable} sectionTableProps={sectionTableProps} sectionView={sectionView} />
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

export function SummaryBox({ totals, roleScoreLabel = "Score", maxScores = { partA: PART_A_MAX, partB: PART_B_MAX, grand: GRAND_MAX } }) {
 return (
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, display: "grid", gap: 12 }}>
 {[
 ["Part A", totals.partA, maxScores.partA, ACCENT],
 ["Part B", totals.partB, maxScores.partB, ACCENT2],
 ["Grand Total", totals.total, maxScores.grand, "#059669"],
 ].map(([label, value, max, color]) =>(
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
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
 {rows.map(([label, value, max, color]) =>(
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
 return<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, color: "#64748b", fontSize: 12 }}>Submit the appraisal to see the approval route.</div>;
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

function buildMediaSectionScores(person, reviewData, reviewerRole) {
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

export function MediaCommAuthorityReviewPanel({ person, reviewerRole, onBack, onSubmit, readOnly = false, showReport = false }) {
 const [sectionView, setSectionView] = useState("partA");
 const [reviewData, setReviewData] = useState({});
 const [remarks, setRemarks] = useState(person?.[`${reviewerRole}Remarks`] || "");
 const [confirmed, setConfirmed] = useState(false);
 const [draftStatus, setDraftStatus] = useState("");
 const [savingDraft, setSavingDraft] = useState(false);
 const form = mergeForm(emptyMediaForm(), person || {});
 const [docs, setDocs] = useState(form.docs || {});
 const subjectProfile = { school: person?.school, department: person?.department, appraisal_role: person?.appraisalRole };
 const visiblePreviousRoles = visiblePreviousReviewRoles(reviewerRole, subjectProfile);
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
 const facultyTotals = calculateMediaTotals(form, "score");
 const totals = calculateMediaTotals(reviewerForm, reviewerRole);
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
 sectionScores: buildMediaSectionScores(form, reviewData, reviewerRole),
 });
 setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
 } catch (err) {
 console.error("Could not save reviewer draft:", err);
 alert(err?.message || "Unable to save draft.");
 } finally {
 setSavingDraft(false);
 }
 };

 const generateReviewReport = async () =>{
 if (!reviewCompleted) return;
 const applicability = reviewerForm.sectionApplicability || {};
 const rowSum = (key, max) =>applicability[key] === "notApplicable" ? 0 : scoreSectionRows(key, reviewerForm[key] || [], max, "score");
 const lecScore = applicability["lectures"] === "notApplicable" ? 0 : averageSectionScore(reviewerForm.lectures || [], 50, "score");
 const cfScore = applicability["courseFile"] === "notApplicable" ? 0 : averageSectionScore(reviewerForm.courseFile || [], 20, "score");
 const innovScore = clampScore(
 Array.isArray(reviewerForm.innovRows)
 ? reviewerForm.innovRows.reduce((t, r) =>t + clampScore(r.score, SCORE_LIMITS.innovativeRow), 0)
 : innovativeTeachingScore(reviewerForm.innovDetails, reviewerForm.innovScore, 10),
 10,
 );
 const projScore = rowSum("projects", 10);
 const qualScore = rowSum("quals", 10);
 const fbScore = feedbackSectionScore(reviewerForm.feedback || [], 10);
 const deptScore = rowSum("deptActs", 20);
 const uniScore = rowSum("uniActs", 30);
 const socScore = rowSum("society", 10);
 const acrScore = rowSum("acr", 25);
 const b1iScore = rowSum("journals", 80);
 const b1iiScore = rowSum("popularWritings", 40);
 const b2Score = rowSum("books", 60);
 const b3Score = rowSum("ict", 30);
 const b4aScore = rowSum("research", 30);
 const b4bScore = rowSum("internalProjects", 15);
 const b4cScore = rowSum("externalProjects", 30);
 const b5Score = rowSum("awards", 10);
 const b6Score = rowSum("confs", 30);
 const b7aScore = rowSum("proposals", 10);
 const b7bScore = rowSum("products", 20);
 const b8Score = clampScore(rowSum("fdps", 20) + rowSum("training", 20), 20);
 const maxScores = getMediaEffectiveMaxScores(reviewerForm);
 const partATotal = panelReadOnly && String(person?.[`${reviewerRole}PartA`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}PartA`]) : totals.partA;
 const partBTotal = panelReadOnly && String(person?.[`${reviewerRole}PartB`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}PartB`]) : totals.partB;
 const grandTotal = panelReadOnly && String(person?.[`${reviewerRole}Total`] ?? "").trim() !== "" ? n(person?.[`${reviewerRole}Total`]) : totals.total;
 await generateMediaCommReport({
 title: "SoMCS Appraisal Report",
 subtitle: "School of Media & Communication Studies",
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
 ...summaryRowIfApplicable(applicability, "lectures", { id: "A(i)", label: "Lectures / Tutorials / Practicals", max: 50, score: lecScore }),
 ...summaryRowIfApplicable(applicability, "courseFile", { id: "A(ii)", label: "Course File", max: 20, score: cfScore }),
 { id: "A(iii)", label: "Innovative Teaching-Learning Methodologies", max: 10, score: innovScore },
 ...summaryRowIfApplicable(applicability, "projects", { id: "A(iv)", label: "Project Guidance", max: 10, score: projScore }),
 ...summaryRowIfApplicable(applicability, "quals", { id: "A(v)", label: "Qualification Enhancement", max: 10, score: qualScore }),
 ...summaryRowIfApplicable(applicability, "feedback", { id: "A(vi)", label: "Students' Feedback", max: 10, score: fbScore }),
 ...summaryRowIfApplicable(applicability, "deptActs", { id: "A(vii)", label: "Departmental / School Activities", max: 20, score: deptScore }),
 ...summaryRowIfApplicable(applicability, "uniActs", { id: "A(viii)", label: "University Level Activities", max: 30, score: uniScore }),
 ...summaryRowIfApplicable(applicability, "society", { id: "A(ix)", label: "Contribution to Society", max: 10, score: socScore }),
 ...summaryRowIfApplicable(applicability, "acr", { id: "A(x)", label: "Annual Confidential Report (ACR)", max: 25, score: acrScore }),
 { isTotal: true, label: "Part A Total", max: maxScores.partA, score: partATotal },
 { isHeader: true, label: "Part B - Research & Academic Contributions" },
 ...summaryRowIfApplicable(applicability, "journals", { id: "B1(i)", label: "Published Papers in Journals", max: 80, score: b1iScore }),
 ...summaryRowIfApplicable(applicability, "popularWritings", { id: "B1(ii)", label: "Popular Writings, Film & Documentary", max: 40, score: b1iiScore }),
 ...summaryRowIfApplicable(applicability, "books", { id: "B2", label: "Articles / Chapters in Books", max: 60, score: b2Score }),
 ...summaryRowIfApplicable(applicability, "ict", { id: "B3", label: "ICT Mediated Teaching-Learning Pedagogy / New Curricula", max: 30, score: b3Score }),
 ...summaryRowIfApplicable(applicability, "research", { id: "B4(a)", label: "Research Guidance - PhD / PG", max: 30, score: b4aScore }),
 ...summaryRowIfApplicable(applicability, "internalProjects", { id: "B4(b)", label: "Internal Research Projects", max: 15, score: b4bScore }),
 ...summaryRowIfApplicable(applicability, "externalProjects", { id: "B4(c)", label: "External Research Projects", max: 30, score: b4cScore }),
 ...summaryRowIfApplicable(applicability, "awards", { id: "B5", label: "Research Awards", max: 10, score: b5Score }),
 ...summaryRowIfApplicable(applicability, "confs", { id: "B6", label: "Conferences / Seminars / Workshops", max: 30, score: b6Score }),
 ...summaryRowIfApplicable(applicability, "proposals", { id: "B7(a)", label: "Research Proposals", max: 10, score: b7aScore }),
 ...summaryRowIfApplicable(applicability, "products", { id: "B7(b)", label: "Products Developed / Used", max: 20, score: b7bScore }),
 ...b8SummaryRowIfApplicable(applicability, { id: "B8", label: "FDP / Self Development + Industrial Training", max: 20, score: b8Score }),
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
<div style={{ color: "#94a3b8", fontSize: 12 }}>{person?.designation || titleCase(person?.appraisalRole)} - SoMCS</div>
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
<MediaForm
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
<CompactAuthoritySummaryCard title="Faculty Score" totals={facultyTotals} maxScores={facultyTotals.maxScores} accent="#0ea5e9" subtitle="Faculty submitted score for the SoMCS media appraisal form." />
<SummaryOtherInfoField value={summaryOtherInfoValueFrom(person)} readOnly rows={4} />
 {previousSummaryCards.map(({ role, label, totals: roleTotals, remarks: roleRemarks }) =>(
<CompactAuthoritySummaryCard key={role} title={`${label} Score`} totals={roleTotals} maxScores={roleTotals.maxScores} accent="#334155" subtitle={`${label} score for the SoMCS media appraisal form.`} remarksTitle={`${label} Remarks`} remarksContent={<div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap", maxHeight: 74, overflow: "auto" }}>{String(roleRemarks || "").trim() || "-"}</div>} />
 ))}
 {reviewerRole === "vc" &&<CompactAuthoritySummaryCard title="Average Score" totals={averageSummaryTotals} maxScores={averageSummaryTotals.maxScores} accent="#f59e0b" subtitle="Average score before VC review." />}
<CompactAuthoritySummaryCard
 title={`${roleLabel(reviewerRole)} Score`}
 totals={reviewerSummaryTotals}
 maxScores={totals.maxScores}
 accent="#134e4a"
 subtitle={`${roleLabel(reviewerRole)} score for the SoMCS media appraisal form.`}
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
 onSubmit(person.id, { partA: totals.partA, partB: totals.partB, total: totals.total }, remarks, buildMediaSectionScores(form, reviewData, reviewerRole), confirmed, "rejected");
 }
 }}
 disabled={!confirmed || !remarks.trim()}
 style={smallButton((confirmed && remarks.trim()) ? "#dc2626" : "#94a3b8")}
>
 Reject Form
</button>
 )}
<button
 onClick={() =>onSubmit(person.id, { partA: totals.partA, partB: totals.partB, total: totals.total }, remarks, buildMediaSectionScores(form, reviewData, reviewerRole), confirmed)}
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





