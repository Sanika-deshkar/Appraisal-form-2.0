import { useState, useRef, useEffect } from "react";
import { HodInput } from "../components/Inputs";
import { api } from "../services/api";
import { Avatar, CompactSummaryCard, ScoreBar, StatusBadge } from "../components/dashboard/dashboardPrimitives";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import { ACR_DETAIL_POINTS, SOCIETY_LABELS, MAX_SCORES, APP_INFO, createAcrRows, fetchSavedAppraisal, loadAppraisalDocuments, loadSavedAppraisal, mergeFacultyInfo, saveAppraisalDraftSection, submitAppraisal, fetchReviewQueueForRole, loadReviewerDraft, saveReviewerDraft, submitWorkflowReview, INNOVATIVE_METHODS, SCORE_LIMITS, averageSectionScore, clampScore, clampReviewScore, courseFileAverageScore, courseFileRowScore, effectiveMaxScore, feedbackAverage, feedbackRowScore, feedbackSectionScore, innovativeSelectionsFromDetails, innovativeTeachingScore, isAllowedAttachmentFile, isValidDDMMYYYY, maskDateDDMMYYYY, normalizeAutoScores, projectGuidanceRowMax, researchGuidanceRowMax, researchGuidanceScore, reviewSectionScore, scoreRemaining, selfEffectivePartAMax, societyRowLocked, societyRowScore, sumSectionScore, toggleInnovativeMethod, validateCompleteRows, generateStandardReport, standardSubmittedScoreSummary, FORM_TYPES, formTypeForSchool, AppraisalHeaderImage, SummaryOtherInfoField, summaryOtherInfoValueFrom, RejectionNotice, DocCell, ViewCell, ViewDocsCell, RowButtons as RowBtns, SectionSaveFooter, SectionCard as SC, T, TH, TH_HOD, TH_DIR, TD, TDC, TDS, TDS_HOD, TDS_DIR, TDV, StandardMyAppraisal } from "../features/faculty-appraisal";
import { canReviewerRejectProfile, rejectedStatusFor, reviewedStatusFor, profileFromsessionStorage, workflowValidationError, roleLabel, getSchoolKey, isAppraisalFinalisedByVc, isRejectedStatus, isPendingReviewStatusFor, hasActiveRejection, reviewListFrom } from "../utils/hierarchy";
import { DesignArtsAuthorityReviewPanel } from "./DesignArtsDashboard";
import { MediaCommAuthorityReviewPanel } from "./MediaCommDashboard";
import { n, pct, grade, RO, TI } from "../features/faculty-appraisal/shared";

// - Helpers - (n, pct, grade, RO, TI → imported from shared)
const NON_ENGINEERING_REVIEW_SCHOOLS = new Set(["SoCM", "SoMCS", "SoD", "SoAA"]);
const isNonEngineeringReviewSubject = (item = {}) =>
 NON_ENGINEERING_REVIEW_SCHOOLS.has(getSchoolKey(item.school || item.schoolName || item.info?.school || ""));

function DirInput({ val, onChange, max, disabled = false }) {
 return (
<input type="number" min="0" step="0.5" value={val ?? ""}
 max={max}
 disabled={disabled}
 onChange={e =>onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
 style={{ width: 58, textAlign: "center", border: "1.5px solid #0ea5e9", borderRadius: 5, padding: "3px 5px", fontSize: 11, fontFamily: "inherit", outline: "none", background: disabled ? "#f1f5f9" : "#f0fbff", cursor: disabled ? "not-allowed" : "text" }}
 />
 );
}

const REVIEW_ARRAY_KEYS = ["lectures", "courseFile", "projects", "quals", "feedback", "deptActs", "uniActs", "society", "industry", "acr", "journals", "books", "ict", "research", "projects2", "externalProjects", "patents", "awards", "confs", "proposals", "products", "fdps", "training"];
const REVIEW_SECTION_MAX = { lectures: 50, courseFile: 20, projects: 10, quals: 10, feedback: 10, deptActs: 20, uniActs: 30, society: 10, industry: 5, acr: 25, journals: 120, books: 50, ict: 20, research: 30, projects2: SCORE_LIMITS.researchInternalProjects, externalProjects: SCORE_LIMITS.researchExternalProjects, patents: 40, awards: 10, confs: 30, proposals: 10, products: 10, fdps: 10, training: 10 };
const REVIEW_SCORE_FIELDS = ["hod", "director", "dean", "vc"];
const preserveSavedReviewScores = (form = {}, source = {}) =>{
 const merged = { ...form };
 merged.info = mergeFacultyInfo(form.info, source, form);
 REVIEW_ARRAY_KEYS.forEach((key) =>{
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
 if (String(next[field] ?? "").trim() === "" && String(sourceRow[field] ?? "").trim() !== "") next[field] = sourceRow[field];
 });
 return next;
 });
 }
 return merged;
};
const buildDirectorSectionScores = (faculty, dirData) =>{
 const payload = {};
 REVIEW_ARRAY_KEYS.forEach((key) =>{
 const rows = Array.isArray(faculty[key]) ? faculty[key] : [];
 payload[key] = rows.map((row, index) =>({
 ...row,
 director: key === "society" && societyRowLocked(row)
 ? "0"
 : clampReviewScore(key, row, dirData[key]?.[index]?.dir ?? row.director ?? "", REVIEW_SECTION_MAX[key] || 0),
 }));
 });
 const innovRows = Array.isArray(faculty.innovRows) ? faculty.innovRows : [];
 const reviewInnovRows = Array.isArray(dirData.innovRows) ? dirData.innovRows : [];
 const mergedInnovRows = innovRows.map((row, index) =>({
 ...row,
 director: clampReviewScore("innovRows", row, reviewInnovRows[index]?.director ?? reviewInnovRows[index]?.dir ?? row.director ?? "", 10),
 }));
 const innovTotal = reviewSectionScore("innovRows", mergedInnovRows, 10, "director");
 payload.innovRows = mergedInnovRows;
 payload.innovativeTeaching = {
 director: innovTotal ? String(innovTotal) : dirData.innovDir ?? faculty.innovDirector ?? "",
 };
 return payload;
};
const normalizeDirectorDraftData = (sectionScores = {}) =>{
 const next = { ...(sectionScores || {}) };
 REVIEW_ARRAY_KEYS.forEach((key) =>{
 if (!Array.isArray(next[key])) return;
 next[key] = next[key].map((row = {}) =>({
 ...row,
 dir: row.dir ?? row.director ?? "",
 }));
 });
 if (Array.isArray(next.innovRows)) {
 next.innovRows = next.innovRows.map((row = {}) =>({
 ...row,
 dir: row.dir ?? row.director ?? "",
 }));
 }
 if (next.innovativeTeaching?.director && !next.innovDir) {
 next.innovDir = next.innovativeTeaching.director;
 }
 return next;
};

// - Faculty Form in HOD Review Mode -
function FacultyReviewForm({ faculty, hodData, setHodData, dirData, setDirData, sectionView = "partA" }) {
 const set = (section, idx, field, val) =>{
 setHodData(prev =>{
 const updated = { ...prev };
 if (!updated[section]) updated[section] = JSON.parse(JSON.stringify(faculty[section] || []));
 if (idx === null) {
 updated[section] = Array.isArray(updated[section])
 ? (updated[section].length ? updated[section].map((r, i) =>i === 0 ? { ...r, [field]: val } : r) : [{ [field]: val }])
 : { ...updated[section], [field]: val };
 }
 else { updated[section] = updated[section].map((r, i) =>i === idx ? { ...r, [field]: val } : r); }
 return updated;
 });
 };
 const setScalar = (key, val) =>setHodData(prev =>({ ...prev, [key]: val }));

 const setDir = (section, idx, field, val) =>{
 setDirData(prev =>{
 const updated = { ...prev };
 if (!updated[section]) updated[section] = JSON.parse(JSON.stringify(faculty[section] || []));
 const nextVal = field === "dir" && idx !== null
 ? clampReviewScore(section, faculty[section]?.[idx] || {}, val, REVIEW_SECTION_MAX[section] || 0)
 : val;
 if (idx === null) {
 updated[section] = Array.isArray(updated[section])
 ? (updated[section].length ? updated[section].map((r, i) =>i === 0 ? { ...r, [field]: nextVal } : r) : [{ [field]: nextVal }])
 : { ...updated[section], [field]: nextVal };
 }
 else { updated[section] = updated[section].map((r, i) =>i === idx ? { ...r, [field]: nextVal } : r); }
 return updated;
 });
 };
 const setDirScalar = (key, val) =>setDirData(prev =>({ ...prev, [key]: val }));

 const get = (section, idx, field) =>{
 if (hodData[section]) {
 const s = hodData[section];
 return idx === null
 ? (Array.isArray(s) ? (s[0]?.[field] ?? "") : (s[field] ?? ""))
 : (s[idx]?.[field] ?? faculty[section]?.[idx]?.[field] ?? "");
 }
 if (idx === null) {
 const source = faculty[section];
 return Array.isArray(source) ? (source[0]?.[field] ?? "") : (source?.[field] ?? "");
 }
 return faculty[section]?.[idx]?.[field] ?? "";
 };
 const getS = (key) =>hodData[key] ?? faculty[key] ?? "";

 const getDir = (section, idx, field) =>{
 if (dirData[section]) {
 const s = dirData[section];
 return idx === null ? (Array.isArray(s) ? (s[0]?.[field] ?? "") : (s[field] ?? "")) : (s[idx]?.[field] ?? "");
 }
 if (idx === null) {
 const source = faculty[section];
 return Array.isArray(source) ? (source[0]?.director ?? "") : (source?.director ?? "");
 }
 return faculty[section]?.[idx]?.director ?? "";
 };
 const getDirS = (key) =>dirData[key] ?? faculty.innovDirector ?? faculty.innovDir ?? "";

 const info = mergeFacultyInfo(faculty.info, faculty);
 const { lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, docs } = faculty;
 const rows = (arr) =>arr && arr.length >0 ? arr : [{}];
 const innovativeRows = Array.isArray(faculty.innovRows) && faculty.innovRows.length
 ? faculty.innovRows
 : [{ method: faculty.innovDetails || "Innovative / participatory teaching methods used", details: faculty.innovDetails || "", score: faculty.innovScore || "" }];
 const getInnovDir = (index) =>dirData.innovRows?.[index]?.director ?? dirData.innovRows?.[index]?.dir ?? innovativeRows[index]?.director ?? "";
 const setInnovDir = (index, value) =>{
 const sourceRow = innovativeRows[index] || {};
 const nextValue = clampReviewScore("innovRows", sourceRow, value, 10);
 setDirData(prev =>{
 const sourceRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : JSON.parse(JSON.stringify(innovativeRows));
 const nextRows = sourceRows.map((row, rowIndex) =>rowIndex === index ? { ...row, director: nextValue } : row);
 const total = reviewSectionScore("innovRows", nextRows.map((row, rowIndex) =>({ ...innovativeRows[rowIndex], ...row })), 10, "director");
 return { ...prev, innovRows: nextRows, innovDir: total ? String(total) : "" };
 });
 };

 return (
<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
 {/* HOD Review Banner */}
<div style={{ background: "linear-gradient(90deg,#065f46,#059669)", color: "#d1fae5", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
<span style={{ fontSize: 18 }}></span>
<div>
<strong>Director Review Mode</strong>- Faculty self-scores are read-only. Only<span style={{ color: "#6ee7b7", fontWeight: 700 }}>Director Score</span>columns are editable. Click<span style={{ color: "#6ee7b7" }}>View Doc</span>links to open uploaded files.
</div>
</div>

 {/* Faculty Info */}
<SC title="Faculty Information" accent="#6366f1">
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
<tbody>
 {[["Name", info.name], ["Qualification", info.qual], ["Designation", info.desig], ["Academic Year", info.ay]].map(([label, val]) =>(
<tr key={label}>
<td style={{ padding: "6px 10px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", width: "35%" }}>{label}</td>
<td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", color: "#334155" }}>{val}</td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {sectionView === "partA" && (<>
 {/* - PART A - */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#dbeafe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART A - Teaching & Academic Activities</div>

 {/* A1: Lectures */}
<SC title="A1. Lectures / Tutorials / Practicals (Max 50)" accent="#6366f1">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Semester</th><th style={TH}>Course Code / Name</th>
<th style={TH}>Classes (as per course structure)</th><th style={TH}>Classes Actually Conducted</th>
<th style={TH}>View Docs</th>
<th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(lectures).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.sem} /></td>
<td style={TD}><RO val={r.code} /></td>
<td style={TDC}><RO val={r.planned} center /></td>
<td style={TDC}><RO val={r.conducted} center /></td>
<td style={TDV}><ViewDocsCell docKey={`lec-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("lectures", i, "dir")} onChange={v =>setDir("lectures", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>

 {/* A2: Course File */}
<SC title="A2. Course File (Max 20)" accent="#6366f1">
<table style={T}>
<thead><tr>
<th style={{ ...TH, width: 30 }}>SN</th>
<th style={TH}>Course</th><th style={TH}>Program & Semester</th><th style={TH}>Availability as per IQAC format</th>
<th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(courseFile).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.course} /></td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.details} center /></td>
<td style={TDS}><RO val={courseFileRowScore(r) ? String(courseFileRowScore(r)) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("courseFile", i, "dir")} onChange={v =>setDir("courseFile", i, "dir", v)} max={SCORE_LIMITS.courseFileRow} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* A3: Innovative Teaching */}
<SC title="A3. Innovative Teaching-Learning (Max 10)" accent="#8b5cf6">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Method</th><th style={TH}>Details</th><th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {innovativeRows.map((row, index) =>{
 const rowReviewable = rowHasReviewableData(row);
 return (
<tr key={index}>
<td style={TDC}>{index + 1}</td>
<td style={TD}><RO val={row.method || faculty.innovDetails} /></td>
<td style={TD}><RO val={row.details} /></td>
<td style={TDV}><ViewDocsCell docKey={index === 0 ? ["innov", "innov-0"] : `innov-${index}`} docs={docs} /></td>
<td style={TDS}><RO val={String(row.score ?? "").trim() ? clampScore(row.score, SCORE_LIMITS.innovativeRow) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={String(getInnovDir(index) ?? "").trim() ? clampScore(getInnovDir(index), SCORE_LIMITS.innovativeRow) : ""} max={SCORE_LIMITS.innovativeRow} disabled={!rowReviewable} onChange={v =>setInnovDir(index, v)} /></td>
</tr>
 );
 })}
</tbody>
</table>
</SC>

 {/* A4: Projects */}
 {faculty.sectionApplicability?.projects !== "notApplicable" &&<SC title="A4. Projects (Max 10)" accent="#8b5cf6">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Project Type</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(projects).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDV}><ViewDocsCell docKey={`proj-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, projectGuidanceRowMax(r)) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("projects", i, "dir")} max={projectGuidanceRowMax(r)} onChange={v =>setDir("projects", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>}

 {/* A5: Qualification */}
<SC title="A5. Qualification Enhancement (Max 10)" accent="#8b5cf6">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Description</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(quals).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDV}><ViewDocsCell docKey={`qual-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("quals", i, "dir")} onChange={v =>setDir("quals", i, "dir", v)} max={SCORE_LIMITS.qualificationRow} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B: Student Feedback */}
<SC title="B. Student Feedback (Max 10)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Course</th><th style={TH}>First Feedback(%)</th>
<th style={TH}>Second Feedback(%)</th><th style={TH}>Average</th>
<th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(feedback).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.code} /></td>
<td style={TDC}><RO val={r.fb1} center /></td>
<td style={TDC}><RO val={r.fb2} center /></td>
<td style={{ ...TDC, fontWeight: 700, color: "#6366f1" }}>
 {r.fb1 && r.fb2 ? ((n(r.fb1) + n(r.fb2)) / 2).toFixed(2) : "-"}
</td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("feedback", i, "dir")} onChange={v =>setDir("feedback", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* C: Dept Activities */}
<SC title="C. Departmental Activities (Max 20)" accent="#f59e0b">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Nature</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(deptActs).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.activity} /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`dept-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("deptActs", i, "dir")} onChange={v =>setDir("deptActs", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* D: University Activities */}
<SC title="D. University Activities (Max 30)" accent="#f59e0b">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Nature</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(uniActs).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.activity} /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`uni-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("uniActs", i, "dir")} onChange={v =>setDir("uniActs", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* E: Society */}
<SC title="E. Contribution to Society (Max 10, Max 5 per row)" accent="#10b981">
<div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
 {["applicable", "notApplicable"].map((v) =>(
<label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
<input type="checkbox" checked={(faculty.sectionApplicability?.society || "applicable") === v} readOnly disabled />
 {v === "applicable" ? "Applicable" : "Not Applicable"}
</label>
 ))}
</div>
 {faculty.sectionApplicability?.society !== "notApplicable" &&<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Details</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score (Max 5)</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(society).map((r, i) =>(
<tr key={i} style={societyRowLocked(r) ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`soc-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? societyRowScore(r) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={societyRowLocked(r) ? "0" : getDir("society", i, "dir")} max={SCORE_LIMITS.societyRow} disabled={societyRowLocked(r)} onChange={v =>setDir("society", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>}
</SC>

 {/* F: Industry */}
<SC title="F. Industry Connect (Max 5)" accent="#10b981">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Industry Name</th><th style={TH}>Details</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(industry).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.name} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`ind-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("industry", i, "dir")} onChange={v =>setDir("industry", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* G: ACR */}
<SC title="G. Annual Confidential Report (Max 25)" accent="#ef4444">
<div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>ACR is assessed in the Director review column - faculty does not fill scores.</div>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Parameter</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(acr).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDS_DIR}><DirInput val={String(getDir("acr", i, "dir") ?? "").trim() ? clampScore(getDir("acr", i, "dir"), SCORE_LIMITS.acrRow) : ""} max={SCORE_LIMITS.acrRow} onChange={v =>setDir("acr", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

</>)}
 {sectionView === "partB" && (<>
 {/* - PART B - */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#ede9fe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART B - Research & Academic Contributions</div>

 {/* B1: Journals */}
<SC title="B1. Research Papers / Journal Publications (Max 120)" accent="#7c3aed">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Journal</th>
<th style={TH}>ISSN</th><th style={TH}>Journal Indexing</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(journals).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.journal} /></td>
<td style={TDC}><RO val={r.issn} center /></td>
<td style={TDC}><RO val={r.index} center /></td>
<td style={TDV}><ViewDocsCell docKey={`jour-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("journals", i, "dir")} onChange={v =>setDir("journals", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>

 {/* B2: Books */}
<SC title="B2. Books / Book Chapters (Max 50)" accent="#7c3aed">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title with Page Nos.</th><th style={TH}>Book Title, Editor & Publisher</th>
<th style={TH}>ISSN / ISBN No.</th><th style={TH}>Type of Publisher</th><th style={TH}>Co-authors (from DYPIU)</th><th style={TH}>First Author</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(books).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.book} /></td>
<td style={TDC}><RO val={r.issn} center /></td>
<td style={TD}><RO val={r.pub} /></td>
<td style={TD}><RO val={r.coauth} /></td>
<td style={TDC}><RO val={r.first} center /></td>
<td style={TDV}><ViewDocsCell docKey={`book-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("books", i, "dir")} onChange={v =>setDir("books", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>

 {/* B3: ICT */}
<SC title="B3. ICT / E-Content / Pedagogy (Max 20)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Type</th><th style={TH}>Quadrants</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(ict).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.type} /></td>
<td style={TDC}><RO val={r.quad} center /></td>
<td style={TDV}><ViewDocsCell docKey={`ict-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("ict", i, "dir")} onChange={v =>setDir("ict", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B4: Research Guidance */}
 {faculty.sectionApplicability?.research !== "notApplicable" &&<SC title="B4(a). Research Guidance - PhD / PG (Max 30)" accent="#059669">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Degree</th><th style={TH}>Student Name</th><th style={TH}>Status</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(research).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TDC}><RO val={r.degree} center /></td>
<td style={TD}><RO val={r.name} /></td>
<td style={TD}><RO val={r.thesis} /></td>
<td style={TDV}><ViewDocsCell docKey={`res-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("research", i, "dir")} onChange={v =>setDir("research", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>}

<SC title="B4(b). Research / Consultancy Internal Projects (Max 15)" accent="#059669">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Agency</th>
<th style={TH}>Sanction Date</th><th style={TH}>Amount</th><th style={TH}>Role</th><th style={TH}>Status</th>
<th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(faculty.projects2).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TD}><RO val={r.role} /></td>
<td style={TD}><RO val={r.status} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("projects2", i, "dir")} max={SCORE_LIMITS.researchInternalProjects} onChange={v =>setDir("projects2", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>

<SC title="B4(c). Research / Consultancy External Projects (Max 30)" accent="#059669">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Agency</th>
<th style={TH}>Sanction Date</th><th style={TH}>Amount</th><th style={TH}>Role</th><th style={TH}>Status</th>
<th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(faculty.externalProjects).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TD}><RO val={r.role} /></td>
<td style={TD}><RO val={r.status} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("externalProjects", i, "dir")} max={SCORE_LIMITS.researchExternalProjects} onChange={v =>setDir("externalProjects", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>

 {/* B5: Patents */}
<SC title="B5(a). Patents (IPR) (Max 40)" accent="#f97316">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>National / International</th>
<th style={TH}>Filed</th><th style={TH}>Status</th><th style={TH}>File No.</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(patents).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.type} center /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TDC}><RO val={r.status} center /></td>
<td style={TDC}><RO val={r.fileNo} center /></td>
<td style={TDV}><ViewDocsCell docKey={`pat-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("patents", i, "dir")} onChange={v =>setDir("patents", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>

 {/* B5b: Awards */}
<SC title="B5(b). Awards (Max 10)" accent="#f97316">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Award Title</th><th style={TH}>Date</th>
<th style={TH}>Agency</th><th style={TH}>Level</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(awards).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TD}><RO val={r.level} /></td>
<td style={TDV}><ViewDocsCell docKey={`awd-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("awards", i, "dir")} onChange={v =>setDir("awards", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B6: Conferences */}
<SC title="B6. Invited Lectures / Resource Person / Paper Presentations (Max 30)" accent="#6366f1">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title / Session</th><th style={TH}>Type</th>
<th style={TH}>Organizer</th><th style={TH}>Level</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(confs).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.type} /></td>
<td style={TD}><RO val={r.org} /></td>
<td style={TD}><RO val={r.level} /></td>
<td style={TDV}><ViewDocsCell docKey={`conf-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("confs", i, "dir")} onChange={v =>setDir("confs", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B7: Proposals */}
<SC title="B7(a). Submitted Research Proposals (Max 10)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Duration</th>
<th style={TH}>Funding Agency</th><th style={TH}>Amount</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(proposals).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.duration} center /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TDV}><ViewDocsCell docKey={`prop-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("proposals", i, "dir")} onChange={v =>setDir("proposals", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

<SC title="B7(b). Product Developed and Used by Students in Lab / Commercialized (Max 10)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Details of Product</th><th style={TH}>Used by Students in Lab / Commercialized</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(products).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.details} /></td>
<td style={TD}><RO val={r.usage} /></td>
<td style={TDV}><ViewDocsCell docKey={`prod-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("products", i, "dir")} onChange={v =>setDir("products", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B8: Self Dev */}
<SC title="B8(a). FDP / Workshops Attended (Max 10)" accent="#10b981">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Program</th><th style={TH}>Duration</th><th style={TH}>Organizer</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(fdps).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.program} /></td>
<td style={TDC}><RO val={r.duration} center /></td>
<td style={TD}><RO val={r.org} /></td>
<td style={TDV}><ViewDocsCell docKey={`fdp-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, SCORE_LIMITS.fdpRow) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("fdps", i, "dir")} max={SCORE_LIMITS.fdpRow} onChange={v =>setDir("fdps", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

<SC title="B8(b). Industrial Training" accent="#10b981">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Company</th><th style={TH}>Duration</th><th style={TH}>Nature</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(training).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.company} /></td>
<td style={TDC}><RO val={r.duration} center /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`train-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, SCORE_LIMITS.fdpRow) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("training", i, "dir")} max={SCORE_LIMITS.fdpRow} onChange={v =>setDir("training", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>
<table style={{ ...T, marginTop: 4 }}>
<tbody>
<tr style={{ background: "#f3e8ff" }}>
<td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total B8 Score (Max 10)</td>
<td style={{ ...TDS, fontWeight: "bold" }}>
 {clampScore(
 (fdps || []).reduce((s, r) =>s + clampScore(parseFloat(r.score) || 0, SCORE_LIMITS.fdpRow), 0) +
 (training || []).reduce((s, r) =>s + clampScore(parseFloat(r.score) || 0, SCORE_LIMITS.fdpRow), 0),
 10
 ).toFixed(1)}
</td>
<td style={{ ...TDS_DIR, fontWeight: "bold" }}>
 {clampScore(
 (fdps || []).reduce((s, r, i) =>s + clampScore(parseFloat(getDir("fdps", i, "dir")) || 0, SCORE_LIMITS.fdpRow), 0) +
 (training || []).reduce((s, r, i) =>s + clampScore(parseFloat(getDir("training", i, "dir")) || 0, SCORE_LIMITS.fdpRow), 0),
 10
 ).toFixed(1)}
</td>
</tr>
</tbody>
</table>
</>)}
</div>
 );
}

// - Full Review Panel (opened when HOD clicks Review) -
function ReviewPanel({ faculty, onBack, onSubmit, readOnly = false }) {
 const [hodData, setHodData] = useState({});
 const [dirData, setDirData] = useState({});
 const [hodRemarks] = useState(faculty.hodRemarks || "");
 const [dirRemarks, setDirRemarks] = useState(faculty.directorRemarks || "");
 const [sectionView, setSectionView] = useState("partA");
 const [reviewConfirmed, setReviewConfirmed] = useState(false);
 const [draftStatus, setDraftStatus] = useState("");
 const [savingDraft, setSavingDraft] = useState(false);
 const finalisedByVc = isAppraisalFinalisedByVc(faculty);
 const pendingThisReviewer = isPendingReviewStatusFor([faculty.status, faculty.workflowStatus, faculty.workflow_status], "director");
 const reviewLocked = finalisedByVc || readOnly || (!pendingThisReviewer && (faculty.status === "Reviewed" || /Director\s*(Reviewed|Rejected)/i.test(faculty.status || "") || n(faculty.directorTotal) >0 || String(faculty.directorRemarks || "").trim() !== ""));
 const canReject = canReviewerRejectProfile("director", faculty);
 const subjectEmail = faculty.email || faculty.faculty_email || faculty.facultyEmail;
 const academicYear = faculty.academicYear || faculty.academic_year || faculty.info?.ay || APP_INFO.DEFAULT_AY || "2025-2026";
 const reviewerMaxScores = {
 partA: effectiveMaxScore(200, faculty.sectionApplicability || {}, [{ key: "projects", max: 10 }, { key: "society", max: 10 }]),
 partB: effectiveMaxScore(375, faculty.sectionApplicability || {}, [{ key: "research", max: 30 }]),
 grand: 0,
 };
 reviewerMaxScores.grand = reviewerMaxScores.partA + reviewerMaxScores.partB;

 // Compute HOD total from hodData
 const calcHodScore = () =>{
 const get = (section, idx, field) =>{
 if (hodData[section]) {
 const s = hodData[section];
 return idx === null ? n(Array.isArray(s) ? s[0]?.[field] : s[field]) : n(s[idx]?.[field]);
 }
 const source = faculty[section];
 return idx === null ? n(Array.isArray(source) ? source[0]?.[field] : source?.[field]) : n(source?.[idx]?.[field]);
 };
 const getS = (key) =>n(hodData[key] ?? faculty[key]);
 const sumReviewRows = (section, field, max, rowMax) =>clampScore(
 (faculty[section] || []).reduce((total, row, index) =>{
 if (section === "society" && societyRowLocked(row)) return total;
 if (!rowHasReviewableData(row)) return total;
 const limit = typeof rowMax === "function" ? rowMax(row) : rowMax;
 return total + (limit ? clampScore(get(section, index, field), limit) : get(section, index, field));
 }, 0),
 max,
 );
 const lec = reviewSectionScore("lectures", faculty.lectures || [], 50, "hod");
 const cf = reviewSectionScore("courseFile", faculty.courseFile || [], 20, "hod");
 const innov = clampScore(getS("innovHod"), 10);
 const proj = faculty.sectionApplicability?.projects === "notApplicable" ? 0 : sumReviewRows("projects", "hod", 10, projectGuidanceRowMax);
 const qual = sumReviewRows("quals", "hod", 10, SCORE_LIMITS.qualificationRow);
 const fb = reviewSectionScore("feedback", faculty.feedback || [], 10, "hod");
 const dept = sumReviewRows("deptActs", "hod", 20);
 const uni = sumReviewRows("uniActs", "hod", 30);
 const soc = sumReviewRows("society", "hod", 10, SCORE_LIMITS.societyRow);
 const ind = sumReviewRows("industry", "hod", 5);
 const acrT = sumReviewRows("acr", "hod", 25, SCORE_LIMITS.acrRow);
 const partA = clampScore(lec + cf + innov + proj + qual + fb + dept + uni + soc + ind + acrT, reviewerMaxScores.partA);

 const jour = sumReviewRows("journals", "hod", 120);
 const bk = sumReviewRows("books", "hod", 50);
 const ictT = sumReviewRows("ict", "hod", 20);
 const res = faculty.sectionApplicability?.research === "notApplicable" ? 0 : sumReviewRows("research", "hod", 30, researchGuidanceRowMax);
 const resProjects = sumReviewRows("projects2", "hod", SCORE_LIMITS.researchInternalProjects);
 const externalResProjects = sumReviewRows("externalProjects", "hod", SCORE_LIMITS.researchExternalProjects);
 const pat = sumReviewRows("patents", "hod", 40);
 const awd = sumReviewRows("awards", "hod", 10);
 const conf = sumReviewRows("confs", "hod", 30);
 const prop = sumReviewRows("proposals", "hod", 10);
 const prod = sumReviewRows("products", "hod", 10);
 const b8 = clampScore(sumReviewRows("fdps", "hod", 10, SCORE_LIMITS.fdpRow) + sumReviewRows("training", "hod", 10, SCORE_LIMITS.fdpRow), 10);
 const partB = clampScore(jour + bk + ictT + res + resProjects + externalResProjects + pat + awd + conf + prop + prod + b8, reviewerMaxScores.partB);

 return { partA, partB, total: clampScore(partA + partB, reviewerMaxScores.grand) };
 };

 // Compute Director total from dirData
 const calcDirScore = () =>{
 const getD = (section, idx, field) =>{
 if (dirData[section]) {
 const s = dirData[section];
 return idx === null ? n(Array.isArray(s) ? s[0]?.[field] : s[field]) : n(s[idx]?.[field]);
 }
 const source = faculty[section];
 return idx === null ? n(Array.isArray(source) ? source[0]?.director : source?.director) : n(source?.[idx]?.director);
 };
 const getDirS = (key) =>n(dirData[key] ?? faculty.innovDirector ?? faculty.innovDir);
 const sumReviewRows = (section, field, max, rowMax) =>clampScore(
 (faculty[section] || []).reduce((total, row, index) =>{
 if (section === "society" && societyRowLocked(row)) return total;
 if (!rowHasReviewableData(row)) return total;
 const limit = typeof rowMax === "function" ? rowMax(row) : rowMax;
 return total + (limit ? clampScore(getD(section, index, field), limit) : getD(section, index, field));
 }, 0),
 max,
 );
 const lectureReviewRows = (faculty.lectures || []).map((row, index) =>({
 ...row,
 dir: dirData.lectures?.[index]?.dir ?? dirData.lectures?.[index]?.director ?? row.dir ?? row.director ?? "",
 }));
 const courseFileReviewRows = (faculty.courseFile || []).map((row, index) =>({
 ...row,
 dir: dirData.courseFile?.[index]?.dir ?? dirData.courseFile?.[index]?.director ?? row.dir ?? row.director ?? "",
 }));
 const lec = reviewSectionScore("lectures", lectureReviewRows, 50, "dir");
 const cf = reviewSectionScore("courseFile", courseFileReviewRows, 20, "dir");
 const innovReviewRows = (faculty.innovRows || []).map((row, index) =>({
 ...row,
 director: dirData.innovRows?.[index]?.director ?? dirData.innovRows?.[index]?.dir ?? row.director ?? "",
 }));
 const feedbackReviewRows = (faculty.feedback || []).map((row, index) =>({
 ...row,
 dir: dirData.feedback?.[index]?.dir ?? dirData.feedback?.[index]?.director ?? row.dir ?? row.director ?? "",
 }));
 const innov = innovReviewRows.length ? reviewSectionScore("innovRows", innovReviewRows, 10, "director") : clampScore(getDirS("innovDir"), 10);
 const proj = faculty.sectionApplicability?.projects === "notApplicable" ? 0 : sumReviewRows("projects", "dir", 10, projectGuidanceRowMax);
 const qual = sumReviewRows("quals", "dir", 10, SCORE_LIMITS.qualificationRow);
 const fb = reviewSectionScore("feedback", feedbackReviewRows, 10, "dir");
 const dept = sumReviewRows("deptActs", "dir", 20);
 const uni = sumReviewRows("uniActs", "dir", 30);
 const soc = sumReviewRows("society", "dir", 10, SCORE_LIMITS.societyRow);
 const ind = sumReviewRows("industry", "dir", 5);
 const acrT = sumReviewRows("acr", "dir", 25, SCORE_LIMITS.acrRow);
 const partA = clampScore(lec + cf + innov + proj + qual + fb + dept + uni + soc + ind + acrT, reviewerMaxScores.partA);

 const jour = sumReviewRows("journals", "dir", 120);
 const bk = sumReviewRows("books", "dir", 50);
 const ictT = sumReviewRows("ict", "dir", 20);
 const res = faculty.sectionApplicability?.research === "notApplicable" ? 0 : sumReviewRows("research", "dir", 30, researchGuidanceRowMax);
 const resProjects = sumReviewRows("projects2", "dir", SCORE_LIMITS.researchInternalProjects);
 const externalResProjects = sumReviewRows("externalProjects", "dir", SCORE_LIMITS.researchExternalProjects);
 const pat = sumReviewRows("patents", "dir", 40);
 const awd = sumReviewRows("awards", "dir", 10);
 const conf = sumReviewRows("confs", "dir", 30);
 const prop = sumReviewRows("proposals", "dir", 10);
 const prod = sumReviewRows("products", "dir", 10);
 const b8 = clampScore(sumReviewRows("fdps", "dir", 10, SCORE_LIMITS.fdpRow) + sumReviewRows("training", "dir", 10, SCORE_LIMITS.fdpRow), 10);
 const partB = clampScore(jour + bk + ictT + res + resProjects + externalResProjects + pat + awd + conf + prop + prod + b8, reviewerMaxScores.partB);

 return { partA, partB, total: clampScore(partA + partB, reviewerMaxScores.grand) };
 };

 const { partA, partB, total } = calcHodScore();
 const calculatedDirScores = calcDirScore();
 const hasSavedDirectorScores = ["directorPartA", "directorPartB", "directorTotal"].some((key) =>String(faculty?.[key] ?? "").trim() !== "");
 const rawDisplayedDirScores = reviewLocked && hasSavedDirectorScores ? {
 partA: String(faculty?.directorPartA ?? "").trim() !== "" ? n(faculty.directorPartA) : calculatedDirScores.partA,
 partB: String(faculty?.directorPartB ?? "").trim() !== "" ? n(faculty.directorPartB) : calculatedDirScores.partB,
 total: String(faculty?.directorTotal ?? "").trim() !== "" ? n(faculty.directorTotal) : calculatedDirScores.total,
 } : calculatedDirScores;
 const displayedDirScores = {
 partA: clampScore(rawDisplayedDirScores.partA, reviewerMaxScores.partA),
 partB: clampScore(rawDisplayedDirScores.partB, reviewerMaxScores.partB),
 total: clampScore(rawDisplayedDirScores.total || rawDisplayedDirScores.partA + rawDisplayedDirScores.partB, reviewerMaxScores.grand),
 };
 const { partA: dirPartA, partB: dirPartB, total: dirTotal } = displayedDirScores;
 const g = grade(dirTotal, reviewerMaxScores.grand);
 useEffect(() =>{
 let active = true;
 if (reviewLocked || !subjectEmail) return undefined;
 loadReviewerDraft({ subjectEmail, academicYear, reviewerRole: "director" })
 .then((draft) =>{
 if (!active || !draft?.payload) return;
 setDirData(normalizeDirectorDraftData(draft.payload.section_scores || {}));
 setDirRemarks(draft.payload.remarks ?? "");
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
 reviewerRole: "director",
 partAScore: dirPartA,
 partBScore: dirPartB,
 totalScore: dirTotal,
 remarks: dirRemarks,
 sectionScores: buildDirectorSectionScores(faculty, dirData),
 });
 setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
 } catch (err) {
 console.error("Could not save reviewer draft:", err);
 alert(err?.message || "Unable to save draft.");
 } finally {
 setSavingDraft(false);
 }
 };
 const facultySummary = standardSubmittedScoreSummary(faculty, {
 partA: faculty.lectures?.reduce((a, r) =>a + n(r.score), 0) || 0,
 partB: faculty.journals?.reduce((a, r) =>a + n(r.score), 0) || 0,
 });

 return (
<div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100%" }}>
 {/* Header */}
<div style={{ background: "#0f172a", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16, borderRadius: 10 }}>
<button onClick={onBack} style={{ background: "#1e293b", border: "none", color: "#94a3b8", cursor: "pointer", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontFamily: "inherit" }}> Back</button>
<Avatar initials={faculty.avatar} color={faculty.avatarColor} size={40} />
<div style={{ flex: 1 }}>
<div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{faculty.name}</div>
<div style={{ color: "#64748b", fontSize: 11 }}>{faculty.designation} - {faculty.employeeId}</div>
</div>
<div style={{ display: "flex", gap: 10 }}>
<div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
<div style={{ color: "#86efac", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>Dir Part A</div>
<div style={{ color: "#4ade80", fontWeight: 800, fontSize: 16 }}>{dirPartA.toFixed(1)}</div>
</div>
<div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
<div style={{ color: "#86efac", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>Dir Part B</div>
<div style={{ color: "#4ade80", fontWeight: 800, fontSize: 16 }}>{dirPartB.toFixed(1)}</div>
</div>
<div style={{ background: g.bg, border: `2px solid ${g.color}40`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
<div style={{ color: g.color, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>Dir Total</div>
<div style={{ color: g.color, fontWeight: 800, fontSize: 16 }}>{dirTotal.toFixed(1)}<span style={{ fontSize: 10, color: "#94a3b8" }}>/575</span></div>
</div>
</div>
</div>
 {finalisedByVc && (
<div style={{ background: "#ecfdf5", border: "1px solid #86efac", color: "#065f46", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
 This appraisal has been finalised by the VC.
</div>
 )}

 {/* Section switcher */}
<div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
 {[["partA", "Part A"], ["partB", "Part B"], ["summary", "Summary"]].map(([id, label]) =>(
<button key={id} onClick={() =>{
 setSectionView(id);
 requestAnimationFrame(() =>{
 window.scrollTo({ top: 0, left: 0, behavior: "auto" });
 });
 }}
 style={{ padding: "7px 18px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: sectionView === id ? "#312e81" : "#e2e8f0", color: sectionView === id ? "#e0e7ff" : "#475569" }}>
 {label}
</button>
 ))}
</div>

 {(sectionView === "partA" || sectionView === "partB") && (
<fieldset disabled={reviewLocked} style={{ border: "none", padding: 0, margin: 0 }}>
<FacultyReviewForm faculty={faculty} hodData={hodData} setHodData={setHodData} dirData={dirData} setDirData={setDirData} sectionView={sectionView} />
</fieldset>
 )}
 {(sectionView === "partA" || sectionView === "partB") && !reviewLocked && (
<div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, margin: "12px 0 14px", flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{draftStatus}</span>
<button
 onClick={handleSaveDraft}
 disabled={savingDraft}
 style={{ padding: "10px 22px", background: savingDraft ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 7, cursor: savingDraft ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
>
 {savingDraft ? "Saving..." : "Save Draft"}
</button>
</div>
 )}

 {sectionView === "summary" && (
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
<CompactSummaryCard
 title="Faculty Score"
 subtitle="Faculty submitted score for the engineering appraisal form."
 totals={{ partA: facultySummary.partA, partB: facultySummary.partB, total: facultySummary.total }}
 maxScores={{ partA: facultySummary.partAMax, partB: facultySummary.partBMax, grand: facultySummary.grandMax }}
 accent="#0ea5e9"
/>
<SummaryOtherInfoField value={summaryOtherInfoValueFrom(faculty)} readOnly rows={4} />
<CompactSummaryCard
 title="Director Score"
 subtitle="Director score for the engineering appraisal form."
 totals={{ partA: dirPartA, partB: dirPartB, total: dirTotal }}
 maxScores={reviewerMaxScores}
 accent="#0ea5e9"
 remarksTitle="Director Remarks"
 remarksContent={(
<textarea value={dirRemarks} onChange={e =>setDirRemarks(e.target.value)} rows={4} readOnly={reviewLocked}
 placeholder="Enter your director remarks, observations, and recommendations..."
 style={{ width: "100%", border: "none", padding: 0, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "transparent", color: "#334155", outline: "none" }} />
 )}
/>

 {!reviewLocked && (
<label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 14, color: "#334155", fontSize: 12, lineHeight: 1.5, cursor: "pointer" }}>
<input
 type="checkbox"
 checked={reviewConfirmed}
 onChange={(e) =>setReviewConfirmed(e.target.checked)}
 style={{ marginTop: 3 }}
 />
<span>I have verified all the details and confirm that the information provided is correct. I am responsible for the accuracy of this data.</span>
</label>
 )}

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{draftStatus}</span>
<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
<button onClick={onBack} style={{ padding: "9px 22px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>{reviewLocked ? "Close" : "Cancel"}</button>
 {!reviewLocked && (
<>
<button
 onClick={handleSaveDraft}
 disabled={savingDraft}
 style={{ padding: "10px 22px", background: savingDraft ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 7, cursor: savingDraft ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
>
 {savingDraft ? "Saving..." : "Save Draft"}
</button>
{canReject && (
<button
 onClick={() =>{
 if (window.confirm("Reject this appraisal and send it back to the user for editing?")) {
 onSubmit(faculty.id, { partA: dirPartA, partB: dirPartB, total: dirTotal }, dirRemarks, buildDirectorSectionScores(faculty, dirData), reviewConfirmed, "rejected");
 }
 }}
 disabled={!reviewConfirmed || !dirRemarks.trim()}
 style={{ padding: "10px 22px", background: (reviewConfirmed && dirRemarks.trim()) ? "#dc2626" : "#94a3b8", color: "#fff", border: "none", borderRadius: 7, cursor: (reviewConfirmed && dirRemarks.trim()) ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
>
 Reject Form
</button>
)}
<button onClick={() =>onSubmit(faculty.id, { partA: dirPartA, partB: dirPartB, total: dirTotal }, dirRemarks, buildDirectorSectionScores(faculty, dirData), reviewConfirmed)}
 disabled={!reviewConfirmed || !dirRemarks.trim()}
 style={{ padding: "10px 28px", background: (reviewConfirmed && dirRemarks.trim()) ? "#059669" : "#64748b", color: "#fff", border: "none", borderRadius: 7, cursor: (reviewConfirmed && dirRemarks.trim()) ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
 Submit Director Review
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

// - Main Director Dashboard -
export default function DirectorDashboard() {
 const [activeMainTab, setActiveMainTab] = useState("myAppraisal");
 const [hodAppraisalTab, setHodAppraisalTab] = useState("partA");
 const [reviewingFaculty, setReviewingFaculty] = useState(null);
 const [reviewingHod, setReviewingHod] = useState(null);
 const [reviewLoading, setReviewLoading] = useState(null);

 const dirSchool = sessionStorage.getItem("school");
 const hasHOD = sessionStorage.getItem("hasHod") === "true";

 const [facultyList, setFacultyList] = useState([]);
 const [hodList, setHodList] = useState([]);

 useEffect(() =>{
 const loadReviewQueue = async () =>{
 try {
 const items = await fetchReviewQueueForRole({
 reviewerRole: "director",
 reviewerProfile: { ...profileFromsessionStorage(), school: dirSchool },
 schoolValues: [dirSchool],
 });
 setFacultyList(items.filter((item) =>item.appraisalRole === "faculty"));
 setHodList(items.filter((item) =>item.appraisalRole === "hod"));
 } catch (err) {
 console.error("Could not load Director review queue:", err);
 setFacultyList([]);
 setHodList([]);
 }
 };

 loadReviewQueue();
 }, [dirSchool]);

 const [filterStatus, setFilterStatus] = useState("All");
 const [showLogoutModal, setShowLogoutModal] = useState(false);


 const isDirectorPending = (item) =>{
 const s = item.status || "";
 if (isPendingReviewStatusFor([s, item.workflowStatus, item.workflow_status], "director")) return true;
 return s === "pending_director" || s === "Pending Review" || s === "pending_hod" ||
 (n(item.directorTotal)<= 0 && !String(item.directorRemarks || "").trim() && s !== "Reviewed" && s !== "pending_dean" && s !== "director_reviewed" && !/Director\s*(Reviewed|Rejected)/i.test(s) && s !== "completed");
 };
 const isDirectorReviewed = (item) =>{
 const s = item.status || "";
 if (isPendingReviewStatusFor([s, item.workflowStatus, item.workflow_status], "director")) return false;
 return n(item.directorTotal) >0 || String(item.directorRemarks || "").trim() !== "" || s === "Reviewed" || s === "pending_dean" || s === "director_reviewed" || /Director\s*Reviewed/i.test(s);
 };

 const facultyPendingCount = facultyList.filter(isDirectorPending).length;
 const facultyReviewedCount = facultyList.filter(isDirectorReviewed).length;
 const hodPendingCount = hodList.filter(isDirectorPending).length;
 const hodReviewedCount = hodList.filter(isDirectorReviewed).length;

 const navItems = [
 { id: "myAppraisal", icon: "", label: "My Appraisal", sub: "View your self-appraisal form" },
 { id: "facultyApprovals", icon: "", label: "Faculty's Appraisal", sub: `${facultyPendingCount} awaiting review`, badge: facultyPendingCount },
 ...(hasHOD ? [{ id: "hodApprovals", icon: "", label: "HOD's Appraisal", sub: `${hodPendingCount} awaiting review`, badge: hodPendingCount }] : []),
 { id: "guidelines", icon: "", label: "Guidelines", sub: "Faculty appraisal guidelines AY 2025-26" },
 ];
 const handleSubmitReview = async (type, id, scores, remarks, sectionScores, reviewConfirmed = false, decision = "approved") =>{
 if (!reviewConfirmed) {
 alert("Please verify and confirm the accuracy declaration before submitting the review.");
 return;
 }
 if (!remarks?.trim()) {
 alert("Remarks are mandatory. Please enter your remarks before submitting the review.");
 return;
 }
 const sourceList = type === "hod" ? hodList : facultyList;
 const item = sourceList.find((entry) =>entry.id === id);
 if (!item) return;

 try {
 await submitWorkflowReview({
 subjectEmail: item.email,
 academicYear: item.academicYear || item.academic_year || item.info?.ay || APP_INFO.DEFAULT_AY || "2025-2026",
 reviewerRole: "director",
 partAScore: scores.partA,
 partBScore: scores.partB,
 totalScore: scores.total,
 remarks,
 sectionScores,
 subjectProfile: item,
 decision,
 });

 const status = decision === "rejected" ? rejectedStatusFor("director") : reviewedStatusFor("director");
 if (type === "hod") {
 setHodList(prev =>prev.map(h =>h.id === id ? { ...h, ...sectionScores, innovDirector: sectionScores?.innovativeTeaching?.director ?? h.innovDirector, status, workflowStatus: status, directorPartA: scores.partA, directorPartB: scores.partB, directorTotal: scores.total, directorRemarks: remarks } : h));
 setReviewingHod(null);
 } else {
 setFacultyList(prev =>prev.map(f =>f.id === id ? { ...f, ...sectionScores, innovDirector: sectionScores?.innovativeTeaching?.director ?? f.innovDirector, status, workflowStatus: status, directorPartA: scores.partA, directorPartB: scores.partB, directorTotal: scores.total, directorRemarks: remarks } : f));
 setReviewingFaculty(null);
 }

 alert(decision === "rejected" ? "Appraisal rejected and sent back for editing." : "Director review approved and forwarded to Dean.");
 } catch (err) {
 console.error("Could not submit Director review:", err);
 alert(`Unable to submit Director review.\n\n${err.message}`);
 }
 };

 const filtered = activeMainTab === "hodApprovals"
 ? (filterStatus === "All" ? hodList : (filterStatus === "Pending Review" ? hodList.filter(isDirectorPending) : hodList.filter(isDirectorReviewed)))
 : (filterStatus === "All" ? facultyList : (filterStatus === "Pending Review" ? facultyList.filter(isDirectorPending) : facultyList.filter(isDirectorReviewed)));


 const isMyAppraisalSectionOpen = (_section) =>true;
 const handleMyAppraisalSectionChange = (section) =>{
 setHodAppraisalTab(section);
 requestAnimationFrame(() =>{
 window.scrollTo({ top: 0, left: 0, behavior: "auto" });
 });
 };
 return (
<DashboardLayout
 appInfo={APP_INFO}
 showLogoutModal={showLogoutModal}
 onCancelLogout={() =>setShowLogoutModal(false)}
 containerStyle={{ display: "flex", minHeight: "100vh", fontFamily: "inherit", background: "#f8fafc", color: "#1e293b" }}
 mainStyle={{ flex: 1, padding: "24px 30px", display: "flex", flexDirection: "column", gap: 18, overflowX: "auto" }}
 sidebar={(
<DashboardSidebar
 appInfo={APP_INFO}
 navItems={navItems}
 activeTab={activeMainTab}
 onTabSelect={(tab) =>{ setActiveMainTab(tab); setReviewingFaculty(null); }}
 showSectionSelector={activeMainTab === "myAppraisal"}
 sectionTab={hodAppraisalTab}
 onSectionChange={handleMyAppraisalSectionChange}
 isSectionOpen={isMyAppraisalSectionOpen}
 profileSubtitle={`Director - ${sessionStorage.getItem("department")?.split(" ")[0] || ""}`}
 onLogout={() =>setShowLogoutModal(true)}
 showLogoutSpacer
/>
 )}
>

 {activeMainTab === "myAppraisal" && <StandardMyAppraisal sectionTab={hodAppraisalTab} onSectionTabChange={handleMyAppraisalSectionChange} defaultDesignation={sessionStorage.getItem("role") === "director" ? "Director" : ""} titleNameFallback="HOD" subtitleSeparator=" - " />}

 {(activeMainTab === "facultyApprovals" || activeMainTab === "hodApprovals") && !reviewingFaculty && !reviewingHod && (
<>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
<div>
<h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5 }}>
 {activeMainTab === "facultyApprovals" ? "Faculty's Appraisal" : "HOD's Appraisal"}
</h1>
<p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 11 }}>{sessionStorage.getItem("department") || ""} - AY {APP_INFO.DEFAULT_AY}</p>
</div>
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
<div style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: "#fef3c7", color: "#92400e" }}>
 {activeMainTab === "facultyApprovals" ? facultyPendingCount : hodPendingCount} Pending
</div>
<div style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: "#d1fae5", color: "#065f46" }}>
 {activeMainTab === "facultyApprovals" ? facultyReviewedCount : hodReviewedCount} Reviewed
</div>
<AppraisalHeaderImage />
</div>
</div>

 {/* Filter */}
<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", borderRadius: 9, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
<span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Filter:</span>
 {["All", "Pending Review", "Reviewed"].map(f =>(
<button key={f} onClick={() =>setFilterStatus(f)}
 style={{ fontSize: 11, padding: "4px 12px", border: "1px solid #e2e8f0", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", background: filterStatus === f ? "#0f172a" : "none", color: filterStatus === f ? "#f1f5f9" : "#475569" }}>
 {f}
</button>
 ))}
</div>

<div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
 {filtered.map(item =>{
 const itemSummary = standardSubmittedScoreSummary(item);
 const courseFilePartA = Array.isArray(item.courseFile)
 ? (() =>{
 const filled = item.courseFile.filter(row =>String(row?.score ?? "").trim() !== "");
 return filled.length ? filled.reduce((total, row) =>total + courseFileRowScore(row), 0) / filled.length : 0;
 })()
 : n(item.courseFile?.score);
 const partA = [
 ...(item.lectures || []).map(r =>n(r.score)),
 courseFilePartA, n(item.innovScore),
 ...(item.sectionApplicability?.projects === "notApplicable" ? [] : (item.projects || []).map(r =>n(r.score))),
 ...(item.quals || []).map(r =>n(r.score)),
 ...(item.feedback || []).map(r =>n(r.score)),
 ...(item.deptActs || []).map(r =>n(r.score)),
 ...(item.uniActs || []).map(r =>n(r.score)),
 ...(item.society || []).map(r =>societyRowScore(r)),
 ...(item.industry || []).map(r =>n(r.score)),
 ].reduce((a, b) =>a + b, 0);

 const partB = [
 ...(item.journals || []).map(r =>n(r.score)),
 ...(item.books || []).map(r =>n(r.score)),
 ...(item.confs || []).map(r =>n(r.score)),
 ...(item.patents || []).map(r =>n(r.score)),
 ].reduce((a, b) =>a + b, 0);

 const docCount = Object.values(item.docs || {}).reduce((a, arr) =>a + arr.length, 0);

 return (
<div key={item.id} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,.07)", display: "flex", flexDirection: "column", gap: 14 }}>
<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
<Avatar initials={item.avatar} color={item.avatarColor} size={46} />
<div style={{ flex: 1 }}>
<div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{item.name}</div>
<div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>{item.designation}</div>
<div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{item.employeeId}</div>
</div>
<StatusBadge status={item.status} />
</div>

 {(() =>{
 const reviewed = isDirectorReviewed(item);
 const dirA = n(item.directorPartA);
 const dirB = n(item.directorPartB);
 const selfA = itemSummary.partA;
 const selfB = itemSummary.partB;
 const showDirScores = reviewed && (dirA >0 || dirB >0);
 const reviewPartAMax = isNonEngineeringReviewSubject(item) ? itemSummary.partAMax + 25 : itemSummary.partAMax;
 const noScoresAvailable = reviewed && dirA === 0 && dirB === 0 && selfA === 0 && selfB === 0;
 if (noScoresAvailable) {
 return (
<div style={{ background: "#f0fdf4", borderRadius: 8, padding: "14px", textAlign: "center" }}>
<div style={{ fontSize: 18, color: "#10b981" }}>Done</div>
<div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginTop: 2 }}>Director Reviewed</div>
<div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Click "View Review" to see scores</div>
</div>
 );
 }
 
return (
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
 {[ 
 { label: showDirScores ? "Dir Part A" : "Part A", val: showDirScores ? dirA : selfA, max: showDirScores ? reviewPartAMax : itemSummary.partAMax, color: "#6366f1" },
 { label: showDirScores ? "Dir Part B" : "Part B", val: showDirScores ? dirB : selfB, max: itemSummary.partBMax, color: "#0ea5e9" },
 { label: "Docs", val: docCount, max: null, color: "#10b981" },
 ].map(({ label, val, max, color }) =>(
<div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
<div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
<div style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1 }}>
 {val.toFixed ? val.toFixed(1) : val}{max &&<span style={{ fontSize: 9, color: "#94a3b8" }}>/{max}</span>}
</div>
 {max &&<ScoreBar score={val} max={max} color={color} />}
 {!max &&<div style={{ fontSize: 9, color: "#94a3b8" }}>files uploaded</div>}
</div>
 ))}
</div>
 );
 })()}

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
<div style={{ fontSize: 10, color: "#94a3b8" }}>Submitted: {item.submittedOn}</div>
<button
 disabled={reviewLoading === item.id}
 onClick={async () =>{
 setReviewLoading(item.id);
 try {
 const data = await fetchSavedAppraisal({
 facultyEmail: item.email,
 academicYear: item.academic_year || item.academicYear || APP_INFO.DEFAULT_AY || "2025-2026",
 });
 const form = data?.payload?.form || data?.form || {};
 const docs = data?.payload?.docs || data?.docs || {};
 const mergedForm = preserveSavedReviewScores(form, item);
 const declaration = data?.declaration || item.declaration || null;
 const merged = { ...item, ...mergedForm, docs, declaration, status: declaration?.status || data?.status || item.status, workflowStatus: declaration?.status || data?.workflowStatus || item.workflowStatus };
 activeMainTab === "facultyApprovals" ? setReviewingFaculty(merged) : setReviewingHod(merged);
 } catch (err) {
 alert(`Unable to open submitted form.\n\n${err.message}`);
 } finally {
 setReviewLoading(null);
 }
 }}
 style={{ fontSize: 11, padding: "7px 18px", background: isDirectorReviewed(item) ? "#1e293b" : "#312e81", color: "#f1f5f9", border: "none", borderRadius: 6, cursor: reviewLoading === item.id ? "wait" : "pointer", fontWeight: 700, fontFamily: "inherit", opacity: reviewLoading === item.id ? 0.7 : 1 }}>
 {reviewLoading === item.id ? "Loading..." : isDirectorReviewed(item) ? "View Review" : "Review Form"}
</button>
</div>
</div>
 );
 })}
</div>

 {filtered.length === 0 && (
<div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
<div style={{ fontSize: 32, marginBottom: 8 }}>Done</div>
<div style={{ fontWeight: 700, color: "#0f172a" }}>All caught up!</div>
<div style={{ color: "#64748b", fontSize: 12 }}>No forms match the selected filter.</div>
</div>
 )}
</>
 )}

 {/* REVIEW PANEL */}
 {activeMainTab === "facultyApprovals" && reviewingFaculty && (
 formTypeForSchool(getSchoolKey(reviewingFaculty.school)) === FORM_TYPES.MEDIA_COMM ? (
<MediaCommAuthorityReviewPanel
 person={reviewingFaculty}
 reviewerRole="director"
 onBack={() =>setReviewingFaculty(null)}
 onSubmit={(id, scores, remarks, sectionScores, reviewConfirmed, decision) =>handleSubmitReview("faculty", id, scores, remarks, sectionScores, reviewConfirmed, decision)}
 readOnly={isDirectorReviewed(reviewingFaculty)}
 />
 ) : formTypeForSchool(getSchoolKey(reviewingFaculty.school)) === FORM_TYPES.DESIGN_ARTS ? (
<DesignArtsAuthorityReviewPanel
 person={reviewingFaculty}
 reviewerRole="director"
 onBack={() =>setReviewingFaculty(null)}
 onSubmit={(id, scores, remarks, sectionScores, reviewConfirmed, decision) =>handleSubmitReview("faculty", id, scores, remarks, sectionScores, reviewConfirmed, decision)}
 readOnly={isDirectorReviewed(reviewingFaculty)}
 />
 ) : (
<ReviewPanel
 faculty={reviewingFaculty}
 onBack={() =>setReviewingFaculty(null)}
 onSubmit={(id, total, remarks, sectionScores, reviewConfirmed, decision) =>handleSubmitReview("faculty", id, total, remarks, sectionScores, reviewConfirmed, decision)}
 readOnly={isDirectorReviewed(reviewingFaculty)}
 />
 )
 )}
 {activeMainTab === "hodApprovals" && reviewingHod && (
<ReviewPanel
 faculty={reviewingHod}
 onBack={() =>setReviewingHod(null)}
 onSubmit={(id, total, remarks, sectionScores, reviewConfirmed, decision) =>handleSubmitReview("hod", id, total, remarks, sectionScores, reviewConfirmed, decision)}
 readOnly={isDirectorReviewed(reviewingHod)}
 />
 )}
</DashboardLayout>
 );
}






