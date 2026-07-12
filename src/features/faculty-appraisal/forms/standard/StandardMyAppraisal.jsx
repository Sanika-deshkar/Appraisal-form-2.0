/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../services/api";
import {
  ACR_DETAIL_POINTS,
  APP_INFO,
  createAcrRows,
} from "../../config";
import {
  loadAppraisalDocuments,
  loadSavedAppraisal,
  saveAppraisalDraftSection,
  submitAppraisal,
} from "../../services";
import {
  SCORE_LIMITS,
  averageSectionScore,
  clampScore,
  courseFileAverageScore,
  effectiveMaxScore,
  feedbackAverage,
  feedbackRowScore,
  feedbackSectionScore,
  isValidDDMMYYYY,
  maskDateDDMMYYYY,
  normalizeAutoScores,
  projectGuidanceRowMax,
  researchGuidanceScore,
  selfEffectivePartAMax,
  societyRowLocked,
  societyRowScore,
  sumSectionScore,
  validateCompleteRows,
} from "../../utils";
import {
  AppraisalHeaderImage,
  DocCell,
  RejectionNotice,
  RowButtons as RowBtns,
  SectionCard as SC,
  SectionSaveFooter,
  SummaryOtherInfoField,
  T,
  TD,
  TDC,
  TDS,
  TH,
  ViewCell,
} from "../../components";
import {
  n,
  pct,
  reportExperience,
  reportQualification,
  reportTextValue,
  RO,
  TI,
  WorkflowStatusTracker,
} from "../../shared";
import {
  getReviewChain,
  hasActiveRejection,
  pendingStatusFor,
  profileFromsessionStorage,
  reviewListFrom,
  roleLabel,
  workflowValidationError,
} from "../../../../utils/hierarchy";

export default function StandardMyAppraisal({
  sectionTab,
  onSectionTabChange,
  showSectionSelector = false,
  defaultDesignation = sessionStorage.getItem("designation") || "",
  defaultAcademicYear = "2025-2026",
  titleNameFallback = "Faculty",
  subtitleSeparator = ".",
} = {}) {
  const navigate = useNavigate();
  const [localAppraisalTab, setLocalAppraisalTab] = useState("partA");
  const hodAppraisalTab = sectionTab || localAppraisalTab;
  const setHodAppraisalTab = onSectionTabChange || setLocalAppraisalTab;

  // -- HOD's own appraisal form state --
  const [info, setInfo] = useState({
    name: sessionStorage.getItem("name") || "",
    qual: sessionStorage.getItem("qualification") || "",
    desig: defaultDesignation,
    school: sessionStorage.getItem("school") || sessionStorage.getItem("department") || "",
    experience: sessionStorage.getItem("experience") || "",
    expDyp: "",
    expPrev: "",
    expTotal: "",
    ay: defaultAcademicYear
  });
  const inf = (k) => (v) => setInfo((p) => ({ ...p, [k]: v }));

  const [lectures, setLectures] = useState([
    { sem: "", code: "", planned: "", conducted: "", score: "", hod: "", director: "" },
  ]);
  const setLec = (i, k, v) => setLectures((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [courseFile, setCourseFile] = useState([{ course: "", title: "", details: "", score: "", hod: "", director: "" }]);
  const setCF = (i, k, v) => setCourseFile((p) => p.map((r, j) => {
    if (j !== i) return r;
    const next = { ...r, [k]: v };
    return next;
  }));
  const [innovScore, setInnovScore] = useState("");
  const [innovDetails, setInnovDetails] = useState("");
  const [innovRows, setInnovRows] = useState([{ method: "", details: "", score: "" }]);
  const setInnov = (i, k, v) => setInnovRows((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const [projects, setProjects] = useState([
    { label: "", score: "", hod: "", director: "" },
  ]);
  const setProj = (i, k, v) => setProjects((p) => p.map((r, j) => {
    if (j !== i) return r;
    const next = { ...r, [k]: k === "score" ? String(clampScore(v, projectGuidanceRowMax(r)) || "") : v };
    return k === "label" ? { ...next, score: String(clampScore(next.score, projectGuidanceRowMax(next)) || "") } : next;
  }));

  const [quals, setQuals] = useState([
    { label: "", score: "", hod: "", director: "" },
  ]);
  const setQual = (i, k, v) => setQuals((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [feedback, setFeedback] = useState([
    { code: "", fb1: "", fb2: "", score: "", hod: "", director: "" },
  ]);
  const setFb = (i, k, v) => setFeedback((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [deptActs, setDeptActs] = useState([
    { activity: "", nature: "", score: "", hod: "", director: "" },
  ]);
  const setDept = (i, k, v) => setDeptActs((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [uniActs, setUniActs] = useState([
    { activity: "", nature: "", score: "", hod: "", director: "" },
  ]);
  const setUni = (i, k, v) => setUniActs((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [society, setSociety] = useState([
    { label: "", details: "", score: "", hod: "", director: "" },
  ]);
  const setSoc = (i, k, v) => setSociety((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [industry, setIndustry] = useState([
    { name: "", details: "", score: "", hod: "", director: "" },
  ]);
  const setInd = (i, k, v) => setIndustry((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [acr, setAcr] = useState(createAcrRows);
  const setAcrRow = (i, k, v) => setAcr((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [journals, setJournals] = useState([
    { title: "", journal: "", issn: "", index: "", score: "", hod: "", director: "" },
  ]);
  const setJour = (i, k, v) => setJournals((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [books, setBooks] = useState([
    { title: "", book: "", issn: "", pub: "", coauth: "", first: "", score: "", hod: "", director: "" },
  ]);
  const setBook = (i, k, v) => setBooks((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [ict, setIct] = useState([
    { title: "", desc: "", type: "", quad: "", score: "", hod: "", director: "" },
  ]);
  const setIctRow = (i, k, v) => setIct((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [research, setResearch] = useState([
    { degree: "", name: "", thesis: "", score: "", hod: "", director: "" },
  ]);
  const setRes = (i, k, v) => setResearch((p) => p.map((r, j) => {
    if (j !== i) return r;
    const next = { ...r, [k]: v };
    return ["degree", "name", "thesis"].includes(k)
      ? { ...next, score: next.name || next.thesis ? String(researchGuidanceScore(next)) : "" }
      : next;
  }));

  const [projects2, setProjects2] = useState([
    { title: "", agency: "", date: "", amount: "", role: "", status: "", score: "", hod: "" },
  ]);
  const setPrj2 = (i, k, v) => setProjects2((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [externalProjects, setExternalProjects] = useState([
    { title: "", agency: "", date: "", amount: "", role: "", status: "", score: "", hod: "" },
  ]);
  const setExtPrj = (i, k, v) => setExternalProjects((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [patents, setPatents] = useState([
    { title: "", type: "", date: "", status: "", fileNo: "", score: "", hod: "", director: "" },
  ]);
  const setPat = (i, k, v) => setPatents((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [awards, setAwards] = useState([
    { title: "", date: "", agency: "", level: "", score: "", hod: "", director: "" },
  ]);
  const setAwd = (i, k, v) => setAwards((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [confs, setConfs] = useState([
    { title: "", type: "", org: "", level: "", score: "", hod: "", director: "" },
  ]);
  const setConf = (i, k, v) => setConfs((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [proposals, setProposals] = useState([
    { title: "", duration: "", agency: "", amount: "", score: "", hod: "", director: "" },
  ]);
  const setProp = (i, k, v) => setProposals((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [products, setProducts] = useState([
    { details: "", usage: "", score: "", hod: "", director: "" },
  ]);
  const setProd = (i, k, v) => setProducts((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [fdps, setFdps] = useState([
    { program: "", duration: "", org: "", score: "", hod: "", director: "" },
  ]);
  const setFdp = (i, k, v) => setFdps((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [training, setTraining] = useState([
    { company: "", duration: "", nature: "", score: "", hod: "", director: "" },
  ]);
  const setTrain = (i, k, v) => setTraining((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [docs, setDocs] = useState({});
  const [sectionApplicability, setSectionApplicability] = useState({ projects: "applicable", research: "applicable", society: "applicable" });
  const [appraisalLocked, setAppraisalLocked] = useState(false);
  const [sectionSaveStatus, setSectionSaveStatus] = useState({ partA: false, partB: false });
  const [summaryOtherInfo, setSummaryOtherInfo] = useState("");
  const [savingSection, setSavingSection] = useState(null);
  const [workflowDeclaration, setWorkflowDeclaration] = useState(null);
  const [workflowReviews, setWorkflowReviews] = useState([]);

  useEffect(() => {
    const userEmail = sessionStorage.getItem("username");
    if (!userEmail || !info.ay) return;

    const loadOwnAppraisal = async () => {
      try {
        const data = await api.get("/appraisal/status", { params: { academic_year: info.ay } }).catch((err) => {
          console.error("Could not load workflow status:", err);
          return null;
        });
        const declaration = data?.declaration || null;
        setWorkflowDeclaration(declaration);
        const loadedReviews = reviewListFrom(data?.reviews);
        setWorkflowReviews(loadedReviews);
        setAppraisalLocked(Boolean(declaration) && !hasActiveRejection(declaration, loadedReviews));

        await Promise.all([
          loadSavedAppraisal({
            facultyEmail: userEmail,
            academicYear: info.ay,
            setters: {
              setInfo, setLectures, setCourseFile, setInnovRows, setInnovDetails, setInnovScore,
              setProjects, setQuals, setFeedback, setDeptActs, setUniActs,
              setSociety, setIndustry, setAcr, setJournals, setBooks, setIct,
              setResearch, setProjects2, setExternalProjects, setPatents, setAwards,
              setConfs, setProposals, setProducts, setFdps, setTraining, setDocs,
              setSummaryOtherInfo, setSectionApplicability, setSectionSaveStatus,
            },
          }),
          loadAppraisalDocuments({ facultyEmail: userEmail, academicYear: info.ay, setDocs }),
        ]);
      } catch (err) {
        console.error("Could not load saved appraisal:", err);
      }
    };

    loadOwnAppraisal();
  }, [info.ay]);

  // -- Computed scores for HOD appraisal --
  const totalLecScore = averageSectionScore(lectures, 50);
  const courseFileScore = courseFileAverageScore(courseFile, 20);
  const innovTotal = clampScore(innovRows.reduce((s, r) => s + clampScore(r.score, SCORE_LIMITS.innovativeRow), 0), 10);
  const innovScoreComputed = String(innovTotal);
  const projectTotal = sectionApplicability.projects === "notApplicable" ? 0 : sumSectionScore(projects, 10, "score", projectGuidanceRowMax);
  const qualTotal = sumSectionScore(quals, 10, "score", SCORE_LIMITS.qualificationRow);
  const teachingRaw = totalLecScore + courseFileScore + innovTotal + projectTotal + qualTotal;
  const stuFeedbackScore = feedbackSectionScore(feedback, 10);
  const deptScore = sumSectionScore(deptActs, 20);
  const uniScore = sumSectionScore(uniActs, 30);
  const societyScore = sectionApplicability.society === "notApplicable" ? 0 : clampScore(society.reduce((total, row) => total + societyRowScore(row), 0), 10);
  const industryScore = sumSectionScore(industry, 5);
  const acrScore = 0;
  const teachingMax = sectionApplicability.projects === "notApplicable" ? 90 : 100;
  const effectivePartAMax = selfEffectivePartAMax(200, sectionApplicability, [{ key: "projects", max: 10 }, { key: "society", max: 10 }]);
  const partATotal = clampScore(teachingRaw + stuFeedbackScore + deptScore + uniScore + societyScore + industryScore + acrScore, effectivePartAMax);

  const journalScore = sumSectionScore(journals, 120);
  const bookScore = sumSectionScore(books, 50);
  const ictScore = sumSectionScore(ict, 20);
  const researchScore = sectionApplicability.research === "notApplicable" ? 0 : clampScore(research.reduce((total, row) => total + researchGuidanceScore(row), 0), 30);
  const projectBScore = sumSectionScore(projects2, SCORE_LIMITS.researchInternalProjects);
  const externalProjectScore = sumSectionScore(externalProjects, SCORE_LIMITS.researchExternalProjects);
  const patentScore = sumSectionScore(patents, 40);
  const awardScore = sumSectionScore(awards, 10);
  const confScore = sumSectionScore(confs, 30);
  const proposalScore = sumSectionScore(proposals, 10);
  const productScore = sumSectionScore(products, 10);
  const fdpScore = fdps.reduce((s, r) => s + clampScore(parseFloat(r.score) || 0, SCORE_LIMITS.fdpRow), 0);
  const trainScore = training.reduce((s, r) => s + clampScore(parseFloat(r.score) || 0, SCORE_LIMITS.fdpRow), 0);
  const b8Score = clampScore(fdpScore + trainScore, 10);
  const researchGuidanceProjectMax = sectionApplicability.research === "notApplicable" ? 45 : 75;
  const effectivePartBMax = effectiveMaxScore(375, sectionApplicability, [{ key: "research", max: 30 }]);
  const effectiveGrandMax = effectivePartAMax + effectivePartBMax;
  const partBTotal = clampScore(journalScore + bookScore + ictScore + researchScore + projectBScore + externalProjectScore + patentScore + awardScore + confScore + proposalScore + productScore + b8Score, effectivePartBMax);
  const grandTotal = clampScore(partATotal + partBTotal, effectiveGrandMax);

  const partAMarksPercentage = effectivePartAMax > 0 ? ((partATotal / effectivePartAMax) * 100).toFixed(2) : "0.00";
  const partBMarksPercentage = effectivePartBMax > 0 ? ((partBTotal / effectivePartBMax) * 100).toFixed(2) : "0.00";
  const totalMarksPercentage = effectiveGrandMax > 0 ? ((grandTotal / effectiveGrandMax) * 100).toFixed(2) : "0.00";

  const gradeFunc = () => {
    const p = pct(grandTotal, effectiveGrandMax);
    if (p >= 85) return { label: "Outstanding", color: "#10b981" };
    if (p >= 70) return { label: "Very Good", color: "#3b82f6" };
    if (p >= 55) return { label: "Good", color: "#f59e0b" };
    if (p >= 40) return { label: "Satisfactory", color: "#f97316" };
    return { label: "Needs Improvement", color: "#ef4444" };
  };
  const g = gradeFunc();
  const [submitting, setSubmitting] = useState(false);
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);
  const [attachmentsConfirmed, setAttachmentsConfirmed] = useState(false);

  const validateSelfAppraisalRows = () => {
    const sections = [
      { label: "A(i). Lectures", rows: lectures, fields: ["sem", "code", "planned", "conducted", "score"] },
      { label: "A(ii). Course File", rows: courseFile, fields: ["course", "title", "details"] },
      { label: "A(iii). Innovative Teaching Methods", rows: innovRows, fields: ["method", "details", "score"] },
      { label: "A(iv). Projects", rows: projects, fields: ["label", "score"], rowMax: projectGuidanceRowMax, maxScore: 10, skip: sectionApplicability.projects === "notApplicable" },
      { label: "A(v). Qualification Enhancement", rows: quals, fields: ["label", "score"] },
      { label: "A(vi). Student Feedback", rows: feedback, fields: ["code", "fb1", "fb2"] },
      { label: "A(vii). Department Activities", rows: deptActs, fields: ["activity", "nature", "score"] },
      { label: "A(viii). University Activities", rows: uniActs, fields: ["activity", "nature", "score"] },
      { label: "A(ix). Contribution to Society", rows: society, fields: ["details"] },
      { label: "A(x). Industry Connect", rows: industry, fields: ["name", "details", "score"] },
      { label: "B1. Journals", rows: journals, fields: ["title", "journal", "issn", "index", "score"] },
      { label: "B2. Books / Chapters", rows: books, fields: ["title", "book", "issn", "pub", "coauth", "first", "score"] },
      { label: "B3. ICT Pedagogy", rows: ict, fields: ["title", "desc", "type", "quad", "score"] },
      { label: "B4(a). Research Guidance", rows: research, fields: ["degree", "name", "thesis"], skip: sectionApplicability.research === "notApplicable" },
      { label: "B4(b). Internal Projects", rows: projects2, fields: ["title", "agency", "date", "amount", "role", "status", "score"] },
      { label: "B4(c). External Projects", rows: externalProjects, fields: ["title", "agency", "date", "amount", "role", "status", "score"] },
      { label: "B5(a). Patents (IPR)", rows: patents, fields: ["title", "type", "date", "status", "fileNo", "score"] },
      { label: "B5(b). Awards", rows: awards, fields: ["title", "date", "agency", "level", "score"] },
      { label: "B6. Conferences", rows: confs, fields: ["title", "type", "org", "level", "score"] },
      { label: "B7(a). Proposals", rows: proposals, fields: ["title", "duration", "agency", "amount", "score"] },
      { label: "B7(b). Products", rows: products, fields: ["details", "usage", "score"] },
      { label: "B8(a). FDP / Workshops", rows: fdps, fields: ["program", "duration", "org", "score"], rowMax: SCORE_LIMITS.fdpRow, maxScore: 10 },
      { label: "B8(b). Industrial Training", rows: training, fields: ["company", "duration", "nature", "score"], rowMax: SCORE_LIMITS.fdpRow, maxScore: 10 },
    ];
    const errors = validateCompleteRows(sections, docs);
    [...projects2, ...externalProjects].forEach((row, index) => {
      if (row.date && !isValidDDMMYYYY(row.date)) errors.push(`B4 project row ${index + 1}: date must be DD/MM/YYYY.`);
    });
    if (errors.length) { alert(errors.join("\n")); return false; }
    return true;
  };

  const validateSelfAppraisalSectionRows = (section) => {
    const partASections = [
      { label: "A(i). Lectures", rows: lectures, fields: ["sem", "code", "planned", "conducted", "score"] },
      { label: "A(ii). Course File", rows: courseFile, fields: ["course", "title", "details"] },
      { label: "A(iii). Innovative Teaching Methods", rows: innovRows, fields: ["method", "details", "score"] },
      { label: "A(iv). Projects", rows: projects, fields: ["label", "score"], rowMax: projectGuidanceRowMax, maxScore: 10, skip: sectionApplicability.projects === "notApplicable" },
      { label: "A(v). Qualification Enhancement", rows: quals, fields: ["label", "score"] },
      { label: "A(vi). Student Feedback", rows: feedback, fields: ["code", "fb1", "fb2"] },
      { label: "A(vii). Department Activities", rows: deptActs, fields: ["activity", "nature", "score"] },
      { label: "A(viii). University Activities", rows: uniActs, fields: ["activity", "nature", "score"] },
      { label: "A(ix). Contribution to Society", rows: society, fields: ["details"] },
      { label: "A(x). Industry Connect", rows: industry, fields: ["name", "details", "score"] },
    ];
    const partBSections = [
      { label: "B1. Journals", rows: journals, fields: ["title", "journal", "issn", "index", "score"] },
      { label: "B2. Books / Chapters", rows: books, fields: ["title", "book", "issn", "pub", "coauth", "first", "score"] },
      { label: "B3. ICT Pedagogy", rows: ict, fields: ["title", "desc", "type", "quad", "score"] },
      { label: "B4(a). Research Guidance", rows: research, fields: ["degree", "name", "thesis"], skip: sectionApplicability.research === "notApplicable" },
      { label: "B4(b). Internal Projects", rows: projects2, fields: ["title", "agency", "date", "amount", "role", "status", "score"] },
      { label: "B4(c). External Projects", rows: externalProjects, fields: ["title", "agency", "date", "amount", "role", "status", "score"] },
      { label: "B5(a). Patents (IPR)", rows: patents, fields: ["title", "type", "date", "status", "fileNo", "score"] },
      { label: "B5(b). Awards", rows: awards, fields: ["title", "date", "agency", "level", "score"] },
      { label: "B6. Conferences", rows: confs, fields: ["title", "type", "org", "level", "score"] },
      { label: "B7(a). Proposals", rows: proposals, fields: ["title", "duration", "agency", "amount", "score"] },
      { label: "B7(b). Products", rows: products, fields: ["details", "usage", "score"] },
      { label: "B8(a). FDP / Workshops", rows: fdps, fields: ["program", "duration", "org", "score"], rowMax: SCORE_LIMITS.fdpRow, maxScore: 10 },
      { label: "B8(b). Industrial Training", rows: training, fields: ["company", "duration", "nature", "score"], rowMax: SCORE_LIMITS.fdpRow, maxScore: 10 },
    ];
    const errors = validateCompleteRows(section === "partA" ? partASections : partBSections, docs);
    if (section !== "partA") {
      [...projects2, ...externalProjects].forEach((row, index) => {
        if (row.date && !isValidDDMMYYYY(row.date)) errors.push(`B4 project row ${index + 1}: date must be DD/MM/YYYY.`);
      });
    }
    if (errors.length) {
      alert(errors.join("\n"));
      return false;
    }
    return true;
  };

  const isMyAppraisalSectionOpen = (_section) => true;

  const handleMyAppraisalSectionChange = (section) => {
    setHodAppraisalTab(section);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const buildSelfDraftForm = (saveStatus = sectionSaveStatus) => normalizeAutoScores({ info, lectures, courseFile, innovDetails: innovRows.map((row) => row.method).filter(Boolean).join(", "), innovScore: innovScoreComputed, innovRows, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, summaryOtherInfo, sectionApplicability, sectionSaveStatus: saveStatus });

  const markSnapshotLocked = () => {
    setAppraisalLocked(true);
    setWorkflowDeclaration((current) => current || { status: "Submitted" });
  };

  const handleSaveCurrentSection = async (section) => {
    if (appraisalLocked) return;
    const userEmail = sessionStorage.getItem("username");
    if (!userEmail) {
      navigate("/login", { replace: true });
      return;
    }
    const nextStatus = { ...sectionSaveStatus, [section]: true };
    setSavingSection(section);
    try {
      await saveAppraisalDraftSection({
        facultyEmail: userEmail,
        academicYear: info.ay,
        form: buildSelfDraftForm(nextStatus),
        totals: { partATotal, partBTotal, grandTotal, effectivePartAMax, effectivePartBMax, effectiveGrandMax },
        docs,
        submitterProfile: profileFromsessionStorage(),
        sectionSaveStatus: nextStatus,
      });
      setSectionSaveStatus(nextStatus);
    } catch (err) {
      if (err?.statusCode === 403 || err?.response?.status === 403) {
        markSnapshotLocked();
        return;
      }
      alert(`Unable to save draft.\n\n${err.message}`);
    } finally {
      setSavingSection(null);
    }
  };
  const handleSubmitAppraisal = async () => {
    if (appraisalLocked) {
      alert("This appraisal has already been submitted and is locked for review.");
      return;
    }
    if (!accuracyConfirmed || !attachmentsConfirmed) {
      alert("Please tick both declaration checkboxes before submitting.");
      return;
    }
    if (!validateSelfAppraisalRows()) return;

    // 1. Basic Validation
    if (!info.name || !info.ay) {
      alert("Please fill in basic faculty information (Name, Academic Year).");
      setHodAppraisalTab("partA");
      return;
    }

    const userEmail = sessionStorage.getItem("username");
    if (!userEmail) {
      alert("Please login again before submitting. Your email was not found in this session.");
      navigate("/login", { replace: true });
      return;
    }

    const workflowError = workflowValidationError(profileFromsessionStorage());
    if (workflowError) {
      alert(workflowError);
      return;
    }

    const confirmSubmit = window.confirm("Are you sure you want to submit your appraisal? This will save your data to the database.");
    if (!confirmSubmit) return;

    setSubmitting(true);
    try {
      const reviewChain = getReviewChain(profileFromsessionStorage());
      const nextReviewer = reviewChain[0];
      const workflowStatus = nextReviewer ? pendingStatusFor(nextReviewer) : "Submitted";

      // 2. Submit all form data via API
      const submitterProfile = profileFromsessionStorage();

      const submittedAt = new Date().toISOString();
      await submitAppraisal({
        facultyEmail: userEmail,
        academicYear: info.ay,
        form: buildSelfDraftForm(),
        totals: { partATotal, partBTotal, grandTotal, effectivePartAMax, effectivePartBMax, effectiveGrandMax },
        docs,
        submitterProfile,
        activeProfile: submitterProfile,
      });
      alert("Appraisal submitted successfully!");
      setAppraisalLocked(true);
      setWorkflowDeclaration({
        status: workflowStatus,
        submitted_at: submittedAt,
        updated_at: submittedAt,
      });
      setWorkflowReviews([]);
    } catch (err) {
      console.error("Submission error:", err);
      alert(`Unable to submit appraisal.\n\n${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const generateReport = async () => {
    const win = window.open('', '_blank');
    if (!win) { alert("Please allow popups to generate the report."); return; }
    let logoSrc = `${window.location.origin}/image.png`;
    try {
      const res = await fetch(logoSrc);
      const blob = await res.blob();
      logoSrc = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
    } catch { /* use URL fallback */ }

    const html = `
  <html>
  <head>
    <title>Faculty Appraisal</title>

    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family: "Times New Roman", serif; font-size: 11px; color: #000; }
      h1 { text-align: center; font-size: 15px; margin: 4px 0; }
      h2 { text-align: center; font-size: 13px; margin: 3px 0; }
      h3 { font-size: 12px; margin: 10px 0 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td { border: 1px solid #000; padding: 4px 6px; word-wrap: break-word; vertical-align: top; }
      th { background: #d9d9d9; text-align: center; font-weight: bold; }
      .c { text-align: center; }
      .b { font-weight: bold; }
      .pb { page-break-before: always; }
      .tr { background: #f2f2f2; font-weight: bold; }
      .ht { width: 100%; border: none; margin-bottom: 6px; }
      .ht td { border: none; padding: 2px; }
      .logo { width: 22mm; height: auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .st th { background: #bfbfbf; }
    </style>
  </head>

  <body>

    <table class="ht"><tr>
      <td style="width:20%;text-align:left"><img class="logo" src="${logoSrc}" alt="DYPIU" /></td>
      <td style="text-align:center">
        <h1>D Y PATIL INTERNATIONAL UNIVERSITY, AKURDI, PUNE</h1>
        <h2>Faculty Appraisal Form - Academic Year ${info.ay || ""}</h2>
      </td>
      <td style="width:20%"></td>
    </tr></table>

    <table>
      <tr><td class="b" style="width:35%">Name of Faculty</td><td>${info.name || "&nbsp;"}</td></tr>
      <tr><td class="b">Educational Qualifications</td><td>${reportQualification(info)}</td></tr>
      <tr><td class="b">Present Designation</td><td>${info.desig || "&nbsp;"}</td></tr>
      <tr><td class="b">School / Department</td><td>${info.school || "&nbsp;"}</td></tr>
      <tr><td class="b">Experience</td><td>${reportExperience(info)}</td></tr>
    </table>

    <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART A - Teaching Process &amp; Academic Activities</h3>

    <h3>(i) Lectures / Tutorials / Practicals &nbsp;(Max 50)</h3>
    <table>
      <tr><th>SN</th><th>Semester</th><th>Course Code / Name</th><th>Classes as per Course Structure</th><th>Classes Actually Conducted</th><th>API Score</th></tr>
      ${lectures.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${l.sem || '&nbsp;'}</td><td>${l.code || '&nbsp;'}</td><td class="c">${l.planned || '&nbsp;'}</td><td class="c">${l.conducted || '&nbsp;'}</td><td class="c">${l.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Average Score (Max 50)</td><td class="c">${totalLecScore.toFixed(1)}</td></tr>
    </table>

    <h3>(ii) Course File &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Course / Paper</th><th>Program & Semester</th><th>Details</th><th>API Score</th></tr>
      ${courseFile.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.course || '&nbsp;'}</td><td>${c.title || '&nbsp;'}</td><td>${c.details || '&nbsp;'}</td><td class="c">${c.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Average Score (Max 20)</td><td class="c">${courseFileScore.toFixed(1)}</td></tr>
    </table>

    <h3>(iii) Innovative Teaching-Learning Methodologies &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Methods Used</th><th>Details</th><th>API Score</th></tr>
      ${innovRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.method || '&nbsp;'}</td><td>${r.details || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total Score (Max 10)</td><td class="c">${innovTotal.toFixed(1)}</td></tr>
    </table>

    ${sectionApplicability.projects !== "notApplicable" ? `
    <h3>(iv) Projects &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Project Type</th><th>API Score</th></tr>
      ${projects.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.label || '&nbsp;'}</td><td class="c">${clampScore(p.score, projectGuidanceRowMax(p)) || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="2" class="c b">Total Score (Max 10)</td><td class="c">${projectTotal.toFixed(1)}</td></tr>
    </table>` : ""}

    <h3>(v) Qualification Enhancement &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Qualification / Category</th><th>API Score</th></tr>
      ${quals.map((q, i) => `<tr><td class="c">${i + 1}</td><td>${q.label || '&nbsp;'}</td><td class="c">${q.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="2" class="c b">Total Score (Max 10)</td><td class="c">${qualTotal.toFixed(1)}</td></tr>
    </table>

    <h3>B. Students' Feedback &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Course Code / Name</th><th>First Feedback(%)</th><th>Second Feedback(%)</th><th>Average</th><th>API Score</th></tr>
      ${feedback.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${f.code || '&nbsp;'}</td><td class="c">${f.fb1 || '&nbsp;'}</td><td class="c">${f.fb2 || '&nbsp;'}</td><td class="c">${(f.fb1 || f.fb2) ? ((n(f.fb1) + n(f.fb2)) / ((f.fb1 ? 1 : 0) + (f.fb2 ? 1 : 0) || 1)).toFixed(2) : '&nbsp;'}</td><td class="c">${(f.fb1 || f.fb2) ? (((n(f.fb1) + n(f.fb2)) / ((f.fb1 ? 1 : 0) + (f.fb2 ? 1 : 0) || 1)) / 10).toFixed(2) : '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr>
    </table>

    <h3>C. Departmental / School Activities &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Activity</th><th>Nature of Activity</th><th>API Score</th></tr>
      ${deptActs.map((d, i) => `<tr><td class="c">${i + 1}</td><td>${d.activity || '&nbsp;'}</td><td>${d.nature || '&nbsp;'}</td><td class="c">${d.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 20)</td><td class="c">${deptScore.toFixed(1)}</td></tr>
    </table>

    <h3>D. University Level Activities &nbsp;(Max 30)</h3>
    <table>
      <tr><th>SN</th><th>Activity</th><th>Nature of Activity</th><th>API Score</th></tr>
      ${uniActs.map((u, i) => `<tr><td class="c">${i + 1}</td><td>${u.activity || '&nbsp;'}</td><td>${u.nature || '&nbsp;'}</td><td class="c">${u.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 30)</td><td class="c">${uniScore.toFixed(1)}</td></tr>
    </table>

    <h3>E. Contribution to Society &nbsp;(Max 10)</h3>
    ${sectionApplicability.society === "notApplicable" ? "<p><em>Not Applicable</em></p>" : `<table>
      <tr><th>SN</th><th>Activity</th><th>Details</th><th>API Score</th></tr>
      ${society.map((s, i) => `<tr><td class="c">${i + 1}</td><td>${s.label || '&nbsp;'}</td><td>${s.details || '&nbsp;'}</td><td class="c">${societyRowScore(s)}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 10)</td><td class="c">${societyScore.toFixed(1)}</td></tr>
    </table>`}

    <h3>F. Industry Connect Activity &nbsp;(Max 5)</h3>
    <table>
      <tr><th>SN</th><th>Name of Industry</th><th>Details of Activity</th><th>API Score</th></tr>
      ${industry.map((ind, i) => `<tr><td class="c">${i + 1}</td><td>${ind.name || '&nbsp;'}</td><td>${ind.details || '&nbsp;'}</td><td class="c">${ind.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 5)</td><td class="c">${industryScore.toFixed(1)}</td></tr>
    </table>

    <h3>G. Annual Confidential Report &nbsp;(Not counted in self score)</h3>
    <table>
      <tr><th>SN</th><th>Parameter</th><th>API Score</th></tr>
      ${acr.map((a, i) => `<tr><td class="c">${i + 1}</td><td>${a.label || '&nbsp;'}</td><td class="c">${String(a.score ?? "").trim() ? clampScore(a.score, SCORE_LIMITS.acrRow) : '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="2" class="c b">Total (Not counted in self score)</td><td class="c">${acrScore.toFixed(1)}</td></tr>
    </table>

    <table class="st">
      <tr><th>Part A Summary</th><th>Max</th><th>Faculty Score</th></tr>
      <tr><td>Teaching Process (i+ii+iii+iv+v)</td><td class="c">${teachingMax}</td><td class="c">${teachingRaw.toFixed(1)}</td></tr>
      <tr><td>Students' Feedback</td><td class="c">10</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr>
      <tr><td>Departmental Activities</td><td class="c">20</td><td class="c">${deptScore.toFixed(1)}</td></tr>
      <tr><td>University Activity</td><td class="c">30</td><td class="c">${uniScore.toFixed(1)}</td></tr>
      <tr><td>Contribution to Society</td><td class="c">${sectionApplicability.society === "notApplicable" ? "N/A" : "10"}</td><td class="c">${societyScore.toFixed(1)}</td></tr>
      <tr><td>Industry Connect</td><td class="c">5</td><td class="c">${industryScore.toFixed(1)}</td></tr>
      <tr><td>Annual Confidential Report</td><td class="c">N/A</td><td class="c">${acrScore.toFixed(1)}</td></tr>
      <tr class="tr"><td class="b">PART A TOTAL</td><td class="c b">${effectivePartAMax}</td><td class="c b">${partATotal.toFixed(1)}</td></tr>
      <tr class="tr"><td class="b">PART A MARKS OBTAINED (%)</td><td colspan="2" class="c b">${partAMarksPercentage}%</td></tr>
    </table>

    <div class="pb"></div>
    <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART B - Research &amp; Academic Contributions</h3>

    <h3>1) Published Papers in Journals &nbsp;(Max 120)</h3>
    <table>
      <tr><th>SN</th><th>Title with Page Nos.</th><th>Journal Details</th><th>ISSN/ISBN No.</th><th>Journal Indexing</th><th>API Score</th></tr>
      ${journals.map((j, i) => `<tr><td class="c">${i + 1}</td><td>${j.title || '&nbsp;'}</td><td>${j.journal || '&nbsp;'}</td><td class="c">${j.issn || '&nbsp;'}</td><td class="c">${j.index || '&nbsp;'}</td><td class="c">${j.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 120)</td><td class="c">${journalScore.toFixed(1)}</td></tr>
    </table>

    <h3>2) Articles / Chapters in Books &nbsp;(Max 50)</h3>
    <table>
      <tr><th>SN</th><th>Title with Page Nos.</th><th>Book Title, Editor &amp; Publisher</th><th>ISSN/ISBN</th><th>Type of Publisher</th><th>Co-authors</th><th>First Author</th><th>API Score</th></tr>
      ${books.map((b, i) => `<tr><td class="c">${i + 1}</td><td>${b.title || '&nbsp;'}</td><td>${b.book || '&nbsp;'}</td><td class="c">${b.issn || '&nbsp;'}</td><td>${b.pub || '&nbsp;'}</td><td>${b.coauth || '&nbsp;'}</td><td class="c">${b.first || '&nbsp;'}</td><td class="c">${b.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="7" class="c b">Total (Max 50)</td><td class="c">${bookScore.toFixed(1)}</td></tr>
    </table>

    <h3>3) ICT Mediated Teaching Learning Pedagogy &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>Short Description</th><th>Type / Link</th><th>Quadrants</th><th>API Score</th></tr>
      ${ict.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.title || '&nbsp;'}</td><td>${r.desc || '&nbsp;'}</td><td>${r.type || '&nbsp;'}</td><td class="c">${r.quad || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 20)</td><td class="c">${ictScore.toFixed(1)}</td></tr>
    </table>

    ${sectionApplicability.research !== "notApplicable" ? `
    <h3>4a) Research Guidance - PhD / PG &nbsp;(Max 30)</h3>
    <table>
      <tr><th>SN</th><th>Degree</th><th>Name of Student</th><th>Thesis / Status</th><th>API Score</th></tr>
      ${research.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="c">${r.degree || '&nbsp;'}</td><td>${r.name || '&nbsp;'}</td><td>${r.thesis || '&nbsp;'}</td><td class="c">${r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : ""}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 30)</td><td class="c">${researchScore.toFixed(1)}</td></tr>
    </table>` : ""}

    <h3>4b) Internal Research Projects &nbsp;(Max 15)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>Funding Agency</th><th>Date of Sanction</th><th>Grant Amount</th><th>Role</th><th>Status</th><th>API Score</th></tr>
      ${projects2.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td>${p.agency || '&nbsp;'}</td><td class="c">${p.date || '&nbsp;'}</td><td class="c">${p.amount || '&nbsp;'}</td><td>${p.role || '&nbsp;'}</td><td>${p.status || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="7" class="c b">Total (Max 15)</td><td class="c">${projectBScore.toFixed(1)}</td></tr>
    </table>

    <h3>4c) External Research Projects &nbsp;(Max 30)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>Funding Agency</th><th>Date of Sanction</th><th>Grant Amount</th><th>Role</th><th>Status</th><th>API Score</th></tr>
      ${externalProjects.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td>${p.agency || '&nbsp;'}</td><td class="c">${p.date || '&nbsp;'}</td><td class="c">${p.amount || '&nbsp;'}</td><td>${p.role || '&nbsp;'}</td><td>${p.status || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="7" class="c b">Total (Max 30)</td><td class="c">${externalProjectScore.toFixed(1)}</td></tr>
    </table>

    <h3>5a) Patents (IPR) &nbsp;(Max 40)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>National / International</th><th>Date of Filing</th><th>Status</th><th>Patent File No.</th><th>API Score</th></tr>
      ${patents.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td class="c">${p.type || '&nbsp;'}</td><td class="c">${p.date || '&nbsp;'}</td><td>${p.status || '&nbsp;'}</td><td class="c">${p.fileNo || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="6" class="c b">Total (Max 40)</td><td class="c">${patentScore.toFixed(1)}</td></tr>
    </table>

    <h3>5b) Research Awards / Fellowships &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Title of Award</th><th>Date</th><th>Awarding Agency</th><th>Level</th><th>API Score</th></tr>
      ${awards.map((a, i) => `<tr><td class="c">${i + 1}</td><td>${a.title || '&nbsp;'}</td><td class="c">${a.date || '&nbsp;'}</td><td>${a.agency || '&nbsp;'}</td><td>${a.level || '&nbsp;'}</td><td class="c">${a.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${awardScore.toFixed(1)}</td></tr>
    </table>

    <h3>6) Conferences / Seminars / Workshops &nbsp;(Max 30)</h3>
    <table>
      <tr><th>SN</th><th>Title / Session</th><th>Type</th><th>Organization</th><th>Level</th><th>API Score</th></tr>
      ${confs.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.title || '&nbsp;'}</td><td>${c.type || '&nbsp;'}</td><td>${c.org || '&nbsp;'}</td><td>${c.level || '&nbsp;'}</td><td class="c">${c.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 30)</td><td class="c">${confScore.toFixed(1)}</td></tr>
    </table>

    <h3>7a) Submitted Research Proposals &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Title of Proposal</th><th>Duration</th><th>Funding Agency</th><th>Grant Amount Requested</th><th>API Score</th></tr>
      ${proposals.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td class="c">${p.duration || '&nbsp;'}</td><td>${p.agency || '&nbsp;'}</td><td class="c">${p.amount || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${proposalScore.toFixed(1)}</td></tr>
    </table>

    <h3>7b) Product Developed and Used by Students / Commercialized &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Details of Product</th><th>Used by Students / Commercialized</th><th>API Score</th></tr>
      ${products.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.details || '&nbsp;'}</td><td>${p.usage || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 10)</td><td class="c">${productScore.toFixed(1)}</td></tr>
    </table>

    <h3>8a) Attended FDP / Workshops &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Program</th><th>Duration</th><th>Organized By</th><th>API Score</th></tr>
      ${fdps.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${f.program || '&nbsp;'}</td><td class="c">${f.duration || '&nbsp;'}</td><td>${f.org || '&nbsp;'}</td><td class="c">${clampScore(f.score, SCORE_LIMITS.fdpRow) || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 10)</td><td class="c">${fdpScore.toFixed(1)}</td></tr>
    </table>

    <h3>8b) Industrial Training &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Company / Industry</th><th>Duration</th><th>Nature of Training</th><th>API Score</th></tr>
      ${training.map((t, i) => `<tr><td class="c">${i + 1}</td><td>${t.company || '&nbsp;'}</td><td class="c">${t.duration || '&nbsp;'}</td><td>${t.nature || '&nbsp;'}</td><td class="c">${clampScore(t.score, SCORE_LIMITS.fdpRow) || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 10)</td><td class="c">${trainScore.toFixed(1)}</td></tr>
    </table>

    <div class="pb"></div>
    <h3 style="text-align:center;font-size:13px">SUMMARY OF API SCORES - AY ${info.ay || ""}</h3>
    <table class="st">
      <tr><th>Sr.No.</th><th>Criteria</th><th>Max Score</th><th>Faculty Score</th></tr>
      <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part A - Teaching Process</td></tr>
      <tr><td class="c">A</td><td>Teaching Process (i+ii+iii+iv+v)</td><td class="c">${teachingMax}</td><td class="c">${teachingRaw.toFixed(1)}</td></tr>
      <tr><td class="c">B</td><td>Students' Feedback</td><td class="c">10</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr>
      <tr><td class="c">C</td><td>Departmental Activities</td><td class="c">20</td><td class="c">${deptScore.toFixed(1)}</td></tr>
      <tr><td class="c">D</td><td>University Activity</td><td class="c">30</td><td class="c">${uniScore.toFixed(1)}</td></tr>
      <tr><td class="c">E</td><td>Contribution to Society</td><td class="c">${sectionApplicability.society === "notApplicable" ? "N/A" : "10"}</td><td class="c">${societyScore.toFixed(1)}</td></tr>
      <tr><td class="c">F</td><td>Industry Connect</td><td class="c">5</td><td class="c">${industryScore.toFixed(1)}</td></tr>
      <tr><td class="c">G</td><td>Annual Confidential Report</td><td class="c">N/A</td><td class="c">${acrScore.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part A Total</td><td class="c b">${effectivePartAMax}</td><td class="c b">${partATotal.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part A Marks Obtained (%)</td><td colspan="2" class="c b">${partAMarksPercentage}%</td></tr>
      <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part B - Research and Academic Contribution</td></tr>
      <tr><td class="c">1</td><td>Research papers / journal publication</td><td class="c">120</td><td class="c">${journalScore.toFixed(1)}</td></tr>
      <tr><td class="c">2</td><td>Books authored / edited / book chapter</td><td class="c">50</td><td class="c">${bookScore.toFixed(1)}</td></tr>
      <tr><td class="c">3</td><td>ICT Teaching Learning Pedagogy</td><td class="c">20</td><td class="c">${ictScore.toFixed(1)}</td></tr>
      <tr><td class="c">4</td><td>Research guidance / projects / consultancy</td><td class="c">${researchGuidanceProjectMax}</td><td class="c">${(researchScore + projectBScore + externalProjectScore).toFixed(1)}</td></tr>
      <tr><td class="c">5</td><td>Patents, Awards, Fellowship</td><td class="c">50</td><td class="c">${(patentScore + awardScore).toFixed(1)}</td></tr>
      <tr><td class="c">6</td><td>Conferences / paper presentations</td><td class="c">30</td><td class="c">${confScore.toFixed(1)}</td></tr>
      <tr><td class="c">7</td><td>Research proposals / product development</td><td class="c">20</td><td class="c">${(proposalScore + productScore).toFixed(1)}</td></tr>
      <tr><td class="c">8</td><td>Self Development (FDP / Industrial Training)</td><td class="c">10</td><td class="c">${b8Score.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part B Total</td><td class="c b">${effectivePartBMax}</td><td class="c b">${partBTotal.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part B Marks Obtained (%)</td><td colspan="2" class="c b">${partBMarksPercentage}%</td></tr>
      <tr style="background:#bfbfbf;font-weight:bold;font-size:13px"><td colspan="2" class="c">Grand Total (Part A + Part B)</td><td class="c">${effectiveGrandMax}</td><td class="c">${grandTotal.toFixed(1)}</td></tr>
      <tr style="background:#bfbfbf;font-weight:bold;font-size:13px"><td colspan="2" class="c">Marks Obtained (%)</td><td colspan="2" class="c">${totalMarksPercentage}%</td></tr>
    </table>

    ${String(summaryOtherInfo ?? "").trim() ? `
    <h3>Any other information not covered above</h3>
    <div style="white-space:pre-wrap;border:1px solid #000;padding:8px;min-height:40px;margin-bottom:10px">${reportTextValue(summaryOtherInfo)}</div>
    ` : ""}

    <h3 style="text-align:center;font-size:14px;background:#d9d9d9;padding:6px;margin:16px 0 10px">DECLARATION BY FACULTY</h3>
    <table style="border:none;margin-bottom:14px">
      <tr>
        <td style="border:none;vertical-align:top;width:32px;font-size:18px">&#10003;</td>
        <td style="border:none;line-height:1.7;font-size:11px">
          I, <strong>${info.name || "________________________"}</strong>, hereby declare that all the information
          furnished in this Self-Appraisal Report is true, complete, and correct to the best of my knowledge and belief.
          I understand that in the event of any information being found false or incorrect, I shall be solely responsible
          for the consequences thereof and shall be liable for any disciplinary action as deemed fit by the University authorities.
        </td>
      </tr>
    </table>
    <table style="border:none;margin-bottom:20px">
      <tr>
        <td style="border:none;width:50%">
          <div style="border-bottom:1px solid #000;min-height:36px;margin-bottom:4px">&nbsp;</div>
          <div><strong>Signature of Faculty</strong></div>
          <div style="margin-top:6px"><strong>Name:</strong> ${info.name || "&nbsp;"}</div>
          <div style="margin-top:4px"><strong>Date of Submission:</strong> ${workflowDeclaration?.submitted_at ? new Date(workflowDeclaration.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "&nbsp;"}</div>
        </td>
        <td style="border:none;width:50%">&nbsp;</td>
      </tr>
    </table>
    ${workflowReviews.length ? `
    <h3 style="text-align:center;font-size:13px;background:#d9d9d9;padding:4px;margin:0 0 8px">REVIEWERS' ACKNOWLEDGEMENT</h3>
    <p style="font-size:10px;margin:0 0 10px">The following authorities acknowledge that they have reviewed the details submitted by the faculty and confirm the accuracy of scores assigned.</p>
    <table>
      <thead><tr><th style="width:30%">Reviewer Role</th><th style="width:40%">Name &amp; Signature</th><th style="width:15%">Date</th><th style="width:15%">Stamp</th></tr></thead>
      <tbody>
        ${workflowReviews.map((rev) => `<tr>
          <td><strong>${roleLabel(rev.reviewer_role)}</strong></td>
          <td style="border-bottom:1px solid #000">${rev.reviewer_name || "&nbsp;"}</td>
          <td style="border-bottom:1px solid #000">${rev.reviewed_at ? new Date(rev.reviewed_at).toLocaleDateString("en-IN") : "&nbsp;"}</td>
          <td style="border-bottom:1px solid #000">&nbsp;</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}

  <script>window.addEventListener('load', function(){ window.focus(); window.print(); });</script>
  </body>
  </html>`;

    win.document.write(html);
    win.document.close();
  };
  const workflowRejected = hasActiveRejection(workflowDeclaration, workflowReviews);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showSectionSelector && (
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>My Appraisal Section</div>
        <select
          value={hodAppraisalTab}
          onChange={(e) => handleMyAppraisalSectionChange(e.target.value)}
          style={{ minWidth: 180, border: "1px solid #cbd5e1", borderRadius: 7, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", color: "#0f172a", background: "#fff", outline: "none" }}
        >
          <option value="partA">Part A</option>
          <option value="partB" disabled={!isMyAppraisalSectionOpen("partB")}>Part B</option>
          <option value="summary" disabled={!isMyAppraisalSectionOpen("summary")}>Summary</option>
        </select>
      </div>
      )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#fff", borderRadius: 9, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.06)", marginBottom: 4, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>My Appraisal Form</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{info.name || titleNameFallback}{subtitleSeparator}{info.ay}</p>
              </div>
              <AppraisalHeaderImage height={64} />
            </div>
            <WorkflowStatusTracker
              declaration={workflowDeclaration}
              reviews={workflowReviews}
              profile={profileFromsessionStorage()}
            />
            <RejectionNotice
              declaration={workflowDeclaration}
              reviews={workflowReviews}
              status={workflowDeclaration?.status}
              alertOnceKey={`${sessionStorage.getItem("username") || ""}:${info.ay || ""}:${workflowDeclaration?.status || ""}`}
            />
            {appraisalLocked && (
              <div style={{ background: workflowRejected ? "#fef2f2" : "#ecfdf5", border: `1px solid ${workflowRejected ? "#fecaca" : "#bbf7d0"}`, color: workflowRejected ? "#991b1b" : "#166534", borderRadius: 9, padding: "10px 14px", fontSize: 12, fontWeight: 700 }}>
                {workflowRejected
                  ? "This appraisal was rejected. Review the approval status in the tracker above."
                  : "Submitted and locked for review. Your saved data is visible here, but editing is disabled while authorities review it."}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ flex: 1, pointerEvents: appraisalLocked && hodAppraisalTab !== "summary" ? "none" : "auto", opacity: appraisalLocked && hodAppraisalTab !== "summary" ? 0.78 : 1 }}>

                {/* Part A Tab */}
                {hodAppraisalTab === "partA" && (
                  <SC title={`Part A - Teaching & Academic Activities (Max ${effectivePartAMax})`} accent="#6366f1">
                    <div style={{ marginBottom: 14, padding: "8px 12px", background: "#f0f4ff", borderRadius: 6, fontSize: 12, color: "#312e81", fontWeight: 600 }}>
                      Total Part A Score: {partATotal.toFixed(1)}/{effectivePartAMax}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Fill in your teaching and academic activities for the appraisal period. Enter scores for each item.</div>
                    {/* A1. Teaching Process */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(i) Lectures, Tutorials, Practicals, Projects - Max 50 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={TH}>SN</th>
                            <th style={TH}>Semester</th>
                            <th style={TH}>Course Code / Name</th>
                            <th style={TH}>Classes (as per course structure)</th>
                            <th style={TH}>Classes Actually Conducted</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lectures.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.sem} onChange={(v) => setLec(i, "sem", v)} /></td>
                              <td style={TD}><TI val={r.code} onChange={(v) => setLec(i, "code", v)} textOnly /></td>
                              <td style={TDC}><TI val={r.planned} onChange={(v) => setLec(i, "planned", v)} center numeric /></td>
                              <td style={TDC}><TI val={r.conducted} onChange={(v) => setLec(i, "conducted", v)} center numeric /></td>
                              <td style={TD}><DocCell id={`lec-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`lec-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setLec(i, "score", v)} center numeric max={50} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Average Score (Max 50)</td>
                            <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{totalLecScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setLectures((p) => [...p, { sem: "", code: "", planned: "", conducted: "", score: "", hod: "", director: "" }])} onDel={() => setLectures((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={lectures.length > 1} />
                    </div>

                    {/* A2. Course File */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(ii) Course File - Max 20 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Course / Paper</th>
                            <th style={TH}>Program & Semester</th>
                            <th style={TH}>Availability as per IQAC format</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseFile.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.course} onChange={(v) => setCF(i, "course", v)} /></td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setCF(i, "title", v)} /></td>
                              <td style={TD}>
                                <select value={r.details} onChange={(e) => setCF(i, "details", e.target.value)} style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}>
                                  <option value="">Select</option>
                                  <option value="1.Available">1.Available</option>
                                  <option value="2.Partially Available">2.Partially Available</option>
                                  <option value="3.Not Available">3.Not Available</option>
                                </select>
                              </td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setCF(i, "score", v === "" ? "" : String(clampScore(v, SCORE_LIMITS.courseFileRow)))} numeric max={SCORE_LIMITS.courseFileRow} center /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={4}>Average Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{courseFileScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setCourseFile((p) => [...p, { course: "", title: "", details: "", score: "", hod: "", director: "" }])} onDel={() => setCourseFile((p) => (p.length > 1 ? p.slice(0, -1) : p))} canDel={courseFile.length > 1} />
                    </div>

                    {/* A3. Innovative Teaching */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(iii) Innovative Teaching-Learning Methodologies - Max 10 marks</div>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>SN</th>
                          <th style={TH}>Methods Used</th>
                          <th style={TH}>Details</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Score</th>
                        </tr></thead>
                        <tbody>
                          {innovRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.method} onChange={(v) => setInnov(i, "method", v)} /></td>
                              <td style={TD}><TI val={r.details} onChange={(v) => setInnov(i, "details", v)} /></td>
                              <td style={TD}><DocCell id={`innov-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`innov-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setInnov(i, "score", v === "" ? "" : String(clampScore(v, SCORE_LIMITS.innovativeRow)))} numeric max={SCORE_LIMITS.innovativeRow} center /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{innovTotal.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setInnovRows((p) => [...p, { method: "", details: "", score: "" }])} onDel={() => setInnovRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={innovRows.length > 1} />
                    </div>

                    {/* A4. Projects */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(iv) Projects - Max 10 marks</div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                        {["applicable", "notApplicable"].map((value) => (
                          <label key={value} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={sectionApplicability.projects === value}
                              onChange={() => {
                                setSectionApplicability((current) => ({ ...current, projects: value }));
                                if (value === "notApplicable") {
                                  setProjects((rows) => rows.map((row) => ({ ...row, label: "", score: "" })));
                                }
                              }}
                            />
                            {value === "applicable" ? "Applicable" : "Not Applicable"}
                          </label>
                        ))}
                      </div>
                      {sectionApplicability.projects !== "notApplicable" && (<>
                        <table style={T}>
                          <thead>
                            <tr>
                              <th style={{ ...TH, width: 30 }}>SN</th>
                              <th style={TH}>Project Description</th>
                              <th style={TH}>Attachment</th>
                              <th style={TH}>View Docs</th>
                              <th style={TH}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projects.map((r, i) => (
                              <tr key={i}>
                                <td style={TDC}>{i + 1}</td>
                                <td style={TD}><TI val={r.label} readOnly={sectionApplicability.projects === "notApplicable"} onChange={(v) => setProj(i, "label", v)} /></td>
                                <td style={TD}><DocCell id={`proj-${i}`} docs={docs} setDocs={setDocs} readOnly={sectionApplicability.projects === "notApplicable"} /></td>
                                <td style={TD}><ViewCell id={`proj-${i}`} docs={docs} /></td>
                                <td style={TDS}><TI val={r.score} readOnly={sectionApplicability.projects === "notApplicable"} onChange={(v) => setProj(i, "score", v)} center numeric max={projectGuidanceRowMax(r)} /></td>
                              </tr>
                            ))}
                            <tr style={{ background: "#eff6ff" }}>
                              <td style={{ ...TDC, fontWeight: "bold" }} colSpan={4}>Total Score (Max {sectionApplicability.projects === "notApplicable" ? 0 : 10})</td>
                              <td style={{ ...TDS, fontWeight: "bold" }}>{projectTotal.toFixed(1)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <RowBtns onAdd={() => setProjects((p) => [...p, { label: "", score: "" }])} onDel={() => setProjects((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={projects.length > 1} />
                      </>)}
                    </div>

                    {/* A5. Qualifications */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(v) Qualification Enhancement - Max 10 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Qualification</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quals.map((r, i) => (
                            <tr key={i}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.label} onChange={(v) => setQual(i, "label", v)} /></td>
                              <td style={TD}><DocCell id={`qual-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`qual-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setQual(i, "score", v)} center numeric max={SCORE_LIMITS.qualificationRow} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={4}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{qualTotal.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setQuals((p) => [...p, { label: "", score: "" }])} onDel={() => setQuals((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={quals.length > 1} />
                    </div>

                    {/* A6. Student Feedback */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(vi) Student Feedback - Max 10 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Course Code / Name</th>
                            <th style={TH}>First Feedback(%)</th>
                            <th style={TH}>Second Feedback(%)</th>
                            <th style={TH}>Average</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedback.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.code} onChange={(v) => setFb(i, "code", v)} textOnly /></td>
                              <td style={TDC}><TI val={r.fb1} onChange={(v) => setFb(i, "fb1", v)} center numeric max={SCORE_LIMITS.feedbackAverage} deferClampWhileTyping /></td>
                              <td style={TDC}><TI val={r.fb2} onChange={(v) => setFb(i, "fb2", v)} center numeric max={SCORE_LIMITS.feedbackAverage} deferClampWhileTyping /></td>
                              <td style={{ ...TDC, fontWeight: 700, color: "#0ea5e9" }}>{r.fb1 || r.fb2 ? feedbackAverage(r).toFixed(2) : ""}</td>
                              <td style={TDS}>{r.fb1 || r.fb2 ? feedbackRowScore(r, 10).toFixed(1) : ""}</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{stuFeedbackScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setFeedback((p) => [...p, { code: "", fb1: "", fb2: "", score: "" }])} onDel={() => setFeedback((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={feedback.length > 1} />
                    </div>

                    {/* A7. Department Activities */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(vii) Department Activities - Max 20 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Activity</th>
                            <th style={TH}>Nature</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deptActs.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity} onChange={(v) => setDept(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.nature} onChange={(v) => setDept(i, "nature", v)} /></td>
                              <td style={TD}><DocCell id={`dept-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`dept-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setDept(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{deptScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setDeptActs((p) => [...p, { activity: "", nature: "", score: "" }])} onDel={() => setDeptActs((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={deptActs.length > 1} />
                    </div>

                    {/* A8. University Activities */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(viii) University Activities - Max 30 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Activity</th>
                            <th style={TH}>Nature</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uniActs.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity} onChange={(v) => setUni(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.nature} onChange={(v) => setUni(i, "nature", v)} /></td>
                              <td style={TD}><DocCell id={`uni-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`uni-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setUni(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 30)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{uniScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setUniActs((p) => [...p, { activity: "", nature: "", score: "" }])} onDel={() => setUniActs((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={uniActs.length > 1} />
                    </div>

                    {/* A9. Contribution to Society */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(ix) Contribution to Society - Max 10 marks (Max 5 per row)</div>
                      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
                        {["applicable", "notApplicable"].map((v) => (
                          <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <input type="checkbox" checked={(sectionApplicability.society || "applicable") === v} onChange={() => setSectionApplicability((p) => ({ ...p, society: v }))} />
                            {v === "applicable" ? "Applicable" : "Not Applicable"}
                          </label>
                        ))}
                      </div>
                      {sectionApplicability.society !== "notApplicable" && <><table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Activity</th>
                            <th style={TH}>Details</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score (Max 5)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {society.map((r, i) => {
                            const socLocked = societyRowLocked(r);
                            return (
                              <tr key={i} style={socLocked ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                                <td style={TDC}>{i + 1}</td>
                                <td style={TD}><TI val={r.label} onChange={(v) => setSoc(i, "label", v)} readOnly={socLocked} /></td>
                                <td style={TD}><TI val={r.details} onChange={(v) => setSoc(i, "details", v)} readOnly={socLocked} /></td>
                                <td style={TD}><DocCell id={`soc-${i}`} docs={docs} setDocs={setDocs} readOnly={socLocked} /></td>
                                <td style={TD}><ViewCell id={`soc-${i}`} docs={docs} /></td>
                                <td style={TDS}><TI val={r.score} onChange={(v) => setSoc(i, "score", v === "" ? "" : String(clampScore(v, SCORE_LIMITS.societyRow)))} numeric max={SCORE_LIMITS.societyRow} center readOnly={socLocked} /></td>
                              </tr>
                            );
                          })}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{societyScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                        <RowBtns onAdd={() => setSociety((p) => [...p, { label: "", details: "", score: "" }])} onDel={() => setSociety((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={society.length > 1} />
                      </>}
                    </div>

                    {/* A10. Industry Connect */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(x) Industry Connect - Max 5 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Company/Organization</th>
                            <th style={TH}>Details</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {industry.map((r, i) => (
                            <tr key={i}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.name} onChange={(v) => setInd(i, "name", v)} textOnly /></td>
                              <td style={TD}><TI val={r.details} onChange={(v) => setInd(i, "details", v)} /></td>
                              <td style={TD}><DocCell id={`ind-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`ind-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setInd(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 5)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{industryScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setIndustry((p) => [...p, { name: "", details: "", score: "" }])} onDel={() => setIndustry((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={industry.length > 1} />
                    </div>

                    {/* A11. ACR */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>(xi) Annual Confidential Report (ACR) - Max 25 marks</div>
                      <div style={{ fontSize: 11, color: "#b45309", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 5, padding: "6px 10px", marginBottom: 8 }}>This section is filled by your superior. It is visible here for reference and is not counted in your self score.</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Parameter</th>
                            <th style={TH}>Assessment Points</th>
                            <th style={TH}>Self Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {createAcrRows(acr).map((row, index) => (
                            <tr key={row.label}>
                              <td style={TDC}>{index + 1}</td>
                              <td style={TD}>{row.label}</td>
                              <td style={TD}>
                                <ul style={{ margin: "0 0 0 16px", padding: 0, color: "#64748b", fontSize: 11, lineHeight: 1.5 }}>
                                  {(ACR_DETAIL_POINTS[row.label] || []).map((point) => <li key={point}>{point}</li>)}
                                </ul>
                              </td>
                              <td style={TDC}>-</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SC>
                )}

                {/* Part B Tab */}
                {hodAppraisalTab === "partB" && (
                  <SC title="Part B - Research & Academic Contributions (Max 375)" accent="#7c3aed">
                    <div style={{ marginBottom: 14, padding: "8px 12px", background: "#ede9fe", borderRadius: 6, fontSize: 12, color: "#6d28d9", fontWeight: 600 }}>
                      Total Part B Score: {partBTotal.toFixed(1)}/{effectivePartBMax}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Enter your research publications, patents, conferences, and other academic contributions.</div>

                    {/* B1. Research Papers / Journals */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B1. Research Papers / Journals - Max 120 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title</th>
                            <th style={TH}>Journal</th>
                            <th style={TH}>ISSN</th>
                            <th style={TH}>Journal Indexing</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journals.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setJour(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.journal} onChange={(v) => setJour(i, "journal", v)} /></td>
                              <td style={TD}><TI val={r.issn} onChange={(v) => setJour(i, "issn", v)} /></td>
                              <td style={TD}><TI val={r.index} onChange={(v) => setJour(i, "index", v)} /></td>
                              <td style={TD}><DocCell id={`jour-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`jour-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setJour(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 120)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{journalScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setJournals((p) => [...p, { title: "", journal: "", issn: "", index: "", score: "" }])} onDel={() => setJournals((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={journals.length > 1} />
                    </div>

                    {/* B2. Books / Chapters */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B2. Books / Chapters - Max 50 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title with Page Nos.</th>
                            <th style={TH}>Book Title, Editor & Publisher</th>
                            <th style={TH}>ISSN / ISBN No.</th>
                            <th style={TH}>Type of Publisher</th>
                            <th style={TH}>Co-authors (from DYPIU)</th>
                            <th style={TH}>First Author</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {books.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setBook(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.book} onChange={(v) => setBook(i, "book", v)} /></td>
                              <td style={TD}><TI val={r.issn} onChange={(v) => setBook(i, "issn", v)} /></td>
                              <td style={TD}><TI val={r.pub} onChange={(v) => setBook(i, "pub", v)} /></td>
                              <td style={TD}><TI val={r.coauth} onChange={(v) => setBook(i, "coauth", v)} /></td>
                              <td style={TD}><select value={r.first || ""} onChange={(e) => setBook(i, "first", e.target.value)} style={{ width: "100%", height: 30, border: "1px solid #d1d5db", borderRadius: 4, padding: "5px 6px", fontSize: 11, fontFamily: "inherit" }}><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></td>
                              <td style={TD}><DocCell id={`book-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`book-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setBook(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={9}>Total Score (Max 50)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{bookScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setBooks((p) => [...p, { title: "", book: "", issn: "", pub: "", coauth: "", first: "", score: "" }])} onDel={() => setBooks((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={books.length > 1} />
                    </div>

                    {/* B3. ICT Pedagogy */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B3. ICT Pedagogy - Max 20 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title</th>
                            <th style={TH}>Description</th>
                            <th style={TH}>Type</th>
                            <th style={TH}>Quadrant</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ict.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setIctRow(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.desc} onChange={(v) => setIctRow(i, "desc", v)} /></td>
                              <td style={TD}><TI val={r.type} onChange={(v) => setIctRow(i, "type", v)} textOnly /></td>
                              <td style={TD}><TI val={r.quad} onChange={(v) => setIctRow(i, "quad", v)} /></td>
                              <td style={TD}><DocCell id={`ict-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`ict-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setIctRow(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{ictScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setIct((p) => [...p, { title: "", desc: "", type: "", quad: "", score: "" }])} onDel={() => setIct((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={ict.length > 1} />
                    </div>

                    {/* B4(a). Research Guidance */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B4(a). Research Guidance - Max 30 marks (PhD: 20, PG: 10)</div>                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#334155" }}>
                        {["applicable", "notApplicable"].map((value) => (
                          <label key={value} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <input type="checkbox" checked={sectionApplicability.research === value} onChange={() => { setSectionApplicability((current) => ({ ...current, research: value })); if (value === "notApplicable") setResearch((rows) => rows.map((row) => ({ ...row, degree: "", name: "", thesis: "", score: "" }))); }} />
                            {value === "applicable" ? "Applicable" : "Not Applicable"}
                          </label>
                        ))}
                      </div>
                      {sectionApplicability.research !== "notApplicable" && (<>
                        <table style={T}>
                          <thead>
                            <tr>
                              <th style={{ ...TH, width: 30 }}>SN</th>
                              <th style={TH}>Degree</th>
                              <th style={TH}>Name</th>
                              <th style={TH}>Thesis Title</th>
                              <th style={TH}>Attachment</th>
                              <th style={TH}>View Docs</th>
                              <th style={TH}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {research.map((r, i) => (
                              <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                                <td style={TDC}>{i + 1}</td>
                                <td style={TD}>
                                  <select
                                    value={r.degree || ""}
                                    disabled={sectionApplicability.research === "notApplicable"}
                                    onChange={(event) => setRes(i, "degree", event.target.value)}
                                    style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontSize: 11, fontFamily: "inherit" }}
                                  >
                                    <option value="">Select</option>
                                    <option value="PhD">PhD</option>
                                    <option value="PG">PG</option>
                                  </select>
                                </td>
                                <td style={TD}><TI val={r.name} readOnly={sectionApplicability.research === "notApplicable"} onChange={(v) => setRes(i, "name", v)} textOnly /></td>
                                <td style={TD}><TI val={r.thesis} readOnly={sectionApplicability.research === "notApplicable"} onChange={(v) => setRes(i, "thesis", v)} textOnly /></td>
                                <td style={TD}><DocCell id={`res-${i}`} docs={docs} setDocs={setDocs} readOnly={sectionApplicability.research === "notApplicable"} /></td>
                                <td style={TD}><ViewCell id={`res-${i}`} docs={docs} /></td>
                                <td style={TDS}><RO val={sectionApplicability.research === "notApplicable" ? "0" : (r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : "")} center /></td>
                              </tr>
                            ))}
                            <tr style={{ background: "#f3e8ff" }}>
                              <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total Score (Max {sectionApplicability.research === "notApplicable" ? 0 : 30})</td>
                              <td style={{ ...TDS, fontWeight: "bold" }}>{researchScore.toFixed(1)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <RowBtns onAdd={() => setResearch((p) => [...p, { degree: "PhD", name: "", thesis: "", score: "" }])} onDel={() => setResearch((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={research.length > 1} />
                      </>)}
                    </div>

                    {/* B4(b). Research / Consultancy Internal Projects */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B4(b). Ongoing & Completed Research / Consultancy Internal Projects - Max 15 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title</th>
                            <th style={TH}>Funding Agency</th>
                            <th style={TH}>Date of Sanction</th>
                            <th style={TH}>Grant Amount</th>
                            <th style={TH}>Role PI / Co-PI / Consultant</th>
                            <th style={TH}>Status</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects2.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setPrj2(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.agency} onChange={(v) => setPrj2(i, "agency", v)} textOnly /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setPrj2(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><TI val={r.amount} onChange={(v) => setPrj2(i, "amount", v)} numeric /></td>
                              <td style={TD}><TI val={r.role} onChange={(v) => setPrj2(i, "role", v)} textOnly /></td>
                              <td style={TD}><TI val={r.status} onChange={(v) => setPrj2(i, "status", v)} textOnly /></td>
                              <td style={TD}><DocCell id={`project2-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`project2-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setPrj2(i, "score", v)} center numeric max={SCORE_LIMITS.researchInternalProjects} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={9}>Total Score (Max 15)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{projectBScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setProjects2((p) => [...p, { title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }])} onDel={() => setProjects2((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={projects2.length > 1} />
                    </div>

                    {/* B4(c). Research / Consultancy External Projects */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B4(c). Ongoing & Completed Research / Consultancy External Projects - Max 30 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title</th>
                            <th style={TH}>Funding Agency</th>
                            <th style={TH}>Date of Sanction</th>
                            <th style={TH}>Grant Amount</th>
                            <th style={TH}>Role PI / Co-PI / Consultant</th>
                            <th style={TH}>Status</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {externalProjects.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setExtPrj(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.agency} onChange={(v) => setExtPrj(i, "agency", v)} textOnly /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setExtPrj(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><TI val={r.amount} onChange={(v) => setExtPrj(i, "amount", v)} numeric /></td>
                              <td style={TD}><TI val={r.role} onChange={(v) => setExtPrj(i, "role", v)} textOnly /></td>
                              <td style={TD}><TI val={r.status} onChange={(v) => setExtPrj(i, "status", v)} textOnly /></td>
                              <td style={TD}><DocCell id={`externalProject-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`externalProject-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setExtPrj(i, "score", v)} center numeric max={SCORE_LIMITS.researchExternalProjects} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={9}>Total Score (Max 30)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{externalProjectScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setExternalProjects((p) => [...p, { title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }])} onDel={() => setExternalProjects((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={externalProjects.length > 1} />
                    </div>

                    {/* B5(a). Patents (IPR) */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B5(a). Patents (IPR) - Max 40 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title</th>
                            <th style={TH}>National / International</th>
                            <th style={TH}>Date</th>
                            <th style={TH}>Status</th>
                            <th style={TH}>File No.</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patents.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setPat(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.type} onChange={(v) => setPat(i, "type", v)} textOnly /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setPat(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><TI val={r.status} onChange={(v) => setPat(i, "status", v)} textOnly /></td>
                              <td style={TD}><TI val={r.fileNo} onChange={(v) => setPat(i, "fileNo", v)} /></td>
                              <td style={TD}><DocCell id={`pat-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`pat-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setPat(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={8}>Total Patents Score (Max 40)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{patentScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setPatents((p) => [...p, { title: "", type: "", date: "", status: "", fileNo: "", score: "" }])} onDel={() => setPatents((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={patents.length > 1} />
                    </div>

                    {/* B5(b). Awards */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B5(b). Awards - Max 10 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Award Title</th>
                            <th style={TH}>Date</th>
                            <th style={TH}>Agency</th>
                            <th style={TH}>Level</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {awards.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setAwd(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setAwd(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><TI val={r.agency} onChange={(v) => setAwd(i, "agency", v)} textOnly /></td>
                              <td style={TD}><TI val={r.level} onChange={(v) => setAwd(i, "level", v)} textOnly /></td>
                              <td style={TD}><DocCell id={`awd-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`awd-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setAwd(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Awards Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{awardScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setAwards((p) => [...p, { title: "", type: "", date: "", agency: "", level: "", score: "" }])} onDel={() => setAwards((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={awards.length > 1} />
                    </div>

                    {/* B6. Invited Lectures / Resource Person / Paper Presentations */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B6. Invited Lectures / Resource Person / Paper Presentations - Max 30 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title</th>
                            <th style={TH}>Type</th>
                            <th style={TH}>Organization</th>
                            <th style={TH}>Level</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confs.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setConf(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.type} onChange={(v) => setConf(i, "type", v)} textOnly /></td>
                              <td style={TD}><TI val={r.org} onChange={(v) => setConf(i, "org", v)} /></td>
                              <td style={TD}><TI val={r.level} onChange={(v) => setConf(i, "level", v)} textOnly /></td>
                              <td style={TD}><DocCell id={`conf-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`conf-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setConf(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 30)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{confScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setConfs((p) => [...p, { title: "", type: "", org: "", level: "", score: "" }])} onDel={() => setConfs((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={confs.length > 1} />
                    </div>

                    {/* B7(a). Submitted Research Proposals */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B7(a). Submitted Research Proposals - Max 10 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Title of Proposal</th>
                            <th style={TH}>Duration</th>
                            <th style={TH}>Funding Agency</th>
                            <th style={TH}>Grant Amount Requested</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposals.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.title} onChange={(v) => setProp(i, "title", v)} textOnly /></td>
                              <td style={TD}><TI val={r.duration} onChange={(v) => setProp(i, "duration", v)} /></td>
                              <td style={TD}><TI val={r.agency} onChange={(v) => setProp(i, "agency", v)} textOnly /></td>
                              <td style={TD}><TI val={r.amount} onChange={(v) => setProp(i, "amount", v)} numeric /></td>
                              <td style={TD}><DocCell id={`prop-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`prop-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setProp(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{proposalScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setProposals((p) => [...p, { title: "", duration: "", agency: "", amount: "", score: "" }])} onDel={() => setProposals((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={proposals.length > 1} />
                    </div>

                    {/* B7(b). Product Developed */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B7(b). Product Developed and Used by Students in Lab / Commercialized - Max 10 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Details of Product</th>
                            <th style={TH}>Used by Students in Lab / Commercialized</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.details} onChange={(v) => setProd(i, "details", v)} /></td>
                              <td style={TD}><TI val={r.usage} onChange={(v) => setProd(i, "usage", v)} /></td>
                              <td style={TD}><DocCell id={`prod-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`prod-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setProd(i, "score", v)} center numeric /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{productScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setProducts((p) => [...p, { details: "", usage: "", score: "" }])} onDel={() => setProducts((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={products.length > 1} />
                    </div>

                    {/* B8(a). FDP / Workshops Attended */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B8(a). FDP / Workshops Attended - Max 10 marks</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Program</th>
                            <th style={TH}>Duration</th>
                            <th style={TH}>Organization</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fdps.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.program} onChange={(v) => setFdp(i, "program", v)} /></td>
                              <td style={TD}><TI val={r.duration} onChange={(v) => setFdp(i, "duration", v)} /></td>
                              <td style={TD}><TI val={r.org} onChange={(v) => setFdp(i, "org", v)} /></td>
                              <td style={TD}><DocCell id={`fdp-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`fdp-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setFdp(i, "score", v)} center numeric max={SCORE_LIMITS.fdpRow} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setFdps((p) => [...p, { program: "", duration: "", org: "", score: "" }])} onDel={() => setFdps((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={fdps.length > 1} />
                    </div>

                    {/* B8(b). Industrial Training */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>B8(b). Industrial Training</div>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Company</th>
                            <th style={TH}>Duration</th>
                            <th style={TH}>Nature</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {training.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.company} onChange={(v) => setTrain(i, "company", v)} /></td>
                              <td style={TD}><TI val={r.duration} onChange={(v) => setTrain(i, "duration", v)} /></td>
                              <td style={TD}><TI val={r.nature} onChange={(v) => setTrain(i, "nature", v)} /></td>
                              <td style={TD}><DocCell id={`train-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`train-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setTrain(i, "score", v)} center numeric max={SCORE_LIMITS.fdpRow} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setTraining((p) => [...p, { company: "", duration: "", nature: "", score: "" }])} onDel={() => setTraining((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={training.length > 1} />
                      <table style={{ ...T, marginTop: 8 }}>
                        <tbody>
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total B8 Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{b8Score.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </SC>
                )}

                {(hodAppraisalTab === "partA" || hodAppraisalTab === "partB") && !appraisalLocked && (
                  <SectionSaveFooter
                    label={hodAppraisalTab === "partA" ? "Part A" : "Part B"}
                    saved={Boolean(sectionSaveStatus[hodAppraisalTab])}
                    saving={savingSection === hodAppraisalTab}
                    locked={appraisalLocked}
                    onSave={() => handleSaveCurrentSection(hodAppraisalTab)}
                  />
                )}

                {/* Summary Tab */}
                {hodAppraisalTab === "summary" && (
                  <SC title="Appraisal Summary & Submission" accent="#10b981">
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
                      <tbody>
                        {[
                          ["Part A - Teaching & Activities", partATotal, effectivePartAMax, "#6366f1"],
                          ["Part B - Research & Contributions", partBTotal, effectivePartBMax, "#7c3aed"],
                          ["Grand Total", grandTotal, effectiveGrandMax, g.color],
                        ].map(([label, score, max, color]) => (
                          <tr key={label}>
                            <td style={{ padding: "10px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", width: "50%" }}>{label}</td>
                            <td style={{ padding: "10px", textAlign: "center", border: "1px solid #e2e8f0", color, fontWeight: 700, fontSize: 14 }}>
                              {score.toFixed(1)}/{max}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <SummaryOtherInfoField
                      value={summaryOtherInfo}
                      onChange={setSummaryOtherInfo}
                      readOnly={appraisalLocked}
                    />

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 10, color: "#334155", fontSize: 12, lineHeight: 1.5, cursor: appraisalLocked ? "not-allowed" : "pointer" }}>
                      <input
                        type="checkbox"
                        checked={accuracyConfirmed}
                        onChange={(e) => setAccuracyConfirmed(e.target.checked)}
                        disabled={submitting || appraisalLocked}
                        style={{ marginTop: 3 }}
                      />
                      <span>I have verified all the details and confirm that the information provided is correct. I am responsible for the accuracy of this data.</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, marginBottom: 14, color: "#334155", fontSize: 12, lineHeight: 1.5, cursor: appraisalLocked ? "not-allowed" : "pointer" }}>
                      <input
                        type="checkbox"
                        checked={attachmentsConfirmed}
                        onChange={(e) => setAttachmentsConfirmed(e.target.checked)}
                        disabled={submitting || appraisalLocked}
                        style={{ marginTop: 3 }}
                      />
                      <span>
                        I confirm that <strong>all required supporting documents and attachments have been uploaded</strong> against the respective entries.
                        I understand that any <strong>missing or false attachment is my sole responsibility</strong> and may result in the rejection or revision of my appraisal.
                      </span>
                    </label>

                    <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                      <button
                        onClick={generateReport}
                        style={{ padding: "10px 28px", background: "#4c1d95", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
                      >
                        Generate Report
                      </button>
                      <button
                        onClick={handleSubmitAppraisal}
                        disabled={submitting || appraisalLocked || !accuracyConfirmed || !attachmentsConfirmed}
                        style={{ padding: "10px 28px", background: (appraisalLocked || !accuracyConfirmed || !attachmentsConfirmed) ? "#64748b" : "#059669", color: "#fff", border: "none", borderRadius: 7, cursor: (appraisalLocked || !accuracyConfirmed || !attachmentsConfirmed) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", opacity: submitting ? 0.7 : 1 }}
                      >
                        {appraisalLocked ? "Submitted & Locked" : submitting ? "Submitting..." : "Submit Appraisal"}
                      </button>
                    </div>
                  </SC>
                )}
              </div>
            </div>
          </div>
    </div>
  );
}

