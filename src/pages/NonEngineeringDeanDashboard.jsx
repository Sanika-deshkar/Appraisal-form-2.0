import { createContext, useContext, useState, useRef, useEffect } from "react";
import { HodInput } from "../components/Inputs";
import { api } from "../services/api";
import { Avatar, CompactSummaryCard, ScoreBar, StatusBadge } from "../components/dashboard/dashboardPrimitives";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import { ACR_DETAIL_POINTS, SOCIETY_LABELS, MAX_SCORES, APP_INFO, createAcrRows, fetchSavedAppraisal, loadAppraisalDocuments, loadSavedAppraisal, mergeFacultyInfo, saveAppraisalDraftSection, submitAppraisal, fetchReviewQueueForRole, loadReviewerDraft, saveReviewerDraft, submitWorkflowReview, INNOVATIVE_METHODS, SCORE_LIMITS, averageSectionScore, clampScore, clampReviewScore, courseFileAverageScore, courseFileRowScore, effectiveMaxScore, feedbackAverage, feedbackRowScore, feedbackSectionScore, innovativeSelectionsFromDetails, innovativeTeachingScore, isAllowedAttachmentFile, isValidDDMMYYYY, maskDateDDMMYYYY, normalizeAutoScores, projectGuidanceRowMax, researchGuidanceRowMax, researchGuidanceScore, reviewSectionScore, rowHasReviewableData, scoreRemaining, selfEffectivePartAMax, societyRowLocked, societyRowScore, sumSectionScore, toggleInnovativeMethod, validateCompleteRows, FORM_TYPES, formTypeForSchool, generateStandardReport, standardSubmittedScoreSummary, AppraisalHeaderImage, SummaryOtherInfoField, summaryOtherInfoValueFrom, RejectionNotice, DocCell, ViewCell, ViewDocsCell, RowButtons as RowBtns, SectionSaveFooter, SectionCard as SC, T, TH, TH_HOD, TH_DIR, TH_DEAN, TD, TDC, TDS, TDS_HOD, TDS_DIR, TDS_DEAN, TDV, StandardMyAppraisal } from "../features/faculty-appraisal";
import { DEAN_TRACKS, getSchoolKey, getSchoolsByDeanTrack } from "../constants/universityHierarchy";
import { canReviewerRejectProfile, rejectedStatusFor, reviewedStatusFor, profileFromsessionStorage, workflowValidationError, roleLabel, isAppraisalFinalisedByVc, isRejectedStatus, isPendingReviewStatusFor, hasActiveRejection, reviewListFrom } from "../utils/hierarchy";
import { n, pct, grade, RO, TI } from "../features/faculty-appraisal/shared";
import { MediaCommAuthorityReviewPanel } from "./MediaCommDashboard";
import { DesignArtsAuthorityReviewPanel } from "./DesignArtsDashboard";

const NON_ENGINEERING_SCHOOLS = getSchoolsByDeanTrack(DEAN_TRACKS.NON_ENGINEERING);
const NON_ENGINEERING_SCHOOL_VALUES = NON_ENGINEERING_SCHOOLS.flatMap((school) =>[
 school.code,
 school.name,
 school.label,
]);
const NON_ENGINEERING_SCHOOL_CODES = NON_ENGINEERING_SCHOOLS.map((school) =>school.code);
const SCHOOL_VISUALS = {
 SoCM: { icon: "CM", color: "#14b8a6", bg: "#ecfeff" },
 SoMCS: { icon: "MC", color: "#6366f1", bg: "#eef2ff" },
 SoD: { icon: "DS", color: "#ec4899", bg: "#fdf2f8" },
 CioD: { icon: "DS", color: "#ec4899", bg: "#fdf2f8" },
 SoAA: { icon: "AA", color: "#7c3aed", bg: "#f3e8ff" },
};

// --- Helpers ------------------------------------------------------------------
const reviewerMaxScoresFromSubmitted = (summary) =>({
 partA: n(summary.partAMax) + 25,
 partB: n(summary.partBMax),
 grand: n(summary.grandMax) + 25,
});
const preserveScrollAfterStateUpdate = (update) =>{
 const x = window.scrollX || 0;
 const y = window.scrollY || 0;
 update();
 requestAnimationFrame(() =>window.scrollTo(x, y));
};

function DeanInput({ val, onChange, max, disabled = false }) {
 return (
<input type="number" min="0" step="0.5" value={val ?? ""}
 max={max}
 disabled={disabled}
 onChange={e =>onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
 style={{ width: 58, textAlign: "center", border: "1.5px solid #7c3aed", borderRadius: 5, padding: "3px 5px", fontSize: 11, fontFamily: "inherit", outline: "none", background: disabled ? "#f1f5f9" : "#faf5ff", cursor: disabled ? "not-allowed" : "text" }}
 />
 );
}
function SelfInput({ val, onChange, max }) {
 return (
<input type="number" min="0" step="0.5" value={val ?? ""}
 max={max}
 onChange={e =>onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
 style={{ width: 58, textAlign: "center", border: "1.5px solid #10b981", borderRadius: 5, padding: "3px 5px", fontSize: 11, fontFamily: "inherit", outline: "none", background: "#f0fff8" }}
 />
 );
}
// --- Faculty Form in HOD Review Mode -----------------------------------------
function FacultyReviewForm({ faculty, hodData, setHodData, sectionView = "partA" }) {
 const set = (section, idx, field, val) =>{
 setHodData(prev =>{
 const updated = { ...prev };
 if (!updated[section]) updated[section] = JSON.parse(JSON.stringify(faculty[section] || []));
 if (idx === null) { updated[section] = { ...updated[section], [field]: val }; }
 else { updated[section] = updated[section].map((r, i) =>i === idx ? { ...r, [field]: val } : r); }
 return updated;
 });
 };
 const setScalar = (key, val) =>setHodData(prev =>({ ...prev, [key]: val }));

 const get = (section, idx, field) =>{
 if (hodData[section]) {
 const s = hodData[section];
 return idx === null ? (s[field] ?? faculty[section]?.[field] ?? "") : (s[idx]?.[field] ?? faculty[section]?.[idx]?.[field] ?? "");
 }
 return idx === null ? (faculty[section]?.[field] ?? "") : (faculty[section]?.[idx]?.[field] ?? "");
 };
 const getS = (key) =>hodData[key] ?? faculty[key] ?? "";

 const info = mergeFacultyInfo(faculty.info, faculty);
 const { lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, docs } = faculty;

 const rows = (arr) =>arr && arr.length >0 ? arr : [{}];

 return (
<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
 {/* HOD Review Banner */}
<div style={{ background: "linear-gradient(90deg,#312e81,#4338ca)", color: "#e0e7ff", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
<span style={{ fontSize: 18 }}></span>
<div>
<strong>HOD Review Mode</strong>- Faculty data is read-only. Only<span style={{ color: "#c7d2fe", fontWeight: 700 }}>HOD Score</span>columns are editable. Click<span style={{ color: "#c7d2fe" }}>View Doc</span>links to open uploaded files.
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
 {/* -- PART A -- */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#dbeafe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART A - Teaching & Academic Activities</div>

 {/* A1: Lectures */}
<SC title="A1. Lectures / Tutorials / Practicals (Max 50)" accent="#6366f1">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Semester</th><th style={TH}>Course Code / Name</th>
<th style={TH}>Classes (as per course structure)</th><th style={TH}>Classes Actually Conducted</th>
<th style={TH}>View Docs</th>
<th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("lectures", i, "hod")} onChange={v =>set("lectures", i, "hod", v)} /></td>
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
<th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(courseFile).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.course} /></td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.details} center /></td>
<td style={TDS}><RO val={courseFileRowScore(r) ? String(courseFileRowScore(r)) : ""} center /></td>
<td style={TDS_HOD}><HodInput val={get("courseFile", i, "hod")} onChange={v =>set("courseFile", i, "hod", v)} max={SCORE_LIMITS.courseFileRow} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* A3: Innovative Teaching */}
<SC title="A3. Innovative Teaching-Learning (Max 10)" accent="#8b5cf6">
<table style={T}>
<thead><tr>
<th style={TH}>Method</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
<tr>
<td style={TD}>Innovative / participatory teaching methods used</td>
<td style={TDS}><RO val={faculty.innovScore} center /></td>
<td style={TDS_HOD}><HodInput val={getS("innovHod")} onChange={v =>setScalar("innovHod", v)} /></td>
</tr>
</tbody>
</table>
</SC>

 {/* A4: Projects */}
 {faculty.sectionApplicability?.projects !== "notApplicable" &&<SC title="A4. Projects (Max 10)" accent="#8b5cf6">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Project Type</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(projects).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDV}><ViewDocsCell docKey={`proj-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, projectGuidanceRowMax(r)) : ""} center /></td>
<td style={TDS_HOD}><HodInput val={get("projects", i, "hod")} max={projectGuidanceRowMax(r)} onChange={v =>set("projects", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(quals).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDV}><ViewDocsCell docKey={`qual-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("quals", i, "hod")} onChange={v =>set("quals", i, "hod", v)} max={SCORE_LIMITS.qualificationRow} /></td>
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
<th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("feedback", i, "hod")} onChange={v =>set("feedback", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(deptActs).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.activity} /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`dept-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("deptActs", i, "hod")} onChange={v =>set("deptActs", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(uniActs).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.activity} /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`uni-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("uniActs", i, "hod")} onChange={v =>set("uniActs", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score (Max 5)</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(society).map((r, i) =>(
<tr key={i} style={societyRowLocked(r) ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`soc-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? societyRowScore(r) : ""} center /></td>
<td style={TDS_HOD}><HodInput val={societyRowLocked(r) ? "0" : get("society", i, "hod")} max={SCORE_LIMITS.societyRow} disabled={societyRowLocked(r)} onChange={v =>set("society", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(industry).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.name} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`ind-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("industry", i, "hod")} onChange={v =>set("industry", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* G: ACR */}
<SC title="G. Annual Confidential Report (Max 25)" accent="#ef4444">
<div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>ACR is assessed by HOD only - faculty does not fill scores.</div>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Parameter</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(acr).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TDS_HOD}><HodInput val={String(get("acr", i, "hod") ?? "").trim() ? clampScore(get("acr", i, "hod"), SCORE_LIMITS.acrRow) : ""} max={SCORE_LIMITS.acrRow} onChange={v =>set("acr", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

</>)}

 {sectionView === "partB" && (<>
 {/* -- PART B -- */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#ede9fe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART B - Research & Academic Contributions</div>

 {/* B1: Journals */}
<SC title="B1. Research Papers / Journal Publications (Max 120)" accent="#7c3aed">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Journal</th>
<th style={TH}>ISSN</th><th style={TH}>Journal Indexing</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("journals", i, "hod")} onChange={v =>set("journals", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("books", i, "hod")} onChange={v =>set("books", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("ict", i, "hod")} onChange={v =>set("ict", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("research", i, "hod")} onChange={v =>set("research", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>}

<SC title="B4(b). Research / Consultancy Internal Projects (Max 15)" accent="#059669">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Funding Agency</th>
<th style={TH}>Date of Sanction</th><th style={TH}>Grant Amount</th><th style={TH}>Role PI / Co-PI / Consultant</th><th style={TH}>Status</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(projects2).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TD}><RO val={r.role} /></td>
<td style={TD}><RO val={r.status} /></td>
<td style={TDV}><ViewDocsCell docKey={`project2-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("projects2", i, "hod")} max={SCORE_LIMITS.researchInternalProjects} onChange={v =>set("projects2", i, "hod", v)} /></td>
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
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Funding Agency</th>
<th style={TH}>Date of Sanction</th><th style={TH}>Grant Amount</th><th style={TH}>Role PI / Co-PI / Consultant</th><th style={TH}>Status</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(externalProjects).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TD}><RO val={r.role} /></td>
<td style={TD}><RO val={r.status} /></td>
<td style={TDV}><ViewDocsCell docKey={`externalProject-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("externalProjects", i, "hod")} max={SCORE_LIMITS.researchExternalProjects} onChange={v =>set("externalProjects", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("patents", i, "hod")} onChange={v =>set("patents", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("awards", i, "hod")} onChange={v =>set("awards", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("confs", i, "hod")} onChange={v =>set("confs", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B7(a): Proposals */}
<SC title="B7(a). Submitted Research Proposals (Max 10)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title of Proposal</th><th style={TH}>Duration</th>
<th style={TH}>Funding Agency</th><th style={TH}>Grant Amount Requested</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("proposals", i, "hod")} onChange={v =>set("proposals", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {/* B7(b): Product Developed */}
<SC title="B7(b). Product Developed and Used by Students in Lab / Commercialized (Max 10)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Details of Product</th><th style={TH}>Used by Students in Lab / Commercialized</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {rows(products).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.details} /></td>
<td style={TD}><RO val={r.usage} /></td>
<td style={TDV}><ViewDocsCell docKey={`prod-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("products", i, "hod")} onChange={v =>set("products", i, "hod", v)} /></td>
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
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("fdps", i, "hod")} max={SCORE_LIMITS.fdpRow} onChange={v =>set("fdps", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

<SC title="B8(b). Industrial Training" accent="#10b981">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Company</th><th style={TH}>Duration</th><th style={TH}>Nature</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
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
<td style={TDS_HOD}><HodInput val={get("training", i, "hod")} max={SCORE_LIMITS.fdpRow} onChange={v =>set("training", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>
</>)}
</div>
 );
}

// --- Full Review Panel (opened when HOD clicks Review) ------------------------
function ReviewPanel({ faculty, onBack, onSubmit }) {
 const [hodData, setHodData] = useState({});
 const [remarks, setRemarks] = useState(faculty.hodRemarks || "");
 const [sectionView, setSectionView] = useState("partA");

 // Compute HOD total from hodData
 const calcHodScore = () =>{
 const get = (section, idx, field) =>{
 if (hodData[section]) {
 const s = hodData[section];
 return idx === null ? n(s[field]) : n(s[idx]?.[field]);
 }
 return idx === null ? n(faculty[section]?.[field]) : n(faculty[section]?.[idx]?.[field]);
 };
 const getS = (key) =>n(hodData[key] ?? faculty[key]);

 const lectureReviewRows = (faculty.lectures || []).map((row, i) =>({
 ...row,
 hod: hodData.lectures?.[i]?.hod ?? row.hod ?? "",
 }));
 const courseFileReviewRows = (faculty.courseFile || []).map((row, i) =>({
 ...row,
 hod: hodData.courseFile?.[i]?.hod ?? row.hod ?? "",
 }));
 const lec = reviewSectionScore("lectures", lectureReviewRows, 50, "hod");
 const cf = reviewSectionScore("courseFile", courseFileReviewRows, 20, "hod");
 const innov = getS("innovHod");
 const proj = faculty.sectionApplicability?.projects === "notApplicable" ? 0 : (faculty.projects || []).reduce((a, _, i) =>a + get("projects", i, "hod"), 0);
 const qual = (faculty.quals || []).reduce((a, _, i) =>a + get("quals", i, "hod"), 0);
 const feedbackReviewRows = (faculty.feedback || []).map((row, i) =>({
 ...row,
 hod: hodData.feedback?.[i]?.hod ?? row.hod ?? "",
 }));
 const fb = reviewSectionScore("feedback", feedbackReviewRows, 10, "hod");
 const dept = (faculty.deptActs || []).reduce((a, _, i) =>a + get("deptActs", i, "hod"), 0);
 const uni = (faculty.uniActs || []).reduce((a, _, i) =>a + get("uniActs", i, "hod"), 0);
 const soc = (faculty.society || []).reduce((a, row, i) =>a + (societyRowLocked(row) ? 0 : get("society", i, "hod")), 0);
 const ind = (faculty.industry || []).reduce((a, _, i) =>a + get("industry", i, "hod"), 0);
 const acrT = (faculty.acr || []).reduce((a, _, i) =>a + clampScore(get("acr", i, "hod"), SCORE_LIMITS.acrRow), 0);
 const partA = lec + cf + innov + proj + qual + fb + dept + uni + soc + ind + acrT;

 const jour = (faculty.journals || []).reduce((a, _, i) =>a + get("journals", i, "hod"), 0);
 const bk = (faculty.books || []).reduce((a, _, i) =>a + get("books", i, "hod"), 0);
 const ictT = (faculty.ict || []).reduce((a, _, i) =>a + get("ict", i, "hod"), 0);
 const res = faculty.sectionApplicability?.research === "notApplicable" ? 0 : (faculty.research || []).reduce((a, _, i) =>a + get("research", i, "hod"), 0);
 const resProjects = clampScore((faculty.projects2 || []).reduce((a, _, i) =>a + get("projects2", i, "hod"), 0), SCORE_LIMITS.researchInternalProjects);
 const externalResProjects = clampScore((faculty.externalProjects || []).reduce((a, _, i) =>a + get("externalProjects", i, "hod"), 0), SCORE_LIMITS.researchExternalProjects);
 const pat = (faculty.patents || []).reduce((a, _, i) =>a + get("patents", i, "hod"), 0);
 const awd = (faculty.awards || []).reduce((a, _, i) =>a + get("awards", i, "hod"), 0);
 const conf = (faculty.confs || []).reduce((a, _, i) =>a + get("confs", i, "hod"), 0);
 const prop = (faculty.proposals || []).reduce((a, _, i) =>a + get("proposals", i, "hod"), 0);
 const prod = (faculty.products || []).reduce((a, _, i) =>a + get("products", i, "hod"), 0);
 const fdp = clampScore((faculty.fdps || []).reduce((a, _, i) =>a + clampScore(get("fdps", i, "hod"), SCORE_LIMITS.fdpRow), 0), 10);
 const train = clampScore((faculty.training || []).reduce((a, _, i) =>a + clampScore(get("training", i, "hod"), SCORE_LIMITS.fdpRow), 0), 10);
 const b8 = clampScore(fdp + train, 10);
 const partB = jour + bk + ictT + res + resProjects + externalResProjects + pat + awd + conf + prop + prod + b8;

 return { partA, partB, total: partA + partB };
 };

 const { partA, partB, total } = calcHodScore();
 const g = grade(total, 575);
 const facultySummary = standardSubmittedScoreSummary(faculty, {
 partA: faculty.lectures?.reduce((a, r) =>a + n(r.score), 0) || 0,
 partB: faculty.journals?.reduce((a, r) =>a + n(r.score), 0) || 0,
 });

 return (
<div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100%" }}>
 {/* Header */}
<div style={{ background: "#0f172a", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16, borderRadius: 10 }}>
<button onClick={onBack} style={{ background: "#1e293b", border: "none", color: "#94a3b8", cursor: "pointer", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontFamily: "inherit" }}>Back</button>
<Avatar initials={faculty.avatar} color={faculty.avatarColor} size={40} />
<div style={{ flex: 1 }}>
<div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{faculty.name}</div>
<div style={{ color: "#64748b", fontSize: 11 }}>{faculty.designation} - {faculty.employeeId}</div>
</div>
<div style={{ display: "flex", gap: 10 }}>
<div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>HOD Part A</div>
<div style={{ color: "#818cf8", fontWeight: 800, fontSize: 16 }}>{partA.toFixed(1)}</div>
</div>
<div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
<div style={{ color: "#94a3b8", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>HOD Part B</div>
<div style={{ color: "#38bdf8", fontWeight: 800, fontSize: 16 }}>{partB.toFixed(1)}</div>
</div>
<div style={{ background: g.bg, border: `2px solid ${g.color}40`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
<div style={{ color: g.color, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>HOD Total</div>
<div style={{ color: g.color, fontWeight: 800, fontSize: 16 }}>{total.toFixed(1)}<span style={{ fontSize: 10, color: "#94a3b8" }}>/575</span></div>
</div>
</div>
</div>

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
<FacultyReviewForm faculty={faculty} hodData={hodData} setHodData={setHodData} sectionView={sectionView} />
 )}

 {sectionView === "summary" && (
<div style={{ background: "#fff", borderRadius: 10, padding: "22px 24px", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
<h3 style={{ margin: "0 0 16px", color: "#0f172a", fontSize: 15 }}>HOD Remarks & Final Submission</h3>

 {/* Score Summary */}
<table style={{ ...T, marginBottom: 18 }}>
<thead><tr>
<th style={TH}>Section</th><th style={TH}>Max</th>
<th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
</tr></thead>
<tbody>
 {[
 ["Part A - Teaching & Activities", facultySummary.partAMax, facultySummary.partA, partA],
 ["Part B - Research & Contributions", facultySummary.partBMax, facultySummary.partB, partB],
 ].map(([label, max, fac, hod]) =>(
<tr key={label}>
<td style={TD}>{label}</td>
<td style={TDC}>{max}</td>
<td style={TDS}>{fac.toFixed(1)}</td>
<td style={{ ...TDS_HOD, fontWeight: 700, color: "#312e81" }}>{hod.toFixed(1)}</td>
</tr>
 ))}
<tr style={{ background: "#d1fae5", fontWeight: 700 }}>
<td style={TD}>Grand Total</td>
<td style={TDC}>{facultySummary.grandMax}</td>
<td style={TDS}>{facultySummary.total.toFixed(1)}</td>
<td style={{ ...TDS_HOD, color: "#065f46", fontSize: 14 }}>{total.toFixed(1)}</td>
</tr>
</tbody>
</table>

<label style={{ fontWeight: 700, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>HOD Remarks</label>
<textarea value={remarks} onChange={e =>setRemarks(e.target.value)} rows={4}
 placeholder="Enter your remarks, observations, and recommendations for this faculty member..."
 style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 7, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: 16 }} />

<div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
<button onClick={onBack} style={{ padding: "9px 22px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
<button onClick={() =>onSubmit(faculty.id, total, remarks)}
 disabled={!remarks.trim()}
 style={{ padding: "10px 28px", background: remarks.trim() ? "#059669" : "#64748b", color: "#fff", border: "none", borderRadius: 7, cursor: remarks.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
 ? Submit HOD Review
</button>
</div>
</div>
 )}
</div>
 );
}

const DEAN_REVIEW_PART_A_KEYS = ["lectures", "courseFile", "projects", "quals", "feedback", "deptActs", "uniActs", "society", "industry", "acr"];
const DEAN_REVIEW_PART_B_KEYS = ["journals", "books", "ict", "research", "projects2", "externalProjects", "patents", "awards", "confs", "proposals", "products", "fdps", "training"];
const DEAN_REVIEW_ARRAY_KEYS = [...DEAN_REVIEW_PART_A_KEYS, ...DEAN_REVIEW_PART_B_KEYS];
const REVIEW_SCORE_FIELDS = ["hod", "director", "dean", "vc"];
const preserveSavedReviewScores = (form = {}, source = {}) =>{
 const merged = { ...form };
 merged.info = mergeFacultyInfo(form.info, source, form);
 DEAN_REVIEW_ARRAY_KEYS.forEach((key) =>{
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
const DEAN_SECTION_MAX = { lectures: 50, courseFile: 20, projects: 10, quals: 10, feedback: 10, deptActs: 20, uniActs: 30, society: 10, industry: 5, acr: 25, journals: 120, books: 50, ict: 20, research: 30, projects2: SCORE_LIMITS.researchInternalProjects, externalProjects: SCORE_LIMITS.researchExternalProjects, patents: 40, awards: 10, confs: 30, proposals: 10, products: 10, fdps: 10, training: 10 };
const DEAN_ROW_MAX = { courseFile: () =>SCORE_LIMITS.courseFileRow, projects: projectGuidanceRowMax, quals: () =>SCORE_LIMITS.qualificationRow, feedback: () =>10, society: () =>SCORE_LIMITS.societyRow, acr: () =>SCORE_LIMITS.acrRow, research: researchGuidanceRowMax, fdps: () =>SCORE_LIMITS.fdpRow, training: () =>SCORE_LIMITS.fdpRow };

const deanScorePayload = (approval, deanData) =>{
 const payload = {};

 DEAN_REVIEW_ARRAY_KEYS.forEach((key) =>{
 if (approval.sectionApplicability?.[key] === "notApplicable") {
 payload[key] = [];
 return;
 }
 const rows = Array.isArray(approval[key]) ? approval[key] : [];
 payload[key] = rows.map((row, index) =>({
 ...row,
 dean: key === "society" && societyRowLocked(row)
 ? "0"
 : clampReviewScore(key, row, deanData[key]?.[index]?.dean ?? row.dean ?? "", DEAN_SECTION_MAX[key] || 0),
 }));
 });

 const innovRows = Array.isArray(approval.innovRows) ? approval.innovRows : [];
 const reviewInnovRows = Array.isArray(deanData.innovRows) ? deanData.innovRows : [];
 const mergedInnovRows = innovRows.map((row, index) =>({
 ...row,
 dean: clampReviewScore("innovRows", row, reviewInnovRows[index]?.dean ?? row.dean ?? "", 10),
 }));
 const innovTotal = reviewSectionScore("innovRows", mergedInnovRows, 10, "dean");
 payload.innovRows = mergedInnovRows;
 payload.innovativeTeaching = {
 dean: innovTotal ? String(innovTotal) : deanData.innovativeTeaching?.dean ?? approval.innovDean ?? "",
 };

 return payload;
};

const sumDeanRows = (payload, keys) =>
 keys.reduce((total, key) =>{
 if (key === "lectures" || key === "courseFile" || key === "feedback") return total + reviewSectionScore(key, payload[key] || [], DEAN_SECTION_MAX[key] || 0, "dean");
 return total + clampScore((payload[key] || []).reduce((sum, row) =>{
 if (key === "society" && societyRowLocked(row)) return sum;
 if (!rowHasReviewableData(key, row)) return sum;
 const rowMax = DEAN_ROW_MAX[key]?.(row);
 return sum + (rowMax ? clampScore(row.dean, rowMax) : n(row.dean));
 }, 0), DEAN_SECTION_MAX[key] || 0);
 }, 0);

const deanScoreTotals = (payload) =>{
 const innovativeScore = Array.isArray(payload.innovRows) && payload.innovRows.length
 ? reviewSectionScore("innovRows", payload.innovRows, 10, "dean")
 : clampScore(payload.innovativeTeaching?.dean, 10);
 const partA = clampScore(sumDeanRows(payload, DEAN_REVIEW_PART_A_KEYS) + innovativeScore, 200);
 const b8 = clampScore(sumDeanRows(payload, ["fdps"]) + sumDeanRows(payload, ["training"]), 10);
 const partBWithoutB8 = sumDeanRows(payload, DEAN_REVIEW_PART_B_KEYS.filter(k =>k !== "fdps" && k !== "training"));
 const cappedPartB = clampScore(partBWithoutB8 + b8, 375);
 return { partA, partB: cappedPartB, total: clampScore(partA + cappedPartB, 575) };
};

function DeanScoreCell({ sectionKey, index, row, deanData, setDeanData }) {
 const value = deanData[sectionKey]?.[index]?.dean ?? row.dean ?? "";
 const maxForRow = DEAN_ROW_MAX[sectionKey]?.(row) || DEAN_SECTION_MAX[sectionKey];
 const societyLocked = sectionKey === "society" && societyRowLocked(row);
 const locked = societyLocked || !rowHasReviewableData(sectionKey, row);
 const displayValue = societyLocked ? "0" : locked ? "" : String(value ?? "").trim() ? clampScore(value, maxForRow) : "";

 const update = (nextValue) =>{
 const clampedValue = clampReviewScore(sectionKey, row, nextValue, DEAN_SECTION_MAX[sectionKey] || 0);
 preserveScrollAfterStateUpdate(() =>setDeanData((prev) =>{
 const baseRows = Array.isArray(prev[sectionKey]) ? prev[sectionKey] : [];
 const updatedRows = [...baseRows];
 updatedRows[index] = { ...(updatedRows[index] || row), dean: clampedValue };
 return { ...prev, [sectionKey]: updatedRows };
 }));
 };

 return<DeanInput val={displayValue} max={maxForRow} disabled={locked} onChange={update} />;
}

function DeanInnovativeScoreCell({ row, index, rows, deanData, setDeanData }) {
 const value = deanData.innovRows?.[index]?.dean ?? row.dean ?? "";
 const locked = !rowHasReviewableData("innovRows", row);
 const update = (nextValue) =>{
 const clampedValue = clampReviewScore("innovRows", row, nextValue, 10);
 preserveScrollAfterStateUpdate(() =>setDeanData((prev) =>{
 const baseRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : rows;
 const updatedRows = [...baseRows];
 updatedRows[index] = { ...(updatedRows[index] || row), dean: clampedValue };
 const totalRows = updatedRows.map((item, rowIndex) =>({ ...item, ...(rowIndex === index ? row : {}) }));
 const total = reviewSectionScore("innovRows", totalRows, 10, "dean");
 return {
 ...prev,
 innovRows: updatedRows,
 innovativeTeaching: { ...(prev.innovativeTeaching || {}), dean: total ? String(total) : "" },
 };
 }));
 };
 return (
<DeanInput
 val={String(value ?? "").trim() ? clampScore(value, SCORE_LIMITS.innovativeRow) : ""}
 max={SCORE_LIMITS.innovativeRow}
 disabled={locked}
 onChange={update}
 />
 );
}

const DeanReviewTableContext = createContext(null);

function ReviewTable({ title, accent = "#4c1d95", sectionKey, columns, docPrefix, rows: sectionRows }) {
 const ctx = useContext(DeanReviewTableContext);
 if (!ctx || ctx.approval.sectionApplicability?.[sectionKey] === "notApplicable") return null;
 const dataRows = sectionRows || ctx.rows(sectionKey);
 const hasDocs = Boolean(docPrefix);
 const totalColumns = 1 + columns.length + (hasDocs ? 1 : 0) + 2;

 return (
<SC title={title} accent={accent}>
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead>
<tr>
<th style={TH}>SN</th>
 {columns.map((column) =><th key={column.label} style={TH}>{column.label}</th>)}
 {hasDocs &&<th style={TH}>View Docs</th>}
 {ctx.scoreHeaders}
</tr>
</thead>
<tbody>
 {dataRows.length ? dataRows.map((row, index) =>(
<tr key={`${sectionKey}-${index}`} style={sectionKey === "society" && societyRowLocked(row) ? { background: "#f1f5f9", opacity: 0.65 } : index % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{index + 1}</td>
 {columns.map((column) =>(
<td key={column.label} style={column.center ? TDC : TD}>
 {ctx.cell(column.render(row), column.center)}
</td>
 ))}
 {hasDocs &&<td style={TDV}><ViewDocsCell docKey={`${docPrefix}-${index}`} docs={ctx.docs} /></td>}
<td style={TDS}>{ctx.cell(sectionKey === "research" ? (row.degree || row.name || row.thesis || row.score ? researchGuidanceScore(row).toFixed(1) : "") : sectionKey === "society" ? (String(row.score ?? "").trim() ? societyRowScore(row) : "") : row.score, true)}</td>
<td style={TDS_DEAN}><DeanScoreCell sectionKey={sectionKey} index={index} row={row} deanData={ctx.deanData} setDeanData={ctx.setDeanData} /></td>
</tr>
 )) : (
<tr>
<td style={{ ...TDC, color: "#94a3b8", fontStyle: "italic" }} colSpan={totalColumns}>
 No submitted rows for this table.
</td>
</tr>
 )}
</tbody>
</table>
</div>
</SC>
 );
}

function DeanReviewScoreForm({ approval, deanData, setDeanData, sectionView = "partA" }) {
 const info = mergeFacultyInfo(approval.info, approval);
 const docs = approval.docs || {};
 const rows = (key) =>Array.isArray(approval[key]) ? approval[key] : [];
 const cell = (value, center = false) =><RO val={value} center={center} />;
 const innovativeRows = Array.isArray(approval.innovRows) && approval.innovRows.length
 ? approval.innovRows
 : [{ method: approval.innovDetails || "Innovative / participatory teaching methods", details: approval.innovDetails || "", score: approval.innovScore || "" }];

 const scoreHeaders = (
<>
<th style={TH}>Faculty Score</th>
<th style={TH_DEAN}>Dean Score</th>
</>
 );

 return (
<DeanReviewTableContext.Provider value={{ approval, deanData, docs, rows, scoreHeaders, setDeanData, cell }}>
<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
<div style={{ background: "linear-gradient(90deg,#4c1d95,#7c3aed)", color: "#ede9fe", borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: 12 }}>
<strong>Dean Review Mode</strong>- Faculty self-scores are read-only. Only the Dean score column is editable.
</div>

<SC title="Faculty Information" accent="#4c1d95">
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
<tbody>
 {[["Name", info.name || approval.name], ["Qualification", info.qual], ["Designation", info.desig || approval.designation], ["Academic Year", approval.academicYear || info.ay]].map(([label, value]) =>(
<tr key={label}>
<td style={{ padding: "6px 10px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", width: "35%" }}>{label}</td>
<td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", color: "#334155" }}>{value || "-"}</td>
</tr>
 ))}
</tbody>
</table>
</SC>

 {sectionView === "partA" && (<>
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#dbeafe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>
 Part A - Teaching & Academic Activities
</div>

<ReviewTable
 title="A1. Lectures / Tutorials / Practicals"
 accent="#6366f1"
 sectionKey="lectures"
 docPrefix="lec"
 columns={[
 { label: "Semester", render: (r) =>r.sem },
 { label: "Course Code / Name", render: (r) =>r.code },
 { label: "Classes (as per course structure)", render: (r) =>r.planned, center: true },
 { label: "Classes Actually Conducted", render: (r) =>r.conducted, center: true },
 ]}
 />

<ReviewTable
 title="A2. Course File"
 accent="#6366f1"
 sectionKey="courseFile"
 docPrefix="courseFile"
 columns={[
 { label: "Course / Paper", render: (r) =>r.course },
 { label: "Program & Semester", render: (r) =>r.title },
 { label: "Details", render: (r) =>r.details },
 ]}
 />

<SC title="A3. Innovative Teaching-Learning" accent="#8b5cf6">
<table style={T}>
<thead>
<tr>
<th style={TH}>SN</th>
<th style={TH}>Method</th>
<th style={TH}>Details</th>
<th style={TH}>View Docs</th>
<th style={TH}>Self Score</th>
<th style={TH_DEAN}>Dean</th>
</tr>
</thead>
<tbody>
 {innovativeRows.map((row, index) =>(
<tr key={`innov-${index}`}>
<td style={TDC}>{index + 1}</td>
<td style={TD}><RO val={row.method || approval.innovDetails} /></td>
<td style={TD}><RO val={row.details} /></td>
<td style={TDV}><ViewDocsCell docKey={index === 0 ? ["innov", "innov-0"] : `innov-${index}`} docs={docs} /></td>
<td style={TDS}><RO val={String(row.score ?? "").trim() ? clampScore(row.score, SCORE_LIMITS.innovativeRow) : ""} center /></td>
<td style={TDS_DEAN}><DeanInnovativeScoreCell row={row} index={index} rows={innovativeRows} deanData={deanData} setDeanData={setDeanData} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>

<ReviewTable
 title="A4. Projects Guided"
 accent="#8b5cf6"
 sectionKey="projects"
 docPrefix="proj"
 columns={[{ label: "Project Type / Description", render: (r) =>r.label }]}
 />

<ReviewTable
 title="A5. Qualification Enhancement"
 accent="#8b5cf6"
 sectionKey="quals"
 docPrefix="qual"
 columns={[{ label: "Description", render: (r) =>r.label }]}
 />

<ReviewTable
 title="A6. Student Feedback"
 accent="#0ea5e9"
 sectionKey="feedback"
 columns={[
 { label: "Course", render: (r) =>r.code },
 { label: "First Feedback(%)", render: (r) =>r.fb1, center: true },
 { label: "Second Feedback(%)", render: (r) =>r.fb2, center: true },
 { label: "Average", render: (r) =>r.fb1 && r.fb2 ? ((n(r.fb1) + n(r.fb2)) / 2).toFixed(2) : "", center: true },
 ]}
 />

<ReviewTable
 title="A7. Department Activities"
 accent="#f59e0b"
 sectionKey="deptActs"
 docPrefix="dept"
 columns={[
 { label: "Activity", render: (r) =>r.activity },
 { label: "Nature", render: (r) =>r.nature },
 ]}
 />

<ReviewTable
 title="A8. University Activities"
 accent="#f59e0b"
 sectionKey="uniActs"
 docPrefix="uni"
 columns={[
 { label: "Activity", render: (r) =>r.activity },
 { label: "Nature", render: (r) =>r.nature },
 ]}
 />

<ReviewTable
 title="A9. Contribution to Society"
 accent="#10b981"
 sectionKey="society"
 docPrefix="soc"
 columns={[
 { label: "Activity", render: (r) =>r.label },
 { label: "Details", render: (r) =>r.details },
 ]}
 />

<ReviewTable
 title="A10. Industry Connect"
 accent="#10b981"
 sectionKey="industry"
 docPrefix="ind"
 columns={[
 { label: "Industry Name", render: (r) =>r.name },
 { label: "Details", render: (r) =>r.details },
 ]}
 />

<ReviewTable
 title="A11. Annual Confidential Report (ACR)"
 accent="#ef4444"
 sectionKey="acr"
 columns={[{ label: "Parameter", render: (r) =>r.label }]}
 />

</>)}
 {sectionView === "partB" && (<>
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#ede9fe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>
 Part B - Research & Academic Contributions
</div>

<ReviewTable
 title="B1. Research Papers / Journal Publications"
 accent="#7c3aed"
 sectionKey="journals"
 docPrefix="jour"
 columns={[
 { label: "Title", render: (r) =>r.title },
 { label: "Journal", render: (r) =>r.journal },
 { label: "ISSN", render: (r) =>r.issn, center: true },
 { label: "Journal Indexing", render: (r) =>r.index, center: true },
 ]}
 />

<ReviewTable
 title="B2. Books / Book Chapters"
 accent="#7c3aed"
 sectionKey="books"
 docPrefix="book"
 columns={[
 { label: "Title with Page Nos.", render: (r) =>r.title },
 { label: "Book Title, Editor & Publisher", render: (r) =>r.book },
 { label: "ISSN / ISBN No.", render: (r) =>r.issn, center: true },
 { label: "Type of Publisher", render: (r) =>r.pub },
 { label: "Co-authors (from DYPIU)", render: (r) =>r.coauth },
 { label: "First Author", render: (r) =>r.first, center: true },
 ]}
 />

<ReviewTable
 title="B3. ICT / E-Content / Pedagogy"
 accent="#0ea5e9"
 sectionKey="ict"
 docPrefix="ict"
 columns={[
 { label: "Title", render: (r) =>r.title },
 { label: "Description", render: (r) =>r.desc },
 { label: "Type", render: (r) =>r.type },
 { label: "Quadrants", render: (r) =>r.quad, center: true },
 ]}
 />

<ReviewTable
 title="B4(a). Research Guidance"
 accent="#059669"
 sectionKey="research"
 docPrefix="res"
 columns={[
 { label: "Degree", render: (r) =>r.degree, center: true },
 { label: "Student Name", render: (r) =>r.name },
 { label: "Thesis Title / Status", render: (r) =>r.thesis },
 ]}
 />

<ReviewTable
 title="B4(b). Research / Consultancy Internal Projects"
 accent="#059669"
 sectionKey="projects2"
 docPrefix="project2"
 columns={[
 { label: "Title", render: (r) =>r.title },
 { label: "Funding Agency", render: (r) =>r.agency },
 { label: "Date of Sanction", render: (r) =>r.date, center: true },
 { label: "Grant Amount", render: (r) =>r.amount, center: true },
 { label: "Role PI / Co-PI / Consultant", render: (r) =>r.role },
 { label: "Status", render: (r) =>r.status },
 ]}
 />

<ReviewTable
 title="B4(c). Research / Consultancy External Projects"
 accent="#059669"
 sectionKey="externalProjects"
 docPrefix="externalProject"
 columns={[
 { label: "Title", render: (r) =>r.title },
 { label: "Funding Agency", render: (r) =>r.agency },
 { label: "Date of Sanction", render: (r) =>r.date, center: true },
 { label: "Grant Amount", render: (r) =>r.amount, center: true },
 { label: "Role PI / Co-PI / Consultant", render: (r) =>r.role },
 { label: "Status", render: (r) =>r.status },
 ]}
 />

<ReviewTable
 title="B5(a). Patents (IPR)"
 accent="#f97316"
 sectionKey="patents"
 docPrefix="pat"
 columns={[
 { label: "Title", render: (r) =>r.title },
 { label: "National / International", render: (r) =>r.type, center: true },
 { label: "Date", render: (r) =>r.date, center: true },
 { label: "Status", render: (r) =>r.status, center: true },
 { label: "File No.", render: (r) =>r.fileNo, center: true },
 ]}
 />

<ReviewTable
 title="B5(b). Awards"
 accent="#f97316"
 sectionKey="awards"
 docPrefix="awd"
 columns={[
 { label: "Award Title", render: (r) =>r.title },
 { label: "Date", render: (r) =>r.date, center: true },
 { label: "Agency", render: (r) =>r.agency },
 { label: "Level", render: (r) =>r.level },
 ]}
 />

<ReviewTable
 title="B6. Invited Lectures / Resource Person / Paper Presentations"
 accent="#6366f1"
 sectionKey="confs"
 docPrefix="conf"
 columns={[
 { label: "Title / Session", render: (r) =>r.title },
 { label: "Type", render: (r) =>r.type },
 { label: "Organizer", render: (r) =>r.org },
 { label: "Level", render: (r) =>r.level },
 ]}
 />

<ReviewTable
 title="B7(a). Submitted Research Proposals"
 accent="#0ea5e9"
 sectionKey="proposals"
 docPrefix="prop"
 columns={[
 { label: "Title of Proposal", render: (r) =>r.title },
 { label: "Duration", render: (r) =>r.duration, center: true },
 { label: "Funding Agency", render: (r) =>r.agency },
 { label: "Grant Amount Requested", render: (r) =>r.amount, center: true },
 ]}
 />

<ReviewTable
 title="B7(b). Product Developed and Used by Students in Lab / Commercialized"
 accent="#0ea5e9"
 sectionKey="products"
 docPrefix="prod"
 columns={[
 { label: "Details of Product", render: (r) =>r.details },
 { label: "Used by Students in Lab / Commercialized", render: (r) =>r.usage },
 ]}
 />

<ReviewTable
 title="B8(a). Self Development - FDP / Workshops"
 accent="#10b981"
 sectionKey="fdps"
 docPrefix="fdp"
 columns={[
 { label: "Program", render: (r) =>r.program },
 { label: "Duration", render: (r) =>r.duration, center: true },
 { label: "Organizer", render: (r) =>r.org },
 ]}
 />

<ReviewTable
 title="B8(b). Industrial Training"
 accent="#10b981"
 sectionKey="training"
 docPrefix="train"
 columns={[
 { label: "Company", render: (r) =>r.company },
 { label: "Duration", render: (r) =>r.duration, center: true },
 { label: "Nature", render: (r) =>r.nature },
 ]}
 />
</>)}
</div>
</DeanReviewTableContext.Provider>
 );
}

function ApprovalReviewPanel({ approval, approvalType, onBack, onSubmit, readOnly = false }) {
 const [remarks, setRemarks] = useState(approval?.deanRemarks || "");
 const [deanData, setDeanData] = useState({});
 const [sectionView, setSectionView] = useState("partA");
 const [reviewConfirmed, setReviewConfirmed] = useState(false);
 const [draftStatus, setDraftStatus] = useState("");
 const [savingDraft, setSavingDraft] = useState(false);
 const finalisedByVc = isAppraisalFinalisedByVc(approval);
 const pendingThisReviewer = isPendingReviewStatusFor([approval?.status, approval?.workflowStatus, approval?.workflow_status], "dean");
 const reviewLocked = finalisedByVc || readOnly || (!pendingThisReviewer && (approval?.status === "Reviewed" || /Dean\s*(Reviewed|Approved|Rejected)/i.test(approval?.status || "")));
 const canReject = canReviewerRejectProfile("dean", approval);
 const subjectEmail = approval?.email || approval?.faculty_email || approval?.facultyEmail;
 const academicYear = approval?.academicYear || approval?.academic_year || approval?.info?.ay || APP_INFO.DEFAULT_AY || "2025-2026";
 const sectionScores = deanScorePayload(approval, deanData);
 const deanScores = deanScoreTotals(sectionScores);
 const selfSummary = standardSubmittedScoreSummary(approval);
 const reviewerMaxScores = reviewerMaxScoresFromSubmitted(selfSummary);
 const hasSavedDeanScores = ["deanPartA", "deanPartB", "deanTotal"].some((key) =>String(approval?.[key] ?? "").trim() !== "");
 const rawDisplayedDeanScores = reviewLocked && hasSavedDeanScores ? {
 partA: String(approval?.deanPartA ?? "").trim() !== "" ? n(approval?.deanPartA) : deanScores.partA,
 partB: String(approval?.deanPartB ?? "").trim() !== "" ? n(approval?.deanPartB) : deanScores.partB,
 total: String(approval?.deanTotal ?? "").trim() !== "" ? n(approval?.deanTotal) : deanScores.total,
 } : deanScores;
 const displayedDeanScores = {
 partA: clampScore(rawDisplayedDeanScores.partA, reviewerMaxScores.partA),
 partB: clampScore(rawDisplayedDeanScores.partB, reviewerMaxScores.partB),
 total: clampScore(rawDisplayedDeanScores.total || rawDisplayedDeanScores.partA + rawDisplayedDeanScores.partB, reviewerMaxScores.grand),
 };
 const titleMap = {
 directorApprovals: "Director's Appraisal Review",
 facultyApprovals: "Faculty's Appraisal Review",
 };
 useEffect(() =>{
 let active = true;
 if (reviewLocked || !subjectEmail) return undefined;
 loadReviewerDraft({ subjectEmail, academicYear, reviewerRole: "dean" })
 .then((draft) =>{
 if (!active || !draft?.payload) return;
 setDeanData(draft.payload.section_scores || {});
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
 reviewerRole: "dean",
 partAScore: displayedDeanScores.partA,
 partBScore: displayedDeanScores.partB,
 totalScore: displayedDeanScores.total,
 remarks,
 sectionScores,
 });
 setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
 } catch (err) {
 console.error("Could not save reviewer draft:", err);
 alert(err?.message || "Unable to save draft.");
 } finally {
 setSavingDraft(false);
 }
 };

 return (
<div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 18px 45px rgba(15,23,42,0.18)", minHeight: "100%" }}>
<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
<button onClick={onBack} style={{ border: "none", background: "#e2e8f0", color: "#0f172a", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>Back</button>
<div>
<div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{titleMap[approvalType]}</div>
<div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{approval.name} - {approval.designation}</div>
</div>
</div>

<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
 {[
 { label: "Employee ID", value: approval.employeeId },
 { label: "Submitted", value: approval.submittedOn },
 { label: "Self Part A", value: `${selfSummary.partA.toFixed(1)} / ${selfSummary.partAMax}` },
 { label: "Self Part B", value: `${selfSummary.partB.toFixed(1)} / ${selfSummary.partBMax}` },
 { label: "Self Total", value: `${selfSummary.total.toFixed(1)} / ${selfSummary.grandMax}` },
 { label: "Dean Total", value: displayedDeanScores.total.toFixed(1) },
 ].map((item) =>(
<div key={item.label} style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 16px" }}>
<div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>{item.label}</div>
<div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{item.value}</div>
</div>
 ))}
</div>
 {finalisedByVc && (
<div style={{ background: "#ecfdf5", border: "1px solid #86efac", color: "#065f46", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
 This appraisal has been finalised by the VC.
</div>
 )}

<div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
 {[["partA", "Part A"], ["partB", "Part B"], ["summary", "Summary"]].map(([id, label]) =>(
<button key={id} onClick={() =>{
 setSectionView(id);
 requestAnimationFrame(() =>{
 window.scrollTo({ top: 0, left: 0, behavior: "auto" });
 });
 }}
 style={{ padding: "7px 18px", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: sectionView === id ? "#4c1d95" : "#e2e8f0", color: sectionView === id ? "#ede9fe" : "#475569" }}>
 {label}
</button>
 ))}
</div>

 {(sectionView === "partA" || sectionView === "partB") && (
<fieldset disabled={reviewLocked} style={{ border: "none", padding: 0, margin: 0 }}>
<DeanReviewScoreForm approval={approval} deanData={deanData} setDeanData={setDeanData} sectionView={sectionView} />
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
<>
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,.06)", marginBottom: 14 }}>
<CompactSummaryCard
 title="Faculty Score"
 subtitle="Faculty submitted score for the non-engineering appraisal form."
 totals={{ partA: selfSummary.partA, partB: selfSummary.partB, total: selfSummary.total }}
 maxScores={{ partA: selfSummary.partAMax, partB: selfSummary.partBMax, grand: selfSummary.grandMax }}
 accent="#0ea5e9"
/>
<SummaryOtherInfoField value={summaryOtherInfoValueFrom(approval)} readOnly rows={4} />
<CompactSummaryCard
 title="Dean Score"
 subtitle="Dean score for the non-engineering appraisal form."
 totals={displayedDeanScores}
 maxScores={reviewerMaxScores}
 accent="#4c1d95"
 remarksTitle="Dean Remarks"
 remarksContent={(
<textarea value={remarks} onChange={(e) =>setRemarks(e.target.value)} rows={4} readOnly={reviewLocked}
 style={{ width: "100%", border: "none", padding: 0, fontFamily: "inherit", fontSize: 12, color: "#334155", resize: "vertical", background: "transparent", outline: "none" }}
 />
 )}
/>
</div>
</>
 )}

 {sectionView === "summary" && !reviewLocked && (
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

 {sectionView === "summary" && (
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
<span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{draftStatus}</span>
<div style={{ display: "flex", gap: 12, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
<button onClick={onBack} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569", fontWeight: 700, cursor: "pointer" }}>{reviewLocked ? "Close" : "Cancel"}</button>
 {!reviewLocked && (
<>
<button
 onClick={handleSaveDraft}
 disabled={savingDraft}
 style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", background: savingDraft ? "#94a3b8" : "#2563eb", color: "#f8fafc", fontWeight: 700, cursor: savingDraft ? "not-allowed" : "pointer" }}
>
 {savingDraft ? "Saving..." : "Save Draft"}
</button>
 {canReject && (
<button
 onClick={() =>{
 if (window.confirm("Reject this appraisal and send it back to the user for editing?")) {
 onSubmit(approval.id, deanScores, remarks, sectionScores, reviewConfirmed, "rejected");
 }
 }}
 disabled={!reviewConfirmed || !remarks.trim()}
 style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", background: (reviewConfirmed && remarks.trim()) ? "#dc2626" : "#94a3b8", color: "#f8fafc", fontWeight: 700, cursor: (reviewConfirmed && remarks.trim()) ? "pointer" : "not-allowed" }}
>
 Reject Form
</button>
 )}
<button onClick={() =>onSubmit(approval.id, deanScores, remarks, sectionScores, reviewConfirmed)} disabled={!reviewConfirmed || !remarks.trim()} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", background: (reviewConfirmed && remarks.trim()) ? "#0f172a" : "#64748b", color: "#f8fafc", fontWeight: 700, cursor: (reviewConfirmed && remarks.trim()) ? "pointer" : "not-allowed" }}>Approve & Forward</button>
</>
 )}
</div>
</div>
 )}
</div>
 );
}

// --- Main Dean Dashboard -------------------------------------------------------
export default function NonEngineeringDeanDashboard() {
 const [activeMainTab, setActiveMainTab] = useState("myAppraisal");
 const [hodAppraisalTab, setHodAppraisalTab] = useState("partA");
 const [reviewingApproval, setReviewingApproval] = useState(null);
 const [reviewLoading, setReviewLoading] = useState(null);

 const [facultyList, setFacultyList] = useState([]);
 const [directorList, setDirectorList] = useState([]);

 useEffect(() =>{
 const loadReviewQueue = async () =>{
 try {
 const items = await fetchReviewQueueForRole({
 reviewerRole: "dean",
 reviewerProfile: profileFromsessionStorage(),
 schoolValues: NON_ENGINEERING_SCHOOL_CODES,
 });
 const schoolOf = (item) =>getSchoolKey(item.school || item.school_name || item.schoolName || "");
 const roleOf = (item) =>(item.appraisalRole || item.appraisal_role || "").toLowerCase();
 const scopedItems = items.filter((item) =>{
 const code = schoolOf(item);
 return NON_ENGINEERING_SCHOOL_CODES.includes(code) || NON_ENGINEERING_SCHOOL_CODES.includes(item.school);
 });
 setFacultyList(scopedItems.filter((item) =>roleOf(item) === "faculty"));
 setDirectorList(scopedItems.filter((item) =>roleOf(item) === "director"));
 } catch (err) {
 console.error("Could not load Non-Engineering Dean review queue:", err);
 setFacultyList([]);
 setDirectorList([]);
 }
 };

 loadReviewQueue();
 }, []);

 const [filterStatus, setFilterStatus] = useState("All");
 const [selectedSchoolCode, setSelectedSchoolCode] = useState("all");
 const [showLogoutModal, setShowLogoutModal] = useState(false);


 const isDeanPending = (item) =>{
 const s = item.status || "";
 if (isPendingReviewStatusFor([s, item.workflowStatus, item.workflow_status], "dean")) return true;
 return s === "pending_dean" ||
 (n(item.deanTotal)<= 0 && !String(item.deanRemarks || "").trim() && s !== "Reviewed" && s !== "pending_vc" && s !== "completed" && !/Dean\s*(Reviewed|Rejected)/i.test(s));
 };
 const isDeanReviewed = (item) =>{
 const s = item.status || "";
 if (isPendingReviewStatusFor([s, item.workflowStatus, item.workflow_status], "dean")) return false;
 return n(item.deanTotal) >0 || String(item.deanRemarks || "").trim() !== "" || s === "Reviewed" || s === "pending_vc" || s === "completed" || /Dean\s*Reviewed/i.test(s);
 };

 const facultyPendingCount = facultyList.filter(isDeanPending).length;
 const facultyReviewedCount = facultyList.filter(isDeanReviewed).length;
 const directorPendingCount = directorList.filter(isDeanPending).length;
 const directorReviewedCount = directorList.filter(isDeanReviewed).length;

 const activeApprovalList = activeMainTab === "directorApprovals"
 ? directorList
 : activeMainTab === "facultyApprovals"
 ? facultyList
 : [];

 const activeSchoolApprovalList = selectedSchoolCode === "all"
 ? activeApprovalList
 : activeApprovalList.filter((item) =>getSchoolKey(item.school) === selectedSchoolCode);

 const pendingCount = activeSchoolApprovalList.filter(isDeanPending).length;

 const reviewedCount = activeSchoolApprovalList.filter(isDeanReviewed).length;

 const filtered = filterStatus === "All"
 ? activeSchoolApprovalList
 : (filterStatus === "Pending Review"
 ? activeSchoolApprovalList.filter(isDeanPending)
 : activeSchoolApprovalList.filter(isDeanReviewed));

 const schoolTabs = [
 { code: "all", label: "All Schools", count: activeApprovalList.length, icon: "All", color: "#0f172a", bg: "#e2e8f0" },
 ...NON_ENGINEERING_SCHOOLS.map((school) =>({
 code: school.code,
 label: school.code,
 count: activeApprovalList.filter((item) =>getSchoolKey(item.school) === school.code).length,
 icon: SCHOOL_VISUALS[school.code]?.icon || school.code.slice(0, 2),
 color: SCHOOL_VISUALS[school.code]?.color || "#334155",
 bg: SCHOOL_VISUALS[school.code]?.bg || "#f1f5f9",
 })),
 ];

 const navItems = [
 { id: "myAppraisal", icon: "", label: "My Appraisal", sub: "Self-assessment form" },
 { id: "directorApprovals", icon: "", label: "Director's Appraisal", sub: `${directorPendingCount} awaiting review`, badge: directorPendingCount },
 { id: "facultyApprovals", icon: "", label: "Faculty's Appraisal", sub: `${facultyPendingCount} awaiting review`, badge: facultyPendingCount },
 { id: "guidelines", icon: "", label: "Guidelines", sub: "Faculty appraisal guidelines AY 2025-26" },
 ];
 const handleSubmitReview = async (id, scores, remarks, sectionScores, reviewConfirmed = false, decision = "approved") =>{
 if (!reviewConfirmed) {
 alert("Please verify and confirm the accuracy declaration before submitting the review.");
 return;
 }
 if (!remarks?.trim()) {
 alert("Remarks are mandatory. Please enter your remarks before submitting the review.");
 return;
 }
 const sourceList = activeMainTab === "facultyApprovals"
 ? facultyList
 : directorList;
 const item = sourceList.find((entry) =>entry.id === id);
 if (!item) return;

 try {
 await submitWorkflowReview({
 subjectEmail: item.email,
 academicYear: item.academicYear || item.academic_year || item.info?.ay || APP_INFO.DEFAULT_AY || "2025-2026",
 reviewerRole: "dean",
 partAScore: scores.partA,
 partBScore: scores.partB,
 totalScore: scores.total,
 remarks,
 sectionScores,
 subjectProfile: item,
 decision,
 });

 const status = decision === "rejected" ? rejectedStatusFor("dean") : reviewedStatusFor("dean");
 const markReviewed = (entry) =>entry.id === id
 ? { ...entry, ...sectionScores, innovDean: sectionScores?.innovativeTeaching?.dean ?? entry.innovDean, status, workflowStatus: status, deanPartA: scores.partA, deanPartB: scores.partB, deanTotal: scores.total, deanRemarks: remarks }
 : entry;

 if (activeMainTab === "facultyApprovals") {
 setFacultyList(prev =>prev.map(markReviewed));
 }
 if (activeMainTab === "directorApprovals") {
 setDirectorList(prev =>prev.map(markReviewed));
 }
 setReviewingApproval(null);
 alert(decision === "rejected" ? "Appraisal rejected and sent back for editing." : "Dean review approved and forwarded to VC.");
 } catch (err) {
 console.error("Could not submit Dean review:", err);
 alert(`Unable to submit Dean review.\n\n${err.message}`);
 }
 };


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
 onTabSelect={(tab) =>{ setActiveMainTab(tab); setReviewingApproval(null); setSelectedSchoolCode("all"); }}
 showSectionSelector={activeMainTab === "myAppraisal"}
 sectionTab={hodAppraisalTab}
 onSectionChange={handleMyAppraisalSectionChange}
 isSectionOpen={isMyAppraisalSectionOpen}
 afterNavItem={{
 id: "myAppraisal",
 content: (
<div style={{ background: "#1e293b", borderRadius: 9, padding: "12px 13px", display: "grid", gap: 8 }}>
<div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.9 }}>Schools Overseen</div>
 {NON_ENGINEERING_SCHOOLS.map((school) =>{
 const visual = SCHOOL_VISUALS[school.code] || {};
 return (
<div key={school.code} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#cbd5e1" }}>
<span style={{ width: 9, height: 9, borderRadius: 2, background: visual.color || "#64748b", display: "inline-block" }} />
<span style={{ color: visual.color || "#cbd5e1", fontWeight: 800 }}>{visual.icon || "-"}</span>
<span>{school.code}</span>
</div>
 );
 })}
</div>
 ),
 wrapperStyle: { display: "grid", gap: 10 },
 }}
 profileSubtitle={`Dean - ${sessionStorage.getItem("department")?.split(" ")[0] || ""}`}
 onLogout={() =>setShowLogoutModal(true)}
 showLogoutSpacer
/>
 )}
>

 {activeMainTab === "myAppraisal" && <StandardMyAppraisal sectionTab={hodAppraisalTab} onSectionTabChange={handleMyAppraisalSectionChange} defaultDesignation={sessionStorage.getItem("role") === "dean" ? "Dean" : ""} defaultAcademicYear={sessionStorage.getItem("academicYear") || "2025-2026"} titleNameFallback="Dean" subtitleSeparator=" - " />}

 {(activeMainTab === "directorApprovals" || activeMainTab === "facultyApprovals") && !reviewingApproval && (
<>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
<div>
<h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>
 {activeMainTab === "directorApprovals" ? "Director's Appraisal" : "Faculty's Appraisal"}
</h1>
<p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 11 }}>{NON_ENGINEERING_SCHOOLS.length} Non-Engineering Schools - AY {info.ay}</p>
</div>
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
<div style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: "#fef3c7", color: "#92400e" }}>{pendingCount} Pending</div>
<div style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: "#d1fae5", color: "#065f46" }}>{reviewedCount} Reviewed</div>
<AppraisalHeaderImage />
</div>
</div>

<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {schoolTabs.map((school) =>{
 const active = selectedSchoolCode === school.code;
 return (
<button
 key={school.code}
 onClick={() =>setSelectedSchoolCode(school.code)}
 style={{
 minWidth: school.code === "all" ? 132 : 112,
 border: "none",
 borderRadius: 8,
 padding: "8px 14px",
 cursor: "pointer",
 fontFamily: "inherit",
 background: active ? school.color : school.bg,
 color: active ? "#fff" : "#334155",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 gap: 8,
 fontSize: 13,
 fontWeight: 900,
 boxShadow: active ? "0 8px 18px rgba(15,23,42,0.16)" : "none",
 }}
 >
<span>{school.icon}</span>
<span>{school.label}</span>
<span style={{ minWidth: 22, borderRadius: 12, padding: "2px 6px", background: active ? "rgba(255,255,255,0.2)" : "#cbd5e1", color: active ? "#fff" : "#475569", fontSize: 10 }}>
 {school.count}
</span>
</button>
 );
 })}
</div>

 {/* Filter */}
<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", borderRadius: 9, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
<span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Filter:</span>
 {[
 ["All", "All"],
 ["Pending Review", "Pending Dean Review"],
 ["Reviewed", "Dean Reviewed"],
 ].map(([value, label]) =>(
<button key={value} onClick={() =>setFilterStatus(value)}
 style={{ fontSize: 11, padding: "4px 12px", border: "1px solid #e2e8f0", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", background: filterStatus === value ? "#0f172a" : "none", color: filterStatus === value ? "#f1f5f9" : "#475569" }}>
 {label}
</button>
 ))}
</div>

 {/* Faculty Grid */}
<div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
 {filtered.map(faculty =>{
 const facultySummary = standardSubmittedScoreSummary(faculty);
 const courseFilePartA = Array.isArray(faculty.courseFile)
 ? (() =>{
 const filled = faculty.courseFile.filter(row =>String(row?.score ?? "").trim() !== "");
 return filled.length ? filled.reduce((total, row) =>total + courseFileRowScore(row), 0) / filled.length : 0;
 })()
 : n(faculty.courseFile?.score);
 const facPartA = [
 ...(faculty.lectures || []).map(r =>n(r.score)),
 courseFilePartA, n(faculty.innovScore),
 ...(faculty.sectionApplicability?.projects === "notApplicable" ? [] : (faculty.projects || []).map(r =>n(r.score))),
 ...(faculty.quals || []).map(r =>n(r.score)),
 ...(faculty.feedback || []).map(r =>n(r.score)),
 ...(faculty.deptActs || []).map(r =>n(r.score)),
 ...(faculty.uniActs || []).map(r =>n(r.score)),
 ...(faculty.society || []).map(r =>societyRowScore(r)),
 ...(faculty.industry || []).map(r =>n(r.score)),
 ].reduce((a, b) =>a + b, 0);

 const facPartB = [
 ...(faculty.journals || []).map(r =>n(r.score)),
 ...(faculty.books || []).map(r =>n(r.score)),
 ...(faculty.confs || []).map(r =>n(r.score)),
 ...(faculty.patents || []).map(r =>n(r.score)),
 ].reduce((a, b) =>a + b, 0);

 const docCount = Object.values(faculty.docs || {}).reduce((a, arr) =>a + arr.length, 0);

 
return (
<div key={faculty.id} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,.07)", display: "flex", flexDirection: "column", gap: 14 }}>
<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
<Avatar initials={faculty.avatar} color={faculty.avatarColor} size={46} />
<div style={{ flex: 1 }}>
<div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{faculty.name}</div>
<div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>{faculty.designation}</div>
<div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{faculty.employeeId}</div>
</div>
<StatusBadge status={faculty.status} />
</div>

<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
 {[
 { label: "Part A", val: facultySummary.partA, max: facultySummary.partAMax, color: "#6366f1" },
 { label: "Part B", val: facultySummary.partB, max: facultySummary.partBMax, color: "#0ea5e9" },
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

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
<div style={{ fontSize: 10, color: "#94a3b8" }}>Submitted: {faculty.submittedOn}</div>
<button
 disabled={reviewLoading === faculty.id}
 onClick={async () =>{
 setReviewLoading(faculty.id);
 try {
 const data = await fetchSavedAppraisal({
 facultyEmail: faculty.email,
 academicYear: faculty.academic_year || faculty.academicYear || APP_INFO.DEFAULT_AY || "2025-2026",
 });
 const form = data?.payload?.form || data?.form || {};
 const docs = data?.payload?.docs || data?.docs || {};
 const mergedForm = preserveSavedReviewScores(form, faculty);
 const declaration = data?.declaration || faculty.declaration || null;
 setReviewingApproval({ ...faculty, ...mergedForm, docs, declaration, status: declaration?.status || data?.status || faculty.status, workflowStatus: declaration?.status || data?.workflowStatus || faculty.workflowStatus });
 } catch (err) {
 alert(`Unable to open submitted form.\n\n${err.message}`);
 } finally {
 setReviewLoading(null);
 }
 }}
 style={{ fontSize: 11, padding: "7px 18px", background: isDeanReviewed(faculty) ? "#1e293b" : "#312e81", color: "#f1f5f9", border: "none", borderRadius: 6, cursor: reviewLoading === faculty.id ? "wait" : "pointer", fontWeight: 700, fontFamily: "inherit", opacity: reviewLoading === faculty.id ? 0.7 : 1 }}>
 {reviewLoading === faculty.id ? "Loading..." : isDeanReviewed(faculty) ? "View Review" : "Review Form"}
</button>
</div>
</div>
 );
 })}
</div>

 {filtered.length === 0 && (
<div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
<div style={{ fontWeight: 700, color: "#0f172a" }}>All caught up!</div>
<div style={{ color: "#64748b", fontSize: 12 }}>No records match the selected school / status filter.</div>
</div>
 )}
</>
 )}

 {/* REVIEW PANEL */}
 {(activeMainTab === "directorApprovals" || activeMainTab === "facultyApprovals") && reviewingApproval && (
 formTypeForSchool(getSchoolKey(reviewingApproval.school)) === FORM_TYPES.MEDIA_COMM ? (
<MediaCommAuthorityReviewPanel
 person={reviewingApproval}
 reviewerRole="dean"
 onBack={() =>setReviewingApproval(null)}
 onSubmit={handleSubmitReview}
 readOnly={isDeanReviewed(reviewingApproval)}
 />
 ) : formTypeForSchool(getSchoolKey(reviewingApproval.school)) === FORM_TYPES.DESIGN_ARTS ? (
<DesignArtsAuthorityReviewPanel
 person={reviewingApproval}
 reviewerRole="dean"
 onBack={() =>setReviewingApproval(null)}
 onSubmit={handleSubmitReview}
 readOnly={isDeanReviewed(reviewingApproval)}
 />
 ) : (
<ApprovalReviewPanel
 approval={reviewingApproval}
 approvalType={activeMainTab}
 onBack={() =>setReviewingApproval(null)}
 onSubmit={handleSubmitReview}
 readOnly={isDeanReviewed(reviewingApproval)}
 />
 )
 )}
</DashboardLayout>
 );
}





