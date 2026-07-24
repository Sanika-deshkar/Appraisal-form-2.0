/* eslint-disable no-unused-vars, react-hooks/set-state-in-effect */
 import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, LogoutConfirmModal } from "../components/dashboard/dashboardPrimitives";
import { fetchNonTeachingQueueForRole, isNonTeachingReviewComplete } from "../services/nonTeachingWorkflow";
import { fetchReviewQueueForRole, loadReviewerDraft, saveReviewerDraft, submitWorkflowReview, fetchSavedAppraisal, mergeFacultyInfo, ACR_DETAIL_POINTS, MAX_SCORES, APP_INFO, createAcrRows, buildReviewRemarks, openFullFormReport, SummaryOtherInfoField, summaryOtherInfoValueFrom, SCORE_LIMITS, clampScore, clampReviewScore, effectiveMaxScore, projectGuidanceRowMax, researchGuidanceRowMax, researchGuidanceScore, reviewRowMaxForSection, reviewSectionScore, rowHasReviewableData, selfEffectivePartAMax, societyRowLocked, societyRowScore, standardReviewSummary, AppraisalHeaderImage, ViewDocsCell, SectionCard as SC } from "../features/faculty-appraisal";

import { DEAN_TRACKS, UNIVERSITY_SCHOOLS, normalizeHierarchyText } from "../constants/universityHierarchy";
import { canReviewerRejectProfile, getSchoolKey, profileFromsessionStorage, rejectedStatusFor, visiblePreviousReviewRoles, isAppraisalFinalisedByVc, isPendingReviewStatusFor } from "../utils/hierarchy";
import { NonTeachingAuthorityReviewPanel } from "./NonTeachingStaffDashboard";
import { n, pct, grade, RO } from "../features/faculty-appraisal/shared";

// --- Helpers ------------------------------------------------------------------
const oneDecimal = (value) =>(Math.trunc(n(value) * 10) / 10).toFixed(1);
const isVcReviewed = (person = {}) =>!isPendingReviewStatusFor([person.status, person.workflowStatus, person.workflow_status], "vc") && (person.status === "Reviewed" || person.status === "VC Reviewed" || person.status === "Rejected" || person.status === "VC Rejected" || n(person.vcTotal) >0);
// --- Sub-components -----------------------------------------------------------
function ScoreBar({ score, max, color = "#0ea5e9" }) {
 return (
<div style={{ width: "100%", background: `${color}18`, borderRadius: 6, height: 5, overflow: "hidden", marginTop: 4 }}>
<div style={{ width: `${pct(score, max)}%`, height: "100%", background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 6, transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
</div>
 );
}
function SummaryBox({
 totals,
 title = "Score",
 roleScoreLabel = "Score",
 maxScores = { partA: MAX_SCORES.PART_A, partB: MAX_SCORES.PART_B, grand: MAX_SCORES.GRAND_TOTAL },
 accent = "#4c1d95",
 remarks,
 remarksTitle,
}) {
 const scoreRows = [
 ["Part A", totals.partA, maxScores.partA, "#6366f1"],
 ["Part B", totals.partB, maxScores.partB, "#0ea5e9"],
 ["Total", totals.total, maxScores.grand, "#059669"],
 ];
 const hasRemarks = remarks !== undefined;
 return (
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `3px solid ${accent}`, borderRadius: 10, padding: "12px 14px", display: "grid", gridTemplateColumns: hasRemarks ? "minmax(300px, 0.95fr) minmax(280px, 1.05fr)" : "1fr", gap: 12, alignItems: "stretch", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}>
<div style={{ display: "grid", gap: 10, minWidth: 0 }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
<div>
<div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{title}</div>
<div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{roleScoreLabel}</div>
</div>
<div style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}30`, borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", letterSpacing: 0.2 }}>
 {oneDecimal(totals.total)} <span style={{ fontSize: 10, opacity: 0.6 }}>/ {maxScores.grand}</span>
</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
 {scoreRows.map(([label, value, max, color]) =>(
<div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
<div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline", marginBottom: 6 }}>
<span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
<span style={{ fontSize: 12, color, fontWeight: 900, whiteSpace: "nowrap" }}>{oneDecimal(value)}<span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}> /{max}</span></span>
</div>
<div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
 <div style={{ height: "100%", width: `${pct(n(value), max)}%`, background: `linear-gradient(90deg,${color}99,${color})`, borderRadius: 3 }} />
</div>
</div>
 ))}
</div>
</div>
 {hasRemarks && (
<div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 8, padding: "10px 12px", minWidth: 0, display: "flex", flexDirection: "column" }}>
<div style={{ fontWeight: 800, color: accent, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{remarksTitle || `${title} Remarks`}</div>
<div style={{ color: "#334155", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", flex: 1, maxHeight: 80, overflow: "auto" }}>
 {String(remarks || "").trim() || <span style={{ color: "#cbd5e1" }}>â€”</span>}
</div>
</div>
 )}
</div>
 );
}
function StatusBadge({ status }) {
 const map = {
 "Pending Review":     { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b", border: "#fde68a" },
 "HOD Reviewed":       { bg: "#f5f3ff", color: "#5b21b6", dot: "#7c3aed", border: "#ddd6fe" },
 "Director Reviewed":  { bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6", border: "#bfdbfe" },
 "Director Approved":  { bg: "#ecfeff", color: "#164e63", dot: "#06b6d4", border: "#a5f3fc" },
 "Pending Dean Review":{ bg: "#fffbeb", color: "#92400e", dot: "#f59e0b", border: "#fde68a" },
 "Dean Reviewed":      { bg: "#f0fdf4", color: "#065f46", dot: "#10b981", border: "#bbf7d0" },
 "VC Reviewed":        { bg: "#fdf4ff", color: "#6b21a8", dot: "#a855f7", border: "#e9d5ff" },
 "Reviewed":           { bg: "#fdf4ff", color: "#6b21a8", dot: "#a855f7", border: "#e9d5ff" },
 "Rejected":           { bg: "#fef2f2", color: "#991b1b", dot: "#ef4444", border: "#fecaca" },
 "VC Rejected":        { bg: "#fef2f2", color: "#991b1b", dot: "#ef4444", border: "#fecaca" },
 "Pending VC Review":  { bg: "#f5f3ff", color: "#5b21b6", dot: "#7c3aed", border: "#ddd6fe" },
 };
 const s = map[status] || map["Pending Review"];
 const label = status === "Reviewed" ? "VC Reviewed" : status === "Pending Review" ? "Pending VC Review" : status;
 return (
<span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: 20, border: `1px solid ${s.border}`, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
<span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0, boxShadow: `0 0 4px ${s.dot}88` }} />{label}
</span>
 );
}
function RoleBadge({ role }) {
 const map = {
 Director:      { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
 HOD:           { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
 Faculty:       { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
 Dean:          { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
 "Center Head": { bg: "#ccfbf1", color: "#0f766e", border: "#5eead4" },
 };
 const s = map[role] || map.Faculty;
 return (
<span style={{ display: "inline-flex", alignItems: "center", background: s.bg, color: s.color, fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 20, border: `1px solid ${s.border}`, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
 {role}
</span>
 );
}
// RO â†’ imported from shared
function ScoreValue({ val, center }) {
 const empty = val === undefined || val === null || val === "";
 return<span style={{ fontSize: 11, fontFamily: "inherit", color: "#1e293b", display: "block", textAlign: center ? "center" : "left" }}>{empty ?<span style={{ color: "#cbd5e1" }}>-</span>: val}</span>;
}
function VCInput({ val, onChange, max, disabled = false }) {
 return (
<input type="number" min="0" step="0.5" value={val ?? ""}
 max={max}
 disabled={disabled}
 onChange={e =>onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
 style={{ width: 58, textAlign: "center", border: "1.5px solid #7c3aed", borderRadius: 5, padding: "3px 5px", fontSize: 11, fontFamily: "inherit", outline: "none", background: disabled ? "#f1f5f9" : "#fdf4ff", cursor: disabled ? "not-allowed" : "text" }}
 />
 );
}
// --- Table style constants -----------------------------------------------------
const T = { width: "100%", borderCollapse: "collapse", fontSize: 11 };
const TH = { border: "1px solid #334155", padding: "5px 7px", background: "#1e293b", color: "#e2e8f0", fontWeight: 700, textAlign: "center", fontSize: 10, letterSpacing: "0.3px" };
const TH_HOD = { ...TH, background: "#312e81", color: "#c7d2fe" };
const TH_DIR = { ...TH, background: "#0c4a6e", color: "#bae6fd" };
const TH_DEAN = { ...TH, background: "#065f46", color: "#bbf7d0" };
const TH_VC = { ...TH, background: "#4c1d95", color: "#e9d5ff" };
const TD = { border: "1px solid #e2e8f0", padding: "5px 7px", verticalAlign: "middle" };
const TDC = { ...TD, textAlign: "center" };
const TDS = { ...TD, textAlign: "center", background: "#f8fafc", minWidth: 58 };
const TDS_HOD = { ...TDS, background: "#f0f4ff" };
const TDS_DIR = { ...TDS, background: "#f0fbff" };
const TDS_DEAN = { ...TDS, background: "#f0fdf4" };
const TDS_VC = { ...TDS, background: "#fdf4ff", minWidth: 70 };
const TDV = { ...TD, background: "#fafbff", minWidth: 110 };

const VC_CHAIN_ROLE_META = {
 hod: {
 label: "HOD Score",
 shortLabel: "HOD",
 field: "hod",
 headerStyle: TH_HOD,
 cellStyle: TDS_HOD,
 color: "#818cf8",
 remarksKey: "hodRemarks",
 remarksTitle: "HOD Remarks",
 remarksBg: "#f0f4ff",
 remarksBorder: "#c7d2fe",
 remarksColor: "#4338ca",
 },
 center_head: {
 label: "Center Head Score",
 shortLabel: "Center Head",
 field: "hod",
 headerStyle: TH_HOD,
 cellStyle: TDS_HOD,
 color: "#0f766e",
 remarksKey: "hodRemarks",
 remarksTitle: "Center Head Remarks",
 remarksBg: "#ecfdf5",
 remarksBorder: "#99f6e4",
 remarksColor: "#0f766e",
 },
 director: {
 label: "Director Score",
 shortLabel: "Director",
 field: "director",
 headerStyle: TH_DIR,
 cellStyle: TDS_DIR,
 color: "#38bdf8",
 remarksKey: "directorRemarks",
 remarksTitle: "Director Remarks",
 remarksBg: "#f0f9ff",
 remarksBorder: "#bae6fd",
 remarksColor: "#0369a1",
 },
 dean: {
 label: "Dean Score",
 shortLabel: "Dean",
 field: "dean",
 headerStyle: TH_DEAN,
 cellStyle: TDS_DEAN,
 color: "#34d399",
 remarksKey: "deanRemarks",
 remarksTitle: "Dean Remarks",
 remarksBg: "#f0fdf4",
 remarksBorder: "#bbf7d0",
 remarksColor: "#065f46",
 },
};

const vcChainProfileFor = (person = {}, personMode = "faculty") =>({
 school: person.school || person.info?.school || "",
 department: person.department || "",
 appraisal_role: person.appraisalRole || personMode,
});

const vcPreviousRolesFor = (person = {}, personMode = "faculty") =>{
 const profile = vcChainProfileFor(person, personMode);
 return visiblePreviousReviewRoles("vc", profile);
};

const vcRoleMeta = (role) =>VC_CHAIN_ROLE_META[role] || {
 label: `${role} Score`,
 shortLabel: role,
 field: role,
 headerStyle: TH,
 cellStyle: TDS,
 color: "#64748b",
};

const vcScoreForRole = (row = {}, role) =>{
 const field = vcRoleMeta(role).field;
 return row?.[field] ??
 row?.[`${field}_score`] ??
 row?.[`${field}Score`] ??
 row?.[`${field}_marks`] ??
 row?.[`${field}Marks`] ??
 (role === "center_head" ? (row.center_head_score ?? row.centerHeadScore ?? row.center_head_marks ?? row.centerHeadMarks) : undefined) ??
 row?.[`${role}_score`] ??
 row?.[`${role}Score`] ??
 row?.[`${role}_marks`] ??
 row?.[`${role}Marks`];
};
const vcTotalForRole = (person = {}, role) =>{
 if (role === "hod" || role === "center_head") return n(person.hodTotal ?? person.hodScore);
 if (role === "director") return n(person.directorTotal ?? person.directorScore);
 if (role === "dean") return n(person.deanTotal ?? person.deanScore);
 return 0;
};
const vcSelfTotalForPerson = (person = {}) =>
 n(person.declaration?.grand_total ?? person.grandTotal ?? person.grand_total ?? person.totalScore ?? person.total ?? person.selfTotal);
const rawVcSelfTotalForPerson = (person = {}) =>
 person.declaration?.grand_total ?? person.grandTotal ?? person.grand_total ?? person.totalScore ?? person.total ?? person.selfTotal;
const rawVcTotalForRole = (person = {}, role) =>{
 if (role === "hod" || role === "center_head") return person.hodTotal ?? person.hodScore;
 if (role === "director") return person.directorTotal ?? person.directorScore;
 if (role === "dean") return person.deanTotal ?? person.deanScore;
 return undefined;
};
const hasScoreValue = (value) =>
 value !== undefined && value !== null && String(value).trim() !== "" && Number.isFinite(Number(value));
const vcAverageBeforeVc = (person = {}, personMode = "faculty", previousRoles = vcPreviousRolesFor(person, personMode)) =>{
 const scores = [
 rawVcSelfTotalForPerson(person),
 ...previousRoles
 .filter((role) =>role !== personMode)
 .map((role) =>rawVcTotalForRole(person, role)),
 ]
 .filter(hasScoreValue)
 .map(Number);
 if (!scores.length) return 0;
 return scores.reduce((sum, value) =>sum + value, 0) / scores.length;
};

const vcReviewSummaryFrom = standardReviewSummary;

const VC_REVIEW_ARRAY_KEYS = ["lectures", "courseFile", "projects", "quals", "feedback", "deptActs", "uniActs", "society", "industry", "acr", "journals", "books", "ict", "research", "projects2", "externalProjects", "patents", "awards", "confs", "proposals", "products", "fdps", "training"];
const VC_SECTION_MAX = { lectures: 50, courseFile: 20, projects: 10, quals: 10, feedback: 10, deptActs: 20, uniActs: 30, society: 10, industry: 5, acr: 25, journals: 120, books: 50, ict: 20, research: 30, projects2: SCORE_LIMITS.researchInternalProjects, externalProjects: SCORE_LIMITS.researchExternalProjects, patents: 40, awards: 10, confs: 30, proposals: 10, products: 10, fdps: 10, training: 10 };
const REVIEW_SCORE_FIELDS = ["hod", "director", "dean", "vc"];
const preserveSavedReviewScores = (form = {}, source = {}) =>{
 const merged = { ...form };
 merged.info = mergeFacultyInfo(form.info, source, form);
 VC_REVIEW_ARRAY_KEYS.forEach((key) =>{
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
const VC_REPORT_PART_A_SECTIONS = [
 { key: "lectures", title: "A(i). Lectures / Tutorials / Practicals", max: 50, doc: "lec", fields: [["sem", "Semester"], ["code", "Course Code / Name"], ["planned", "Classes (as per course structure)"], ["conducted", "Classes Actually Conducted"], ["pctConducted", "% Conducted"]] },
 { key: "courseFile", title: "A(ii). Course File", max: 20, doc: "cf", fields: [["course", "Course / Paper"], ["title", "Title"], ["details", "IQAC Index Compliance (Yes/No, with proof)"]] },
 { key: "projects", title: "A(vi). Guided Students Project", max: 10, doc: "proj", fields: [["label", "Project Category"]] },
 { key: "quals", title: "A(viii). Qualification Enhancement", max: 10, doc: "qual", fields: [["label", "Category"]] },
 { key: "feedback", title: "Student Feedback", max: 10, doc: "fb", fields: [["code", "Course Code / Name"], ["fb1", "First Feedback(%)"], ["fb2", "Second Feedback(%)"]] },
 { key: "deptActs", title: "Departmental / School Activities", max: 20, doc: "dept", fields: [["activity", "Activity"], ["nature", "Nature"]] },
 { key: "uniActs", title: "University Level Activities", max: 30, doc: "uni", fields: [["activity", "Activity"], ["nature", "Nature"]] },
 { key: "society", title: "Contribution to Society", max: 10, doc: "soc", fields: [["label", "Activity"], ["details", "Details"]] },
 { key: "industry", title: "Industry Connect", max: 5, doc: "ind", fields: [["name", "Industry"], ["details", "Details"]] },
 { key: "acr", title: "(xi) Annual Confidential Report (ACR) - Max 25 marks", max: 25, doc: "acr", fields: [["label", "Attribute"]] },
];
const VC_REPORT_PART_B_SECTIONS = [
 { key: "journals", title: "B1. Journal Publications", max: 100, doc: "jour", fields: [["title", "Title"], ["journal", "Journal"], ["issn", "ISSN"], ["impactFactor", "Impact Factor"], ["authorPosition", "Author Position"]] },
 { key: "books", title: "B2. Books, Book Chapters & Edited Volumes", max: 30, doc: "book", fields: [["title", "Title"], ["book", "Publisher & ISBN"], ["pub", "Type (Book/Chapter/Editor/Translation)"], ["level", "Level (Intl./National/Local)"], ["coauth", "Co-authors from DYPIU"]] },
 { key: "patents", title: "B3. Patents, Copyrights & IP and Product Development", max: 40, doc: "pat", fields: [["title", "Title"], ["type", "National / International"], ["status", "Status (Published/Granted)"], ["fileNo", "Filing / Grant No. & Date"]] },
 { key: "projects2", title: "B4. Funded Research Projects", max: 40, doc: "project2", fields: [["title", "Title of Project"], ["agency", "Funding Agency"], ["date", "Sanction Date"], ["amount", "Amount (₹)"], ["role", "PI / Co-PI"], ["status", "Status"]] },
 { key: "research", title: "B5. Research Guidance", max: 20, doc: "res", fields: [["degree", "Degree (PhD/PG)"], ["name", "Name of Student / Scholar"], ["status", "Status (Ongoing/Awarded)"], ["date", "Date"]] },
 { key: "proposals", title: "B6. Consultancy, Testing & Training", max: 20, doc: "prop", fields: [["agency", "Client / Organisation"], ["duration", "Nature of Engagement"], ["amount", "Revenue Generated (₹)"]] },
 { key: "confs", title: "B7. Conference / FDP / Training / Workshop Contributions Organised", max: 20, doc: "conf", fields: [["title", "Event / Session Title"], ["role", "Role"], ["date", "Date"], ["level", "Level (Intl./National)"]] },
 { key: "fdps", title: "B8. Conference / FDP / Industry Training - Attended", max: 20, doc: "fdp", fields: [["program", "Programme / Event"], ["duration", "Duration"], ["org", "Organised By"]] },
 { key: "awards", title: "B9. Research Awards, Fellowships, Reviewer of Journal & Citations", max: 20, doc: "awd", fields: [["title", "Title of Award / Fellowship / Metric"], ["agency", "Awarding Agency"], ["level", "Level"], ["date", "Date"]] },
 { key: "products", title: "B10. Innovation, Start-ups & Technology Transfer", max: 20, doc: "prod", fields: [["details", "Title / Start-up / Product"], ["role", "Role"], ["status", "Status"]] },
 { key: "ict", title: "B11. ICT Content, MOOCs & E-Learning", max: 20, doc: "ict", fields: [["title", "Title"], ["type", "Platform / Type"], ["quad", "Reach / Views (if available)"]] },
 { key: "exhibitions", title: "B12. Exhibitions — Photography, Design & Applied Arts, Documentaries, Films & Audio-Visual Productions", max: 30, doc: "exh", fields: [["title", "Title of Work / Exhibition"], ["type", "Type (Solo/Group/Curated)"], ["venueLevel", "Venue & Level (Institutional/National/Intl.)"], ["date", "Date"]] },
];

const buildVcSectionScores = (person, vcData) =>{
 const payload = {};
 VC_REVIEW_ARRAY_KEYS.forEach((key) =>{
 const rows = Array.isArray(person[key]) ? person[key] : [];
 payload[key] = rows.map((row, index) =>({
 ...row,
 vc: key === "society" && societyRowLocked(row)
 ? "0"
 : clampReviewScore(key, row, vcData[key]?.[index]?.vc ?? row.vc ?? "", VC_SECTION_MAX[key] || 0),
 }));
 });
 const innovRows = Array.isArray(person.innovRows) ? person.innovRows : [];
 const reviewInnovRows = Array.isArray(vcData.innovRows) ? vcData.innovRows : [];
 const mergedInnovRows = innovRows.map((row, index) =>({
 ...row,
 vc: clampReviewScore("innovRows", row, reviewInnovRows[index]?.vc ?? row.vc ?? "", 10),
 }));
 const innovTotal = reviewSectionScore("innovRows", mergedInnovRows, 10, "vc");
 payload.innovRows = mergedInnovRows;
 payload.innovativeTeaching = {
 vc: innovTotal ? String(innovTotal) : vcData.innovVc ?? vcData.innovVC ?? person.innovVc ?? "",
 };
 return payload;
};


// --- VC Review Form -----------------------------------------------------------
// personMode: "dean" | "director" | "hod" | "faculty"
function VCReviewForm({ person, vcData, setVcData, personMode = "director", sectionView = "partA" }) {
 const info = mergeFacultyInfo(person.info, person);
 const hiddenInfoRows = new Set(["expDyp", "expPrev", "expTotal"]);
 const reviewRoles = vcPreviousRolesFor(person, personMode);
 const selfScoreLabel = personMode === "faculty" ? "Faculty Score" : "Self Score";

 const set = (section, idx, field, val) =>{
 setVcData(prev =>{
 const updated = { ...prev };
 if (!updated[section]) updated[section] = JSON.parse(JSON.stringify(person[section] || []));
 const nextVal = field === "vc" && idx !== null
 ? clampReviewScore(section, person[section]?.[idx] || {}, val, VC_SECTION_MAX[section] || 0)
 : val;
 if (idx === null) {
 updated[section] = Array.isArray(updated[section])
 ? (updated[section].length ? updated[section].map((r, i) =>i === 0 ? { ...r, [field]: nextVal } : r) : [{ [field]: nextVal }])
 : { ...updated[section], [field]: nextVal };
 } else updated[section] = updated[section].map((r, i) =>i === idx ? { ...r, [field]: nextVal } : r);
 return updated;
 });
 };
 const get = (section, idx, field) =>{
 if (vcData[section]) {
 const s = vcData[section];
 return idx === null
 ? (Array.isArray(s) ? (s[0]?.[field] ?? "") : (s[field] ?? ""))
 : (s[idx]?.[field] ?? person[section]?.[idx]?.[field] ?? "");
 }
 if (idx === null) {
 const source = person[section];
 return Array.isArray(source) ? (source[0]?.[field] ?? "") : (source?.[field] ?? "");
 }
 return person[section]?.[idx]?.[field] ?? "";
 };
 const { docs } = person;
 const rows = (arr) =>arr && arr.length >0 ? arr : [{}];
 const vcRowMax = (section, row = {}) =>reviewRowMaxForSection(section, row, VC_SECTION_MAX[section] || 0);
 const innovativeRows = Array.isArray(person.innovRows) && person.innovRows.length
 ? person.innovRows
 : [{ method: person.innovDetails || "Innovative / participatory teaching methods used", details: person.innovDetails || "", score: person.innovScore || "" }];
 const getInnovVc = (index) =>vcData.innovRows?.[index]?.vc ?? innovativeRows[index]?.vc ?? "";
 const setInnovVc = (index, value) =>{
 const sourceRow = innovativeRows[index] || {};
 const nextValue = clampReviewScore("innovRows", sourceRow, value, 10);
 setVcData(prev =>{
 const sourceRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : JSON.parse(JSON.stringify(innovativeRows));
 const nextRows = sourceRows.map((row, rowIndex) =>rowIndex === index ? { ...row, vc: nextValue } : row);
 const total = reviewSectionScore("innovRows", nextRows.map((row, rowIndex) =>({ ...innovativeRows[rowIndex], ...row })), 10, "vc");
 return { ...prev, innovRows: nextRows, innovVc: total ? String(total) : "" };
 });
 };

 const renderScoreHeaders = () =>(
<>
<th style={TH}>{selfScoreLabel}</th>
 {reviewRoles.map((role) =>{
 const meta = vcRoleMeta(role);
 return<th key={role} style={meta.headerStyle}>{meta.label}</th>;
 })}
<th style={TH_VC}>VC Score</th>
</>
 );

 const renderScoreCells = (r, section, i) =>{
 const maxForRow = vcRowMax(section, r);
 const societyLocked = section === "society" && societyRowLocked(r);
 const rowReviewable = rowHasReviewableData(section, r);
 const locked = societyLocked || !rowReviewable;
 const displayScore = (value) =>rowReviewable && maxForRow ? (String(value ?? "").trim() ? clampScore(value, maxForRow) : "") : "";
 const facultyScore = section === "research"
 ? (r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : "")
 : section === "society"
 ? (String(r?.score ?? "").trim() ? societyRowScore(r) : "")
 : displayScore(r?.score);
 const displayReviewScore = (value) =>
 value === undefined || value === null || String(value).trim() === ""
 ? undefined
 : displayScore(value);
 return (
<>
<td style={TDS}><ScoreValue val={facultyScore} center /></td>
 {reviewRoles.map((role) =>{
 const meta = vcRoleMeta(role);
 return<td key={role} style={meta.cellStyle}><ScoreValue val={societyLocked ? "0" : displayReviewScore(vcScoreForRole(r, role))} center /></td>;
 })}
<td style={TDS_VC}><VCInput val={societyLocked ? "0" : displayReviewScore(get(section, i, "vc")) ?? ""} max={maxForRow} disabled={locked} onChange={v =>set(section, i, "vc", v)} /></td>
</>
 );
 };

 return (
<div style={{ display: "flex", flexDirection: "column" }}>
 {/* Mode banner */}
<div style={{ background: "linear-gradient(90deg,#2e1065,#6d28d9)", color: "#ede9fe", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
<span style={{ fontSize: 18 }}></span>
<div>
<strong>Vice Chancellor Review Mode</strong>- Only the<span style={{ color: "#d8b4fe", fontWeight: 700 }}>VC Score</span>column is editable.
 {" "}All previous scores are shown read-only for reference.
</div>
</div>

 {/* Personal Info */}
<SC title="Personal Information" accent="#7c3aed">
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
<tbody>
 {Object.entries(info).filter(([k]) =>!hiddenInfoRows.has(k)).map(([k, v]) =>(
<tr key={k}>
<td style={{ padding: "6px 10px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", width: "35%", textTransform: "capitalize" }}>{k}</td>
<td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", color: "#334155" }}>{v}</td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {sectionView === "partA" && (<>
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#dbeafe", padding: "8px 14px", borderRadius: 6, marginBottom: 10 }}>PART A - Teaching &amp; Academic Activities</div>

 {/* A1 Lectures */}
<SC title="A1. Lectures / Tutorials / Practicals (Max 50)" accent="#7c3aed">
<div style={{ overflowX: "auto" }}>
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Semester</th><th style={TH}>Course</th>
<th style={TH}>Classes (as per course structure)</th><th style={TH}>Classes Actually Conducted</th><th style={TH}>Docs</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person.lectures).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td><td style={TD}><RO val={r.sem} /></td><td style={TD}><RO val={r.code} /></td>
<td style={TDC}><RO val={r.planned} center /></td><td style={TDC}><RO val={r.conducted} center /></td>
<td style={TDV}><ViewDocsCell docKey={`lec-${i}`} docs={docs} /></td>
 {renderScoreCells(r, "lectures", i)}
</tr>
 ))}</tbody></table>
</div>
</SC>

 {/* A2 Course File */}
<SC title="A2. Course File (Max 20)" accent="#7c3aed">
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Course</th><th style={TH}>Title</th><th style={TH}>IQAC Index Compliance (Yes/No, with proof)</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person.courseFile).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.course} /></td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.details} center /></td>
 {renderScoreCells(r, "courseFile", i)}
</tr>
 ))}</tbody></table>
</SC>

 {/* A3 Innovative */}
<SC title="A3. Innovative Teaching-Learning (Max 10)" accent="#7c3aed">
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Method</th><th style={TH}>Proof Attached (Yes/No)</th>
<th style={TH}>View Docs</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{innovativeRows.map((row, index) =>{
 const rowReviewable = rowHasReviewableData("innovRows", row);
 const previousInnovScore = (role) =>{
 const value = row[role] ?? "";
 return String(value ?? "").trim() ? clampScore(value, SCORE_LIMITS.innovativeRow) : "";
 };
 return (
<tr key={`innov-${index}`}>
<td style={TDC}>{index + 1}</td>
<td style={TD}><RO val={row.method || person.innovDetails} /></td>
<td style={TD}><RO val={row.details} /></td>
<td style={TDV}><ViewDocsCell docKey={index === 0 ? ["innov", "innov-0"] : `innov-${index}`} docs={docs} /></td>
<td style={TDS}><ScoreValue val={String(row.score ?? "").trim() ? clampScore(row.score, SCORE_LIMITS.innovativeRow) : ""} center /></td>
 {reviewRoles.map((role) =>{
 const meta = vcRoleMeta(role);
 return<td key={role} style={meta.cellStyle}><ScoreValue val={previousInnovScore(role)} center /></td>;
 })}
<td style={TDS_VC}><VCInput val={String(getInnovVc(index) ?? "").trim() ? clampScore(getInnovVc(index), SCORE_LIMITS.innovativeRow) : ""} max={SCORE_LIMITS.innovativeRow} disabled={!rowReviewable} onChange={v =>setInnovVc(index, v)} /></td>
</tr>
 );
 })}</tbody></table>
</SC>

 {/* A4-A5 Projects & Quals */}
 {[
 ["A4. Projects (Max 10)", "projects", "proj"],
 ["A5. Qualification Enhancement (Max 10)", "quals", "qual"],
 ].map(([title, key, docPfx]) =>(
<SC key={key} title={title} accent="#7c3aed">
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Description</th><th style={TH}>Docs</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person[key]).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDV}><ViewDocsCell docKey={`${docPfx}-${i}`} docs={docs} /></td>
 {renderScoreCells(r, key, i)}
</tr>
 ))}</tbody></table>
</SC>
 ))}

 {/* B Feedback */}
<SC title="B. Student Feedback (Max 10)" accent="#7c3aed">
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Course</th><th style={TH}>First Feedback(%)</th><th style={TH}>Second Feedback(%)</th><th style={TH}>Average</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person.feedback).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td><td style={TD}><RO val={r.code} /></td>
<td style={TDC}><RO val={r.fb1} center /></td><td style={TDC}><RO val={r.fb2} center /></td>
<td style={{ ...TDC, fontWeight: 700, color: "#0ea5e9" }}>{r.fb1 && r.fb2 ? ((n(r.fb1) + n(r.fb2)) / 2).toFixed(2) : "-"}</td>
 {renderScoreCells(r, "feedback", i)}
</tr>
 ))}</tbody></table>
</SC>

 {/* C-F Activities */}
 {[
 ["C. Departmental Activities (Max 20)", "deptActs", "#f59e0b", ["Activity", "Nature"], ["activity", "nature"], "dept"],
 ["D. University Activities (Max 30)", "uniActs", "#f59e0b", ["Activity", "Nature"], ["activity", "nature"], "uni"],
 ["F. Industry Connect (Max 5)", "industry", "#10b981", ["Industry", "Details"], ["name", "details"], "ind"],
 ].map(([title, key, accent2, cols, fields, docPfx]) =>(
<SC key={key} title={title} accent={accent2}>
<table style={T}><thead><tr>
<th style={TH}>SN</th>
 {cols.map(c =><th key={c} style={TH}>{c}</th>)}
<th style={TH}>Docs</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person[key]).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
 {fields.map(f =><td key={f} style={TD}><RO val={r[f]} /></td>)}
<td style={TDV}><ViewDocsCell docKey={`${docPfx}-${i}`} docs={docs} /></td>
 {renderScoreCells(r, key, i)}
</tr>
 ))}</tbody></table>
</SC>
 ))}

 {/* E. Contribution to Society */}
<SC title="E. Contribution to Society (Max 10, Max 5 per row)" accent="#10b981">
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Details</th><th style={TH}>Docs</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person.society).map((r, i) =>(
<tr key={i} style={societyRowLocked(r) ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`soc-${i}`} docs={docs} /></td>
 {renderScoreCells(r, "society", i)}
</tr>
 ))}</tbody></table>
</SC>

 {/* G ACR */}
<SC title="G. Annual Confidential Report (Max 25)" accent="#ef4444">
<table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Attribute</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{createAcrRows(person.acr).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}>
<div style={{ fontWeight: 700 }}>{r.label}</div>
 {ACR_DETAIL_POINTS[r.label] && (
<ul style={{ margin: "5px 0 0 16px", padding: 0, color: "#64748b", fontSize: 10, lineHeight: 1.5 }}>
 {ACR_DETAIL_POINTS[r.label].map((point) =><li key={point}>{point}</li>)}
</ul>
 )}
</td>
 {renderScoreCells(r, "acr", i)}
</tr>
 ))}</tbody></table>
</SC>

</>)}
 {sectionView === "partB" && (<>
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#ede9fe", padding: "8px 14px", borderRadius: 6, marginBottom: 10 }}>PART B - Research &amp; Academic Contributions</div>

 {/* B1 Journals */}
<SC title="B1. Research Papers / Journal Publications (Max 120)" accent="#7c3aed">
<div style={{ overflowX: "auto" }}><table style={T}><thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Journal</th>
<th style={TH}>ISSN</th><th style={TH}>Journal Indexing</th><th style={TH}>Docs</th>
 {renderScoreHeaders()}
</tr></thead>
<tbody>{rows(person.journals).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td><td style={TD}><RO val={r.title} /></td><td style={TD}><RO val={r.journal} /></td>
<td style={TDC}><RO val={r.issn} center /></td><td style={TDC}><RO val={r.index} center /></td>
<td style={TDV}><ViewDocsCell docKey={`jour-${i}`} docs={docs} /></td>
 {renderScoreCells(r, "journals", i)}
</tr>
 ))}</tbody></table></div>
</SC>

 {/* B2-B8 */}
 {[
 { title: "B2. Books / Book Chapters (Max 50)", key: "books", docPfx: "book",
 render: (r) =>[r.title, r.book, r.issn, r.pub, r.coauth, r.first] },
 { title: "B3. ICT / E-Content (Max 20)", key: "ict", docPfx: "ict",
 render: (r) =>[r.title, r.type, r.quad] },
 { title: "B4(a). Research Guidance (Max 30)", key: "research", docPfx: "res",
 render: (r) =>[r.degree, r.name, r.thesis] },
 { title: "B4(b). Research / Consultancy Internal Projects (Max 15)", key: "projects2", docPfx: "project2",
 render: (r) =>[r.title, r.agency, r.date, r.amount, r.role, r.status] },
 { title: "B4(c). Research / Consultancy External Projects (Max 30)", key: "externalProjects", docPfx: "externalProject",
 render: (r) =>[r.title, r.agency, r.date, r.amount, r.role, r.status] },
 { title: "B5(a). Patents (IPR) (Max 40)", key: "patents", docPfx: "pat",
 render: (r) =>[r.title, r.type, r.date, r.status, r.fileNo] },
 { title: "B5(b). Awards (Max 10)", key: "awards", docPfx: "awd",
 render: (r) =>[r.title, r.date, r.agency, r.level] },
 { title: "B6. Invited Lectures / Resource Person / Paper Presentations (Max 30)", key: "confs", docPfx: "conf",
 render: (r) =>[r.title, r.type, r.org, r.level] },
 { title: "B7(a). Submitted Research Proposals (Max 10)", key: "proposals", docPfx: "prop",
 render: (r) =>[r.title, r.duration, r.agency, r.amount] },
 { title: "B7(b). Product Developed and Used by Students in Lab / Commercialized (Max 10)", key: "products", docPfx: "prod",
 render: (r) =>[r.details, r.usage] },
 { title: "B8(a). FDP / Workshops Attended (Max 10)", key: "fdps", docPfx: "fdp",
 render: (r) =>[r.program, r.duration, r.org] },
 { title: "B8(b). Industrial Training", key: "training", docPfx: "train",
 render: (r) =>[r.company, r.duration, r.nature] },
 ].map(({ title, key, docPfx, render }) =>(
<SC key={key} title={title} accent="#7c3aed">
<div style={{ overflowX: "auto" }}><table style={T}><thead>
<tr>
<th style={TH}>SN</th><th style={TH}>Details</th><th style={TH}>Docs</th>
 {renderScoreHeaders()}
</tr>
</thead>
<tbody>{rows(person[key]).map((r, i) =>{
 const cells = render(r);
 return (
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}>
 {cells.filter(Boolean).map((c, ci) =>(
<span key={ci} style={{ display: "inline-block", marginRight: 8, color: "#334155" }}>{c}</span>
 ))}
</td>
<td style={TDV}><ViewDocsCell docKey={`${docPfx}-${i}`} docs={docs} /></td>
 {renderScoreCells(r, key, i)}
</tr>
 );
 })}</tbody></table></div>
</SC>
 ))}
</>)}
</div>
 );
}


// --- Score Calculator ---------------------------------------------------------
function calcVCScore(person, vcData) {
 const get = (section, idx, field) =>{
 if (vcData[section]) {
 const s = vcData[section];
 return idx === null ? n(Array.isArray(s) ? s[0]?.[field] : s[field]) : n(s[idx]?.[field]);
 }
 const source = person[section];
 return idx === null ? n(Array.isArray(source) ? source[0]?.[field] : source?.[field]) : n(source?.[idx]?.[field]);
 };
 const sectionMax = { lectures: 50, courseFile: 20, projects: 10, quals: 10, feedback: 10, deptActs: 20, uniActs: 30, society: 10, industry: 5, acr: 25, journals: 120, books: 50, ict: 20, research: 30, projects2: SCORE_LIMITS.researchInternalProjects, externalProjects: SCORE_LIMITS.researchExternalProjects, patents: 40, awards: 10, confs: 30, proposals: 10, products: 10, fdps: 10, training: 10 };
 const rowMax = { courseFile: () =>SCORE_LIMITS.courseFileRow, projects: projectGuidanceRowMax, quals: () =>SCORE_LIMITS.qualificationRow, feedback: () =>10, society: () =>SCORE_LIMITS.societyRow, acr: () =>SCORE_LIMITS.acrRow, research: researchGuidanceRowMax, fdps: () =>SCORE_LIMITS.fdpRow, training: () =>SCORE_LIMITS.fdpRow };
 const sum = (arr, s, f) =>{
 if (s === "lectures" || s === "courseFile" || s === "feedback") {
 const averageRows = (arr || []).map((row, i) =>({
 ...row,
 [f]: vcData[s]?.[i]?.[f] ?? row?.[f] ?? "",
 }));
 return reviewSectionScore(s, averageRows, sectionMax[s] || 0, f);
 }
 return clampScore((arr || []).reduce((a, row, i) =>{
 if (s === "society" && societyRowLocked(row)) return a;
 if (!rowHasReviewableData(s, row)) return a;
 const limit = rowMax[s]?.(row);
 return a + (limit ? clampScore(get(s, i, f), limit) : get(s, i, f));
 }, 0), sectionMax[s] || 0);
 };
 const innovRows = (person.innovRows || []).map((row, index) =>({
 ...row,
 vc: vcData.innovRows?.[index]?.vc ?? row.vc ?? "",
 }));
 const innov = innovRows.length ? reviewSectionScore("innovRows", innovRows, 10, "vc") : clampScore(vcData.innovVc ?? vcData.innovVC ?? person.innovVc, 10);

 const partA = sum(person.lectures, "lectures", "vc") + sum(person.courseFile, "courseFile", "vc") +
 innov + sum(person.projects, "projects", "vc") +
 sum(person.quals, "quals", "vc") + sum(person.feedback, "feedback", "vc") +
 sum(person.deptActs, "deptActs", "vc") + sum(person.uniActs, "uniActs", "vc") +
 sum(person.society, "society", "vc") + sum(person.industry, "industry", "vc") +
 sum(person.acr, "acr", "vc");

 const partB = sum(person.journals, "journals", "vc") + sum(person.books, "books", "vc") +
 sum(person.ict, "ict", "vc") + sum(person.research, "research", "vc") +
 sum(person.projects2, "projects2", "vc") + sum(person.externalProjects, "externalProjects", "vc") + sum(person.patents, "patents", "vc") + sum(person.awards, "awards", "vc") +
 sum(person.confs, "confs", "vc") + sum(person.proposals, "proposals", "vc") + sum(person.products, "products", "vc") +
 clampScore(sum(person.fdps, "fdps", "vc") + sum(person.training || [], "training", "vc"), 10);

 const partAMax = effectiveMaxScore(MAX_SCORES.PART_A || 200);
 const partBMax = effectiveMaxScore(MAX_SCORES.PART_B || 375);
 const cappedPartA = clampScore(partA, partAMax);
 const cappedPartB = clampScore(partB, partBMax);
 return { partA: cappedPartA, partB: cappedPartB, total: clampScore(cappedPartA + cappedPartB, partAMax + partBMax) };
}

// --- VC Review Panel ----------------------------------------------------------
function VCReviewPanel({ person, personMode, onBack, onSubmit, readOnly = false }) {
 const [vcData, setVcData] = useState({});
 const [remarks, setRemarks] = useState(person.vcRemarks || "");
 const [sectionView, setSectionView] = useState("partA");
 const [reviewConfirmed, setReviewConfirmed] = useState(false);
 const [draftStatus, setDraftStatus] = useState("");
 const [savingDraft, setSavingDraft] = useState(false);
 const finalisedByVc = isAppraisalFinalisedByVc(person);
 const [editingFinalised, setEditingFinalised] = useState(false);
 const finalisedReadOnly = finalisedByVc && !editingFinalised;
 const reviewLocked = (readOnly && !finalisedByVc) || finalisedReadOnly;
 const canReject = canReviewerRejectProfile("vc", person);
 const subjectEmail = person.email || person.faculty_email || person.facultyEmail;
 const academicYear = person.academicYear || person.academic_year || person.info?.ay || APP_INFO.DEFAULT_AY || "2026-2027";

 const calculatedScores = calcVCScore(person, vcData);
 const partA = reviewLocked && n(person.vcPartA) >0 ? n(person.vcPartA) : calculatedScores.partA;
 const partB = reviewLocked && n(person.vcPartB) >0 ? n(person.vcPartB) : calculatedScores.partB;
 const total = reviewLocked && n(person.vcTotal) >0 ? n(person.vcTotal) : calculatedScores.total;
 const selfMaxScores = {
 partA: selfEffectivePartAMax(MAX_SCORES.PART_A),
 partB: effectiveMaxScore(MAX_SCORES.PART_B),
 grand: 0,
 };
 selfMaxScores.grand = selfMaxScores.partA + selfMaxScores.partB;
 const reviewerMaxScores = {
 partA: effectiveMaxScore(MAX_SCORES.PART_A),
 partB: selfMaxScores.partB,
 grand: 0,
 };
 reviewerMaxScores.grand = reviewerMaxScores.partA + reviewerMaxScores.partB;
 const g = grade(total, reviewerMaxScores.grand);
 const previousRoles = vcPreviousRolesFor(person, personMode);
 const selfPartA = Math.min(n(person.declaration?.part_a_total ?? person.selfPartA ?? person.partATotal), selfMaxScores.partA);
 const selfPartB = Math.min(n(person.declaration?.part_b_total ?? person.selfPartB ?? person.partBTotal), selfMaxScores.partB);
 const selfTotal = Math.min(vcSelfTotalForPerson(person), selfPartA + selfPartB, selfMaxScores.grand);
 const facultyTotals = { partA: selfPartA, partB: selfPartB, total: selfTotal, maxScores: selfMaxScores };
 const reviewerSummaryTotals = { partA, partB, total, maxScores: reviewerMaxScores };
 const roleSummaryTotalsFor = (role) =>{
 const prefix = role === "hod" || role === "center_head" ? "hod" : role;
 const rawTotal = rawVcTotalForRole(person, role);
 return {
 partA: n(person[`${prefix}PartA`]),
 partB: n(person[`${prefix}PartB`]),
 total: n(rawTotal),
 maxScores: reviewerMaxScores,
 hasTotal: hasScoreValue(rawTotal),
 };
 };
 const previousSummaryCards = previousRoles.map((role) =>{
 const meta = vcRoleMeta(role);
 return {
 role,
 meta,
 totals: roleSummaryTotalsFor(role),
 remarks: person[meta.remarksKey],
 };
 });
 const averageSourceTotals = [
 facultyTotals,
 ...previousSummaryCards
 .filter((item) =>item.role !== personMode && item.totals.hasTotal)
 .map((item) =>item.totals),
 ];
 const averageSummaryTotals = averageSourceTotals.length
 ? {
 partA: averageSourceTotals.reduce((sum, item) =>sum + n(item.partA), 0) / averageSourceTotals.length,
 partB: averageSourceTotals.reduce((sum, item) =>sum + n(item.partB), 0) / averageSourceTotals.length,
 total: averageSourceTotals.reduce((sum, item) =>sum + n(item.total), 0) / averageSourceTotals.length,
 maxScores: reviewerMaxScores,
 }
 : { partA: 0, partB: 0, total: 0, maxScores: reviewerMaxScores };
 const vcReviewCompleted = !isPendingReviewStatusFor([person.status, person.workflowStatus, person.workflow_status], "vc") && (person.status === "Reviewed" || person.status === "VC Reviewed" || n(person.vcTotal) >0);
 const firstReviewRoleLabel = previousRoles.includes("center_head") ? "Center Head Remarks" : "HOD Remarks";
 const personInfo = mergeFacultyInfo(person.info, person);
 useEffect(() =>{
 let active = true;
 if (reviewLocked || !subjectEmail) return undefined;
 loadReviewerDraft({ subjectEmail, academicYear, reviewerRole: "vc" })
 .then((draft) =>{
 if (!active || !draft?.payload) return;
 setVcData(draft.payload.section_scores || {});
 setRemarks(draft.payload.remarks ?? "");
 setDraftStatus(draft.updated_at ? `Last saved: ${new Date(draft.updated_at).toLocaleString()}` : "Draft loaded");
 })
 .catch((err) =>{
 if (!active) return;
 console.error("Could not load reviewer draft:", err);
 setDraftStatus(err?.message || "Could not load draft.");
 });
 return () =>{ active = false; };
 }, [academicYear, reviewLocked, subjectEmail]);

 const handleSaveDraft = async () =>{
 try {
 setSavingDraft(true);
 await saveReviewerDraft({
 subjectEmail,
 academicYear,
 reviewerRole: "vc",
 partAScore: partA,
 partBScore: partB,
 totalScore: total,
 remarks,
 sectionScores: buildVcSectionScores(person, vcData),
 });
 setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
 } catch (err) {
 console.error("Could not save reviewer draft:", err);
 alert(err?.message || "Unable to save draft.");
 } finally {
 setSavingDraft(false);
 }
 };

 const generateVcReport = () =>{
 if (!vcReviewCompleted) return;
 const reportForm = {
 ...person,
 info: {
 ...personInfo,
 name: personInfo.name || person.name,
 ay: personInfo.ay || person.academicYear || APP_INFO.DEFAULT_AY,
 desig: personInfo.desig || person.designation || personMode,
 school: personInfo.school || person.schoolName || person.school,
 },
 docs: person.docs || {},
 };
 VC_REVIEW_ARRAY_KEYS.forEach((key) =>{
 const rows = Array.isArray(person[key]) ? person[key] : (person[key] ? [person[key]] : []);
 reportForm[key] = rows.map((row, index) =>({
 ...row,
 vc: key === "society" && societyRowLocked(row)
 ? "0"
 : key === "acr"
 ? (String(vcData[key]?.[index]?.vc ?? row.vc ?? "").trim() ? String(clampScore(vcData[key]?.[index]?.vc ?? row.vc, SCORE_LIMITS.acrRow)) : "")
 : vcData[key]?.[index]?.vc ?? row.vc ?? "",
 }));
 });
 reportForm.innovVc = vcData.innovVc ?? vcData.innovVC ?? person.innovVc ?? "";
 openFullFormReport({
 title: "VC Appraisal Report",
 subtitle: `${APP_INFO.UNIVERSITY_NAME} | Academic Year ${person.academicYear || person.info?.ay || APP_INFO.DEFAULT_AY || ""}`,
 form: reportForm,
 docs: reportForm.docs,
 partASections: VC_REPORT_PART_A_SECTIONS,
 partBSections: VC_REPORT_PART_B_SECTIONS,
 totals: {
 partA: reviewLocked && String(person.vcPartA ?? "").trim() !== "" ? n(person.vcPartA) : partA,
 partB: reviewLocked && String(person.vcPartB ?? "").trim() !== "" ? n(person.vcPartB) : partB,
 total: reviewLocked && String(person.vcTotal ?? "").trim() !== "" ? n(person.vcTotal) : total,
 },
 maxScores: reviewerMaxScores,
 scoreRoles: ["score", ...previousRoles, "vc"],
 roleLabel: (value) =>value === "vc" ? "VC" : vcRoleMeta(value).shortLabel || value,
 status: person.status,
 remarksSections: buildReviewRemarks({
 source: person,
 currentRole: "vc",
 currentRemarks: remarks,
 roleLabels: { hod: firstReviewRoleLabel },
 }),
 generatedBy: sessionStorage.getItem("name") || "Vice Chancellor",
 });
 };

 const scoreCards = [
 { label: personMode === "faculty" ? "Faculty Score" : "Self Score", val: selfTotal, color: "#e2e8f0" },
 ...previousRoles.map((role) =>{
 const meta = vcRoleMeta(role);
 return { label: meta.label, val: vcTotalForRole(person, role), color: meta.color };
 }),
 { label: "Average Score", val: vcAverageBeforeVc(person, personMode, previousRoles), color: "#f59e0b" },
 ];

 return (
<div style={{ display: "flex", flexDirection: "column" }}>

 {/* Header */}
<div style={{ background: "#0f172a", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16, borderRadius: 10 }}>
<button onClick={onBack} style={{ background: "#1e293b", border: "none", color: "#94a3b8", cursor: "pointer", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontFamily: "inherit" }}>Back</button>
<Avatar initials={person.avatar} color={person.avatarColor || "#7c3aed"} size={40} />
<div style={{ flex: 1 }}>
<div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{person.name}</div>
<div style={{ color: "#64748b", fontSize: 11 }}>{person.designation} - {person.employeeId}</div>
</div>
<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {scoreCards.map(({ label, val, color }) =>(
<div key={label} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
<div style={{ color, fontWeight: 800, fontSize: 14 }}>{oneDecimal(val)}</div>
</div>
 ))}
<div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>VC Part A</div>
<div style={{ color: "#c4b5fd", fontWeight: 800, fontSize: 14 }}>{partA.toFixed(1)}</div>
</div>
<div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>VC Part B</div>
<div style={{ color: "#a78bfa", fontWeight: 800, fontSize: 14 }}>{partB.toFixed(1)}</div>
</div>
<div style={{ background: g.bg, border: `2px solid ${g.color}40`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
<div style={{ color: g.color, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>VC Total</div>
<div style={{ color: g.color, fontWeight: 800, fontSize: 14 }}>{total.toFixed(1)}<span style={{ fontSize: 10, color: "#94a3b8" }}>/{reviewerMaxScores.grand}</span></div>
</div>
</div>
</div>

 {/* Section switcher */}
<div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
 {[["partA", "Part A"], ["partB", "Part B"], ["summary", "Summary"]].map(([id, label]) =>(
<button key={id} onClick={() =>{ setSectionView(id); requestAnimationFrame(() =>{ window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }); }}
 style={{ padding: "7px 18px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: sectionView === id ? "#4c1d95" : "#e2e8f0", color: sectionView === id ? "#ddd6fe" : "#475569" }}>
 {label}
</button>
 ))}
</div>
 {finalisedReadOnly && (
<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
<button onClick={() =>{ setEditingFinalised(true); setReviewConfirmed(false); }}
 style={{ padding: "10px 28px", background: "#4c1d95", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
 Edit Form
</button>
</div>
 )}

 {(sectionView === "partA" || sectionView === "partB") && (
<fieldset disabled={reviewLocked} style={{ border: "none", padding: 0, margin: 0 }}>
<VCReviewForm person={person} vcData={vcData} setVcData={setVcData} personMode={personMode} sectionView={sectionView} />
</fieldset>
 )}
 {(sectionView === "partA" || sectionView === "partB") && !reviewLocked && (
<div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, margin: "12px 0 14px", flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{draftStatus}</span>
<button onClick={handleSaveDraft} disabled={savingDraft}
 style={{ padding: "8px 14px", background: savingDraft ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 7, cursor: savingDraft ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit" }}>
 {savingDraft ? "Saving..." : "Save Draft"}
</button>
</div>
 )}

 {/* â”€â”€ Summary â”€â”€ */}
 {sectionView === "summary" && (
<div style={{ display: "grid", gap: 14 }}>


 {/* â‘¡ Self Score card */}
<SummaryBox title={personMode === "faculty" ? "Faculty Score" : "Self Score"} totals={facultyTotals} maxScores={facultyTotals.maxScores} accent="#0ea5e9" roleScoreLabel={`${personMode === "faculty" ? "Faculty submitted" : "Self"} score for the engineering appraisal form.`} />

 {/* â‘¢ Any Other Information */}
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }}>
<div style={{ background: "#f8fafc", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
<div style={{ width: 3, height: 16, background: "#94a3b8", borderRadius: 2 }} />
<span style={{ fontWeight: 800, fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.7 }}>Any Other Information Not Covered Above</span>
</div>
<div style={{ padding: "12px 16px" }}>
<SummaryOtherInfoField value={summaryOtherInfoValueFrom(person)} readOnly rows={5} />
</div>
</div>

 {/* â‘£ Reviewer Scores section */}
 {previousSummaryCards.length >0 && (
<>
<div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
<div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#e2e8f0)" }} />
<div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 20, padding: "4px 14px", border: "1px solid #e2e8f0" }}>
<div style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
<span style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Reviewer Scores</span>
</div>
<div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#e2e8f0,transparent)" }} />
</div>
 {previousSummaryCards.map(({ role, meta, totals, remarks: roleRemarks }) =>(
<SummaryBox key={role} title={`${meta.shortLabel} Score`} totals={totals} maxScores={totals.maxScores} accent={meta.remarksColor || meta.color} roleScoreLabel={`${meta.shortLabel} score for the engineering appraisal form.`} remarks={roleRemarks} remarksTitle={`${meta.shortLabel} Remarks`} />
 ))}
</>
 )}

 {/* â‘¤ Final Scores â€” 2-column grid */}
<div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
<div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#e2e8f0)" }} />
<div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fdf4ff", borderRadius: 20, padding: "4px 14px", border: "1px solid #e9d5ff" }}>
<div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />
<span style={{ fontSize: 10, fontWeight: 800, color: "#6d28d9", textTransform: "uppercase", letterSpacing: 0.8 }}>Final Assessment</span>
</div>
<div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#e2e8f0,transparent)" }} />
</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
<SummaryBox title="Average Score" totals={averageSummaryTotals} maxScores={averageSummaryTotals.maxScores} accent="#f59e0b" roleScoreLabel="Average across all reviewers." />
<SummaryBox title="Vice Chancellor Score" totals={reviewerSummaryTotals} maxScores={reviewerSummaryTotals.maxScores} accent="#7c3aed" roleScoreLabel="Vice Chancellor final score." />
</div>

 {/* â‘¥ VC Remarks & Actions */}
<div style={{ background: "#fff", border: "1px solid #a5b4fc", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgba(79,70,229,0.10)" }}>

 {/* Header strip */}
<div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #c7d2fe", background: "#f5f7ff" }}>
<div>
<div style={{ fontSize: 15, fontWeight: 900, color: "#1e293b", letterSpacing: -0.3 }}>Vice Chancellor Final Remarks</div>
<div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>Enter your assessment remarks and confirm before submitting</div>
</div>
<div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
<div style={{ background: "#fff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "7px 16px", textAlign: "center" }}>
<div style={{ fontSize: 8, fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>VC Total</div>
<div style={{ fontSize: 18, fontWeight: 900, color: "#4338ca", lineHeight: 1 }}>{oneDecimal(reviewerSummaryTotals.total)}<span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>/{reviewerSummaryTotals.maxScores.grand}</span></div>
</div>
</div>
</div>

 {/* Body */}
<div style={{ padding: "18px 20px", display: "grid", gap: 14 }}>

 {/* Textarea */}
<div>
<div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.6 }}>Your Remarks</div>
<textarea value={remarks} readOnly={reviewLocked} onChange={e =>setRemarks(e.target.value)} rows={4}
 placeholder="Write your assessment remarks hereâ€¦"
 style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", fontFamily: "inherit", fontSize: 12, resize: "vertical", background: reviewLocked ? "#f8fafc" : "#fff", color: "#1e293b", outline: "none", lineHeight: 1.6 }} />
</div>

 {/* Confirmation checkbox */}
 {!reviewLocked && (
<label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, color: "#334155", fontSize: 12, lineHeight: 1.65, cursor: "pointer" }}>
<input type="checkbox" checked={reviewConfirmed} onChange={e =>setReviewConfirmed(e.target.checked)} style={{ marginTop: 3, accentColor: "#a78bfa", flexShrink: 0, width: 14, height: 14 }} />
<span>I have verified all the details and confirm that the information provided is correct. I am responsible for the accuracy of this data.</span>
</label>
 )}

 {/* Footer: status + buttons */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingTop: 4, borderTop: "1px solid #c7d2fe", flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontStyle: "italic" }}>{draftStatus}</span>
<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
<button onClick={onBack} style={{ padding: "9px 16px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>Close</button>
<button onClick={generateVcReport} disabled={!vcReviewCompleted}
 style={{ padding: "9px 16px", background: vcReviewCompleted ? "rgba(255,255,255,0.93)" : "rgba(255,255,255,0.08)", color: vcReviewCompleted ? "#4c1d95" : "#6b7280", border: "none", borderRadius: 9, cursor: vcReviewCompleted ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 12, fontFamily: "inherit" }}>
 ðŸ“„ Generate Report
</button>
 {!reviewLocked && (
<>
<button onClick={handleSaveDraft} disabled={savingDraft}
 style={{ padding: "9px 16px", background: savingDraft ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", border: "none", borderRadius: 9, cursor: savingDraft ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", boxShadow: savingDraft ? "none" : "0 3px 12px rgba(37,99,235,0.4)" }}>
 {savingDraft ? "Savingâ€¦" : "Save Draft"}
</button>
 {canReject && (
<button onClick={() =>{ if (window.confirm("Reject this appraisal and send it back to the user for editing?")) { onSubmit(person.id, { partA, partB, total }, remarks, personMode, buildVcSectionScores(person, vcData), reviewConfirmed, "rejected"); } }}
 disabled={!reviewConfirmed || !remarks.trim()}
 style={{ padding: "9px 16px", background: (reviewConfirmed && remarks.trim()) ? "linear-gradient(135deg,#b91c1c,#ef4444)" : "rgba(255,255,255,0.06)", color: "#fff", border: "none", borderRadius: 9, cursor: (reviewConfirmed && remarks.trim()) ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 12, fontFamily: "inherit", boxShadow: (reviewConfirmed && remarks.trim()) ? "0 3px 12px rgba(185,28,28,0.4)" : "none" }}>
 Reject Form
</button>
 )}
<button onClick={() =>onSubmit(person.id, { partA, partB, total }, remarks, personMode, buildVcSectionScores(person, vcData), reviewConfirmed)}
 disabled={!reviewConfirmed || !remarks.trim()}
 style={{ padding: "9px 22px", background: (reviewConfirmed && remarks.trim()) ? "linear-gradient(135deg,#047857,#10b981)" : "rgba(255,255,255,0.06)", color: "#fff", border: "none", borderRadius: 9, cursor: (reviewConfirmed && remarks.trim()) ? "pointer" : "not-allowed", fontWeight: 900, fontSize: 12, fontFamily: "inherit", letterSpacing: 0.2, boxShadow: (reviewConfirmed && remarks.trim()) ? "0 4px 16px rgba(4,120,87,0.5)" : "none" }}>
 {finalisedByVc ? "Edit & Resubmit" : "âœ“ Submit VC Review"}
</button>
</>
 )}
</div>
</div>
</div>
</div>

</div>
 )}
</div>
 );
}


// --- Person Card --------------------------------------------------------------
function PersonCard({ person, role, onReview, schoolColor, loading = false }) {
 const personMode = role === "Director" ? "director" : role === "HOD" ? "hod" : role === "Dean" ? "dean" : role === "Center Head" ? "center_head" : "faculty";
 const previousRoles = vcPreviousRolesFor(person, personMode);
 const vcTotal = n(person.vcTotal);
 const scoreTiles = [
 {
 label: personMode === "faculty" ? "Faculty Score" : "Self Score",
 value: vcSelfTotalForPerson(person),
 color: "#0ea5e9",
 },
 ...previousRoles.map((reviewRole) =>{
 const meta = vcRoleMeta(reviewRole);
 return { label: meta.shortLabel, value: vcTotalForRole(person, reviewRole), color: meta.color };
 }),
 { label: "Average Score", value: vcAverageBeforeVc(person, personMode, previousRoles), color: "#f59e0b" },
 { label: "VC Score", value: vcTotal, color: "#7c3aed", isVc: true },
 ];
 const remarkTiles = previousRoles
 .map((reviewRole) =>{
 const meta = vcRoleMeta(reviewRole);
 return { label: meta.shortLabel, value: person[meta.remarksKey], color: meta.remarksColor, bg: meta.remarksBg, border: meta.color };
 })
 .filter((item) =>item.value);

 const ROLE_PALETTE = {
 Dean:          { color: "#059669", light: "#d1fae5", label: "Dean"        },
 Director:      { color: "#2563eb", light: "#dbeafe", label: "Director"    },
 HOD:           { color: "#7c3aed", light: "#ede9fe", label: "HOD"         },
 "Center Head": { color: "#0f766e", light: "#ccfbf1", label: "Center Head" },
 Faculty:       { color: "#0ea5e9", light: "#e0f2fe", label: "Faculty"     },
 };
 const rolePalette = ROLE_PALETTE[role] || { color: schoolColor || "#7c3aed", light: "#f3e8ff", label: role };
 const cardColor = rolePalette.color;
 return (
<div className="vc-review-card fa-fade-up" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
 {/* Role-colored top stripe */}
<div style={{ height: 4, background: `linear-gradient(90deg,${cardColor},${cardColor}66)`, flexShrink: 0 }} />

<div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
 {/* Header row */}
<div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
<Avatar initials={person.avatar} color={person.avatarColor || cardColor} size={42} />
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
<span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{person.name}</span>
<RoleBadge role={role} />
</div>
<div style={{ fontSize: 10, color: "#64748b" }}>{person.designation}</div>
<div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", marginTop: 1 }}>{person.employeeId}</div>
</div>
<StatusBadge status={person.status} />
</div>

 {/* Score grid */}
<div className="vc-score-strip" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(scoreTiles.length, 1)}, minmax(0, 1fr))`, gap: 6, background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
 {scoreTiles.map((tile) =>{
 const score = n(tile.value);
 return (
<div key={tile.label} style={{ minWidth: 0 }}>
<div style={{ fontSize: 8, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{tile.label}</div>
 {score >0 || tile.isVc ? (
<>
<div style={{ fontSize: 15, fontWeight: 900, color: tile.color, lineHeight: 1 }}>
 {score >0 ? score.toFixed(1) : "â€”"}<span style={{ fontSize: 8, color: "#cbd5e1", fontWeight: 600 }}>/{MAX_SCORES.GRAND_TOTAL}</span>
</div>
<ScoreBar score={score} max={MAX_SCORES.GRAND_TOTAL} color={tile.color} />
</>
 ) : (
<div style={{ fontSize: 15, fontWeight: 900, color: "#cbd5e1" }}>â€”</div>
 )}
</div>
 );
 })}
</div>

 {remarkTiles.length >0 && (
<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
 {remarkTiles.map((item) =>(
<div key={item.label} style={{ background: item.bg, borderRadius: 7, padding: "6px 10px", fontSize: 10, color: item.color, borderLeft: `3px solid ${item.border}` }}>
<span style={{ fontWeight: 800 }}>{item.label}:</span>{" "}{item.value.slice(0, 55)}{item.value.length >55 ? "â€¦" : ""}
</div>
 ))}
</div>
 )}

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
<div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.2 }}>Submitted: {person.submittedOn || "â€”"}</div>
<button className="vc-action-button" onClick={() =>onReview(person, personMode)} disabled={loading}
 style={{ fontSize: 11, padding: "7px 16px", background: loading ? "#94a3b8" : isVcReviewed(person) ? "linear-gradient(135deg,#1e293b,#334155)" : `linear-gradient(135deg,${cardColor},${cardColor}cc)`, color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "wait" : "pointer", fontWeight: 800, fontFamily: "inherit", letterSpacing: 0.2, boxShadow: loading ? "none" : `0 4px 12px ${cardColor}44` }}>
 {loading ? "Openingâ€¦" : isVcReviewed(person) ? "View Review" : "Review Form"}
</button>
</div>
</div>
</div>
 );
}

// --- School Panel -------------------------------------------------------------
function SchoolPanel({ school, deanList, dirList, hodList, centerHeadList = [], facList, onReview, reviewLoading = null }) {
 const schoolDeans = deanList.filter(d =>d.schoolId === school.id);
 const schoolDirs = dirList.filter(d =>d.schoolId === school.id);
 const schoolHods = hodList.filter(h =>h.schoolId === school.id);
 const schoolCenterHeads = centerHeadList.filter(c =>c.schoolId === school.id);
 const schoolFaculty = facList.filter(f =>f.schoolId === school.id);

 const allPeople = [
 ...schoolDeans.map(p =>({ person: p, role: "Dean" })),
 ...schoolDirs.map(p =>({ person: p, role: "Director" })),
 ...schoolHods.map(p =>({ person: p, role: "HOD" })),
 ...schoolCenterHeads.map(p =>({ person: p, role: "Center Head" })),
 ...schoolFaculty.map(p =>({ person: p, role: "Faculty" })),
 ];

 const pendingCount = allPeople.filter(p =>!isVcReviewed(p.person)).length;
 const reviewedCount = allPeople.filter(p =>isVcReviewed(p.person)).length;

 return (
<div className="vc-school-panel">
 {/* School banner */}
<div className="vc-school-summary fa-slide-top" style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", marginBottom: 16, borderLeft: `5px solid ${school.color}`, display: "flex", alignItems: "center", gap: 16 }}>
<div className="vc-school-icon" style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${school.color}22,${school.color}11)`, color: school.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0, border: `1.5px solid ${school.color}30` }}>
 {school.icon}
</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontWeight: 900, fontSize: 17, color: "#0f172a", letterSpacing: -0.3 }}>{school.name}</div>
<div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{school.code} &nbsp;Â·&nbsp; {allPeople.length} member{allPeople.length !== 1 ? "s" : ""}</div>
</div>
<div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
 {pendingCount >0 && (
<div className="vc-count-pill vc-count-pill--pending" style={{ padding: "5px 13px", fontSize: 11, fontWeight: 800 }}>{pendingCount} Pending</div>
 )}
 {reviewedCount >0 && (
<div className="vc-count-pill" style={{ background: "#fdf4ff", color: "#6b21a8", border: "1px solid #e9d5ff", borderRadius: 20, padding: "5px 13px", fontSize: 11, fontWeight: 800 }}>{reviewedCount} Reviewed</div>
 )}
 {school.hasHods && (
<div className="vc-count-pill" style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", borderRadius: 20, padding: "5px 10px", fontSize: 10, fontWeight: 700 }}>Has HODs</div>
 )}
</div>
</div>

 {allPeople.length === 0 ? (
<div className="vc-empty-state fa-fade-up" style={{ textAlign: "center", padding: "44px 20px" }}>
<div className="vc-empty-orb" style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px", background: `${school.color}15`, color: school.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17, border: `1.5px dashed ${school.color}44` }}>{school.code}</div>
<div style={{ fontWeight: 800, color: "#475569", fontSize: 14 }}>No submissions yet</div>
<div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>New appraisal forms will appear here automatically.</div>
</div>
 ) : (
<div className="vc-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
 {allPeople.map(({ person, role }) =>(
<PersonCard key={`${role}-${person.id}`} person={person} role={role} onReview={onReview} schoolColor={school.color} loading={reviewLoading === (person.id || person.email)} />
 ))}
</div>
 )}
</div>
 );
}


// --- University Structure -----------------------------------------------------
// --- Main VC Dashboard --------------------------------------------------------
function NonTeachingCard({ item, onReview }) {
 const reviewed = isNonTeachingReviewComplete(item);
 const cardColor = "#1d4ed8";
 return (
<div className="vc-review-card fa-fade-up" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
<div style={{ height: 4, background: `linear-gradient(90deg,${cardColor},#0ea5e9)`, flexShrink: 0 }} />

<div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
<div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
<Avatar initials={item.avatar} color={item.avatarColor || cardColor} size={42} />
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{item.name}</div>
<div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{item.roleLabel} Â· {item.designation}</div>
<div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", marginTop: 1 }}>{item.employeeId}</div>
</div>
 {reviewed && <span style={{ fontSize: 9, fontWeight: 800, background: "#fdf4ff", color: "#6b21a8", border: "1px solid #e9d5ff", borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>VC Reviewed</span>}
</div>

<div className="vc-score-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
 {[
 ["Self", item.selfTotal, "#1d4ed8"],
 ["RO", item.roTotal, "#0891b2"],
 ["Registrar", item.registrarTotal, "#155e75"],
 ["VC", item.vcTotal, "#6d28d9"],
 ].map(([label, value, color]) =>(
<div key={label} style={{ minWidth: 0 }}>
<div style={{ fontSize: 8, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
<div style={{ fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{n(value).toFixed(1)}<span style={{ fontSize: 8, color: "#cbd5e1", fontWeight: 600 }}>/ 130</span></div>
<ScoreBar score={value} max={130} color={color} />
</div>
 ))}
</div>

 {(item.form?.roRemarks || item.form?.registrarRemarks) && (
<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
 {item.form?.roRemarks && (
<div style={{ background: "#eff6ff", borderLeft: "3px solid #1d4ed8", borderRadius: 7, padding: "6px 10px", color: "#1e40af", fontSize: 10 }}>
<span style={{ fontWeight: 800 }}>RO:</span>{" "}{item.form.roRemarks.slice(0, 70)}{item.form.roRemarks.length >70 ? "â€¦" : ""}
</div>
 )}
 {item.form?.registrarRemarks && (
<div style={{ background: "#ecfeff", borderLeft: "3px solid #155e75", borderRadius: 7, padding: "6px 10px", color: "#155e75", fontSize: 10 }}>
<span style={{ fontWeight: 800 }}>Registrar:</span>{" "}{item.form.registrarRemarks.slice(0, 70)}{item.form.registrarRemarks.length >70 ? "â€¦" : ""}
</div>
 )}
</div>
 )}

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
<div style={{ fontSize: 9, color: "#94a3b8" }}>Submitted: {item.submittedOn || "â€”"}</div>
<button className="vc-action-button" type="button" onClick={() =>onReview(item)} style={{ fontSize: 11, padding: "7px 16px", background: reviewed ? "linear-gradient(135deg,#1e293b,#334155)" : `linear-gradient(135deg,${cardColor},#0ea5e9)`, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 800, fontFamily: "inherit", boxShadow: `0 4px 12px ${cardColor}44` }}>
 {reviewed ? "View Review" : "Review Form"}
</button>
</div>
</div>
</div>
 );
}

const nonTeachingItemKey = (item = {}) =>
 item.id || item.email || item.staff_email || item.form?.info?.email || item.staffEmail;

const upsertNonTeachingItem = (items = [], nextItem = {}) =>{
 const nextKey = nonTeachingItemKey(nextItem);
 if (!nextKey) return [nextItem, ...items];
 const withoutExisting = items.filter((item) =>nonTeachingItemKey(item) !== nextKey);
 return [nextItem, ...withoutExisting];
};

function NonTeachingPanel({ pendingItems = [], reviewedItems = [], onReview }) {
 const pending = pendingItems.length;
 const reviewed = reviewedItems.length;
 const renderCards = (items) =>(
<div className="vc-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
 {items.map((item) =><NonTeachingCard key={nonTeachingItemKey(item)} item={item} onReview={onReview} />)}
</div>
 );

 return (
<div className="vc-school-panel">
<div className="vc-school-summary fa-slide-top" style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", marginBottom: 16, borderLeft: "5px solid #1d4ed8", display: "flex", alignItems: "center", gap: 16 }}>
<div className="vc-school-icon" style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#dbeafe,#eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1d4ed8", fontWeight: 900, fontSize: 16, border: "1.5px solid #bfdbfe" }}>NT</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontWeight: 900, fontSize: 17, color: "#0f172a", letterSpacing: -0.3 }}>Non-Teaching Staff Reviews</div>
<div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Registrar Â· Reporting Officer Â· Staff branch</div>
</div>
 {pending >0 &&<div className="vc-count-pill vc-count-pill--pending" style={{ padding: "5px 13px", fontSize: 11, fontWeight: 800 }}>{pending} Pending</div>}
 {reviewed >0 &&<div className="vc-count-pill" style={{ background: "#fdf4ff", color: "#6b21a8", border: "1px solid #e9d5ff", borderRadius: 20, padding: "5px 13px", fontSize: 11, fontWeight: 800 }}>{reviewed} Reviewed</div>}
</div>

<div className="vc-list-section" style={{ marginBottom: 20 }}>
<div style={{ fontWeight: 800, fontSize: 12, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Pending Reviews</div>
 {pendingItems.length === 0 ? (
<div className="vc-empty-state fa-fade-up" style={{ padding: "44px 20px", textAlign: "center" }}>
<div className="vc-empty-orb" style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, border: "1.5px dashed #bfdbfe" }}>NT</div>
<div style={{ fontWeight: 800, color: "#475569", fontSize: 14 }}>No pending reviews</div>
<div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>Non-teaching submissions will appear here once approved by the Registrar.</div>
</div>
 ) : (
 renderCards(pendingItems)
 )}
</div>

<div className="vc-list-section">
<div style={{ fontWeight: 800, fontSize: 12, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>Reviewed</div>
 {reviewedItems.length === 0 ? (
<div className="vc-empty-state fa-fade-up" style={{ padding: "28px 20px", textAlign: "center" }}>
<div style={{ fontWeight: 800, color: "#64748b", fontSize: 13 }}>No reviewed submissions yet</div>
</div>
 ) : (
 renderCards(reviewedItems)
 )}
</div>
</div>
 );
}

const SCHOOL_META = {
 SoCSEA: { color: "#6366f1", icon: "CS" },
 SoBB: { color: "#10b981", icon: "BB" },
 SoCE: { color: "#0ea5e9", icon: "CE" },
 SoEMR: { color: "#f59e0b", icon: "EM" },
 SoCM: { color: "#14b8a6", icon: "CM" },
 SoMCS: { color: "#8b5cf6", icon: "MC" },
 SoD: { color: "#ec4899", icon: "DS" },
 CioD: { color: "#ec4899", icon: "DS" },
 SoAA: { color: "#f97316", icon: "AA" },
 CISR: { color: "#0f766e", icon: "CI" },
};

const toVcSchool = (school) =>{
 const meta = SCHOOL_META[school.code] || {};
 return {
 id: school.code.toLowerCase(),
 code: school.code,
 name: school.name,
 label: school.label,
 color: meta.color || "#64748b",
 icon: meta.icon || school.code,
 hasHods: school.code === "SoEMR",
 };
};

const DIVISION_SCHOOLS = {
 engineering: {
 id: "engineering",
 code: "DEAN-ENGG",
 name: "Dean of Engineering",
 label: "Engineering Division",
 color: "#4c1d95",
 icon: "DE",
 hasHods: false,
 },
 non_engineering: {
 id: "non_engineering",
 code: "DEAN-NENG",
 name: "Dean of Non-Engineering",
 label: "Non-Engineering Division",
 color: "#7c2d12",
 icon: "DN",
 hasHods: false,
 },
};

const HIERARCHY_SCHOOLS = {
 engg: UNIVERSITY_SCHOOLS
 .filter((school) =>school.deanTrack === DEAN_TRACKS.ENGINEERING)
 .map(toVcSchool)
 .concat(DIVISION_SCHOOLS.engineering),
 "non-engg": UNIVERSITY_SCHOOLS
 .filter((school) =>school.deanTrack === DEAN_TRACKS.NON_ENGINEERING)
 .map(toVcSchool)
 .concat(DIVISION_SCHOOLS.non_engineering),
 cisr: UNIVERSITY_SCHOOLS
 .filter((school) =>school.deanTrack === DEAN_TRACKS.DIRECT_VC)
 .map(toVcSchool),
};

const schoolIdForPerson = (person = {}) =>{
 const schoolValue = person.school || person.info?.school || "";
 const normalizedSchool = normalizeHierarchyText(schoolValue);
 if (normalizedSchool === "engineering") return "engineering";
 if (normalizedSchool === "non engineering" || normalizedSchool === "nonengineering") return "non_engineering";

 const schoolKey = getSchoolKey(schoolValue);
 return schoolKey ? schoolKey.toLowerCase() : "";
};

const withVcSchoolId = (item) =>({
 ...item,
 schoolId: item.schoolId || schoolIdForPerson(item),
});

export default function VCDashboard() {
 const navigate = useNavigate();
 const [deanTypeFilter, setDeanTypeFilter] = useState("engg");
 const [activeSchoolId, setActiveSchoolId] = useState("socsea");
 const [reviewing, setReviewing] = useState(null);
 const [reviewLoading, setReviewLoading] = useState(null);
 const [showLogoutModal, setShowLogoutModal] = useState(false);
 const [deanList, setDeanList] = useState([]);
 const [dirList, setDirList] = useState([]);
 const [hodList, setHodList] = useState([]);
 const [centerHeadList, setCenterHeadList] = useState([]);
 const [facList, setFacList] = useState([]);
 const [nonTeachingList, setNonTeachingList] = useState([]);
 const [nonTeachingReviewedList, setNonTeachingReviewedList] = useState([]);

 const pollingActiveRef = useRef(true);
 const prevDataRef = useRef(null);

 const loadReviewQueue = useCallback(async (silent = false) =>{
 if (!pollingActiveRef.current) return;
 try {
 const items = await fetchReviewQueueForRole({
 reviewerRole: "vc",
 reviewerProfile: { ...profileFromsessionStorage(), appraisal_role: "vc" },
 schoolValues: [
 ...UNIVERSITY_SCHOOLS.flatMap((school) =>[school.code, school.name, school.label]),
 "CioD",
 DEAN_TRACKS.ENGINEERING,
 DEAN_TRACKS.NON_ENGINEERING,
 ],
 });
 let nonTeachingItems = [];
 try {
 nonTeachingItems = await fetchNonTeachingQueueForRole({
 reviewerRole: "vc",
 academicYear: APP_INFO.DEFAULT_AY,
 });
 } catch (nonTeachingErr) {
 console.warn("Could not load VC non-teaching review queue:", nonTeachingErr.message);
 }
 if (!pollingActiveRef.current) return;
 const routedItems = items.map(withVcSchoolId);
 const nextFac = routedItems.filter(item =>item.appraisalRole === "faculty");
 const nextHod = routedItems.filter(item =>item.appraisalRole === "hod");
 const nextCH = routedItems.filter(item =>item.appraisalRole === "center_head");
 const nextDir = routedItems.filter(item =>item.appraisalRole === "director");
 const nextDean = routedItems.filter(item =>item.appraisalRole === "dean");
 const nextNT = nonTeachingItems.filter((item) =>!isNonTeachingReviewComplete(item));
 const nextNTR = nonTeachingItems.filter(isNonTeachingReviewComplete);
 // On silent polls, skip state updates if nothing changed (avoids any re-render jitter)
 const snapshot = JSON.stringify({ items, nonTeachingItems });
 if (silent && prevDataRef.current === snapshot) return;
 prevDataRef.current = snapshot;
 setFacList(nextFac);
 setHodList(nextHod);
 setCenterHeadList(nextCH);
 setDirList(nextDir);
 setDeanList(nextDean);
 setNonTeachingList(nextNT);
 setNonTeachingReviewedList(nextNTR);
 } catch (err) {
 if (!silent) {
 console.error("Could not load VC review queue:", err);
 if (!pollingActiveRef.current) return;
 setFacList([]); setHodList([]); setCenterHeadList([]); setDirList([]); setDeanList([]);
 setNonTeachingList([]);
 setNonTeachingReviewedList([]);
 }
 }
 }, []);

 useEffect(() =>{
 pollingActiveRef.current = true;
 loadReviewQueue(false);
 const intervalId = setInterval(() =>{ loadReviewQueue(true); }, 3000);
 return () =>{
 pollingActiveRef.current = false;
 clearInterval(intervalId);
 };
 }, [loadReviewQueue]);

 const handleSubmit = async (id, scores, remarks, personMode, sectionScores, reviewConfirmed = false, decision = "approved") =>{
 if (!reviewConfirmed) {
 alert("Please verify and confirm the accuracy declaration before submitting the review.");
 return;
 }
 if (!remarks?.trim()) {
 alert("Remarks are mandatory. Please enter your remarks before submitting the review.");
 return;
 }
 const sourceList = personMode === "dean" ? deanList : personMode === "director" ? dirList : personMode === "hod" ? hodList : personMode === "center_head" ? centerHeadList : facList;
 const item = sourceList.find(entry =>entry.id === id);
 if (!item) return;
 const wasFinalised = isAppraisalFinalisedByVc(item);
 try {
 await submitWorkflowReview({
 subjectEmail: item.email,
 academicYear: item.academicYear || item.academic_year || item.info?.ay || APP_INFO.DEFAULT_AY || "2026-2027",
 reviewerRole: "vc",
 partAScore: scores.partA,
 partBScore: scores.partB,
 totalScore: scores.total,
 remarks,
 sectionScores,
 subjectProfile: item,
 decision,
 });
 const status = decision === "rejected" ? rejectedStatusFor("vc") : "Reviewed";
 const upd = (list) =>list.map(p =>p.id === id
 ? { ...p, ...sectionScores, innovVc: sectionScores?.innovativeTeaching?.vc ?? p.innovVc, status, workflowStatus: status, declaration: { ...(p.declaration || {}), status }, vcPartA: scores.partA, vcPartB: scores.partB, vcTotal: scores.total, vcRemarks: remarks }
 : p);
 if (personMode === "dean") setDeanList(upd);
 else if (personMode === "director") setDirList(upd);
 else if (personMode === "hod") setHodList(upd);
 else if (personMode === "center_head") setCenterHeadList(upd);
 else if (personMode === "faculty") setFacList(upd);
 setReviewing(null);
 alert(decision === "rejected" ? "Appraisal rejected and sent back for editing." : (wasFinalised ? "VC review updated." : "VC final approval submitted."));
 } catch (err) {
 console.error("Could not submit VC review:", err);
 alert(`Unable to submit VC review.\n\n${err.message}`);
 }
 };

 const currentSchools = HIERARCHY_SCHOOLS[deanTypeFilter] || [];
 const activeSchool = currentSchools.find(s =>s.id === activeSchoolId) || currentSchools[0] || null;

 const switchDeanType = (type) =>{
 setDeanTypeFilter(type);
 setActiveSchoolId(HIERARCHY_SCHOOLS[type]?.[0]?.id || "");
 setReviewing(null);
 };
 const switchSchool = (schoolId) =>{ setActiveSchoolId(schoolId); setReviewing(null); };

 const openTeachingReview = async (person, personMode) =>{
 const academicYear = person.academicYear || person.academic_year || person.info?.ay || APP_INFO.DEFAULT_AY || "2026-2027";
 setReviewLoading(person.id || person.email);
 try {
 const data = await fetchSavedAppraisal({
 facultyEmail: person.email,
 academicYear,
 });
 const form = data?.payload?.form || data?.form || {};
 const docs = data?.payload?.docs || data?.docs || {};
 const reviewSummary = vcReviewSummaryFrom(person, data, data?.payload);
 const mergedForm = preserveSavedReviewScores(form, person);
 const declaration = data?.declaration || person.declaration || null;
 setReviewing({
 person: { ...person, ...mergedForm, ...reviewSummary, docs, academicYear, academic_year: academicYear, declaration, status: declaration?.status || data?.status || person.status, workflowStatus: declaration?.status || data?.workflowStatus || person.workflowStatus },
 personMode,
 });
 } catch (err) {
 alert(`Unable to open submitted form.\n\n${err.message}`);
 } finally {
 setReviewLoading(null);
 }
 };

 const getSchoolPending = (school) =>{
 const all = [
 ...deanList.filter(p =>p.schoolId === school.id),
 ...dirList.filter(p =>p.schoolId === school.id),
 ...hodList.filter(p =>p.schoolId === school.id),
 ...centerHeadList.filter(p =>p.schoolId === school.id),
 ...facList.filter(p =>p.schoolId === school.id),
 ];
 return all.filter(p =>!isVcReviewed(p)).length;
 };

 const teachingItems = [...deanList, ...dirList, ...hodList, ...centerHeadList, ...facList];
 const totalPending = teachingItems.filter(p =>!isVcReviewed(p)).length +
 nonTeachingList.length;
 const totalReviewed = teachingItems.filter(isVcReviewed).length +
 nonTeachingReviewedList.length;

 return (
<div className="vc-app-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "inherit", background: "#f0f4ff", color: "#1e293b" }}>

 {/* -- Sidebar -- */}
<aside className="vc-sidebar" style={{ width: 264, height: "100vh", minHeight: "100vh", boxSizing: "border-box", overflow: "hidden", background: "#0f172a", display: "flex", flexDirection: "column", padding: "22px 16px", gap: 12, position: "sticky", top: 0, alignSelf: "flex-start", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "2px 0 16px rgba(15,23,42,0.14)" }}>
<div className="vc-sidebar-brand" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
<div className="vc-brand-mark" style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 13 }}>FA</div>
<div>
<div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13 }}>{APP_INFO.PORTAL_NAME}</div>
<div style={{ color: "#94a3b8", fontSize: 9, marginTop: 2 }}>{APP_INFO.UNIVERSITY_NAME}</div>
</div>
</div>

<div className="vc-sidebar-role-card" style={{ background: "#3b0764", borderRadius: 12, padding: "11px 12px", fontSize: 11, color: "#c4b5fd" }}>
<div style={{ fontWeight: 800, marginBottom: 2, color: "#fff" }}>Vice Chancellor</div>
<div style={{ color: "#c4b5fd", fontSize: 10 }}>Full university oversight</div>
<div style={{ color: "#93c5fd", fontSize: 9, marginTop: 6 }}>AY {APP_INFO.DEFAULT_AY}</div>
</div>

<div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

<button className="vc-sidebar-nav" onClick={() =>setReviewing(null)}
 style={{ background: "rgba(99,102,241,0.18)", border: "none", borderRadius: 8, padding: "10px 11px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, width: "100%", fontFamily: "inherit", transition: "background 0.15s" }}>
<span className="vc-sidebar-nav-icon" style={{ fontSize: 16 }}>ðŸ“‹</span>
<div style={{ flex: 1, textAlign: "left" }}>
<div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12 }}>School Reviews</div>
<div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>{totalPending} awaiting</div>
</div>
 {totalPending >0 && (
<div style={{ background: "#7c3aed", color: "#fff", fontWeight: 800, fontSize: 10, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{totalPending}</div>
 )}
</button>

 {/* Score legend */}
<div className="vc-sidebar-card" style={{ background: "#1e293b", borderRadius: 10, padding: "10px 12px" }}>
<div style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Score Columns</div>
 {[
 { color: "#818cf8", label: "HOD Score" },
 { color: "#38bdf8", label: "Director Score" },
 { color: "#34d399", label: "Dean Score" },
 { color: "#a78bfa", label: "VC Score" },
 ].map(({ color, label }) =>(
<div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
<div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
<div style={{ fontSize: 10, color: "#94a3b8" }}>{label}</div>
</div>
 ))}
</div>

 {/* University summary */}
<div className="vc-sidebar-card" style={{ background: "#1e293b", borderRadius: 10, padding: "10px 12px" }}>
<div style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>University Overview</div>
<div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>4 Engineering Schools</div>
<div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>4 Non-Engineering Schools</div>
<div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>CISR Center</div>
<div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Non-Teaching Branch</div>
<div style={{ display: "flex", gap: 6 }}>
<div style={{ flex: 1, background: "#fef3c7", borderRadius: 5, padding: "4px 6px", textAlign: "center" }}>
<div style={{ fontSize: 14, fontWeight: 800, color: "#92400e" }}>{totalPending}</div>
<div style={{ fontSize: 8, color: "#b45309" }}>Pending</div>
</div>
<div style={{ flex: 1, background: "#fdf4ff", borderRadius: 5, padding: "4px 6px", textAlign: "center" }}>
<div style={{ fontSize: 14, fontWeight: 800, color: "#6b21a8" }}>{totalReviewed}</div>
<div style={{ fontSize: 8, color: "#7c3aed" }}>VC Reviewed</div>
</div>
</div>
</div>

<div style={{ flex: 1 }} />
<div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
<button
 type="button"
 onClick={() =>navigate("/edit-profile")}
 title="Edit profile"
 style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
 >
<Avatar initials={(sessionStorage.getItem("name") || "U").split(" ").map(w =>w[0]).join("").toUpperCase()} color="#7c3aed" size={34} />
<div>
<div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700 }}>{sessionStorage.getItem("name") || "Vice Chancellor"}</div>
<div style={{ color: "#475569", fontSize: 9 }}>Vice Chancellor - {APP_INFO.SHORT_NAME}</div>
</div>
</button>
<div className="vc-sidebar-help" style={{ margin: "8px 0", padding: "10px 12px", background: "rgba(37,99,235,0.15)", border: "1px solid #2563eb", borderRadius: 8 }}>
<div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>For any queries</div>
<a href="mailto:appraisal@dypiu.ac.in" style={{ color: "#60a5fa", fontWeight: 600, fontSize: 11, wordBreak: "break-all", textDecoration: "none" }}>appraisal@dypiu.ac.in</a>
</div>
<button onClick={() =>setShowLogoutModal(true)}
 style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: "none", border: "1px solid #374151", borderRadius: 8, padding: "9px 11px", cursor: "pointer", fontFamily: "inherit" }}
 onMouseEnter={e =>e.currentTarget.style.background = "#1e293b"}
 onMouseLeave={e =>e.currentTarget.style.background = "none"}>
<span style={{ fontSize: 15 }}>ðŸšª</span>
<span style={{ color: "#f87171", fontWeight: 700, fontSize: 12 }}>Logout</span>
</button>
</aside>

 {/* ===== MAIN CONTENT ===== */}
<main className="vc-dashboard-main" style={{ flex: 1, padding: "28px 30px", display: "flex", flexDirection: "column", gap: 16, overflowX: "auto" }}>

 {!reviewing && (
<>
 {/* Hero */}
<div className="vc-dashboard-hero fa-slide-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
<div style={{ minWidth: 0 }}>
<h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1.15, letterSpacing: -0.5 }}>School-wise Appraisal Reviews</h1>
<p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
<span style={{ background: "#e0e7ff", color: "#3730a3", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{APP_INFO.SHORT_NAME}</span>
<span>AY {APP_INFO.DEFAULT_AY}</span>
</p>
</div>
<div className="vc-hero-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
<div className="vc-total-pill" style={{ fontSize: 12, color: "#374151", background: "#fff", padding: "10px 18px", borderRadius: 12, boxShadow: "0 2px 8px rgba(15,23,42,0.08)", fontWeight: 700 }}>
<span style={{ color: "#6d28d9", fontWeight: 900, fontSize: 16 }}>{deanList.length + dirList.length + hodList.length + centerHeadList.length + facList.length + nonTeachingList.length + nonTeachingReviewedList.length}</span>{" "}total submissions
</div>
<AppraisalHeaderImage />
</div>
</div>

 {/* Division Switcher */}
<div className="vc-segmented-tabs fa-fade-up" style={{ display: "flex", width: "fit-content", gap: 2 }}>
 {[
 { key: "engg", label: "Engineering Schools", color: "#1e40af", bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)" },
 { key: "non-engg", label: "Non-Engineering Schools", color: "#6b21a8", bg: "linear-gradient(135deg,#f3e8ff,#e9d5ff)" },
 { key: "cisr", label: "CISR", color: "#0f766e", bg: "linear-gradient(135deg,#ccfbf1,#99f6e4)" },
 { key: "non-teaching", label: "Non-Teaching Staff", color: "#1d4ed8", bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)" },
 ].map(({ key, label, color, bg }) =>{
 const schoolPending = key === "non-teaching"
 ? nonTeachingList.length
 : (HIERARCHY_SCHOOLS[key] || []).reduce((a, s) =>a + getSchoolPending(s), 0);
 const isActive = deanTypeFilter === key;
 return (
<button className={`vc-segmented-tab${isActive ? " is-active" : ""}`} key={key} onClick={() =>switchDeanType(key)}
 style={{ padding: "9px 20px", border: isActive ? `1.5px solid ${color}44` : "1.5px solid transparent", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: isActive ? bg : "none", color: isActive ? color : "#64748b", display: "flex", alignItems: "center", gap: 7, boxShadow: isActive ? `0 2px 12px ${color}22` : "none" }}>
 {label}
 {schoolPending >0 && (
<span style={{ background: isActive ? color : "#94a3b8", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 900 }}>{schoolPending}</span>
 )}
</button>
 );
 })}
</div>

 {/* School Tabs */}
 {activeSchool && (
<div className="vc-school-tabs fa-fade-up" style={{ display: "flex", background: "#fff" }}>
 {currentSchools.map((school, idx) =>{
 const pending = getSchoolPending(school);
 const isActive = school.id === activeSchoolId;
 const shortName = school.name.replace(/^School of /i, "").replace(/^Dean of /i, "");
 return (
<button className={`vc-school-tab${isActive ? " is-active" : ""}`} key={school.id} onClick={() =>switchSchool(school.id)}
 title={school.name}
 style={{ flex: 1, padding: "11px 6px 10px", border: "none", cursor: "pointer", fontFamily: "inherit", background: isActive ? `${school.color}12` : "none", borderBottom: isActive ? `3px solid ${school.color}` : "3px solid transparent", borderRight: idx < currentSchools.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
<div style={{ width: 30, height: 30, borderRadius: 8, background: isActive ? `${school.color}20` : "#f1f5f9", color: isActive ? school.color : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, border: isActive ? `1.5px solid ${school.color}35` : "1.5px solid transparent" }}>{school.icon}</div>
<div style={{ fontSize: 11, fontWeight: 800, color: isActive ? school.color : "#374151" }}>{school.code}</div>
<div style={{ fontSize: 10, color: isActive ? school.color : "#1e293b", fontWeight: 700, lineHeight: 1.3, textAlign: "center", wordBreak: "break-word", maxWidth: "100%" }}>{shortName}</div>
 {pending >0 && (
<div style={{ background: "#f59e0b", color: "#fff", borderRadius: 8, padding: "1px 7px", fontSize: 9, fontWeight: 900 }}>{pending}</div>
 )}
</button>
 );
 })}
</div>
 )}

 {deanTypeFilter === "non-teaching" ? (
<NonTeachingPanel
 pendingItems={nonTeachingList}
 reviewedItems={nonTeachingReviewedList}
 onReview={(person) =>setReviewing({ person, personMode: "non_teaching" })}
 />
 ) : activeSchool ? (
<SchoolPanel
 school={activeSchool}
 deanList={deanList}
 dirList={dirList}
 hodList={hodList}
 centerHeadList={centerHeadList}
 facList={facList}
 onReview={openTeachingReview}
 reviewLoading={reviewLoading}
 />
 ) : null}
</>
 )}

 {reviewing && (
 reviewing.personMode === "non_teaching" ? (
<NonTeachingAuthorityReviewPanel
 item={reviewing.person}
 reviewerRole="vc"
 onBack={() =>setReviewing(null)}
 readOnly={isNonTeachingReviewComplete(reviewing.person)}
 onSubmitted={(updated) =>{
 setNonTeachingList((current) =>current.filter((item) =>nonTeachingItemKey(item) !== nonTeachingItemKey(updated)));
 setNonTeachingReviewedList((current) =>upsertNonTeachingItem(current, updated));
 setReviewing(null);
 }}
 />
 ) : (
<VCReviewPanel
 person={reviewing.person}
 personMode={reviewing.personMode}
 onBack={() =>setReviewing(null)}
 onSubmit={handleSubmit}
 readOnly={isVcReviewed(reviewing.person)}
 />
 ))}
</main>

 {/* Logout Modal */}
 {showLogoutModal && (
<div style={{ position: "fixed", inset: 0, background: "rgba(8,9,26,0.65)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
 onClick={() =>setShowLogoutModal(false)}>
<div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 360, width: "90%", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, fontFamily: "inherit" }}
 onClick={e =>e.stopPropagation()}>
<div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#fee2e2,#fecaca)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 8px 20px rgba(239,68,68,0.25)" }}>ðŸšª</div>
<div style={{ textAlign: "center" }}>
<div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a", marginBottom: 8, letterSpacing: -0.3 }}>Confirm Logout</div>
<div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
 You are about to log out of <strong style={{ color: "#374151" }}>{APP_INFO.PORTAL_NAME}</strong>.<br />Any unsaved changes will be lost.
</div>
</div>
<div style={{ display: "flex", gap: 10, width: "100%" }}>
<button onClick={() =>setShowLogoutModal(false)}
 style={{ flex: 1, padding: "11px 0", background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
 Cancel
</button>
<button onClick={() =>{ setShowLogoutModal(false); sessionStorage.clear(); navigate("/", { replace: true }); }}
 style={{ flex: 1, padding: "11px 0", background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(220,38,38,0.35)" }}>
 Yes, Logout
</button>
</div>
</div>
</div>
 )}
</div>
 );
}

