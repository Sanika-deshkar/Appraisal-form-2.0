/* eslint-disable no-unused-vars, no-undef, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, LogoutConfirmModal, ScoreBar, StatusBadge } from "../components/dashboard/dashboardPrimitives";
import { getSchoolKey } from "../constants/universityHierarchy";
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
} from "../features/faculty-appraisal";
import { canReviewerRejectProfile, getReviewChain, pendingStatusFor, profileFromsessionStorage, reviewedStatusFor, roleLabel, visiblePreviousReviewRoles, workflowValidationError, isAppraisalFinalisedByVc, isRejectedStatus, isPendingReviewStatusFor, hasActiveRejection, reviewListFrom } from "../utils/hierarchy";
import { n, pct, RO, TI } from "../features/faculty-appraisal/shared";

import { emptyMediaForm, ALL_ARRAY_KEYS, titleCase, calculateMediaTotals, getMediaEffectiveMaxScores, validateMediaBeforeSubmit, mergeForm, preserveSavedReviewScores, PART_A_SECTIONS, PART_B_SECTIONS, MediaForm, MediaCommAuthorityReviewPanel, SectionSelector, AccuracyCheckbox, CompactAuthoritySummaryCard, isReviewerReviewComplete, normalizeScoresForSubmit, summaryRowIfApplicable } from "../components/appraisal/mediaCommunication/MediaCommunicationAppraisalForm";
export default function MediaCommDashboard({ fixedRole }) {
 const navigate = useNavigate();
 const role = fixedRole || sessionStorage.getItem("role") || "faculty";
 const profile = profileFromsessionStorage();
 const [activeTab, setActiveTab] = useState(role === "faculty" ? "my" : "approvals");
 const [selfSectionView, setSelfSectionView] = useState("partA");
 const [form, setForm] = useState(emptyMediaForm);
 const [docs, setDocs] = useState({});
 const [queue, setQueue] = useState([]);
 const [reviewing, setReviewing] = useState(null);
 const [reviewLoading, setReviewLoading] = useState(null);
 const [loadingQueue, setLoadingQueue] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [confirmed, setConfirmed] = useState(false);
 const [attachmentsConfirmed, setAttachmentsConfirmed] = useState(false);

 const [showLogoutModal, setShowLogoutModal] = useState(false);
 const [sectionSaveStatus, setSectionSaveStatus] = useState({ partA: true, partB: true });
 const [savingSection, setSavingSection] = useState(null);
 const [declaration, setDeclaration] = useState(null);
 const [reviews, setReviews] = useState([]);
 const userEmail = sessionStorage.getItem("username") || "";
 const academicYear = form.info?.ay || "2025-2026";
 const workflowRejected = hasActiveRejection(declaration, reviews);
 const locked = Boolean(declaration) && !workflowRejected;
 const totals = calculateMediaTotals(form, "score");
 const canSelfSubmit = role !== "vc";

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
 ["setSectionApplicability", (value) =>setForm((prev) =>({ ...prev, sectionApplicability: { ...(prev.sectionApplicability || {}), ...(value || {}) } }))],
 ["setSectionSaveStatus", (value) =>setSectionSaveStatus((prev) =>({ ...prev, ...(value || {}) }))],
 ]), []);

 useEffect(() =>{
 if (!userEmail || !academicYear || !canSelfSubmit) return;
 const loadAll = async () =>{
 const data = await api.get("/appraisal/status", { params: { academic_year: academicYear } }).catch((err) =>{
 console.error("Could not load workflow status:", err);
 return null;
 });
 const declarationRow = data?.declaration || null;
 const loadedReviews = reviewListFrom(data?.reviews);
 setDeclaration(declarationRow);
 setReviews(loadedReviews);
 await Promise.all([
 loadSavedAppraisal({ facultyEmail: userEmail, academicYear, setters }),
 loadAppraisalDocuments({ facultyEmail: userEmail, academicYear, setDocs }),
 ]);
 };
 loadAll().catch((err) =>console.error("Could not load SoMCS appraisal:", err));
 }, [userEmail, academicYear, setters, canSelfSubmit]);

 const loadQueue = async () =>{
 if (role === "faculty") return;
 setLoadingQueue(true);
 try {
 const items = await fetchReviewQueueForRole({
 reviewerRole: role,
 reviewerProfile: { ...profile, appraisal_role: role },
 schoolValues: FORM_SCHOOL_CODES[FORM_TYPES.MEDIA_COMM],
 });
 setQueue(items.filter((item) =>FORM_SCHOOL_CODES[FORM_TYPES.MEDIA_COMM].includes(getSchoolKey(item.school))));
 } catch (err) {
 console.error("Could not load SoMCS review queue:", err);
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
 setSavingSection(section);
 try {
 await saveAppraisalDraftSection({
 facultyEmail: userEmail,
 academicYear,
 form: { ...form, sectionSaveStatus: nextStatus },
 docs,
 totals: {
 partATotal: totals.partA,
 partBTotal: totals.partB,
 grandTotal: totals.total,
 effectivePartAMax: totals.maxScores.partA,
 effectivePartBMax: totals.maxScores.partB,
 effectiveGrandMax: totals.maxScores.grand,
 },
 submitterProfile: { ...profile, appraisal_role: role },
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
 if (!confirmed || !attachmentsConfirmed) {
 alert("Please tick both declaration checkboxes before submitting.");
 return;
 }
 if (!userEmail) {
 navigate("/login", { replace: true });
 return;
 }
 const submitterProfile = { ...profile, appraisal_role: role };
 const workflowError = workflowValidationError(submitterProfile);
 if (workflowError) {
 alert(workflowError);
 return;
 }
 const normalizedForm = normalizeScoresForSubmit(form);
 const validationErrors = validateMediaBeforeSubmit(normalizedForm, docs);
 if (validationErrors.length) {
 alert(validationErrors.join("\n"));
 return;
 }
 setSubmitting(true);
 try {
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
 form: normalizedForm,
 docs,
 submitterProfile,
 activeProfile: submitterProfile,
 });
 setDeclaration({ status: pendingStatusFor(getReviewChain({ ...profile, appraisal_role: role })[0]), submitted_at: new Date().toISOString() });
 alert("SoMCS appraisal submitted successfully.");
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
 academicYear: item.academicYear || item.academic_year || item.info?.ay || APP_INFO.DEFAULT_AY || "2025-2026",
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

 const openSubmittedReview = async (item) =>{
 setReviewLoading(item.id);
 try {
 const data = await fetchSavedAppraisal({
 facultyEmail: item.email,
 academicYear: item.academic_year || item.academicYear || item.info?.ay || APP_INFO.DEFAULT_AY || "2025-2026",
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
 };

 const generateSelfReport = async () =>{
 const applicability = form.sectionApplicability || {};
 const rowSum = (key, max) =>applicability[key] === "notApplicable" ? 0 : scoreSectionRows(key, form[key] || [], max, "score");
 const lecScore = applicability["lectures"] === "notApplicable" ? 0 : averageSectionScore(form.lectures || [], 50, "score");
 const cfScore = applicability["courseFile"] === "notApplicable" ? 0 : averageSectionScore(form.courseFile || [], 20, "score");
 const innovScore = clampScore(
 Array.isArray(form.innovRows)
 ? form.innovRows.reduce((t, r) =>t + clampScore(r.score, SCORE_LIMITS.innovativeRow), 0)
 : innovativeTeachingScore(form.innovDetails, form.innovScore, 10),
 10,
 );
 const projScore = rowSum("projects", 10);
 const qualScore = rowSum("quals", 10);
 const fbScore = feedbackSectionScore(form.feedback || [], 10);
 const deptScore = rowSum("deptActs", 20);
 const uniScore = rowSum("uniActs", 30);
 const socScore = rowSum("society", 10);
 const acrScore = 0;
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
 const maxScores = getMediaEffectiveMaxScores(form, { self: true });
 const partATotal = clampScore(lecScore + cfScore + innovScore + projScore + qualScore + fbScore + deptScore + uniScore + socScore, maxScores.partA);
 const partBTotal = clampScore(b1iScore + b1iiScore + b2Score + b3Score + b4aScore + b4bScore + b4cScore + b5Score + b6Score + b7aScore + b7bScore + b8Score, maxScores.partB);
 const grandTotal = clampScore(partATotal + partBTotal, maxScores.grand);
 await generateMediaCommReport({
 title: "SoMCS Faculty Appraisal Report",
 subtitle: "School of Media & Communication Studies",
 form,
 docs,
 partASections: PART_A_SECTIONS.map((section) =>section.key === "acr" ? { ...section, max: 0, title: "(x) Annual Confidential Report (ACR) - Not counted in self score" } : section),
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
 ...summaryRowIfApplicable(applicability, "lectures", { id: "A(i)", label: "Lectures / Tutorials / Practicals", max: 50, score: lecScore }),
 ...summaryRowIfApplicable(applicability, "courseFile", { id: "A(ii)", label: "Course File", max: 20, score: cfScore }),
 { id: "A(iii)", label: "Innovative Teaching-Learning Methodologies", max: 10, score: innovScore },
 ...summaryRowIfApplicable(applicability, "projects", { id: "A(iv)", label: "Project Guidance", max: 10, score: projScore }),
 ...summaryRowIfApplicable(applicability, "quals", { id: "A(v)", label: "Qualification Enhancement", max: 10, score: qualScore }),
 ...summaryRowIfApplicable(applicability, "feedback", { id: "A(vi)", label: "Students' Feedback", max: 10, score: fbScore }),
 ...summaryRowIfApplicable(applicability, "deptActs", { id: "A(vii)", label: "Departmental / School Activities", max: 20, score: deptScore }),
 ...summaryRowIfApplicable(applicability, "uniActs", { id: "A(viii)", label: "University Level Activities", max: 30, score: uniScore }),
 ...summaryRowIfApplicable(applicability, "society", { id: "A(ix)", label: "Contribution to Society", max: 10, score: socScore }),
 { id: "A(x)", label: "Annual Confidential Report (ACR)", max: "N/A", score: 0 },
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

 const pendingCount = queue.filter((item) =>item.status === "Pending Review").length;

 return (
<div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit" }}>
<aside style={{ width: 230, height: "100vh", minHeight: "100vh", position: "sticky", top: 0, alignSelf: "flex-start", boxSizing: "border-box", overflow: "hidden", background: "#0f172a", color: "#f8fafc", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 14, borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "2px 0 16px rgba(15,23,42,0.14)" }}>
<div style={{ borderBottom: "1px solid #1e293b", paddingBottom: 14 }}>
<div style={{ fontSize: 13, fontWeight: 900 }}>{APP_INFO.PORTAL_NAME}</div>
<div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>Media & Communication</div>
</div>
 {canSelfSubmit && (
<>
<button onClick={() =>{ setActiveTab("my"); setReviewing(null); }} style={navButton(activeTab === "my")}>My Appraisal</button>
 {activeTab === "my" && (
<label style={{ display: "grid", gap: 6, padding: "0 10px 4px 16px", fontSize: 10, color: "#94a3b8", fontWeight: 800 }}>
 Appraisal Section
<select
 value={selfSectionView}
 onChange={(event) =>handleSelfSectionChange(event.target.value)}
 style={{ height: 34, border: "1px solid #334155", borderRadius: 7, background: "#1e293b", color: "#f8fafc", padding: "0 9px", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}
 >
 {SECTION_OPTIONS.map((option) =><option key={option.value} value={option.value} disabled={!isSelfSectionOpen(option.value)}>{option.label}</option>)}
</select>
</label>
 )}
</>
 )}
 {role !== "faculty" &&<button onClick={() =>{ setActiveTab("approvals"); setReviewing(null); }} style={navButton(activeTab === "approvals")}>Approvals ({pendingCount})</button>}
<button onClick={() =>{ window.open('/faculty-appraisal-guidelines.pdf', '_blank'); }} style={navButton(false)}>Guidelines</button>
<div style={{ marginTop: "auto", borderTop: "1px solid #1e293b", paddingTop: 12, display: "grid", gap: 10 }}>
<button
 type="button"
 onClick={() =>navigate("/edit-profile")}
 title="Edit profile"
 style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
 >
<Avatar initials={userInitials(sessionStorage.getItem("name"))} color={ACCENT} size={34} />
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
 {(sessionStorage.getItem("name") || "User").split(" ").slice(0, 2).join(" ")}
</div>
<div style={{ color: "#475569", fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
 {roleLabel(role)} {sessionStorage.getItem("department")?.split(" ")[0] || ""}
</div>
</div>
</button>
<div style={{ margin: "8px 0", padding: "10px 12px", background: "rgba(37,99,235,0.15)", border: "1px solid #2563eb", borderRadius: 8 }}>
<div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>For any queries</div>
<a href="mailto:appraisal@dypiu.ac.in" style={{ color: "#60a5fa", fontWeight: 600, fontSize: 11, wordBreak: "break-all", textDecoration: "none" }}>appraisal@dypiu.ac.in</a>
</div>
<button
 onClick={() =>setShowLogoutModal(true)}
 style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: "none", border: "1px solid #374151", borderRadius: 8, padding: "9px 11px", cursor: "pointer", fontFamily: "inherit" }}
 onMouseEnter={(event) =>{ event.currentTarget.style.background = "#1e293b"; }}
 onMouseLeave={(event) =>{ event.currentTarget.style.background = "none"; }}
 >
<span style={{ color: "#f87171", fontWeight: 700, fontSize: 12 }}>Logout</span>
</button>
</div>
</aside>
<main style={{ flex: 1, padding: "20px 24px", overflowX: "auto" }}>
<div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
<div>
<h2 style={{ margin: 0, color: "#0f172a", fontSize: 21 }}>School of Media & Communication Studies</h2>
<div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{roleLabel(role)} workflow dashboard</div>
</div>
<AppraisalHeaderImage />
</div>

 {activeTab === "my" && canSelfSubmit && (
<div style={{ display: "grid", gap: 16 }}>
<WorkflowTracker declaration={declaration} reviews={reviews} profile={{ ...profile, appraisal_role: role }} />
<RejectionNotice
 declaration={declaration}
 reviews={reviews}
 form={form}
 status={declaration?.status || form.status}
 alertOnceKey={`${userEmail}:${academicYear}:${declaration?.status || form.status || ""}`}
/>
 {(selfSectionView === "partA" || selfSectionView === "partB") && (
<>
<MediaForm
 form={form}
 setForm={setForm}
 docs={docs}
 setDocs={setDocs}
 mode="self"
 locked={locked}
 sectionView={selfSectionView}
 />
 {!locked && (
<SectionSaveFooter
 variant="card"
 label={selfSectionView === "partA" ? "Part A" : "Part B"}
 saved={Boolean(sectionSaveStatus[selfSectionView])}
 saving={savingSection === selfSectionView}
 locked={locked}
 onSave={() =>handleSaveSelfSection(selfSectionView)}
 />
 )}
</>
 )}
 {selfSectionView === "summary" && (
<div style={{ display: "grid", gap: 16 }}>
<SummaryBox totals={totals} maxScores={totals.maxScores} roleScoreLabel="Faculty/self appraisal score from the Media & Communication form." />
<SummaryOtherInfoField
 value={form.summaryOtherInfo}
 onChange={(value) =>setForm((prev) =>({ ...prev, summaryOtherInfo: value }))}
 readOnly={locked}
/>
<div style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
 {locked ?<StatusBadge status={declaration?.status || "Submitted"} />: (
<>
<AccuracyCheckbox checked={confirmed} onChange={setConfirmed} />
<label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "#334155", lineHeight: 1.5, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, cursor: "pointer" }}>
<input type="checkbox" checked={attachmentsConfirmed} onChange={(e) =>setAttachmentsConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
<span>I confirm that<strong>all required supporting documents and attachments have been uploaded</strong>against the respective entries. I understand that any<strong>missing or false attachment is my sole responsibility</strong>and may result in the rejection or revision of my appraisal.</span>
</label>
</>
 )}
<div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
<button onClick={generateSelfReport} style={smallButton("#4c1d95")}>
 Generate Report
</button>
<button onClick={handleSubmitAppraisal} disabled={submitting || locked || !confirmed || !attachmentsConfirmed} style={smallButton((locked || !confirmed || !attachmentsConfirmed) ? "#94a3b8" : "#059669")}>
 {locked ? "Appraisal Locked" : submitting ? "Submitting..." : "Submit Appraisal"}
</button>
</div>
</div>
</div>
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
 Loading SoMCS queue...
</div>
 )}

 {/* - Empty state - */}
 {!loadingQueue && queue.length === 0 && (
<div style={{ textAlign: "center", padding: "56px 24px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
<div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>Done</div>
<div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>All caught up!</div>
<div style={{ color: "#64748b", fontSize: 13 }}>No SoMCS submissions are assigned to you at this time.</div>
</div>
 )}

 {/* - Faculty cards - */}
<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {queue.map((item) =>{
 const initials = (item.name || "?").trim().split(/\s+/).map(w =>w[0]).join("").substring(0, 2).toUpperCase();
 const mergedItem = mergeForm(emptyMediaForm(), item);
 const facultyTotals = calculateMediaTotals(mergedItem, "score");
 const reviewerTotals = calculateMediaTotals(mergedItem, role);
 const hasReviewerScores = reviewerTotals.partA >0 || reviewerTotals.partB >0 || reviewerTotals.total >0;
 const pendingForRole = isPendingReviewStatusFor([item.status, item.workflowStatus, item.workflow_status], role);
 const reviewComplete = !pendingForRole && (isReviewerReviewComplete(item, role) || hasReviewerScores);
 const maxScores = {
 partA: n(item.effectivePartAMax) || facultyTotals.maxScores.partA,
 partB: n(item.effectivePartBMax) || facultyTotals.maxScores.partB,
 grand: n(item.effectiveGrandMax) || facultyTotals.maxScores.grand,
 };
 const itemTotals = {
 partA: n(item.selfPartA ?? item.partATotal),
 partB: n(item.selfPartB ?? item.partBTotal),
 total: n(item.selfTotal ?? item.grandTotal),
 };
 const scoreLabel = `Submitted on ${item.submittedOn || "record"}`;
 return (
<div key={item.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", borderLeft: `4px solid ${reviewComplete ? "#22c55e" : ACCENT}`, overflow: "hidden" }}>
 {/* - Name / role / action row - */}
<div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
<div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0, letterSpacing: 0.5 }}>{initials}</div>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
<div style={{ fontSize: 12, color: "#64748b" }}>{titleCase(item.appraisalRole)} - {item.school}</div>
</div>
<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
<StatusBadge status={item.status} />
<button
 disabled={reviewLoading === item.id}
 onClick={() =>openSubmittedReview(item)}
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
<MediaCommAuthorityReviewPanel
 person={reviewing}
 reviewerRole={role}
 onBack={() =>setReviewing(null)}
 onSubmit={handleSubmitReview}
 readOnly={isReviewerReviewComplete(reviewing, role)}
 />
 )}
</main>
 {showLogoutModal && (
<LogoutConfirmModal
 onCancel={() =>setShowLogoutModal(false)}
 onConfirm={() =>{
 setShowLogoutModal(false);
 sessionStorage.clear();
 navigate("/login", { replace: true });
 }}
 />
 )}
</div>
 );
}

const thStyle = { border: "1px solid #334155", padding: "7px 8px", background: "#1e293b", color: "#e2e8f0", fontWeight: 800, textAlign: "center", fontSize: 10, whiteSpace: "nowrap", letterSpacing: "0.3px" };
const tdStyle = { border: "1px solid #e2e8f0", padding: "5px 7px", verticalAlign: "middle", minWidth: 120 };
const tdCenter = { ...tdStyle, textAlign: "center", minWidth: 70 };
const smallButton = (background) =>({ padding: "8px 14px", background, color: "#fff", border: "none", borderRadius: 7, cursor: background === "#94a3b8" ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit" });
const navButton = (active) =>({ width: "100%", border: "none", borderLeft: `3px solid ${active ? ACCENT : "transparent"}`, background: active ? `${ACCENT}33` : "transparent", color: active ? "#fbbf24" : "#cbd5e1", borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", fontWeight: 800, fontFamily: "inherit" });




