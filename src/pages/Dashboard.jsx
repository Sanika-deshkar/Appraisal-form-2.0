import { useEffect, useState, useRef } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import { api } from "../services/api";
import { ACR_DETAIL_POINTS, APP_INFO, createAcrRows, saveAppraisalDraftSection, submitAppraisal, loadSavedAppraisal, loadAppraisalDocuments, INNOVATIVE_METHODS, SCORE_LIMITS, averageSectionScore, clampScore, courseFileAverageScore, courseFileRowScore, effectiveMaxScore, feedbackAverage, feedbackRowScore, feedbackSectionScore, innovativeSelectionsFromDetails, innovativeTeachingScore, isAllowedAttachmentFile, isValidDDMMYYYY, maskDateDDMMYYYY, normalizeAutoScores, projectGuidanceRowMax, researchGuidanceRowMax, researchGuidanceScore, reviewSectionScore, scoreRemaining, selfEffectivePartAMax, societyRowLocked, societyRowScore, sumSectionScore, toggleInnovativeMethod, validateCompleteRows, standardSubmittedScoreSummary, AppraisalHeaderImage, SummaryOtherInfoField, summaryOtherInfoValueFrom, RejectionNotice, DocCell, ViewCell, ViewDocsCell, RowButtons as RowBtns, SectionSaveFooter, SectionCard as SC, T, TH, TH_HOD, TD, TDC, TDS, TDS_HOD, TDV, StandardMyAppraisal } from "../features/faculty-appraisal";
import {
  profileFromsessionStorage,
  roleLabel,
  workflowValidationError,
} from "../utils/hierarchy";
import {
  n,
  pct,
  grade,
  reportValue,
  reportTextValue,
  reportQualification,
  reportExperience,
  RO,
  TI,
  WorkflowStatusTracker,
} from "../features/faculty-appraisal/shared";

// --- Helpers ------------------------------------------------------------------
// n, pct, grade, reportValue, reportTextValue, reportQualification,
// reportExperience, RO, TI, WorkflowStatusTracker — imported from shared above.
const hasAnyValue = (row, keys) => keys.some((key) => String(row[key] ?? "").trim() !== "");
const docSectionFromKey = (docKey) => docKey.replace(/-\d+$/, "").replace(/\d+$/, "");
const docRowFromKey = (docKey) => {
  const match = docKey.match(/(\d+)$/);
  return match ? Number(match[1]) + 1 : null;
};
const docsToRows = (docs, facultyEmail, academicYear) =>
  Object.entries(docs).flatMap(([docKey, files]) =>
    (files || []).map((file) => ({
      faculty_email: facultyEmail,
      academic_year: academicYear,
      section: docSectionFromKey(docKey),
      row_no: docRowFromKey(docKey),
      doc_key: docKey,
      file_name: file.name,
      file_type: file.type,
      file_url: file.url,
      storage_path: file.publicId || null,
    }))
  );
const dbText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};
const dbDate = (value) => {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const dbNumber = (value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : n(text);
};
const inputValue = (value) => value ?? "";
// pct, grade, reportValue, reportTextValue, reportQualification, reportExperience ? imported from shared

// WorkflowStatusTracker ? imported from shared

// RO, TI ? imported from shared. HodInput kept local (used only in Dashboard's FacultyReviewForm).
function HodInput({ val, onChange, max, disabled = false }) {
  return (
    <input
      type="number" min="0" step="0.5" value={val ?? ""}
      max={max}
      disabled={disabled}
      onChange={e => onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
      style={{ width: 58, height: 30, boxSizing: "border-box", textAlign: "center", border: "1.5px solid #6366f1", borderRadius: 5, padding: "5px 6px", fontSize: 11, fontFamily: "inherit", outline: "none", background: disabled ? "#f1f5f9" : "#f0f4ff", cursor: disabled ? "not-allowed" : "text" }}
    />
  );
}

// --- Faculty Form in HOD Review Mode -----------------------------------------
function FacultyReviewForm({ faculty, hodData, setHodData, sectionView = "partA" }) {
  const set = (section, idx, field, val) => {
    setHodData(prev => {
      const updated = { ...prev };
      if (!updated[section]) updated[section] = JSON.parse(JSON.stringify(faculty[section] || []));
      if (idx === null) { updated[section] = { ...updated[section], [field]: val }; }
      else { updated[section] = updated[section].map((r, i) => i === idx ? { ...r, [field]: val } : r); }
      return updated;
    });
  };
  const setScalar = (key, val) => setHodData(prev => ({ ...prev, [key]: val }));

  const get = (section, idx, field) => {
    if (hodData[section]) {
      const s = hodData[section];
      return idx === null ? (s[field] ?? faculty[section]?.[field] ?? "") : (s[idx]?.[field] ?? faculty[section]?.[idx]?.[field] ?? "");
    }
    return idx === null ? (faculty[section]?.[field] ?? "") : (faculty[section]?.[idx]?.[field] ?? "");
  };
  const getS = (key) => hodData[key] ?? faculty[key] ?? "";

  const { info, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, docs } = faculty;

  const rows = (arr) => arr && arr.length > 0 ? arr : [{}];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* HOD Review Banner */}
      <div style={{ background: "linear-gradient(90deg,#312e81,#4338ca)", color: "#e0e7ff", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>Review</span>
        <div>
          <strong>HOD Review Mode</strong> - Faculty data is read-only. Only <span style={{ color: "#c7d2fe", fontWeight: 700 }}>HOD Score</span> columns are editable. Click <span style={{ color: "#c7d2fe" }}>View Doc</span> links to open uploaded files.
        </div>
      </div>

      {/* Faculty Info */}
      <SC title="Faculty Information" accent="#6366f1">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {[["Name", info.name], ["Qualification", info.qual], ["Designation", info.desig], ["Academic Year", info.ay]].map(([label, val]) => (
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
                {rows(lectures).map((r, i) => (
                  <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                    <td style={TDC}>{i + 1}</td>
                    <td style={TD}><RO val={r.sem} /></td>
                    <td style={TD}><RO val={r.code} /></td>
                    <td style={TDC}><RO val={r.planned} center /></td>
                    <td style={TDC}><RO val={r.conducted} center /></td>
                    <td style={TDV}><ViewDocsCell docKey={`lec-${i}`} docs={docs} /></td>
                    <td style={TDS}><RO val={r.score} center /></td>
                    <td style={TDS_HOD}><HodInput val={get("lectures", i, "hod")} onChange={v => set("lectures", i, "hod", v)} /></td>
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
              {rows(courseFile).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.course} /></td>
                  <td style={TD}><RO val={r.title} /></td>
                  <td style={TDC}><RO val={r.details} center /></td>
                  <td style={TDS}><RO val={courseFileRowScore(r) ? String(courseFileRowScore(r)) : ""} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("courseFile", i, "hod")} onChange={v => set("courseFile", i, "hod", v)} max={SCORE_LIMITS.courseFileRow} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SC>

        {/* A3: Innovative Teaching */}
        <SC title="A3. Innovative Teaching-Learning (Max 10)" accent="#8b5cf6">
          <table style={T}>
            <thead><tr>
              <th style={TH}>Method</th><th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style={TD}>Innovative / participatory teaching methods used</td>
                <td style={TDV}><ViewDocsCell docKey={["innov", "innov-0"]} docs={docs} /></td>
                <td style={TDS}><RO val={faculty.innovScore} center /></td>
                <td style={TDS_HOD}><HodInput val={getS("innovHod")} onChange={v => setScalar("innovHod", v)} /></td>
              </tr>
            </tbody>
          </table>
        </SC>

        {/* A4: Projects */}
        {faculty.sectionApplicability?.projects !== "notApplicable" && <SC title="A4. Projects (Max 10)" accent="#8b5cf6">
          <table style={T}>
            <thead><tr>
              <th style={TH}>SN</th><th style={TH}>Project Type</th>
              <th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
            </tr></thead>
            <tbody>
              {rows(projects).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.label} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`proj-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, projectGuidanceRowMax(r)) : ""} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("projects", i, "hod")} max={projectGuidanceRowMax(r)} onChange={v => set("projects", i, "hod", v)} /></td>
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
              {rows(quals).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.label} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`qual-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("quals", i, "hod")} onChange={v => set("quals", i, "hod", v)} /></td>
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
              {rows(feedback).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.code} /></td>
                  <td style={TDC}><RO val={r.fb1} center /></td>
                  <td style={TDC}><RO val={r.fb2} center /></td>
                  <td style={{ ...TDC, fontWeight: 700, color: "#6366f1" }}>
                    {r.fb1 && r.fb2 ? ((n(r.fb1) + n(r.fb2)) / 2).toFixed(2) : "-"}
                  </td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("feedback", i, "hod")} onChange={v => set("feedback", i, "hod", v)} /></td>
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
              {rows(deptActs).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.activity} /></td>
                  <td style={TD}><RO val={r.nature} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`dept-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("deptActs", i, "hod")} onChange={v => set("deptActs", i, "hod", v)} /></td>
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
              {rows(uniActs).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.activity} /></td>
                  <td style={TD}><RO val={r.nature} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`uni-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("uniActs", i, "hod")} onChange={v => set("uniActs", i, "hod", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SC>

        {/* E: Society */}
        <SC title="E. Contribution to Society (Max 10, Max 5 per row)" accent="#10b981">
          <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
            {["applicable", "notApplicable"].map((v) => (
              <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={(faculty.sectionApplicability?.society || "applicable") === v} readOnly disabled />
                {v === "applicable" ? "Applicable" : "Not Applicable"}
              </label>
            ))}
          </div>
          {faculty.sectionApplicability?.society !== "notApplicable" && <table style={T}>
            <thead><tr>
              <th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Details</th>
              <th style={TH}>View Docs</th><th style={TH}>Faculty Score (Max 5)</th><th style={TH_HOD}>HOD Score</th>
            </tr></thead>
            <tbody>
              {rows(society).map((r, i) => (
                <tr key={i} style={societyRowLocked(r) ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.label} /></td>
                  <td style={TD}><RO val={r.details} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`soc-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={String(r.score ?? "").trim() ? societyRowScore(r) : ""} center /></td>
                  <td style={TDS_HOD}><HodInput val={societyRowLocked(r) ? "0" : get("society", i, "hod")} max={SCORE_LIMITS.societyRow} disabled={societyRowLocked(r)} onChange={v => set("society", i, "hod", v)} /></td>
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
              {rows(industry).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.name} /></td>
                  <td style={TD}><RO val={r.details} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`ind-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("industry", i, "hod")} onChange={v => set("industry", i, "hod", v)} /></td>
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
              {rows(acr).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.label} /></td>
                  <td style={TDS_HOD}><HodInput val={String(get("acr", i, "hod") ?? "").trim() ? clampScore(get("acr", i, "hod"), SCORE_LIMITS.acrRow) : ""} max={SCORE_LIMITS.acrRow} onChange={v => set("acr", i, "hod", v)} /></td>
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
                {rows(journals).map((r, i) => (
                  <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                    <td style={TDC}>{i + 1}</td>
                    <td style={TD}><RO val={r.title} /></td>
                    <td style={TD}><RO val={r.journal} /></td>
                    <td style={TDC}><RO val={r.issn} center /></td>
                    <td style={TDC}><RO val={r.index} center /></td>
                    <td style={TDV}><ViewDocsCell docKey={`jour-${i}`} docs={docs} /></td>
                    <td style={TDS}><RO val={r.score} center /></td>
                    <td style={TDS_HOD}><HodInput val={get("journals", i, "hod")} onChange={v => set("journals", i, "hod", v)} /></td>
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
                {rows(books).map((r, i) => (
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
                    <td style={TDS_HOD}><HodInput val={get("books", i, "hod")} onChange={v => set("books", i, "hod", v)} /></td>
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
              {rows(ict).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.title} /></td>
                  <td style={TD}><RO val={r.type} /></td>
                  <td style={TDC}><RO val={r.quad} center /></td>
                  <td style={TDV}><ViewDocsCell docKey={`ict-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("ict", i, "hod")} onChange={v => set("ict", i, "hod", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SC>

        {/* B4: Research Guidance */}
        {faculty.sectionApplicability?.research !== "notApplicable" && <SC title="B4(a). Research Guidance - PhD / PG (Max 30)" accent="#059669">
          <table style={T}>
            <thead><tr>
              <th style={TH}>SN</th><th style={TH}>Degree</th><th style={TH}>Student Name</th><th style={TH}>Status</th>
              <th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
            </tr></thead>
            <tbody>
              {rows(research).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TDC}><RO val={r.degree} center /></td>
                  <td style={TD}><RO val={r.name} /></td>
                  <td style={TD}><RO val={r.thesis} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`res-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : ""} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("research", i, "hod")} onChange={v => set("research", i, "hod", v)} /></td>
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
                {rows(projects2).map((r, i) => (
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
                    <td style={TDS_HOD}><HodInput val={get("projects2", i, "hod")} max={SCORE_LIMITS.researchInternalProjects} onChange={v => set("projects2", i, "hod", v)} /></td>
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
                {rows(externalProjects).map((r, i) => (
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
                    <td style={TDS_HOD}><HodInput val={get("externalProjects", i, "hod")} max={SCORE_LIMITS.researchExternalProjects} onChange={v => set("externalProjects", i, "hod", v)} /></td>
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
                {rows(patents).map((r, i) => (
                  <tr key={i}>
                    <td style={TDC}>{i + 1}</td>
                    <td style={TD}><RO val={r.title} /></td>
                    <td style={TDC}><RO val={r.type} center /></td>
                    <td style={TDC}><RO val={r.date} center /></td>
                    <td style={TDC}><RO val={r.status} center /></td>
                    <td style={TDC}><RO val={r.fileNo} center /></td>
                    <td style={TDV}><ViewDocsCell docKey={`pat-${i}`} docs={docs} /></td>
                    <td style={TDS}><RO val={r.score} center /></td>
                    <td style={TDS_HOD}><HodInput val={get("patents", i, "hod")} onChange={v => set("patents", i, "hod", v)} /></td>
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
              {rows(awards).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.title} /></td>
                  <td style={TDC}><RO val={r.date} center /></td>
                  <td style={TD}><RO val={r.agency} /></td>
                  <td style={TD}><RO val={r.level} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`awd-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("awards", i, "hod")} onChange={v => set("awards", i, "hod", v)} /></td>
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
              {rows(confs).map((r, i) => (
                <tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.title} /></td>
                  <td style={TD}><RO val={r.type} /></td>
                  <td style={TD}><RO val={r.org} /></td>
                  <td style={TD}><RO val={r.level} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`conf-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("confs", i, "hod")} onChange={v => set("confs", i, "hod", v)} /></td>
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
              {rows(proposals).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.title} /></td>
                  <td style={TDC}><RO val={r.duration} center /></td>
                  <td style={TD}><RO val={r.agency} /></td>
                  <td style={TDC}><RO val={r.amount} center /></td>
                  <td style={TDV}><ViewDocsCell docKey={`prop-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("proposals", i, "hod")} onChange={v => set("proposals", i, "hod", v)} /></td>
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
              {rows(products).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.details} /></td>
                  <td style={TD}><RO val={r.usage} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`prod-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={r.score} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("products", i, "hod")} onChange={v => set("products", i, "hod", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SC>

        {/* B8a: FDP / Workshops */}
        <SC title="B8(a). FDP / Workshops Attended (Max 10)" accent="#10b981">
          <table style={T}>
            <thead><tr>
              <th style={TH}>SN</th><th style={TH}>Program</th><th style={TH}>Duration</th><th style={TH}>Organizer</th>
              <th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
            </tr></thead>
            <tbody>
              {rows(fdps).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.program} /></td>
                  <td style={TDC}><RO val={r.duration} center /></td>
                  <td style={TD}><RO val={r.org} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`fdp-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, SCORE_LIMITS.fdpRow) : ""} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("fdps", i, "hod")} max={SCORE_LIMITS.fdpRow} onChange={v => set("fdps", i, "hod", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SC>

        {/* B8b: Industrial Training */}
        <SC title="B8(b). Industrial Training" accent="#10b981">
          <table style={T}>
            <thead><tr>
              <th style={TH}>SN</th><th style={TH}>Company</th><th style={TH}>Duration</th><th style={TH}>Nature</th>
              <th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>HOD Score</th>
            </tr></thead>
            <tbody>
              {rows(training).map((r, i) => (
                <tr key={i}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TD}><RO val={r.company} /></td>
                  <td style={TDC}><RO val={r.duration} center /></td>
                  <td style={TD}><RO val={r.nature} /></td>
                  <td style={TDV}><ViewDocsCell docKey={`train-${i}`} docs={docs} /></td>
                  <td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, SCORE_LIMITS.fdpRow) : ""} center /></td>
                  <td style={TDS_HOD}><HodInput val={get("training", i, "hod")} max={SCORE_LIMITS.fdpRow} onChange={v => set("training", i, "hod", v)} /></td>
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
  const calcHodScore = () => {
    const get = (section, idx, field) => {
      if (hodData[section]) {
        const s = hodData[section];
        return idx === null ? n(s[field]) : n(s[idx]?.[field]);
      }
      return idx === null ? n(faculty[section]?.[field]) : n(faculty[section]?.[idx]?.[field]);
    };
    const getS = (key) => n(hodData[key] ?? faculty[key]);

    const lectureReviewRows = (faculty.lectures || []).map((row, i) => ({
      ...row,
      hod: hodData.lectures?.[i]?.hod ?? row.hod ?? "",
    }));
    const courseFileReviewRows = (faculty.courseFile || []).map((row, i) => ({
      ...row,
      hod: hodData.courseFile?.[i]?.hod ?? row.hod ?? "",
    }));
    const lec = reviewSectionScore("lectures", lectureReviewRows, 50, "hod");
    const cf = reviewSectionScore("courseFile", courseFileReviewRows, 20, "hod");
    const innov = getS("innovHod");
    const proj = faculty.sectionApplicability?.projects === "notApplicable" ? 0 : (faculty.projects || []).reduce((a, _, i) => a + get("projects", i, "hod"), 0);
    const qual = (faculty.quals || []).reduce((a, _, i) => a + get("quals", i, "hod"), 0);
    const feedbackReviewRows = (faculty.feedback || []).map((row, i) => ({
      ...row,
      hod: hodData.feedback?.[i]?.hod ?? row.hod ?? "",
    }));
    const fb = reviewSectionScore("feedback", feedbackReviewRows, 10, "hod");
    const dept = (faculty.deptActs || []).reduce((a, _, i) => a + get("deptActs", i, "hod"), 0);
    const uni = (faculty.uniActs || []).reduce((a, _, i) => a + get("uniActs", i, "hod"), 0);
    const soc = faculty.sectionApplicability?.society === "notApplicable" ? 0 : (faculty.society || []).reduce((a, row, i) => a + (societyRowLocked(row) ? 0 : get("society", i, "hod")), 0);
    const ind = (faculty.industry || []).reduce((a, _, i) => a + get("industry", i, "hod"), 0);
    const acrT = (faculty.acr || []).reduce((a, _, i) => a + clampScore(get("acr", i, "hod"), SCORE_LIMITS.acrRow), 0);
    const partA = lec + cf + innov + proj + qual + fb + dept + uni + soc + ind + acrT;

    const jour = (faculty.journals || []).reduce((a, _, i) => a + get("journals", i, "hod"), 0);
    const bk = (faculty.books || []).reduce((a, _, i) => a + get("books", i, "hod"), 0);
    const ictT = (faculty.ict || []).reduce((a, _, i) => a + get("ict", i, "hod"), 0);
    const res = faculty.sectionApplicability?.research === "notApplicable" ? 0 : (faculty.research || []).reduce((a, _, i) => a + get("research", i, "hod"), 0);
    const resProjects = clampScore((faculty.projects2 || []).reduce((a, _, i) => a + get("projects2", i, "hod"), 0), SCORE_LIMITS.researchInternalProjects);
    const externalResProjects = clampScore((faculty.externalProjects || []).reduce((a, _, i) => a + get("externalProjects", i, "hod"), 0), SCORE_LIMITS.researchExternalProjects);
    const pat = (faculty.patents || []).reduce((a, _, i) => a + get("patents", i, "hod"), 0);
    const awd = (faculty.awards || []).reduce((a, _, i) => a + get("awards", i, "hod"), 0);
    const conf = (faculty.confs || []).reduce((a, _, i) => a + get("confs", i, "hod"), 0);
    const prop = (faculty.proposals || []).reduce((a, _, i) => a + get("proposals", i, "hod"), 0);
    const prod = (faculty.products || []).reduce((a, _, i) => a + get("products", i, "hod"), 0);
    const fdp = clampScore((faculty.fdps || []).reduce((a, _, i) => a + clampScore(get("fdps", i, "hod"), SCORE_LIMITS.fdpRow), 0), 10);
    const train = clampScore((faculty.training || []).reduce((a, _, i) => a + clampScore(get("training", i, "hod"), SCORE_LIMITS.fdpRow), 0), 10);
    const b8 = clampScore(fdp + train, 10);
    const partB = jour + bk + ictT + res + resProjects + externalResProjects + pat + awd + conf + prop + prod + b8;

    return { partA, partB, total: partA + partB };
  };

  const { partA, partB, total } = calcHodScore();
  const g = grade(total, 575);
  const facultySummary = standardSubmittedScoreSummary(faculty);

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
        {[["partA", "Part A"], ["partB", "Part B"], ["summary", "Summary"]].map(([id, label]) => (
          <button key={id} onClick={() => {
            setSectionView(id);
            requestAnimationFrame(() => {
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
              ].map(([label, max, fac, hod]) => (
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

          <SummaryOtherInfoField value={summaryOtherInfoValueFrom(faculty)} readOnly rows={4} />

          <label style={{ fontWeight: 700, fontSize: 13, color: "#334155", display: "block", marginBottom: 6 }}>HOD Remarks</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4}
            placeholder="Enter your remarks, observations, and recommendations for this faculty member..."
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 7, padding: "10px 12px", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: 16 }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onBack} style={{ padding: "9px 22px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
            <button onClick={() => onSubmit(faculty.id, total, remarks)}
              disabled={!remarks.trim()}
              style={{ padding: "10px 28px", background: remarks.trim() ? "#059669" : "#64748b", color: "#fff", border: "none", borderRadius: 7, cursor: remarks.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
              Submit HOD Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main HOD Dashboard -------------------------------------------------------
export default function Dashboard() {
  const [activeMainTab, setActiveMainTab] = useState("myAppraisal");
  const [hodAppraisalTab, setHodAppraisalTab] = useState("partA");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { id: "myAppraisal", icon: "", label: "My Appraisal", sub: "View your self-appraisal form" },
    { id: "guidelines", icon: "", label: "Guidelines", sub: "Faculty appraisal guidelines AY 2025-26" },
  ];

  const isMyAppraisalSectionOpen = (_section) => true;

  const handleMyAppraisalSectionChange = (section) => {
    setHodAppraisalTab(section);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  return (
    <DashboardLayout
      appInfo={APP_INFO}
      showLogoutModal={showLogoutModal}
      onCancelLogout={() => setShowLogoutModal(false)}
      containerStyle={{ display: "flex", minHeight: "100vh", fontFamily: "inherit", background: "#f8fafc", color: "#1e293b" }}
      mainStyle={{ flex: 1, padding: "24px 30px", display: "flex", flexDirection: "column", gap: 18, overflowX: "auto" }}
      sidebar={(
        <DashboardSidebar
          appInfo={APP_INFO}
          navItems={navItems}
          activeTab={activeMainTab}
          onTabSelect={(tab) => setActiveMainTab(tab)}
          showSectionSelector={activeMainTab === "myAppraisal"}
          sectionTab={hodAppraisalTab}
          onSectionChange={handleMyAppraisalSectionChange}
          isSectionOpen={isMyAppraisalSectionOpen}
          profileSubtitle={`${sessionStorage.getItem("role") || "Faculty"} ${sessionStorage.getItem("department")?.split(" ")[0] || ""}`}
          onLogout={() => setShowLogoutModal(true)}
        />
      )}
    >
      {activeMainTab === "myAppraisal" && (
        <StandardMyAppraisal
          sectionTab={hodAppraisalTab}
          onSectionTabChange={handleMyAppraisalSectionChange}
        />
      )}
    </DashboardLayout>
  );
}


