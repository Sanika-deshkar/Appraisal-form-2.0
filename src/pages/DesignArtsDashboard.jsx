/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import { Avatar, LogoutConfirmModal, ScoreBar, StatusBadge } from "../components/dashboard/dashboardPrimitives";
import { getSchoolByValue, getSchoolKey } from "../constants/universityHierarchy";
import { api } from "../services/api";
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
 ViewDocsCell,
 SectionSaveFooter,
 RowButtons as RowBtns,
} from "../features/faculty-appraisal";
import { canReviewerRejectProfile, getReviewChain, pendingStatusFor, profileFromsessionStorage, reviewedStatusFor, roleLabel, visiblePreviousReviewRoles, workflowValidationError, isAppraisalFinalisedByVc, isRejectedStatus, isPendingReviewStatusFor, hasActiveRejection, reviewListFrom } from "../utils/hierarchy";
import { n, pct, RO, TI } from "../features/faculty-appraisal/shared";

import { emptyDesignArtsForm, ALL_ARRAY_KEYS, titleCase, calculateDesignArtsTotals, getDesignArtsEffectiveMaxScores, validateDesignArtsBeforeSubmit, mergeForm, preserveSavedReviewScores, designArtsSchoolName, PART_A_SECTIONS, PART_B_SECTIONS, DesignArtsForm, DesignArtsAuthorityReviewPanel, SectionSelector, AccuracyCheckbox, CompactAuthoritySummaryCard, isReviewerReviewComplete, normalizeScoresForSubmit, summaryRow, b8summaryRow, SECTION_OPTIONS, SummaryBox, WorkflowTracker, ACCENT, ACCENT2, PART_A_MAX, PART_B_MAX, GRAND_MAX, userInitials } from "../components/appraisal/designArts/DesignArtsAppraisalForm";
import { loadClosedAppraisal } from "../services/appraisalPersistence";

export default function DesignArtsDashboard({ fixedRole }) {
 const navigate = useNavigate();
 const role = fixedRole || sessionStorage.getItem("role") || "faculty";
 const profile = profileFromsessionStorage();
 const [activeTab, setActiveTab] = useState(role === "faculty" ? "my" : "approvals");
 const [selfSectionView, setSelfSectionView] = useState("partA");
 const [form, setForm] = useState(emptyDesignArtsForm);
 const [docs, setDocs] = useState({});
 const [queue, setQueue] = useState([]);
 const [reviewing, setReviewing] = useState(null);
 const [loadingQueue, setLoadingQueue] = useState(false);
 const [reviewLoading, setReviewLoading] = useState(null);
 const [submitting, setSubmitting] = useState(false);
 const [confirmed, setConfirmed] = useState(false);
 const [attachmentsConfirmed, setAttachmentsConfirmed] = useState(false);

 const [showLogoutModal, setShowLogoutModal] = useState(false);
 const [sectionSaveStatus, setSectionSaveStatus] = useState({ partA: false, partB: false });
 const [savingSection, setSavingSection] = useState(null);
 const [declaration, setDeclaration] = useState(null);
 const [reviews, setReviews] = useState([]);
 const [availableCycles, setAvailableCycles] = useState([]);
 const userEmail = sessionStorage.getItem("username") || "";
 const academicYear = form.info?.ay || sessionStorage.getItem("academicYear") || "2026-2027";

 useEffect(() => {
    const fetchCycles = async () => {
      try {
        const res = await api.get("/academic-years/available");
        const cycles = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (cycles.length > 0) {
          const formatted = cycles.map((c) => ({
            academic_year: c.academic_year || c.academicYear || c.year || String(c),
            is_open: c.is_open !== undefined ? Boolean(c.is_open) : true,
          }));
          setAvailableCycles(formatted);
        }
      } catch (err) {
        console.warn("Could not fetch available cycles:", err);
      }
    };
    fetchCycles();
  }, []);

  const academicYearOptions = availableCycles.length > 0
    ? availableCycles
    : [
        { academic_year: "2026-2027", is_open: true },
        { academic_year: "2025-2026", is_open: false },
      ];

  const selectedCycle = academicYearOptions.find((c) => c.academic_year === academicYear);
  const isSelectedCycleClosed = selectedCycle ? !selectedCycle.is_open : false;
  const workflowRejected = hasActiveRejection(declaration, reviews);
  const locked = isSelectedCycleClosed || (Boolean(declaration) && !workflowRejected);
  const totals = calculateDesignArtsTotals(form, "score");
  const canSelfSubmit = role !== "vc";
  const currentSchoolValue = form.info?.school || profile.school || sessionStorage.getItem("school") || sessionStorage.getItem("schoolName") || "";
  const schoolDisplayName = designArtsSchoolName(
    profile,
    sessionStorage.getItem("school"),
    sessionStorage.getItem("schoolName"),
    form,
  );

  const handleAcademicYearChange = (newAy) => {
    setForm((prev) => ({ ...prev, info: { ...prev.info, ay: newAy } }));
    sessionStorage.setItem("academicYear", newAy);
  };

  const handleGenerateReport = () => {
    openFullFormReport({
      title: `${schoolDisplayName} — Faculty Appraisal Report`,
      subtitle: `Academic Year: ${academicYear}`,
      form,
      docs,
      partASections: PART_A_SECTIONS,
      partBSections: PART_B_SECTIONS,
      totals,
      maxScores: totals.maxScores,
      scoreRoles: ["score"],
      roleLabel,
      declaration,
    });
  };

 const setters = useMemo(() =>Object.fromEntries([
 ["setInfo", (value) =>setForm((prev) =>({ ...prev, info: { ...prev.info, ...value } }))],
 ...ALL_ARRAY_KEYS.map((key) =>[`set${titleCase(key)}`, (value) =>setForm((prev) =>({ ...prev, [key]: key === "acr" ? createAcrRows(value) : value }))]),
 ["setInnovDetails", (value) =>setForm((prev) =>({ ...prev, innovDetails: value }))],
 ["setInnovScore", (value) =>setForm((prev) =>({ ...prev, innovScore: value }))],
 ["setInnovRows", (value) =>setForm((prev) =>({ ...prev, innovRows: value }))],
 ["setInnovHod", (value) =>setForm((prev) =>({ ...prev, innovHod: value }))],
 ["setInnovDirector", (value) =>setForm((prev) =>({ ...prev, innovDirector: value }))],
 ["setInnovDean", (value) =>setForm((prev) =>({ ...prev, innovDean: value }))],
 ["setInnovVc", (value) =>setForm((prev) =>({ ...prev, innovVc: value }))],
 ["setSummaryOtherInfo", (value) =>setForm((prev) =>({ ...prev, summaryOtherInfo: value }))],
 ["setSectionSaveStatus", (value) =>setSectionSaveStatus((prev) =>({ ...prev, ...(value || {}) }))],
 ]), []);

 useEffect(() =>{
 if (!userEmail || !academicYear || !canSelfSubmit) return;
 setDocs({});
 const loadAll = async () =>{
 const data = await api.get("/appraisal/status", { params: { academic_year: academicYear } }).catch((err) =>{
 console.error("Could not load workflow status:", err);
 return null;
 });
 const declarationRow = data?.declaration || null;
 const loadedReviews = reviewListFrom(data?.reviews);
 setDeclaration(declarationRow);
 setReviews(loadedReviews);
 const loader = isSelectedCycleClosed ? loadClosedAppraisal : loadSavedAppraisal;
 await Promise.all([
 loader({ facultyEmail: userEmail, academicYear, setters }),
 loadAppraisalDocuments({ facultyEmail: userEmail, academicYear, setDocs }),
 ]);
 };
 loadAll().catch((err) =>console.error(`Could not load ${schoolDisplayName} appraisal:`, err));
 }, [userEmail, academicYear, setters, canSelfSubmit, isSelectedCycleClosed]);

 const loadQueue = async () =>{
 if (role === "faculty") return;
 setLoadingQueue(true);
 try {
 const items = await fetchReviewQueueForRole({
 reviewerRole: role,
 reviewerProfile: { ...profile, appraisal_role: role },
 schoolValues: FORM_SCHOOL_CODES[FORM_TYPES.DESIGN_ARTS],
 });
 setQueue(items.filter((item) =>FORM_SCHOOL_CODES[FORM_TYPES.DESIGN_ARTS].includes(getSchoolKey(item.school || item.info?.school))));
 } catch (err) {
 console.error(`Could not load ${schoolDisplayName} review queue:`, err);
 setQueue([]);
 } finally {
 setLoadingQueue(false);
 }
 };

 useEffect(() =>{
 loadQueue();
 }, [role, profile.school, profile.department]);

 const isSelfSectionOpen = (_section) =>true;

 const handleSelfSectionChange = (section) =>{
 setSelfSectionView(section);
 requestAnimationFrame(() =>{
 window.scrollTo({ top: 0, left: 0, behavior: "auto" });
 });
 };

 const handleSaveSelfSection = async (section) =>{
 if (locked) return;
 if (!userEmail) {
 navigate("/login", { replace: true });
 return;
 }
 const nextStatus = { ...sectionSaveStatus, [section]: true };
 const formToSave = {
 ...form,
 info: { ...form.info, school: currentSchoolValue },
 sectionSaveStatus: nextStatus,
 };
 setSavingSection(section);
 try {
 await saveAppraisalDraftSection({
 facultyEmail: userEmail,
 academicYear,
 form: formToSave,
 docs,
 totals: {
 partATotal: totals.partA,
 partBTotal: totals.partB,
 grandTotal: totals.total,
 effectivePartAMax: totals.maxScores.partA,
 effectivePartBMax: totals.maxScores.partB,
 effectiveGrandMax: totals.maxScores.grand,
 },
 submitterProfile: { ...profile, school: currentSchoolValue, appraisal_role: role },
 sectionSaveStatus: nextStatus,
 });
 setSectionSaveStatus(nextStatus);
 } catch (err) {
 if (err?.statusCode === 403 || err?.response?.status === 403) {
 setDeclaration((current) =>current || { status: "Submitted" });
 return;
 }
 alert(`Unable to save draft.\n\n${err.message}`);
 } finally {
 setSavingSection(null);
 }
 };

 const handleSubmitAppraisal = async () =>{
 if (locked) {
 alert("This appraisal has already been submitted and is locked for review.");
 return;
 }
 if (!confirmed || !attachmentsConfirmed) {
 alert("Please tick both declaration checkboxes before submitting.");
 return;
 }
 if (!userEmail) {
 navigate("/login", { replace: true });
 return;
 }
 const submitterProfile = { ...profile, school: currentSchoolValue, appraisal_role: role };
 const workflowError = workflowValidationError(submitterProfile);
 if (workflowError) {
 alert(workflowError);
 return;
 }
 const normalizedForm = normalizeScoresForSubmit({
 ...form,
 info: { ...form.info, school: currentSchoolValue },
 });
 const validationErrors = validateDesignArtsBeforeSubmit(normalizedForm, docs);
 if (validationErrors.length) {
 alert(validationErrors.join("\n"));
 return;
 }
 const confirmSubmit = window.confirm("Are you sure you want to submit your appraisal? This will save your data to the database.");
 if (!confirmSubmit) return;
 const finalSectionSaveStatus = { ...sectionSaveStatus, partA: true, partB: true };
 const submittedForm = {
 ...normalizedForm,
 sectionSaveStatus: finalSectionSaveStatus,
 };
 setSubmitting(true);
 try {
 const submittedAt = new Date().toISOString();
 await submitAppraisal({
 facultyEmail: userEmail,
 academicYear,
 totals: {
 partATotal: totals.partA,
 partBTotal: totals.partB,
 grandTotal: totals.total,
 effectivePartAMax: totals.maxScores.partA,
 effectivePartBMax: totals.maxScores.partB,
 effectiveGrandMax: totals.maxScores.grand,
 },
 form: submittedForm,
 docs,
 submitterProfile,
 activeProfile: submitterProfile,
 });
 setSectionSaveStatus(finalSectionSaveStatus);
 setDeclaration({ status: pendingStatusFor(getReviewChain(submitterProfile)[0]), submitted_at: submittedAt, updated_at: submittedAt });
 setReviews([]);
 alert(`${schoolDisplayName} appraisal submitted successfully.`);
 } catch (err) {
 alert(`Unable to submit appraisal.\n\n${err.message}`);
 } finally {
 setSubmitting(false);
 }
 };

 const handleSubmitReview = async (id, scores, remarks, sectionScores, reviewConfirmed = false, decision = "approved") =>{
 if (!reviewConfirmed) {
 alert("Please verify and confirm the accuracy declaration before submitting the review.");
 return;
 }
 if (!remarks?.trim()) {
 alert("Remarks are mandatory. Please enter your remarks before submitting the review.");
 return;
 }
 const item = queue.find((entry) =>entry.id === id);
 if (!item) return;
 try {
 await submitWorkflowReview({
 subjectEmail: item.email,
 academicYear: item.academicYear || item.academic_year || item.info?.ay || APP_INFO.DEFAULT_AY || "2026-2027",
 reviewerRole: role,
 partAScore: scores.partA,
 partBScore: scores.partB,
 totalScore: scores.total,
 remarks,
 sectionScores,
 subjectProfile: item,
 decision,
 });
 setReviewing(null);
 await loadQueue();
 alert(decision === "rejected" ? "Appraisal rejected and sent back for editing." : `${roleLabel(role)} review submitted successfully.`);
 } catch (err) {
 alert(`Unable to submit review.\n\n${err.message}`);
 }
 };

 const generateSelfReport = () =>{
 const applicability = {};
 const rowSum = (key, max) =>scoreSectionRows(key, form[key] || [], max, "score");
 const lecScore = scoreSectionRows("lectures", form.lectures || [], 40, "score");
 const cfScore = scoreSectionRows("courseFile", form.courseFile || [], 20, "score");
 const innovScore = clampScore(Array.isArray(form.innovRows) ? form.innovRows.reduce((t, r) =>t + clampScore(r.score, SCORE_LIMITS.innovativeRow), 0) : innovativeTeachingScore(form.innovDetails, form.innovScore, 10), 10);
 const obeScore = scoreSectionRows("obeRows", form.obeRows || [], 20, "score");
 const mentoringScore = scoreSectionRows("mentoringRows", form.mentoringRows || [], 10, "score");
 const maxScores = getDesignArtsEffectiveMaxScores(form, { self: true });
 const b8Score = rowSum("fdps", 20);
 const partATotal = clampScore(lecScore + cfScore + innovScore + obeScore + mentoringScore + rowSum("projects", 20) + rowSum("quals", 10) + feedbackSectionScore(form.feedback || [], 10), maxScores.partA);
 const partBTotal = clampScore(
    rowSum("journals", 60) +
    rowSum("books", 30) +
    rowSum("ipr", 40) +
    rowSum("externalProjects", 20) +
    rowSum("research", 20) +
    rowSum("consultancy", 30) +
    rowSum("confs", 20) +
    b8Score +
    rowSum("awards", 20) +
    rowSum("innovation", 20) +
    rowSum("ict", 40) +
    rowSum("exhibitions", 30),
    maxScores.partB
  );
  const grandTotal = clampScore(partATotal + partBTotal, maxScores.grand);
  generateMediaCommReport({
  title: `${schoolDisplayName} Appraisal Report`,
  subtitle: `${roleLabel(role)} appraisal form`,
  form,
  docs,
  partASections: PART_A_SECTIONS.map((section) =>section.key === "acr" ? { ...section, max: 0, title: "(xi) Annual Confidential Report (ACR) - Not counted in self score" } : section),
  partBSections: PART_B_SECTIONS,
 		totals: { partA: partATotal, partB: partBTotal, total: grandTotal },
 		hideAcr: true,
  maxScores,
  generatedBy: sessionStorage.getItem("name") || roleLabel(role),
  declaration,
  reviewChain: reviews.map((rev) =>({
  label: roleLabel(rev.reviewer_role),
  name: rev.reviewer_name || "",
  date: rev.reviewed_at ? new Date(rev.reviewed_at).toLocaleDateString("en-IN") : "",
  })),
  detailedSummaryRows: [
  { isHeader: true, label: "Part A - Teaching Process & Academic Activities" },
  ...summaryRow(applicability, "lectures", { id: "A1", label: "Lectures / Tutorials / Practicals", max: 40, score: lecScore }),
  ...summaryRow(applicability, "courseFile", { id: "A2", label: "Course File", max: 20, score: cfScore }),
  { id: "A3", label: "Innovative Teaching-Learning Methodologies", max: 10, score: innovScore },
  ...summaryRow(applicability, "feedback", { id: "A4", label: "Students' Feedback", max: 10, score: feedbackSectionScore(form.feedback || [], 10) }),
  { id: "A5", label: "Learning Outcomes Attainment & OBE Practice", max: 20, score: obeScore },
  ...summaryRow(applicability, "projects", { id: "A6", label: "Student Project Guidance", max: 20, score: rowSum("projects", 20) }),
  { id: "A7", label: "Student Mentoring & Counselling", max: 10, score: mentoringScore },
  ...summaryRow(applicability, "quals", { id: "A8", label: "Qualification Enhancement", max: 10, score: rowSum("quals", 10) }),
  { isTotal: true, label: "Part A Total", max: maxScores.partA, score: partATotal },
  { isHeader: true, label: "Part B - Research, Publications & Creative Output" },
  ...summaryRow(applicability, "journals", { id: "B1", label: "Journal Publications / Academic Research Papers", max: 60, score: rowSum("journals", 60) }),
  ...summaryRow(applicability, "books", { id: "B2", label: "Books, Book Chapters & Edited Volumes", max: 30, score: rowSum("books", 30) }),
  ...summaryRow(applicability, "ipr", { id: "B3", label: "Patents, Copyrights, IP & Creative Product Development", max: 40, score: rowSum("ipr", 40) }),
  ...summaryRow(applicability, "externalProjects", { id: "B4", label: "Funded Research / Creative Projects & Grants", max: 20, score: rowSum("externalProjects", 20) }),
  ...summaryRow(applicability, "research", { id: "B5", label: "Research / Creative Guidance", max: 20, score: rowSum("research", 20) }),
  ...summaryRow(applicability, "consultancy", { id: "B6", label: "Consultancy, Training & Creative Commissions", max: 30, score: rowSum("consultancy", 30) }),
  ...summaryRow(applicability, "confs", { id: "B7", label: "Conference / FDP / Festival Contributions — Organised", max: 20, score: rowSum("confs", 20) }),
  ...summaryRow(applicability, "fdps", { id: "B8", label: "Conference / FDP / Industry-Studio Training Attended", max: 20, score: b8Score }),
  ...summaryRow(applicability, "awards", { id: "B9", label: "Research Awards, Fellowships, Reviewer & Citations", max: 20, score: rowSum("awards", 20) }),
  ...summaryRow(applicability, "innovation", { id: "B10", label: "Innovation, Start-ups & Technology Transfer", max: 20, score: rowSum("innovation", 20) }),
  ...summaryRow(applicability, "ict", { id: "B11", label: "ICT Content, MOOCs & E-Learning", max: 40, score: rowSum("ict", 40) }),
  ...summaryRow(applicability, "exhibitions", { id: "B12", label: "Exhibitions — Photography, Design & Applied Arts, Documentaries", max: 30, score: rowSum("exhibitions", 30) }),
  { isTotal: true, label: "Part B Total", max: maxScores.partB, score: partBTotal },
  { isGrandTotal: true, label: "Grand Total (Part A + Part B)", max: maxScores.grand, score: grandTotal },
  ],
  });
  };

  const navItems = [
    ...(canSelfSubmit ? [{ id: "myAppraisal", label: "My Appraisal", sub: "View your self-appraisal form" }] : []),
    ...(role !== "faculty" ? [{ id: "approvals", label: `Approvals (${pendingCount})`, sub: "Review faculty appraisals" }] : []),
  ];

  return (
    <DashboardLayout
      appInfo={APP_INFO}
      showLogoutModal={showLogoutModal}
      onCancelLogout={() => setShowLogoutModal(false)}
      containerStyle={{ display: "flex", minHeight: "100vh", fontFamily: "inherit", background: "#f8fafc", color: "#111827" }}
      mainStyle={{ flex: 1, padding: "40px", display: "flex", flexDirection: "column", gap: 24, overflowX: "auto", maxWidth: 1600, margin: "0 auto", width: "100%" }}
      sidebar={(
        <DashboardSidebar
          appInfo={APP_INFO}
          navItems={navItems}
          activeTab={activeTab === "my" ? "myAppraisal" : "approvals"}
          onTabSelect={(tabId) => {
            if (tabId === "myAppraisal") { setActiveTab("my"); setReviewing(null); }
            else { setActiveTab("approvals"); setReviewing(null); }
          }}
          showSectionSelector={activeTab === "my"}
          sectionTab={selfSectionView}
          onSectionChange={handleSelfSectionChange}
          profileSubtitle={`${roleLabel(role)} ${sessionStorage.getItem("department")?.split(" ")[0] || ""}`}
          onLogout={() => setShowLogoutModal(true)}
        />
      )}
    >
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 24px", boxShadow: "0 10px 28px rgba(17,24,39,0.06)", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: 0, lineHeight: 1.1 }}>{schoolDisplayName} — My Appraisal Form</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 13, color: "#6b7280", fontWeight: 600, flexWrap: "wrap" }}>
              <span>{form.info?.name || profile.name || sessionStorage.getItem("name") || "Faculty Member"}</span>
              <span>•</span>
              <span>{roleLabel(role)} Workflow Dashboard</span>
              <span>•</span>
              <span>Academic Year:</span>
              <select
                value={academicYear}
                onChange={(event) => handleAcademicYearChange(event.target.value)}
                style={{ height: 32, border: "1px solid #d1d5db", borderRadius: 8, padding: "0 10px", fontSize: 13, fontFamily: "inherit", color: "#374151", background: "#fff", outline: "none", fontWeight: 700 }}
              >
                {academicYearOptions.map((cycle) => (
                  <option key={cycle.academic_year} value={cycle.academic_year}>
                    {cycle.academic_year} {cycle.is_open ? "(Active)" : "(Closed / Read-Only)"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <AppraisalHeaderImage height={54} />
        </div>
      </div>

 {activeTab === "my" && canSelfSubmit && (
<div style={{ display: "grid", gap: 16 }}>
<div className="appraisal-status-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 344px", gap: 14, alignItems: "stretch" }}>
  <WorkflowTracker declaration={declaration} reviews={reviews} profile={{ ...profile, school: currentSchoolValue, appraisal_role: role }} />
  <div className="appraisal-progress-card" style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 10px 28px rgba(17,24,39,0.06)", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <div style={{ fontSize: 14, color: "#374151", fontWeight: 800 }}>Overall Progress</div>
      <div style={{ fontSize: 18, color: "#111827", fontWeight: 900 }}>{Math.round((totals.total / (totals.maxScores?.grand || 700)) * 100)}%</div>
    </div>
    <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
      <div style={{ width: `${Math.round((totals.total / (totals.maxScores?.grand || 700)) * 100)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#5b5ceb,#7c3aed)", transition: "width 300ms ease" }} />
    </div>
    <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>{totals.total.toFixed(1)} / {totals.maxScores?.grand || 700} Marks</div>
  </div>
</div>
<RejectionNotice
 declaration={declaration}
 reviews={reviews}
 form={form}
 status={declaration?.status || form.status}
 alertOnceKey={`${userEmail}:${academicYear}:${declaration?.status || form.status || ""}`}
/>
  {locked && (
    <div style={{ background: workflowRejected ? "#fef2f2" : isSelectedCycleClosed ? "#fbfbfe" : "#ecfdf5", border: `1px solid ${workflowRejected ? "#fecaca" : isSelectedCycleClosed ? "#ddd6fe" : "#bbf7d0"}`, color: workflowRejected ? "#991b1b" : isSelectedCycleClosed ? "#4c1d95" : "#166534", borderRadius: 9, padding: "10px 14px", fontSize: 12, fontWeight: 700 }}>
      {workflowRejected
        ? "This appraisal was rejected. Review the approval status in the tracker above."
        : isSelectedCycleClosed
          ? `This appraisal form for Academic Year ${academicYear} is closed for editing and displayed in Read-Only mode.`
          : "Submitted and locked for review. Your saved data is visible here, but editing is disabled while authorities review it."}
    </div>
  )}

  {isSelectedCycleClosed ? (
    <div className="fa-section-card appraisal-section-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 18px 50px rgba(17,24,39,0.08)", padding: 24, border: "1px solid #e5e7eb", borderTop: "3px solid #4c1d95" }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: "#4c1d95", marginBottom: 16 }}>Closed Appraisal Report — {academicYear}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          ["Academic Year", academicYear],
          ["Submitted Score", `${totals.total.toFixed(1)} / ${totals.maxScores?.grand || 700}`],
          ["Documents", `${Object.keys(docs).length} file${Object.keys(docs).length === 1 ? "" : "s"}`],
        ].map(([label, value]) => (
          <div key={label} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", background: "#f8fafc" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            <div style={{ marginTop: 5, fontSize: 16, color: "#111827", fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <button
          type="button"
          onClick={handleGenerateReport}
          style={{ padding: "10px 28px", background: "#4c1d95", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}
        >
          Generate Report
        </button>
      </div>
      <div style={{ marginTop: 22, borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
        <div style={{ fontSize: 14, color: "#374151", fontWeight: 900, marginBottom: 12 }}>Attachments</div>
        {Object.keys(docs).length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {Object.keys(docs).map((key) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) minmax(0, 1fr)", alignItems: "center", gap: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>{key}</div>
                <ViewDocsCell docKey={key} docs={docs} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#f8fafc" }}>No attachments found for this closed appraisal year.</div>
        )}
      </div>
    </div>
  ) : (<>
  {(selfSectionView === "partA" || selfSectionView === "partB" || selfSectionView === "partC" || selfSectionView === "partD") && (
<>
<DesignArtsForm
 form={form}
 setForm={setForm}
 docs={docs}
 setDocs={setDocs}
 mode="self"
 locked={locked}
 sectionView={selfSectionView}
/>
<SectionSaveFooter
 savingSection={savingSection}
 onSaveSection={handleSaveSelfSection}
 showNext={selfSectionView !== "partD"}
 onNext={() =>{
  if (selfSectionView === "partA") setSelfSectionView("partB");
  else if (selfSectionView === "partB") setSelfSectionView("partC");
  else if (selfSectionView === "partC") setSelfSectionView("partD");
  else if (selfSectionView === "partD") setSelfSectionView("summary");
 }}
 disabled={locked}
/>
</>
 )}
  {selfSectionView === "summary" && (
<div style={{ display: "grid", gap: 16 }}>
 {locked ?<StatusBadge status={declaration?.status || "Submitted"} />: (
<>
<AccuracyCheckbox checked={confirmed} onChange={setConfirmed} />
<label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "#334155", lineHeight: 1.5, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, cursor: "pointer" }}>
<input type="checkbox" checked={attachmentsConfirmed} onChange={(e) =>setAttachmentsConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
<span>I confirm that <strong>all required supporting documents and attachments have been uploaded</strong> against the respective entries. I understand that any <strong>missing or false attachment is my sole responsibility</strong> and may result in the rejection or revision of my appraisal.</span>
</label>
</>
 )}
<div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
<button onClick={generateSelfReport} style={smallButton("#4c1d95")}>
 Generate Report
</button>
<button onClick={handleSubmitAppraisal} disabled={submitting || locked || !confirmed || !attachmentsConfirmed} style={smallButton((locked || !confirmed || !attachmentsConfirmed) ? "#94a3b8" : "#059669")}>
 {locked ? "Submitted & Locked" : submitting ? "Submitting..." : "Submit Appraisal"}
</button>
</div>
</div>
      )}
    </>
  )}
</div>
  )}

 {activeTab === "approvals" && !reviewing && role !== "faculty" && (
<div>
 {/* - Queue header & live stats - */}
 {!loadingQueue && queue.length >0 && (
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
<div>
<div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Faculty Approvals Queue</div>
<div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Review and grade submitted appraisals</div>
</div>
<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
<span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Total: {queue.length}</span>
<span style={{ background: "#fef9c3", color: "#854d0e", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Pending: {queue.filter(i =>!isReviewerReviewComplete(i, role)).length}</span>
<span style={{ background: "#dcfce7", color: "#166534", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Reviewed: {queue.filter(i =>isReviewerReviewComplete(i, role)).length}</span>
</div>
</div>
 )}

 {/* - Loading indicator - */}
 {loadingQueue && (
<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: "#64748b", fontSize: 13 }}>
<div className="fa-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />
 Loading {schoolDisplayName} queue...
</div>
 )}

 {/* - Empty state - */}
 {!loadingQueue && queue.length === 0 && (
<div style={{ textAlign: "center", padding: "56px 24px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
<div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>Done</div>
<div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>All caught up!</div>
<div style={{ color: "#64748b", fontSize: 13 }}>No {schoolDisplayName} submissions are assigned to you at this time.</div>
</div>
 )}

 {/* - Faculty cards - */}
<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {queue.map((item) =>{
 const initials = (item.name || "?").trim().split(/\s+/).map(w =>w[0]).join("").substring(0, 2).toUpperCase();
 const mergedItem = mergeForm(emptyDesignArtsForm(), item);
 const facultyTotals = calculateDesignArtsTotals(mergedItem, "score");
 const reviewerTotals = calculateDesignArtsTotals(mergedItem, role);
 const hasReviewerScores = reviewerTotals.partA >0 || reviewerTotals.partB >0 || reviewerTotals.total >0;
 const pendingForRole = isPendingReviewStatusFor([item.status, item.workflowStatus, item.workflow_status], role);
 const reviewComplete = !pendingForRole && (isReviewerReviewComplete(item, role) || hasReviewerScores);
 const savedReviewerTotals = {
 partA: n(item?.[`${role}PartA`]),
 partB: n(item?.[`${role}PartB`]),
 total: n(item?.[`${role}Total`]),
 };
 const itemTotals = reviewComplete
 ? (hasReviewerScores ? reviewerTotals : { ...reviewerTotals, ...savedReviewerTotals })
 : facultyTotals;
 const scoreLabel = reviewComplete
 ? `${roleLabel(role)} score for ${item.submittedOn || "record"}`
 : `Submitted on ${item.submittedOn || "record"}`;
 const maxScores = itemTotals.maxScores || { partA: PART_A_MAX, partB: PART_B_MAX, grand: GRAND_MAX };
 return (
<div key={item.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderLeft: `4px solid ${reviewComplete ? "#22c55e" : ACCENT}`, overflow: "hidden" }}>
 {/* - Name / role / action row - */}
<div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
<div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0, letterSpacing: 0.5 }}>{initials}</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
<div style={{ fontSize: 12, color: "#64748b" }}>{titleCase(item.appraisalRole)} - {designArtsSchoolName(item)}</div>
</div>
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
<StatusBadge status={item.status} />
<button
 disabled={reviewLoading === item.id}
 onClick={async () =>{
 setReviewLoading(item.id);
 try {
 const data = await fetchSavedAppraisal({
 facultyEmail: item.email,
 academicYear: item.academic_year || item.academicYear || item.info?.ay || APP_INFO.DEFAULT_AY || "2026-2027",
 });
 const submittedForm = data?.payload?.form || data?.form || {};
 const submittedDocs = data?.payload?.docs || data?.docs || {};
 const mergedForm = preserveSavedReviewScores(submittedForm, item);
 const declaration = data?.declaration || item.declaration || null;
 setReviewing({ ...item, ...mergedForm, docs: submittedDocs, declaration, status: declaration?.status || data?.status || item.status, workflowStatus: declaration?.status || data?.workflowStatus || item.workflowStatus });
 } catch (err) {
 alert(`Unable to open submitted form.\n\n${err.message}`);
 } finally {
 setReviewLoading(null);
 }
 }}
 style={{ ...smallButton(reviewComplete ? "#1e293b" : ACCENT2), padding: "6px 14px", fontSize: 11, cursor: reviewLoading === item.id ? "wait" : "pointer", opacity: reviewLoading === item.id ? 0.7 : 1 }}
 >
 {reviewLoading === item.id ? "Loading..." : reviewComplete ? "View Review" : "Review Form"}
</button>
</div>
</div>
 {/* - Score metrics grid - */}
<div style={{ padding: "12px 18px 14px", background: "#fafbff", borderTop: "1px solid #f1f5f9" }}>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 20px", marginBottom: 8 }}>
 {[["Part A", itemTotals.partA, maxScores.partA, ACCENT], ["Part B", itemTotals.partB, maxScores.partB, ACCENT2], ["Grand Total", itemTotals.total, maxScores.grand, "#059669"]].map(([label, value, max, color]) =>(
<div key={label}>
<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
<span style={{ fontWeight: 600, color: "#475569" }}>{label}</span>
<span style={{ fontWeight: 700, color }}>{n(value).toFixed(1)}<span style={{ color: "#94a3b8", fontWeight: 500 }}>/{max}</span></span>
</div>
<div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
<div style={{ height: "100%", width: `${Math.min(100, max >0 ? (n(value) / max) * 100 : 0)}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
</div>
</div>
 ))}
</div>
<div style={{ fontSize: 10, color: "#94a3b8", textAlign: "right" }}>{scoreLabel}</div>
</div>
</div>
 );
 })}
</div>
</div>
 )}

 {activeTab === "approvals" && reviewing && (
<DesignArtsAuthorityReviewPanel
 person={reviewing}
 reviewerRole={role}
 onBack={() =>setReviewing(null)}
 onSubmit={handleSubmitReview}
 readOnly={isReviewerReviewComplete(reviewing, role)}
 />
 )}
    </DashboardLayout>
  );
}

const thStyle = { border: "1px solid #334155", padding: "7px 8px", background: "#1e293b", color: "#e2e8f0", fontWeight: 800, textAlign: "center", fontSize: 10, whiteSpace: "nowrap", letterSpacing: "0.3px" };
const tdStyle = { border: "1px solid #e2e8f0", padding: "5px 7px", verticalAlign: "middle", minWidth: 120 };
const tdCenter = { ...tdStyle, textAlign: "center", minWidth: 70 };
const smallButton = (background) =>({ padding: "8px 14px", background, color: "#fff", border: "none", borderRadius: 7, cursor: background === "#94a3b8" ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit" });
const navButton = (active) =>({ width: "100%", border: "none", borderLeft: `3px solid ${active ? ACCENT : "transparent"}`, background: active ? `${ACCENT}33` : "transparent", color: active ? "#fbbf24" : "#cbd5e1", borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", fontWeight: 800, fontFamily: "inherit" });





