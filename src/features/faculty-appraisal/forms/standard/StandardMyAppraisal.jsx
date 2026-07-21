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
  loadClosedAppraisal,
  loadAppraisalDocuments,
  loadSavedAppraisal,
  saveAppraisalDraftSection,
  submitAppraisal,
} from "../../services";
import {
  SCORE_LIMITS,
  averageSectionScore,
  clampScore,
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
  ViewDocsCell,
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

const blankInnovativeRow = () => ({ method: "", details: "", score: "" });

const sanitizeInnovativeRows = (rows) => {
  if (!Array.isArray(rows)) return [blankInnovativeRow()];
  const legacyPresetRows = rows.slice(0, INNOVATIVE_METHOD_OPTIONS.length);
  const hasLegacyPreset = legacyPresetRows.length === INNOVATIVE_METHOD_OPTIONS.length
    && legacyPresetRows.every((row = {}, index) => String(row.method ?? "").trim() === INNOVATIVE_METHOD_OPTIONS[index].value);
  const cleaned = rows.filter((row = {}, index) => {
    const method = String(row.method ?? "").trim();
    const hasEnteredData = ["details", "score", "hod", "director", "dean", "vc"].some((key) => String(row[key] ?? "").trim());
    if (hasLegacyPreset && index < INNOVATIVE_METHOD_OPTIONS.length && LEGACY_INNOVATIVE_METHODS.has(method) && !hasEnteredData) return false;
    return method || hasEnteredData;
  });
  return cleaned.length ? cleaned : [blankInnovativeRow()];
};

const PART_A_MAX = 150;
const PART_B_MAX = 350;
const PART_C_MAX = 150;
const PART_D_MAX = 50;
const A1_COURSE_DELIVERY_MAX = 40;
const A2_COURSE_FILE_MAX = 20;
const A3_INNOVATIVE_MAX = 20;
const A3_INNOVATIVE_ROW_MAX = 4;
const A4_FEEDBACK_MAX = 10;
const A5_OBE_MAX = 20;
const A6_PROJECT_GUIDANCE_MAX = 20;
const A7_MENTORING_MAX = 10;
const A8_QUALIFICATION_MAX = 10;
const C1_UNIVERSITY_ADMIN_MAX = 50;
const C2_SCHOOL_ADMIN_MAX = 30;
const C3_EVENT_MAX = 20;
const C4_OUTREACH_MAX = 20;
const C5_INDUSTRY_MAX = 8;
const C6_ALUMNI_MAX = 10;
const C7_PLACEMENT_MAX = 20;
const B1_JOURNAL_MAX = 100;
const B2_BOOK_MAX = 30;
const B3_ICT_MAX = 15;
const B4_PROJECT_MAX = 40;
const B5_RESEARCH_GUIDANCE_MAX = 20;
const B6_CONSULTANCY_MAX = 20;
const B7_CONFERENCE_MAX = 20;
const B8_ATTENDED_MAX = 20;
const B9_AWARDS_MAX = 20;
const B10_STARTUP_MAX = 20;

const defaultObeRows = () => [
  { component: "CO-PO mapping sheet", evidence: "", score: "", max: 5 },
  { component: "Attainment calculation", evidence: "", score: "", max: 10 },
  { component: "Corrective action plan", evidence: "", score: "", max: 5 },
];

const defaultMentoringRows = () => [
  { activity: "Mentoring meetings conducted (min. 2/semester)", evidence: "", score: "", max: 4 },
  { activity: "Mentoring register maintained", evidence: "", score: "", max: 3 },
  { activity: "Documented academic/career counselling outcomes", evidence: "", score: "", max: 3 },
];

const evidenceClaimedOrScored = (row = {}) =>
  Boolean(String(row.score ?? "").trim()) || String(row.evidence ?? "").trim().toLowerCase() === "yes";

function SubsectionIcon({ type }) {
  const icons = {
    teaching: ["M4 19V6.5A2.5 2.5 0 0 1 6.5 4H20v15H6.5A2.5 2.5 0 0 0 4 21V6.5", "M8 8h8M8 12h6"],
    folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
    lightbulb: ["M9 18h6", "M10 22h4", "M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.7-1.5 1.7-1.5 2.5h-4c0-.8-.6-1.8-1.5-2.5Z"],
    users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    guidance: ["M12 3 4 7l8 4 8-4-8-4Z", "M4 11l8 4 8-4", "M7 13v4c2.2 2 7.8 2 10 0v-4"],
    mentoring: ["M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M17 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M2 21a5 5 0 0 1 10 0", "M14 21a4 4 0 0 1 8 0"],
    award: ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "M9 14l-1 7 4-2 4 2-1-7"],
    chart: ["M4 19V5", "M4 19h16", "M8 16v-5", "M12 16V8", "M16 16v-9"],
    building: ["M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16", "M20 21v-9a2 2 0 0 0-2-2h-2", "M8 7h4M8 11h4M8 15h4"],
    school: ["M3 21h18", "M5 21V8l7-5 7 5v13", "M9 21v-7h6v7", "M9 10h.01M15 10h.01"],
    event: ["M7 2v4M17 2v4", "M3 8h18", "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"],
    outreach: ["M12 21s-7-4.4-9-9a5 5 0 0 1 9-4 5 5 0 0 1 9 4c-2 4.6-9 9-9 9Z"],
    industry: ["M3 21h18", "M5 21V9l6 3V9l6 3v9", "M7 17h2M12 17h2M17 17h2"],
    alumni: ["M12 3 22 8l-10 5L2 8l10-5Z", "M6 10v5c2 2 10 2 12 0v-5"],
    placement: ["M10 6h4", "M6 21V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13", "M8 21h8", "M9 11h6M9 15h6"],
    journal: ["M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z", "M8 7h6M8 11h8M8 15h5"],
    book: ["M4 19.5V5a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v15H6a2 2 0 0 1-2-1.5Z", "M8 7h7M8 11h7M8 15h5"],
    monitor: ["M3 5h18v12H3V5Z", "M8 21h8", "M12 17v4"],
    research: ["M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M21 21l-6-6", "M14 14l1-1"],
    project: ["M4 7h16", "M4 12h16", "M4 17h10", "M6 5v14"],
    obe: ["M4 5h16v14H4V5Z", "M8 9h8", "M8 13h5", "M16 16l2 2 3-4"],
    fundedProject: ["M4 7h16v12H4V7Z", "M8 7V5h8v2", "M8 13h8", "M8 16h5"],
    externalProject: ["M5 12h14", "M13 6l6 6-6 6", "M5 5v14"],
    patent: ["M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4Z", "M9 12l2 2 4-5"],
    trophy: ["M8 21h8", "M12 17v4", "M7 4h10v5a5 5 0 0 1-10 0V4Z", "M5 6H3a3 3 0 0 0 3 3h1", "M19 6h2a3 3 0 0 1-3 3h-1"],
    conference: ["M4 5h16v10H4V5Z", "M8 21h8", "M12 15v6"],
    consultancy: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01M3 12h.01M3 18h.01"],
    startup: ["M12 2c3 2 5 5 5 9 0 4-5 11-5 11S7 15 7 11c0-4 2-7 5-9Z", "M12 9h.01"],
    training: ["M3 7h18", "M5 7v12h14V7", "M9 11h6M9 15h4"],
    workshop: ["M4 4h16v6H4V4Z", "M6 14h12", "M8 18h8", "M10 10v4", "M14 10v4"],
    industrialTraining: ["M3 21h18", "M4 21V10l5 3v-3l5 3v-3l6 4v7", "M7 17h2M12 17h2M17 17h2"],
  };
  const paths = icons[type] || icons.project;
  return (
    <span className="appraisal-subsection-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((path) => <path key={path} d={path} />)}
      </svg>
    </span>
  );
}

function SubsectionTitle({ icon, children }) {
  return (
    <div className="appraisal-subsection-title">
      <SubsectionIcon type={icon} />
      <span>{children}</span>
    </div>
  );
}

const partDParameters = [
  { parameter: "Self-motivation & Proactiveness", description: "List of activities/initiatives other than regular load/duties", max: 10 },
  { parameter: "Punctuality", description: "Late marks (office report), punctuality in lecture/practical, timely daily-report checking, absentee without intimation", max: 10 },
  { parameter: "Target-based Work", description: "Tasks allotted; timely completion observed by HOD", max: 10 },
  { parameter: "Effectiveness", description: "Work done without errors and least follow-up, observed by HOD", max: 10 },
  { parameter: "Obedience", description: "Observed by HOD and Director", max: 10 },
];

export default function StandardMyAppraisal({
  sectionTab,
  onSectionTabChange,
  showSectionSelector = false,
  defaultDesignation = sessionStorage.getItem("designation") || "",
  defaultAcademicYear = sessionStorage.getItem("academicYear") || APP_INFO.DEFAULT_AY,
  titleNameFallback = "Faculty",
  subtitleSeparator = ".",
} = {}) {
  const navigate = useNavigate();
  const [localAppraisalTab, setLocalAppraisalTab] = useState("partA");
  const hodAppraisalTab = sectionTab || localAppraisalTab;
  const setHodAppraisalTab = onSectionTabChange || setLocalAppraisalTab;
  const resolvedAcademicYear = defaultAcademicYear || sessionStorage.getItem("academicYear") || APP_INFO.DEFAULT_AY;

  useEffect(() => {
    const syncAcademicYear = (event) => {
      const nextAcademicYear = event?.detail?.academicYear || sessionStorage.getItem("academicYear") || APP_INFO.DEFAULT_AY;
      setInfo((previousInfo) => ({ ...previousInfo, ay: nextAcademicYear }));
    };

    window.addEventListener("academicYearChanged", syncAcademicYear);
    return () => window.removeEventListener("academicYearChanged", syncAcademicYear);
  }, []);

  useEffect(() => {
    setInfo((previousInfo) => ({ ...previousInfo, ay: resolvedAcademicYear }));
  }, [resolvedAcademicYear]);

  const [availableCyclesState, setAvailableCyclesState] = useState(() => normalizeAcademicYearCycles(JSON.parse(sessionStorage.getItem("availableCycles") || "[]")));

  useEffect(() => {
    const syncAvailableCycles = () => {
      setAvailableCyclesState(normalizeAcademicYearCycles(JSON.parse(sessionStorage.getItem("availableCycles") || "[]")));
    };
    window.addEventListener("academicYearChanged", syncAvailableCycles);
    return () => window.removeEventListener("academicYearChanged", syncAvailableCycles);
  }, []);

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
    ay: resolvedAcademicYear
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

  const [obeRows, setObeRows] = useState(defaultObeRows);
  const setObe = (i, k, v) => setObeRows((p) => p.map((r, j) => j === i ? { ...r, [k]: k === "score" ? String(clampScore(v, r.max || A5_OBE_MAX) || "") : v } : r));

  const [mentoringRows, setMentoringRows] = useState(defaultMentoringRows);
  const setMentoring = (i, k, v) => setMentoringRows((p) => p.map((r, j) => j === i ? { ...r, [k]: k === "score" ? String(clampScore(v, r.max || A7_MENTORING_MAX) || "") : v } : r));

  const [deptActs, setDeptActs] = useState([
    { activity: "", nature: "", period: "", score: "", hod: "", director: "" },
  ]);
  const setDept = (i, k, v) => setDeptActs((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [uniActs, setUniActs] = useState([
    { activity: "", nature: "", period: "", score: "", hod: "", director: "" },
  ]);
  const setUni = (i, k, v) => setUniActs((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [eventRows, setEventRows] = useState([
    { event: "", role: "", date: "", level: "", score: "" },
  ]);
  const setEvent = (i, k, v) => setEventRows((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [society, setSociety] = useState([
    { label: "", details: "", date: "", score: "", hod: "", director: "" },
  ]);
  const setSoc = (i, k, v) => setSociety((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [industry, setIndustry] = useState([
    { activity: "", partner: "", date: "", name: "", details: "", score: "", hod: "", director: "" },
  ]);
  const setInd = (i, k, v) => setIndustry((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [alumniRows, setAlumniRows] = useState([
    { activity: "", details: "", date: "", score: "" },
  ]);
  const setAlumni = (i, k, v) => setAlumniRows((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const [placementRows, setPlacementRows] = useState([
    { activityType: "", name: "", date: "", score: "" },
  ]);
  const setPlacement = (i, k, v) => setPlacementRows((p) => p.map((r, j) => j === i ? { ...r, [k]: v } : r));

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
  const [sectionSaveStatus, setSectionSaveStatus] = useState({ partA: false, partB: false, partC: false, partD: false });
  const [summaryOtherInfo, setSummaryOtherInfo] = useState("");
  const [savingSection, setSavingSection] = useState(null);
  const [workflowDeclaration, setWorkflowDeclaration] = useState(null);
  const [workflowReviews, setWorkflowReviews] = useState([]);
  const selectedCycle = availableCyclesState.find((cycle) => cycle.academic_year === info.ay);
  const isSelectedCycleClosed = selectedCycle ? !selectedCycle.is_open : false;

  const appraisalSetters = {
    setInfo, setLectures, setCourseFile, setInnovRows: (rows) => setInnovRows(sanitizeInnovativeRows(rows)), setInnovDetails, setInnovScore,
    setProjects, setObeRows, setMentoringRows, setQuals, setFeedback, setDeptActs, setUniActs,
    setEventRows, setSociety, setIndustry, setAlumniRows, setPlacementRows, setAcr, setJournals, setBooks, setIct,
    setResearch, setProjects2, setExternalProjects, setPatents, setAwards,
    setConfs, setProposals, setProducts, setFdps, setTraining, setDocs,
    setSummaryOtherInfo, setSectionApplicability, setSectionSaveStatus,
  };

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
        const submittedAlready = Boolean(declaration) && !hasActiveRejection(declaration, loadedReviews);
        setAppraisalLocked(isSelectedCycleClosed || submittedAlready);

        const savedAppraisal = await (isSelectedCycleClosed ? loadClosedAppraisal : loadSavedAppraisal)({
          facultyEmail: userEmail,
          academicYear: info.ay,
          setters: appraisalSetters,
        });
        const savedDeclaration = savedAppraisal?.declaration || savedAppraisal?.payload?.declaration || null;
        if (savedDeclaration && !declaration) setWorkflowDeclaration(savedDeclaration);
        const savedReviews = reviewListFrom(savedAppraisal?.reviews || savedAppraisal?.payload?.reviews);
        if (savedReviews.length && !loadedReviews.length) setWorkflowReviews(savedReviews);

        await Promise.all([
          loadAppraisalDocuments({ facultyEmail: userEmail, academicYear: info.ay, setDocs }),
        ]);
      } catch (err) {
        console.error("Could not load saved appraisal:", err);
      }
    };

    loadOwnAppraisal();
  }, [info.ay, isSelectedCycleClosed]);

  // -- Computed scores for HOD appraisal --
  const totalLecScore = sumSectionScore(lectures, A1_COURSE_DELIVERY_MAX, "score", 10);
  const courseFileScore = sumSectionScore(courseFile, A2_COURSE_FILE_MAX, "score", SCORE_LIMITS.courseFileRow);
  const innovTotal = clampScore(innovRows.reduce((s, r) => s + clampScore(r.score, A3_INNOVATIVE_ROW_MAX), 0), A3_INNOVATIVE_MAX);
  const selectedInnovativeMethods = new Set(innovRows.map((row) => String(row.method ?? "").trim()).filter(Boolean));
  const innovativeMethodOptionsForRow = (currentMethod) => INNOVATIVE_METHOD_OPTIONS.filter((option) => option.value === currentMethod || !selectedInnovativeMethods.has(option.value));
  const innovScoreComputed = String(innovTotal);
  const projectTotal = sectionApplicability.projects === "notApplicable" ? 0 : sumSectionScore(projects, A6_PROJECT_GUIDANCE_MAX, "score", A6_PROJECT_GUIDANCE_MAX);
  const obeScore = sumSectionScore(obeRows, A5_OBE_MAX);
  const mentoringScore = sumSectionScore(mentoringRows, A7_MENTORING_MAX);
  const qualTotal = sumSectionScore(quals, A8_QUALIFICATION_MAX, "score", SCORE_LIMITS.qualificationRow);
  const teachingRaw = totalLecScore + courseFileScore + innovTotal + projectTotal + obeScore + mentoringScore + qualTotal;
  const stuFeedbackScore = feedbackSectionScore(feedback, A4_FEEDBACK_MAX);
  const deptScore = sumSectionScore(deptActs, C2_SCHOOL_ADMIN_MAX);
  const uniScore = sumSectionScore(uniActs, C1_UNIVERSITY_ADMIN_MAX);
  const eventScore = sumSectionScore(eventRows, C3_EVENT_MAX);
  const societyScore = sectionApplicability.society === "notApplicable" ? 0 : sumSectionScore(society, C4_OUTREACH_MAX);
  const industryScore = sumSectionScore(industry, C5_INDUSTRY_MAX);
  const alumniScore = sumSectionScore(alumniRows, C6_ALUMNI_MAX);
  const placementScore = sumSectionScore(placementRows, C7_PLACEMENT_MAX);
  const acrScore = 0;
  const teachingMax = sectionApplicability.projects === "notApplicable" ? PART_A_MAX - A6_PROJECT_GUIDANCE_MAX : PART_A_MAX;
  const effectivePartAMax = sectionApplicability.projects === "notApplicable" ? PART_A_MAX - A6_PROJECT_GUIDANCE_MAX : PART_A_MAX;
  const partATotal = clampScore(teachingRaw + stuFeedbackScore, effectivePartAMax);

  const journalScore = sumSectionScore(journals, B1_JOURNAL_MAX);
  const bookScore = sumSectionScore(books, B2_BOOK_MAX);
  const ictScore = sumSectionScore(ict, B3_ICT_MAX);
  const researchScore = sectionApplicability.research === "notApplicable" ? 0 : clampScore(research.reduce((total, row) => total + researchGuidanceScore(row), 0), B5_RESEARCH_GUIDANCE_MAX);
  const projectBScore = sumSectionScore(projects2, B4_PROJECT_MAX);
  const externalProjectScore = 0;
  const patentScore = sumSectionScore(patents, 40);
  const awardScore = sumSectionScore(awards, B9_AWARDS_MAX);
  const confScore = sumSectionScore(confs, B7_CONFERENCE_MAX);
  const proposalScore = sumSectionScore(proposals, B6_CONSULTANCY_MAX);
  const productScore = sumSectionScore(products, B10_STARTUP_MAX);
  const fdpScore = fdps.reduce((s, r) => s + clampScore(parseFloat(r.score) || 0, B8_ATTENDED_MAX), 0);
  const trainScore = training.reduce((s, r) => s + clampScore(parseFloat(r.score) || 0, B8_ATTENDED_MAX), 0);
  const b8Score = clampScore(fdpScore + trainScore, B8_ATTENDED_MAX);
  const researchGuidanceProjectMax = sectionApplicability.research === "notApplicable" ? B4_PROJECT_MAX : B4_PROJECT_MAX + B5_RESEARCH_GUIDANCE_MAX;
  const effectivePartBMax = sectionApplicability.research === "notApplicable" ? PART_B_MAX - B5_RESEARCH_GUIDANCE_MAX : PART_B_MAX;
  const partCTotal = clampScore(uniScore + deptScore + eventScore + societyScore + industryScore + alumniScore + placementScore, PART_C_MAX);
  const partDTotal = 0;
  const effectiveGrandMax = effectivePartAMax + effectivePartBMax + PART_C_MAX + PART_D_MAX;
  const partBTotal = clampScore(journalScore + bookScore + ictScore + researchScore + projectBScore + patentScore + awardScore + confScore + proposalScore + productScore + b8Score, effectivePartBMax);
  const grandTotal = clampScore(partATotal + partBTotal + partCTotal + partDTotal, effectiveGrandMax);

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
  const overallProgress = pct(grandTotal, effectiveGrandMax);
  const [submitting, setSubmitting] = useState(false);
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);

  const validateSelfAppraisalRows = () => {
    const sections = [
      { label: "A(i). Lectures", rows: lectures, fields: ["sem", "code", "planned", "conducted", "score"] },
      { label: "A(ii). Course File", rows: courseFile, fields: ["course", "title", "details"] },
      { label: "A(iii). Innovative Teaching Methods", rows: innovRows, fields: ["method", "details", "score"] },
      { label: "A5. Learning Outcomes Attainment & OBE Practice", rows: obeRows, fields: ["component", "score"], isRowActive: evidenceClaimedOrScored },
      { label: "A6. Student Project Guidance", rows: projects, fields: ["label", "score"], rowMax: A6_PROJECT_GUIDANCE_MAX, maxScore: A6_PROJECT_GUIDANCE_MAX, skip: sectionApplicability.projects === "notApplicable" },
      { label: "A7. Student Mentoring & Counselling", rows: mentoringRows, fields: ["activity", "score"], isRowActive: evidenceClaimedOrScored },
      { label: "A8. Professional Development & Qualification Enhancement", rows: quals, fields: ["label", "score"] },
      { label: "A(vi). Student Feedback", rows: feedback, fields: ["code", "fb1", "fb2"] },
      { label: "C1. Administration at University Level", rows: uniActs, fields: ["activity", "nature", "period", "score"] },
      { label: "C2. Administration at School Level", rows: deptActs, fields: ["activity", "nature", "period", "score"] },
      { label: "C3. Event Organisation & Institutional Visibility", rows: eventRows, fields: ["event", "role", "date", "level", "score"] },
      { label: "C4. Outreach, Extension & Social Responsibility", rows: society, fields: ["label", "details", "date", "score"], skip: sectionApplicability.society === "notApplicable" },
      { label: "C5. Industry Interaction & Linkages", rows: industry, fields: ["activity", "partner", "date", "score"] },
      { label: "C6. Alumni Engagement & Networking", rows: alumniRows, fields: ["activity", "details", "date", "score"] },
      { label: "C7. Student Placement Mentoring & Career Development", rows: placementRows, fields: ["activityType", "name", "date", "score"] },
      { label: "B1. Journals", rows: journals, fields: ["title", "journal", "issn", "index", "score"] },
      { label: "B2. Books / Chapters", rows: books, fields: ["title", "book", "issn", "pub", "coauth", "first", "score"] },
      { label: "B3. Patents, Copyrights & IP and Product Development", rows: patents, fields: ["title", "type", "date", "status", "fileNo", "score"] },
      { label: "B4. Funded Research Projects", rows: projects2, fields: ["title", "agency", "date", "amount", "role", "status", "score"] },
      { label: "B5. Research Guidance", rows: research, fields: ["degree", "name", "thesis"], skip: sectionApplicability.research === "notApplicable" },
      { label: "B6. Consultancy, Testing & Training", rows: proposals, fields: ["title", "duration", "agency", "amount", "score"] },
      { label: "B7. Conference / FDP Contributions - Organised", rows: confs, fields: ["title", "type", "org", "level", "score"] },
      { label: "B8. Conference / FDP / Industry Training Attended", rows: fdps, fields: ["program", "duration", "org", "score"], rowMax: B8_ATTENDED_MAX, maxScore: B8_ATTENDED_MAX },
      { label: "B8. Industrial Training", rows: training, fields: ["company", "duration", "nature", "score"], rowMax: B8_ATTENDED_MAX, maxScore: B8_ATTENDED_MAX },
      { label: "B9. Research Awards, Fellowships & Citations", rows: awards, fields: ["title", "date", "agency", "level", "score"] },
      { label: "B10. Innovation, Start-ups & Technology Transfer", rows: products, fields: ["details", "usage", "score"] },
      { label: "B11. ICT Content, MOOCs & E-Learning", rows: ict, fields: ["title", "desc", "type", "quad", "score"] },
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
      { label: "A5. Learning Outcomes Attainment & OBE Practice", rows: obeRows, fields: ["component", "score"], isRowActive: evidenceClaimedOrScored },
      { label: "A6. Student Project Guidance", rows: projects, fields: ["label", "score"], rowMax: A6_PROJECT_GUIDANCE_MAX, maxScore: A6_PROJECT_GUIDANCE_MAX, skip: sectionApplicability.projects === "notApplicable" },
      { label: "A7. Student Mentoring & Counselling", rows: mentoringRows, fields: ["activity", "score"], isRowActive: evidenceClaimedOrScored },
      { label: "A8. Professional Development & Qualification Enhancement", rows: quals, fields: ["label", "score"] },
      { label: "A(vi). Student Feedback", rows: feedback, fields: ["code", "fb1", "fb2"] },
    ];
    const partCSections = [
      { label: "C1. Administration at University Level", rows: uniActs, fields: ["activity", "nature", "period", "score"] },
      { label: "C2. Administration at School Level", rows: deptActs, fields: ["activity", "nature", "period", "score"] },
      { label: "C3. Event Organisation & Institutional Visibility", rows: eventRows, fields: ["event", "role", "date", "level", "score"] },
      { label: "C4. Outreach, Extension & Social Responsibility", rows: society, fields: ["label", "details", "date", "score"], skip: sectionApplicability.society === "notApplicable" },
      { label: "C5. Industry Interaction & Linkages", rows: industry, fields: ["activity", "partner", "date", "score"] },
      { label: "C6. Alumni Engagement & Networking", rows: alumniRows, fields: ["activity", "details", "date", "score"] },
      { label: "C7. Student Placement Mentoring & Career Development", rows: placementRows, fields: ["activityType", "name", "date", "score"] },
    ];
    const partBSections = [
      { label: "B1. Journals", rows: journals, fields: ["title", "journal", "issn", "index", "score"] },
      { label: "B2. Books / Chapters", rows: books, fields: ["title", "book", "issn", "pub", "coauth", "first", "score"] },
      { label: "B3. Patents, Copyrights & IP and Product Development", rows: patents, fields: ["title", "type", "date", "status", "fileNo", "score"] },
      { label: "B4. Funded Research Projects", rows: projects2, fields: ["title", "agency", "date", "amount", "role", "status", "score"] },
      { label: "B5. Research Guidance", rows: research, fields: ["degree", "name", "thesis"], skip: sectionApplicability.research === "notApplicable" },
      { label: "B6. Consultancy, Testing & Training", rows: proposals, fields: ["title", "duration", "agency", "amount", "score"] },
      { label: "B7. Conference / FDP Contributions - Organised", rows: confs, fields: ["title", "type", "org", "level", "score"] },
      { label: "B8. Conference / FDP / Industry Training Attended", rows: fdps, fields: ["program", "duration", "org", "score"], rowMax: B8_ATTENDED_MAX, maxScore: B8_ATTENDED_MAX },
      { label: "B8. Industrial Training", rows: training, fields: ["company", "duration", "nature", "score"], rowMax: B8_ATTENDED_MAX, maxScore: B8_ATTENDED_MAX },
      { label: "B9. Research Awards, Fellowships & Citations", rows: awards, fields: ["title", "date", "agency", "level", "score"] },
      { label: "B10. Innovation, Start-ups & Technology Transfer", rows: products, fields: ["details", "usage", "score"] },
      { label: "B11. ICT Content, MOOCs & E-Learning", rows: ict, fields: ["title", "desc", "type", "quad", "score"] },
    ];
    const sectionMap = { partA: partASections, partB: partBSections, partC: partCSections, partD: [] };
    const errors = validateCompleteRows(sectionMap[section] || partASections, docs);
    if (section === "partB") {
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

  const buildSelfDraftForm = (saveStatus = sectionSaveStatus) => normalizeAutoScores({ info, lectures, courseFile, innovDetails: innovRows.map((row) => row.method).filter(Boolean).join(", "), innovScore: innovScoreComputed, innovRows, projects, obeRows, mentoringRows, quals, feedback, deptActs, uniActs, eventRows, society, industry, alumniRows, placementRows, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, summaryOtherInfo, sectionApplicability, sectionSaveStatus: saveStatus });

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
        totals: { partATotal, partBTotal, partCTotal, partDTotal, grandTotal, effectivePartAMax, effectivePartBMax, effectiveGrandMax },
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
    if (!declarationConfirmed) {
      alert("Please tick the declaration checkbox before submitting.");
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
        totals: { partATotal, partBTotal, partCTotal, partDTotal, grandTotal, effectivePartAMax, effectivePartBMax, effectiveGrandMax },
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

    <h3>A1. Course Delivery &amp; Classroom Engagement &nbsp;(Max 40)</h3>
    <table>
      <tr><th>SN</th><th>Semester</th><th>Course Code / Name</th><th>Classes as per Course Structure</th><th>Classes Actually Conducted</th><th>API Score</th></tr>
      ${lectures.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${l.sem || '&nbsp;'}</td><td>${l.code || '&nbsp;'}</td><td class="c">${l.planned || '&nbsp;'}</td><td class="c">${l.conducted || '&nbsp;'}</td><td class="c">${l.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total Score (Max 40)</td><td class="c">${totalLecScore.toFixed(1)}</td></tr>
    </table>

    <h3>A2. Course File &amp; Curriculum Documentation &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Course / Paper</th><th>Program & Semester</th><th>Details</th><th>API Score</th></tr>
      ${courseFile.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.course || '&nbsp;'}</td><td>${c.title || '&nbsp;'}</td><td>${c.details || '&nbsp;'}</td><td class="c">${c.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total Score (Max 20)</td><td class="c">${courseFileScore.toFixed(1)}</td></tr>
    </table>

    <h3>A3. Innovative Teaching-Learning Methods &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Methods Used</th><th>Details</th><th>API Score</th></tr>
      ${innovRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.method || '&nbsp;'}</td><td>${r.details || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total Score (Max 20)</td><td class="c">${innovTotal.toFixed(1)}</td></tr>
    </table>

    ${sectionApplicability.projects !== "notApplicable" ? `
    <h3>A6. Student Project Guidance &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Project Type</th><th>API Score</th></tr>
      ${projects.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.label || '&nbsp;'}</td><td class="c">${clampScore(p.score, projectGuidanceRowMax(p)) || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="2" class="c b">Total Score (Max 20)</td><td class="c">${projectTotal.toFixed(1)}</td></tr>
    </table>` : ""}

    <h3>A8. Professional Development &amp; Qualification Enhancement &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Qualification / Category</th><th>API Score</th></tr>
      ${quals.map((q, i) => `<tr><td class="c">${i + 1}</td><td>${q.label || '&nbsp;'}</td><td class="c">${q.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="2" class="c b">Total Score (Max 10)</td><td class="c">${qualTotal.toFixed(1)}</td></tr>
    </table>

    <h3>A4. Student Feedback Score &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Course Code / Name</th><th>First Feedback(%)</th><th>Second Feedback(%)</th><th>Average</th><th>API Score</th></tr>
      ${feedback.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${f.code || '&nbsp;'}</td><td class="c">${f.fb1 || '&nbsp;'}</td><td class="c">${f.fb2 || '&nbsp;'}</td><td class="c">${(f.fb1 || f.fb2) ? ((n(f.fb1) + n(f.fb2)) / ((f.fb1 ? 1 : 0) + (f.fb2 ? 1 : 0) || 1)).toFixed(2) : '&nbsp;'}</td><td class="c">${(f.fb1 || f.fb2) ? (((n(f.fb1) + n(f.fb2)) / ((f.fb1 ? 1 : 0) + (f.fb2 ? 1 : 0) || 1)) / 10).toFixed(2) : '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr>
    </table>

    <h3>A5. Learning Outcomes Attainment &amp; OBE Practice &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Component</th><th>Evidence Attached (Yes/No)</th><th>API Score</th></tr>
      ${obeRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.component || '&nbsp;'}</td><td>${r.evidence || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 20)</td><td class="c">${obeScore.toFixed(1)}</td></tr>
    </table>

    <h3>A7. Student Mentoring &amp; Counselling &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Activity</th><th>Evidence Attached (Yes/No)</th><th>API Score</th></tr>
      ${mentoringRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.activity || '&nbsp;'}</td><td>${r.evidence || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 10)</td><td class="c">${mentoringScore.toFixed(1)}</td></tr>
    </table>

    <div class="pb"></div>
    <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART C - Administrative Role &amp; University Development Contribution</h3>

    <h3>C2. Administration at School Level &nbsp;(Max 30)</h3>
    <table>
      <tr><th>SN</th><th>Activity / Responsibility</th><th>Duration Category</th><th>Period</th><th>API Score</th></tr>
      ${deptActs.map((d, i) => `<tr><td class="c">${i + 1}</td><td>${d.activity || '&nbsp;'}</td><td>${d.nature || '&nbsp;'}</td><td>${d.period || '&nbsp;'}</td><td class="c">${d.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 30)</td><td class="c">${deptScore.toFixed(1)}</td></tr>
    </table>

    <h3>C1. Administration at University Level &nbsp;(Max 50)</h3>
    <table>
      <tr><th>SN</th><th>Activity / Responsibility</th><th>Duration Category</th><th>Period</th><th>API Score</th></tr>
      ${uniActs.map((u, i) => `<tr><td class="c">${i + 1}</td><td>${u.activity || '&nbsp;'}</td><td>${u.nature || '&nbsp;'}</td><td>${u.period || '&nbsp;'}</td><td class="c">${u.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 50)</td><td class="c">${uniScore.toFixed(1)}</td></tr>
    </table>

    <h3>C3. Event Organisation &amp; Institutional Visibility &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Event / Contribution</th><th>Role</th><th>Date</th><th>Level</th><th>API Score</th></tr>
      ${eventRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.event || '&nbsp;'}</td><td>${r.role || '&nbsp;'}</td><td class="c">${r.date || '&nbsp;'}</td><td>${r.level || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 20)</td><td class="c">${eventScore.toFixed(1)}</td></tr>
    </table>

    <h3>C4. Outreach, Extension &amp; Social Responsibility &nbsp;(Max 20)</h3>
    ${sectionApplicability.society === "notApplicable" ? "<p><em>Not Applicable</em></p>" : `<table>
      <tr><th>SN</th><th>Activity</th><th>Details</th><th>Date</th><th>API Score</th></tr>
      ${society.map((s, i) => `<tr><td class="c">${i + 1}</td><td>${s.label || '&nbsp;'}</td><td>${s.details || '&nbsp;'}</td><td class="c">${s.date || '&nbsp;'}</td><td class="c">${s.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 20)</td><td class="c">${societyScore.toFixed(1)}</td></tr>
    </table>`}

    <h3>C5. Industry Interaction &amp; Linkages &nbsp;(Max 8)</h3>
    <table>
      <tr><th>SN</th><th>Activity</th><th>Industry Partner</th><th>Date</th><th>API Score</th></tr>
      ${industry.map((ind, i) => `<tr><td class="c">${i + 1}</td><td>${ind.activity || ind.name || '&nbsp;'}</td><td>${ind.partner || ind.details || '&nbsp;'}</td><td class="c">${ind.date || '&nbsp;'}</td><td class="c">${ind.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 8)</td><td class="c">${industryScore.toFixed(1)}</td></tr>
    </table>

    <h3>C6. Alumni Engagement &amp; Networking &nbsp;(Max 10)</h3>
    <table>
      <tr><th>SN</th><th>Activity</th><th>Details</th><th>Date</th><th>API Score</th></tr>
      ${alumniRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.activity || '&nbsp;'}</td><td>${r.details || '&nbsp;'}</td><td class="c">${r.date || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 10)</td><td class="c">${alumniScore.toFixed(1)}</td></tr>
    </table>

    <h3>C7. Student Placement Mentoring &amp; Career Development &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Activity Type</th><th>Student / Company Name</th><th>Date</th><th>API Score</th></tr>
      ${placementRows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.activityType || '&nbsp;'}</td><td>${r.name || '&nbsp;'}</td><td class="c">${r.date || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 20)</td><td class="c">${placementScore.toFixed(1)}</td></tr>
    </table>

    <div class="pb"></div>
    <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART D - Annual Confidential Report</h3>
    <h3>Part D. Annual Confidential Report &nbsp;(Max 50, Evaluator only)</h3>
    <table>
      <tr><th>SN</th><th>Parameter</th><th>Description / Indicators</th><th>Max Marks</th></tr>
      ${partDParameters.map((row, i) => `<tr><td class="c">${i + 1}</td><td>${row.parameter}</td><td>${row.description}</td><td class="c">${row.max}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Evaluator only)</td><td class="c">${PART_D_MAX}</td></tr>
    </table>

    <table class="st">
      <tr><th>Part A Summary</th><th>Max</th><th>Faculty Score</th></tr>
      <tr><td>Teaching &amp; Learning</td><td class="c">${teachingMax}</td><td class="c">${partATotal.toFixed(1)}</td></tr>
      <tr><td colspan="3" class="b">Part C and D are shown separately in the final summary.</td></tr>
      <tr class="tr"><td class="b">PART A TOTAL</td><td class="c b">${effectivePartAMax}</td><td class="c b">${partATotal.toFixed(1)}</td></tr>
      <tr class="tr"><td class="b">PART A MARKS OBTAINED (%)</td><td colspan="2" class="c b">${partAMarksPercentage}%</td></tr>
    </table>

    <div class="pb"></div>
    <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART B - Research &amp; Innovation</h3>

    <h3>B1. Journal Publications &nbsp;(Max 100)</h3>
    <table>
      <tr><th>SN</th><th>Title with Page Nos.</th><th>Journal Details</th><th>ISSN/ISBN No.</th><th>Journal Indexing</th><th>API Score</th></tr>
      ${journals.map((j, i) => `<tr><td class="c">${i + 1}</td><td>${j.title || '&nbsp;'}</td><td>${j.journal || '&nbsp;'}</td><td class="c">${j.issn || '&nbsp;'}</td><td class="c">${j.index || '&nbsp;'}</td><td class="c">${j.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 100)</td><td class="c">${journalScore.toFixed(1)}</td></tr>
    </table>

    <h3>B2. Books, Book Chapters &amp; Edited Volumes &nbsp;(Max 30)</h3>
    <table>
      <tr><th>SN</th><th>Title with Page Nos.</th><th>Book Title, Editor &amp; Publisher</th><th>ISSN/ISBN</th><th>Type of Publisher</th><th>Co-authors</th><th>First Author</th><th>API Score</th></tr>
      ${books.map((b, i) => `<tr><td class="c">${i + 1}</td><td>${b.title || '&nbsp;'}</td><td>${b.book || '&nbsp;'}</td><td class="c">${b.issn || '&nbsp;'}</td><td>${b.pub || '&nbsp;'}</td><td>${b.coauth || '&nbsp;'}</td><td class="c">${b.first || '&nbsp;'}</td><td class="c">${b.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="7" class="c b">Total (Max 30)</td><td class="c">${bookScore.toFixed(1)}</td></tr>
    </table>

    <h3>B11. ICT Content, MOOCs &amp; E-Learning &nbsp;(Max 15)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>Short Description</th><th>Type / Link</th><th>Quadrants</th><th>API Score</th></tr>
      ${ict.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.title || '&nbsp;'}</td><td>${r.desc || '&nbsp;'}</td><td>${r.type || '&nbsp;'}</td><td class="c">${r.quad || '&nbsp;'}</td><td class="c">${r.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 15)</td><td class="c">${ictScore.toFixed(1)}</td></tr>
    </table>

    ${sectionApplicability.research !== "notApplicable" ? `
    <h3>B5. Research Guidance &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Degree</th><th>Name of Student</th><th>Thesis / Status</th><th>API Score</th></tr>
      ${research.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="c">${r.degree || '&nbsp;'}</td><td>${r.name || '&nbsp;'}</td><td>${r.thesis || '&nbsp;'}</td><td class="c">${r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : ""}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Total (Max 20)</td><td class="c">${researchScore.toFixed(1)}</td></tr>
    </table>` : ""}

    <h3>B4. Funded Research Projects &nbsp;(Max 40)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>Funding Agency</th><th>Date of Sanction</th><th>Grant Amount</th><th>Role</th><th>Status</th><th>API Score</th></tr>
      ${projects2.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td>${p.agency || '&nbsp;'}</td><td class="c">${p.date || '&nbsp;'}</td><td class="c">${p.amount || '&nbsp;'}</td><td>${p.role || '&nbsp;'}</td><td>${p.status || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="7" class="c b">Total (Max 40)</td><td class="c">${projectBScore.toFixed(1)}</td></tr>
    </table>

    <h3>Legacy External Research Projects &nbsp;(Not counted in AY 2026-2027 total)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>Funding Agency</th><th>Date of Sanction</th><th>Grant Amount</th><th>Role</th><th>Status</th><th>API Score</th></tr>
      ${externalProjects.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td>${p.agency || '&nbsp;'}</td><td class="c">${p.date || '&nbsp;'}</td><td class="c">${p.amount || '&nbsp;'}</td><td>${p.role || '&nbsp;'}</td><td>${p.status || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="7" class="c b">Total (Max 0)</td><td class="c">${externalProjectScore.toFixed(1)}</td></tr>
    </table>

    <h3>5a) Patents (IPR) &nbsp;(Max 40)</h3>
    <table>
      <tr><th>SN</th><th>Title</th><th>National / International</th><th>Date of Filing</th><th>Status</th><th>Patent File No.</th><th>API Score</th></tr>
      ${patents.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td class="c">${p.type || '&nbsp;'}</td><td class="c">${p.date || '&nbsp;'}</td><td>${p.status || '&nbsp;'}</td><td class="c">${p.fileNo || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="6" class="c b">Total (Max 40)</td><td class="c">${patentScore.toFixed(1)}</td></tr>
    </table>

    <h3>B9. Research Awards, Fellowships &amp; Citations &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Title of Award</th><th>Date</th><th>Awarding Agency</th><th>Level</th><th>API Score</th></tr>
      ${awards.map((a, i) => `<tr><td class="c">${i + 1}</td><td>${a.title || '&nbsp;'}</td><td class="c">${a.date || '&nbsp;'}</td><td>${a.agency || '&nbsp;'}</td><td>${a.level || '&nbsp;'}</td><td class="c">${a.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 20)</td><td class="c">${awardScore.toFixed(1)}</td></tr>
    </table>

    <h3>B7. Conference / FDP Contributions - Organised &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Title / Session</th><th>Type</th><th>Organization</th><th>Level</th><th>API Score</th></tr>
      ${confs.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.title || '&nbsp;'}</td><td>${c.type || '&nbsp;'}</td><td>${c.org || '&nbsp;'}</td><td>${c.level || '&nbsp;'}</td><td class="c">${c.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 20)</td><td class="c">${confScore.toFixed(1)}</td></tr>
    </table>

    <h3>B6. Consultancy, Testing &amp; Training &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Title of Proposal</th><th>Duration</th><th>Funding Agency</th><th>Grant Amount Requested</th><th>API Score</th></tr>
      ${proposals.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || '&nbsp;'}</td><td class="c">${p.duration || '&nbsp;'}</td><td>${p.agency || '&nbsp;'}</td><td class="c">${p.amount || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="5" class="c b">Total (Max 20)</td><td class="c">${proposalScore.toFixed(1)}</td></tr>
    </table>

    <h3>B10. Innovation, Start-ups &amp; Technology Transfer &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Details of Product</th><th>Used by Students / Commercialized</th><th>API Score</th></tr>
      ${products.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.details || '&nbsp;'}</td><td>${p.usage || '&nbsp;'}</td><td class="c">${p.score || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="3" class="c b">Total (Max 20)</td><td class="c">${productScore.toFixed(1)}</td></tr>
    </table>

    <h3>B8. Conference / FDP / Industry Training Attended &nbsp;(Max 20)</h3>
    <table>
      <tr><th>SN</th><th>Program</th><th>Duration</th><th>Organized By</th><th>API Score</th></tr>
      ${fdps.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${f.program || '&nbsp;'}</td><td class="c">${f.duration || '&nbsp;'}</td><td>${f.org || '&nbsp;'}</td><td class="c">${clampScore(f.score, SCORE_LIMITS.fdpRow) || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">FDP / Workshops Total</td><td class="c">${fdpScore.toFixed(1)}</td></tr>
    </table>

    <h3>Industrial Training</h3>
    <table>
      <tr><th>SN</th><th>Company / Industry</th><th>Duration</th><th>Nature of Training</th><th>API Score</th></tr>
      ${training.map((t, i) => `<tr><td class="c">${i + 1}</td><td>${t.company || '&nbsp;'}</td><td class="c">${t.duration || '&nbsp;'}</td><td>${t.nature || '&nbsp;'}</td><td class="c">${clampScore(t.score, SCORE_LIMITS.fdpRow) || '&nbsp;'}</td></tr>`).join('')}
      <tr class="tr"><td colspan="4" class="c b">Combined B8 Total (Max 20)</td><td class="c">${b8Score.toFixed(1)}</td></tr>
    </table>

    <div class="pb"></div>
    <h3 style="text-align:center;font-size:13px">SUMMARY OF API SCORES - AY ${info.ay || ""}</h3>
    <table class="st">
      <tr><th>Sr.No.</th><th>Criteria</th><th>Max Score</th><th>Faculty Score</th></tr>
      <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part A - Teaching Process</td></tr>
      <tr><td class="c">A</td><td>Teaching &amp; Learning</td><td class="c">${effectivePartAMax}</td><td class="c">${partATotal.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part A Total</td><td class="c b">${effectivePartAMax}</td><td class="c b">${partATotal.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part A Marks Obtained (%)</td><td colspan="2" class="c b">${partAMarksPercentage}%</td></tr>
      <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part B - Research and Academic Contribution</td></tr>
      <tr><td class="c">1</td><td>Journal Publications</td><td class="c">100</td><td class="c">${journalScore.toFixed(1)}</td></tr>
      <tr><td class="c">2</td><td>Books, Book Chapters &amp; Edited Volumes</td><td class="c">30</td><td class="c">${bookScore.toFixed(1)}</td></tr>
      <tr><td class="c">3</td><td>Patents, Copyrights &amp; IP and Product Development</td><td class="c">40</td><td class="c">${patentScore.toFixed(1)}</td></tr>
      <tr><td class="c">4</td><td>Funded Research Projects</td><td class="c">40</td><td class="c">${projectBScore.toFixed(1)}</td></tr>
      <tr><td class="c">5</td><td>Research Guidance</td><td class="c">${sectionApplicability.research === "notApplicable" ? 0 : 20}</td><td class="c">${researchScore.toFixed(1)}</td></tr>
      <tr><td class="c">6</td><td>Consultancy, Testing &amp; Training</td><td class="c">20</td><td class="c">${proposalScore.toFixed(1)}</td></tr>
      <tr><td class="c">7</td><td>Conference / FDP Contributions - Organised</td><td class="c">20</td><td class="c">${confScore.toFixed(1)}</td></tr>
      <tr><td class="c">8</td><td>Conference / FDP / Industry Training Attended</td><td class="c">20</td><td class="c">${b8Score.toFixed(1)}</td></tr>
      <tr><td class="c">9</td><td>Research Awards, Fellowships &amp; Citations</td><td class="c">20</td><td class="c">${awardScore.toFixed(1)}</td></tr>
      <tr><td class="c">10</td><td>Innovation, Start-ups &amp; Technology Transfer</td><td class="c">20</td><td class="c">${productScore.toFixed(1)}</td></tr>
      <tr><td class="c">11</td><td>ICT Content, MOOCs &amp; E-Learning</td><td class="c">15</td><td class="c">${ictScore.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part B Total</td><td class="c b">${effectivePartBMax}</td><td class="c b">${partBTotal.toFixed(1)}</td></tr>
      <tr class="tr"><td colspan="2" class="c b">Part B Marks Obtained (%)</td><td colspan="2" class="c b">${partBMarksPercentage}%</td></tr>
      <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part C - Administrative Role &amp; University Development Contribution</td></tr>
      <tr><td class="c">C</td><td>Administrative Contribution</td><td class="c">${PART_C_MAX}</td><td class="c">${partCTotal.toFixed(1)}</td></tr>
      <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part D - Annual Confidential Report</td></tr>
      <tr><td class="c">D</td><td>Annual Confidential Report (Evaluator only)</td><td class="c">${PART_D_MAX}</td><td class="c">N/A</td></tr>
      <tr style="background:#bfbfbf;font-weight:bold;font-size:13px"><td colspan="2" class="c">Grand Total (Part A + Part B + Part C + Part D)</td><td class="c">${effectiveGrandMax}</td><td class="c">${grandTotal.toFixed(1)}</td></tr>
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
  function normalizeAcademicYearCycles(cyclesData) {
    const normalizeCycle = (cycle) => {
      if (!cycle) return null;
      if (typeof cycle === "string") {
        return { academic_year: cycle, is_open: true };
      }
      const academicYear = cycle.academic_year || cycle.academicYear || cycle.year || cycle.year_label || "";
      if (!academicYear) return null;
      return {
        academic_year: String(academicYear),
        is_open: cycle.is_open ?? cycle.isOpen ?? cycle.active ?? cycle.open ?? false,
      };
    };

    if (Array.isArray(cyclesData)) {
      return cyclesData
        .map(normalizeCycle)
        .filter(Boolean)
        .reduce((acc, cycle) => {
          if (!acc.some((existing) => existing.academic_year === cycle.academic_year)) {
            acc.push(cycle);
          }
          return acc;
        }, [])
        .sort((a, b) => a.academic_year.localeCompare(b.academic_year));
    }
    if (Array.isArray(cyclesData?.cycles)) return normalizeAcademicYearCycles(cyclesData.cycles);
    if (Array.isArray(cyclesData?.data)) return normalizeAcademicYearCycles(cyclesData.data);
    return [];
  }

  const academicYearOptions = availableCyclesState.length
    ? availableCyclesState
    : [{ academic_year: info.ay || resolvedAcademicYear, is_open: true }];
  const documentKeys = Object.keys(docs || {}).filter((key) => {
    const files = Array.isArray(docs?.[key]) ? docs[key] : docs?.[key] ? [docs[key]] : [];
    return files.length > 0;
  }).sort();
  const documentCount = documentKeys.reduce((total, key) => {
    const files = Array.isArray(docs?.[key]) ? docs[key] : docs?.[key] ? [docs[key]] : [];
    return total + files.length;
  }, 0);
  const handleAcademicYearChange = (newAcademicYear) => {
    setInfo((previousInfo) => ({ ...previousInfo, ay: newAcademicYear }));
    sessionStorage.setItem("academicYear", newAcademicYear);
    window.dispatchEvent(new CustomEvent("academicYearChanged", {
      detail: { academicYear: newAcademicYear },
    }));
  };

  return (
    <div className="appraisal-form-shell" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {showSectionSelector && !isSelectedCycleClosed && (
      <div className="appraisal-section-selector" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", boxShadow: "0 12px 30px rgba(17,24,39,0.06)" }}>
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>My Appraisal Section</div>
        <select
          value={hodAppraisalTab}
          onChange={(e) => handleMyAppraisalSectionChange(e.target.value)}
          style={{ minWidth: 220, height: 44, border: "1px solid #e5e7eb", borderRadius: 12, padding: "0 14px", fontSize: 14, fontFamily: "inherit", color: "#111827", background: "#fff", outline: "none", fontWeight: 700 }}
        >
          <option value="partA">Part A</option>
          <option value="partB" disabled={!isMyAppraisalSectionOpen("partB")}>Part B</option>
          <option value="partC" disabled={!isMyAppraisalSectionOpen("partC")}>Part C</option>
          <option value="partD" disabled={!isMyAppraisalSectionOpen("partD")}>Part D</option>
          <option value="summary" disabled={!isMyAppraisalSectionOpen("summary")}>Summary</option>
        </select>
      </div>
      )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="appraisal-page-header" style={{ background: "#fff", borderRadius: 14, padding: "18px 28px", boxShadow: "0 10px 28px rgba(17,24,39,0.06)", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#111827", letterSpacing: 0, lineHeight: 1.1 }}>My Appraisal Form</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 14, color: "#6b7280", fontWeight: 600, flexWrap: "wrap" }}>
                  <span>{info.name || titleNameFallback}</span>
                  <span>{subtitleSeparator}</span>
                  <span>Academic Year:</span>
                  <select
                    value={info.ay}
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
              <AppraisalHeaderImage height={58} />
            </div>
            <div className="appraisal-status-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 344px", gap: 14, alignItems: "stretch" }}>
              <WorkflowStatusTracker
                declaration={workflowDeclaration}
                reviews={workflowReviews}
                profile={profileFromsessionStorage()}
              />
              <div className="appraisal-progress-card" style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 10px 28px rgba(17,24,39,0.06)", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ fontSize: 14, color: "#374151", fontWeight: 800 }}>Overall Progress</div>
                  <div style={{ fontSize: 18, color: "#111827", fontWeight: 900 }}>{overallProgress}%</div>
                </div>
                <div aria-label={`Overall progress ${overallProgress}%`} style={{ height: 10, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                  <div style={{ width: `${overallProgress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#5b5ceb,#7c3aed)", transition: "width 300ms ease" }} />
                </div>
                <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>{grandTotal.toFixed(1)} / {effectiveGrandMax} Marks</div>
              </div>
            </div>
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
                  : isSelectedCycleClosed
                    ? "This appraisal year is closed. The submitted report and stored attachments are shown in read-only mode."
                    : "Submitted and locked for review. Your saved data is visible here, but editing is disabled while authorities review it."}
              </div>
            )}

            {isSelectedCycleClosed ? (
              <SC title="Closed Appraisal Report" accent="#4c1d95">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    ["Academic Year", info.ay || "-"],
                    ["Submitted Score", `${grandTotal.toFixed(1)} / ${effectiveGrandMax}`],
                    ["Documents", `${documentCount} file${documentCount === 1 ? "" : "s"}`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", background: "#f8fafc" }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ marginTop: 5, fontSize: 16, color: "#111827", fontWeight: 900 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={generateReport}
                    style={{ padding: "10px 28px", background: "#4c1d95", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
                  >
                    Generate Report
                  </button>
                </div>
                <div style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 900, marginBottom: 10 }}>Attachments</div>
                  {documentKeys.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {documentKeys.map((key) => (
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
              </SC>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <fieldset disabled={appraisalLocked && hodAppraisalTab !== "summary"} style={{ flex: 1, minWidth: 0, border: 0, padding: 0, margin: 0, opacity: appraisalLocked && hodAppraisalTab !== "summary" ? 0.86 : 1 }}>

                {/* Part A Tab */}
                {hodAppraisalTab === "partA" && (
                  <SC title={`Part A - Teaching & Academic Activities (Max ${effectivePartAMax})`} accent="#5b5ceb" scoreBadge={`${partATotal.toFixed(1)} / ${effectivePartAMax}`}>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4, fontWeight: 600 }}>Fill in your teaching and academic activities for the appraisal period. Enter scores for each item.</div>
                    {/* A1. Teaching Process */}
                    <div style={{ marginBottom: 16, order: 1 }}>
                      <SubsectionTitle icon="teaching">A1. Course Delivery & Classroom Engagement - Max 40 marks</SubsectionTitle>
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
                              <td style={TDS}><TI val={r.score} onChange={(v) => setLec(i, "score", v)} center numeric max={10} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 40)</td>
                            <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{totalLecScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setLectures((p) => [...p, { sem: "", code: "", planned: "", conducted: "", score: "", hod: "", director: "" }])} onDel={() => setLectures((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={lectures.length > 1} />
                    </div>

                    {/* A2. Course File */}
                    <div style={{ marginBottom: 16, order: 2 }}>
                      <SubsectionTitle icon="folder">A2. Course File & Curriculum Documentation - Max 20 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={4}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{courseFileScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setCourseFile((p) => [...p, { course: "", title: "", details: "", score: "", hod: "", director: "" }])} onDel={() => setCourseFile((p) => (p.length > 1 ? p.slice(0, -1) : p))} canDel={courseFile.length > 1} />
                    </div>

                    {/* A3. Innovative Teaching */}
                    <div style={{ marginBottom: 16, order: 3 }}>
                      <SubsectionTitle icon="lightbulb">A3. Innovative Teaching-Learning Methods - Max 20 marks</SubsectionTitle>
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
                              <td style={TD}>
                                <select
                                  value={r.method || ""}
                                  onChange={(e) => setInnov(i, "method", e.target.value)}
                                  style={{ width: "100%", height: 30, border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff", fontFamily: "inherit", fontSize: 11 }}
                                >
                                  <option value="">Select Method</option>
                                  {r.method && !LEGACY_INNOVATIVE_METHODS.has(r.method) && <option value={r.method}>{r.method}</option>}
                                  {innovativeMethodOptionsForRow(r.method).map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={TD}><TI val={r.details} onChange={(v) => setInnov(i, "details", v)} /></td>
                              <td style={TD}><DocCell id={`innov-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`innov-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setInnov(i, "score", v === "" ? "" : String(clampScore(v, A3_INNOVATIVE_ROW_MAX)))} numeric max={A3_INNOVATIVE_ROW_MAX} center /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{innovTotal.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setInnovRows((p) => [...p, { method: "", details: "", score: "" }])} onDel={() => setInnovRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={innovRows.length > 1} />
                    </div>

                    {/* A6. Student Project Guidance */}
                    <div style={{ marginBottom: 16, order: 6 }}>
                      <SubsectionTitle icon="guidance">A6. Student Project Guidance - Max 20 marks</SubsectionTitle>
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
                                <td style={TDS}><TI val={r.score} readOnly={sectionApplicability.projects === "notApplicable"} onChange={(v) => setProj(i, "score", v)} center numeric max={A6_PROJECT_GUIDANCE_MAX} /></td>
                              </tr>
                            ))}
                            <tr style={{ background: "#eff6ff" }}>
                              <td style={{ ...TDC, fontWeight: "bold" }} colSpan={4}>Total Score (Max {sectionApplicability.projects === "notApplicable" ? 0 : 20})</td>
                              <td style={{ ...TDS, fontWeight: "bold" }}>{projectTotal.toFixed(1)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <RowBtns onAdd={() => setProjects((p) => [...p, { label: "", score: "" }])} onDel={() => setProjects((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={projects.length > 1} />
                      </>)}
                    </div>

                    {/* A8. Qualifications */}
                    <div style={{ marginBottom: 16, order: 8 }}>
                      <SubsectionTitle icon="award">A8. Professional Development & Qualification Enhancement - Max 10 marks</SubsectionTitle>
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

                    {/* A4. Student Feedback */}
                    <div style={{ marginBottom: 16, order: 4 }}>
                      <SubsectionTitle icon="chart">A4. Student Feedback Score - Max 10 marks</SubsectionTitle>
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

                    {/* A5. OBE Practice */}
                    <div style={{ marginBottom: 16, order: 5 }}>
                      <SubsectionTitle icon="obe">A5. Learning Outcomes Attainment & OBE Practice - Max 20 marks</SubsectionTitle>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Component</th>
                            <th style={TH}>Evidence Attached (Yes/No)</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {obeRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.component} onChange={(v) => setObe(i, "component", v)} /></td>
                              <td style={TD}><TI val={r.evidence} onChange={(v) => setObe(i, "evidence", v)} placeholder="Yes / No" /></td>
                              <td style={TD}><DocCell id={`obe-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`obe-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setObe(i, "score", v)} center numeric max={r.max || A5_OBE_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{obeScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setObeRows((p) => [...p, { component: "", evidence: "", score: "", max: A5_OBE_MAX }])} onDel={() => setObeRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={obeRows.length > 1} />
                    </div>

                    {/* A7. Mentoring */}
                    <div style={{ marginBottom: 16, order: 7 }}>
                      <SubsectionTitle icon="mentoring">A7. Student Mentoring & Counselling - Max 10 marks</SubsectionTitle>
                      <table style={T}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width: 30 }}>SN</th>
                            <th style={TH}>Activity</th>
                            <th style={TH}>Evidence Attached (Yes/No)</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mentoringRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity} onChange={(v) => setMentoring(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.evidence} onChange={(v) => setMentoring(i, "evidence", v)} placeholder="Yes / No" /></td>
                              <td style={TD}><DocCell id={`mentor-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`mentor-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setMentoring(i, "score", v)} center numeric max={r.max || A7_MENTORING_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#eff6ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{mentoringScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setMentoringRows((p) => [...p, { activity: "", evidence: "", score: "", max: A7_MENTORING_MAX }])} onDel={() => setMentoringRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={mentoringRows.length > 1} />
                    </div>
                  </SC>
                )}

                {/* Part C Tab */}
                {hodAppraisalTab === "partC" && (
                  <SC title={`Part C - Administrative Role & University Development Contribution (Max ${PART_C_MAX})`} accent="#0f766e" scoreBadge={`${partCTotal.toFixed(1)} / ${PART_C_MAX}`}>
                    <div style={{ marginBottom: 14, padding: "8px 12px", background: "#ccfbf1", borderRadius: 6, fontSize: 12, color: "#115e59", fontWeight: 600 }}>
                      Total Part C Score: {partCTotal.toFixed(1)}/{PART_C_MAX}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="building">C1. Administration at University Level - Max 50 marks</SubsectionTitle>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                          <th style={TH}>Activity / Responsibility</th>
                          <th style={TH}>Duration Category</th>
                          <th style={TH}>Period</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Faculty Score</th>
                        </tr></thead>
                        <tbody>
                          {uniActs.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity} onChange={(v) => setUni(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.nature} onChange={(v) => setUni(i, "nature", v)} /></td>
                              <td style={TD}><TI val={r.period} onChange={(v) => setUni(i, "period", v)} /></td>
                              <td style={TD}><DocCell id={`uni-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`uni-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setUni(i, "score", v)} center numeric max={C1_UNIVERSITY_ADMIN_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#ccfbf1" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total (Max 50)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{uniScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setUniActs((p) => [...p, { activity: "", nature: "", period: "", score: "" }])} onDel={() => setUniActs((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={uniActs.length > 1} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="school">C2. Administration at School Level - Max 30 marks</SubsectionTitle>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                          <th style={TH}>Activity / Responsibility</th>
                          <th style={TH}>Duration Category</th>
                          <th style={TH}>Period</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Faculty Score</th>
                        </tr></thead>
                        <tbody>
                          {deptActs.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity} onChange={(v) => setDept(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.nature} onChange={(v) => setDept(i, "nature", v)} /></td>
                              <td style={TD}><TI val={r.period} onChange={(v) => setDept(i, "period", v)} /></td>
                              <td style={TD}><DocCell id={`dept-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`dept-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setDept(i, "score", v)} center numeric max={C2_SCHOOL_ADMIN_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#ccfbf1" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total (Max 30)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{deptScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setDeptActs((p) => [...p, { activity: "", nature: "", period: "", score: "" }])} onDel={() => setDeptActs((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={deptActs.length > 1} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="event">C3. Event Organisation & Institutional Visibility - Max 20 marks</SubsectionTitle>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                          <th style={TH}>Event / Contribution</th>
                          <th style={TH}>Role</th>
                          <th style={TH}>Date</th>
                          <th style={TH}>Level</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Faculty Score</th>
                        </tr></thead>
                        <tbody>
                          {eventRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.event} onChange={(v) => setEvent(i, "event", v)} /></td>
                              <td style={TD}><TI val={r.role} onChange={(v) => setEvent(i, "role", v)} /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setEvent(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><TI val={r.level} onChange={(v) => setEvent(i, "level", v)} /></td>
                              <td style={TD}><DocCell id={`event-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`event-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setEvent(i, "score", v)} center numeric max={C3_EVENT_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#ccfbf1" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{eventScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setEventRows((p) => [...p, { event: "", role: "", date: "", level: "", score: "" }])} onDel={() => setEventRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={eventRows.length > 1} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="outreach">C4. Outreach, Extension & Social Responsibility - Max 20 marks</SubsectionTitle>
                      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
                        {["applicable", "notApplicable"].map((v) => (
                          <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <input type="checkbox" checked={(sectionApplicability.society || "applicable") === v} onChange={() => setSectionApplicability((p) => ({ ...p, society: v }))} />
                            {v === "applicable" ? "Applicable" : "Not Applicable"}
                          </label>
                        ))}
                      </div>
                      {sectionApplicability.society !== "notApplicable" && <>
                        <table style={T}>
                          <thead><tr>
                            <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                            <th style={TH}>Activity</th>
                            <th style={TH}>Details</th>
                            <th style={TH}>Date</th>
                            <th style={TH}>Attachment</th>
                            <th style={TH}>View Docs</th>
                            <th style={TH}>Faculty Score</th>
                          </tr></thead>
                          <tbody>
                            {society.map((r, i) => {
                              const socLocked = societyRowLocked(r);
                              return (
                                <tr key={i} style={socLocked ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                                  <td style={TDC}>{i + 1}</td>
                                  <td style={TD}><TI val={r.label} onChange={(v) => setSoc(i, "label", v)} readOnly={socLocked} /></td>
                                  <td style={TD}><TI val={r.details} onChange={(v) => setSoc(i, "details", v)} readOnly={socLocked} /></td>
                                  <td style={TD}><TI val={r.date} onChange={(v) => setSoc(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" readOnly={socLocked} /></td>
                                  <td style={TD}><DocCell id={`soc-${i}`} docs={docs} setDocs={setDocs} readOnly={socLocked} /></td>
                                  <td style={TD}><ViewCell id={`soc-${i}`} docs={docs} /></td>
                                  <td style={TDS}><TI val={r.score} onChange={(v) => setSoc(i, "score", v === "" ? "" : String(clampScore(v, C4_OUTREACH_MAX)))} numeric max={C4_OUTREACH_MAX} center readOnly={socLocked} /></td>
                                </tr>
                              );
                            })}
                            <tr style={{ background: "#ccfbf1" }}>
                              <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total (Max 20)</td>
                              <td style={{ ...TDS, fontWeight: "bold" }}>{societyScore.toFixed(1)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <RowBtns onAdd={() => setSociety((p) => [...p, { label: "", details: "", date: "", score: "" }])} onDel={() => setSociety((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={society.length > 1} />
                      </>}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="industry">C5. Industry Interaction & Linkages - Max 8 marks</SubsectionTitle>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                          <th style={TH}>Activity (MOU / CoE / Drive / Programme)</th>
                          <th style={TH}>Industry Partner</th>
                          <th style={TH}>Date</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Faculty Score</th>
                        </tr></thead>
                        <tbody>
                          {industry.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity || r.name || ""} onChange={(v) => setInd(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.partner || r.details || ""} onChange={(v) => setInd(i, "partner", v)} /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setInd(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><DocCell id={`ind-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`ind-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setInd(i, "score", v)} center numeric max={C5_INDUSTRY_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#ccfbf1" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total (Max 8)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{industryScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setIndustry((p) => [...p, { activity: "", partner: "", date: "", score: "" }])} onDel={() => setIndustry((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={industry.length > 1} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="alumni">C6. Alumni Engagement & Networking - Max 10 marks</SubsectionTitle>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                          <th style={TH}>Activity</th>
                          <th style={TH}>Details</th>
                          <th style={TH}>Date</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Faculty Score</th>
                        </tr></thead>
                        <tbody>
                          {alumniRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activity} onChange={(v) => setAlumni(i, "activity", v)} /></td>
                              <td style={TD}><TI val={r.details} onChange={(v) => setAlumni(i, "details", v)} /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setAlumni(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><DocCell id={`alumni-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`alumni-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setAlumni(i, "score", v)} center numeric max={C6_ALUMNI_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#ccfbf1" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total (Max 10)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{alumniScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setAlumniRows((p) => [...p, { activity: "", details: "", date: "", score: "" }])} onDel={() => setAlumniRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={alumniRows.length > 1} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <SubsectionTitle icon="placement">C7. Student Placement Mentoring & Career Development - Max 20 marks</SubsectionTitle>
                      <table style={T}>
                        <thead><tr>
                          <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                          <th style={TH}>Activity Type</th>
                          <th style={TH}>Student / Company Name</th>
                          <th style={TH}>Date</th>
                          <th style={TH}>Attachment</th>
                          <th style={TH}>View Docs</th>
                          <th style={TH}>Faculty Score</th>
                        </tr></thead>
                        <tbody>
                          {placementRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                              <td style={TDC}>{i + 1}</td>
                              <td style={TD}><TI val={r.activityType} onChange={(v) => setPlacement(i, "activityType", v)} /></td>
                              <td style={TD}><TI val={r.name} onChange={(v) => setPlacement(i, "name", v)} /></td>
                              <td style={TD}><TI val={r.date} onChange={(v) => setPlacement(i, "date", maskDateDDMMYYYY(v))} placeholder="DD/MM/YYYY" /></td>
                              <td style={TD}><DocCell id={`placement-${i}`} docs={docs} setDocs={setDocs} /></td>
                              <td style={TD}><ViewCell id={`placement-${i}`} docs={docs} /></td>
                              <td style={TDS}><TI val={r.score} onChange={(v) => setPlacement(i, "score", v)} center numeric max={C7_PLACEMENT_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#ccfbf1" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{placementScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setPlacementRows((p) => [...p, { activityType: "", name: "", date: "", score: "" }])} onDel={() => setPlacementRows((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={placementRows.length > 1} />
                    </div>
                  </SC>
                )}

                {/* Part D Tab */}
                {hodAppraisalTab === "partD" && (
                  <SC title={`Part D - Annual Confidential Report (Max ${PART_D_MAX})`} accent="#b45309" scoreBadge={`${partDTotal.toFixed(1)} / ${PART_D_MAX}`}>
                    <div style={{ marginBottom: 14, padding: "8px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                      Evaluated by HOD/Director only. This part has no faculty self-score input.
                    </div>
                    <table style={T}>
                      <thead><tr>
                        <th style={{ ...TH, width: 30 }}>Sr. No.</th>
                        <th style={TH}>Parameter</th>
                        <th style={TH}>Description / Indicators</th>
                        <th style={TH}>Max Marks</th>
                      </tr></thead>
                      <tbody>
                        {partDParameters.map((row, index) => (
                          <tr key={row.parameter} style={index % 2 === 1 ? { background: "#f8fafc" } : {}}>
                            <td style={TDC}>{index + 1}</td>
                            <td style={{ ...TD, fontWeight: 700 }}>{row.parameter}</td>
                            <td style={TD}>{row.description}</td>
                            <td style={TDC}>{row.max}</td>
                          </tr>
                        ))}
                        <tr style={{ background: "#fef3c7" }}>
                          <td style={{ ...TDC, fontWeight: "bold" }} colSpan={3}>Total (Max 50)</td>
                          <td style={{ ...TDS, fontWeight: "bold" }}>{PART_D_MAX}</td>
                        </tr>
                      </tbody>
                    </table>
                  </SC>
                )}

                {/* Part B Tab */}
                {hodAppraisalTab === "partB" && (
                  <SC title={`Part B - Research & Innovation (Max ${effectivePartBMax})`} accent="#7c3aed" scoreBadge={`${partBTotal.toFixed(1)} / ${effectivePartBMax}`}>
                    <div style={{ marginBottom: 14, padding: "8px 12px", background: "#ede9fe", borderRadius: 6, fontSize: 12, color: "#6d28d9", fontWeight: 600 }}>
                      Total Part B Score: {partBTotal.toFixed(1)}/{effectivePartBMax}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Enter your research publications, patents, conferences, and other academic contributions.</div>

                    {/* B1. Journal Publications */}
                    <div style={{ marginBottom: 16, order: 1 }}>
                      <SubsectionTitle icon="journal">B1. Journal Publications - Max 100 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 100)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{journalScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setJournals((p) => [...p, { title: "", journal: "", issn: "", index: "", score: "" }])} onDel={() => setJournals((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={journals.length > 1} />
                    </div>

                    {/* B2. Books / Chapters */}
                    <div style={{ marginBottom: 16, order: 2 }}>
                      <SubsectionTitle icon="book">B2. Books, Book Chapters & Edited Volumes - Max 30 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={9}>Total Score (Max 30)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{bookScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setBooks((p) => [...p, { title: "", book: "", issn: "", pub: "", coauth: "", first: "", score: "" }])} onDel={() => setBooks((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={books.length > 1} />
                    </div>

                    {/* B11. ICT Content, MOOCs & E-Learning */}
                    <div style={{ marginBottom: 16, order: 11 }}>
                      <SubsectionTitle icon="monitor">B11. ICT Content, MOOCs & E-Learning - Max 15 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 15)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{ictScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setIct((p) => [...p, { title: "", desc: "", type: "", quad: "", score: "" }])} onDel={() => setIct((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={ict.length > 1} />
                    </div>

                    {/* B5. Research Guidance */}
                    <div style={{ marginBottom: 16, order: 5 }}>
                      <SubsectionTitle icon="research">B5. Research Guidance - Max 20 marks</SubsectionTitle>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#334155" }}>
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
                              <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total Score (Max {sectionApplicability.research === "notApplicable" ? 0 : 20})</td>
                              <td style={{ ...TDS, fontWeight: "bold" }}>{researchScore.toFixed(1)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <RowBtns onAdd={() => setResearch((p) => [...p, { degree: "PhD", name: "", thesis: "", score: "" }])} onDel={() => setResearch((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={research.length > 1} />
                      </>)}
                    </div>

                    {/* B4. Funded Research Projects */}
                    <div style={{ marginBottom: 16, order: 4 }}>
                      <SubsectionTitle icon="fundedProject">B4. Funded Research Projects - Max 40 marks</SubsectionTitle>
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
                              <td style={TDS}><TI val={r.score} onChange={(v) => setPrj2(i, "score", v)} center numeric max={B4_PROJECT_MAX} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={9}>Total Score (Max 40)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{projectBScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setProjects2((p) => [...p, { title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }])} onDel={() => setProjects2((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={projects2.length > 1} />
                    </div>

                    {/* Legacy external projects retained only for old saved data */}
                    <div style={{ marginBottom: 16, display: "none" }}>
                      <SubsectionTitle icon="externalProject">Legacy External Research Projects - Not counted in AY 2026-2027 total</SubsectionTitle>
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
                              <td style={TDS}><TI val={r.score} onChange={(v) => setExtPrj(i, "score", v)} center numeric max={0} /></td>
                            </tr>
                          ))}
                          <tr style={{ background: "#f3e8ff" }}>
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={9}>Total Score (Max 0)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{externalProjectScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setExternalProjects((p) => [...p, { title: "", agency: "", date: "", amount: "", role: "", status: "", score: "" }])} onDel={() => setExternalProjects((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={externalProjects.length > 1} />
                    </div>

                    {/* B3. Patents, Copyrights & IP and Product Development */}
                    <div style={{ marginBottom: 16, order: 3 }}>
                      <SubsectionTitle icon="patent">B3. Patents, Copyrights & IP and Product Development - Max 40 marks</SubsectionTitle>
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

                    {/* B9. Awards */}
                    <div style={{ marginBottom: 16, order: 9 }}>
                      <SubsectionTitle icon="trophy">B9. Research Awards, Fellowships & Citations - Max 20 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Awards Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{awardScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setAwards((p) => [...p, { title: "", type: "", date: "", agency: "", level: "", score: "" }])} onDel={() => setAwards((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={awards.length > 1} />
                    </div>

                    {/* B7. Conference / FDP Contributions - Organised */}
                    <div style={{ marginBottom: 16, order: 7 }}>
                      <SubsectionTitle icon="conference">B7. Conference / FDP Contributions - Organised - Max 20 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{confScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setConfs((p) => [...p, { title: "", type: "", org: "", level: "", score: "" }])} onDel={() => setConfs((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={confs.length > 1} />
                    </div>

                    {/* B6. Consultancy, Testing & Training */}
                    <div style={{ marginBottom: 16, order: 6 }}>
                      <SubsectionTitle icon="consultancy">B6. Consultancy, Testing & Training - Max 20 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={7}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{proposalScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setProposals((p) => [...p, { title: "", duration: "", agency: "", amount: "", score: "" }])} onDel={() => setProposals((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={proposals.length > 1} />
                    </div>

                    {/* B10. Innovation, Start-ups & Technology Transfer */}
                    <div style={{ marginBottom: 16, order: 10 }}>
                      <SubsectionTitle icon="startup">B10. Innovation, Start-ups & Technology Transfer - Max 20 marks</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{productScore.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <RowBtns onAdd={() => setProducts((p) => [...p, { details: "", usage: "", score: "" }])} onDel={() => setProducts((p) => p.length > 1 ? p.slice(0, -1) : p)} canDel={products.length > 1} />
                    </div>

                    {/* B8. FDP / Workshops Attended */}
                    <div style={{ marginBottom: 16, order: 8 }}>
                      <SubsectionTitle icon="workshop">B8. Conference / FDP / Industry Training Attended - Max 20 marks</SubsectionTitle>
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

                    {/* B8. Industrial Training */}
                    <div style={{ marginBottom: 16, order: 8 }}>
                      <SubsectionTitle icon="industrialTraining">B8(b). Industrial Training</SubsectionTitle>
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
                            <td style={{ ...TDC, fontWeight: "bold" }} colSpan={6}>Total B8 Score (Max 20)</td>
                            <td style={{ ...TDS, fontWeight: "bold" }}>{b8Score.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </SC>
                )}

                {["partA", "partB", "partC", "partD"].includes(hodAppraisalTab) && !appraisalLocked && (
                  <SectionSaveFooter
                    label={{ partA: "Part A", partB: "Part B", partC: "Part C", partD: "Part D" }[hodAppraisalTab]}
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
                          ["Part A - Teaching & Learning", partATotal, effectivePartAMax, "#6366f1"],
                          ["Part B - Research & Innovation", partBTotal, effectivePartBMax, "#7c3aed"],
                          ["Part C - Administrative Contribution", partCTotal, PART_C_MAX, "#0f766e"],
                          ["Part D - Annual Confidential Report", partDTotal, PART_D_MAX, "#b45309"],
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

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#ddf9d1", border: "1px solid #344d34", borderRadius: 8, marginBottom: 14, color: "#334155", fontSize: 12, lineHeight: 1.5, cursor: appraisalLocked ? "not-allowed" : "pointer" }}>
                      <input
                        type="checkbox"
                        checked={declarationConfirmed}
                        onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                        disabled={submitting || appraisalLocked}
                        style={{ marginTop: 3 }}
                      />
                      <span>I hereby declare that the information furnished above is true and correct to the best of my knowledge and belief, and is supported by documentary evidence enclosed with this form. I understand that any false claim, if detected at any stage, may render this appraisal liable to cancellation and may attract disciplinary action as per university policy.</span>
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
                        disabled={submitting || appraisalLocked || !declarationConfirmed}
                        style={{ padding: "10px 28px", background: (appraisalLocked || !declarationConfirmed) ? "#64748b" : "#059669", color: "#fff", border: "none", borderRadius: 7, cursor: (appraisalLocked || !declarationConfirmed) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", opacity: submitting ? 0.7 : 1 }}
                      >
                        {appraisalLocked ? "Submitted & Locked" : submitting ? "Submitting..." : "Submit Appraisal"}
                      </button>
                    </div>
                  </SC>
                )}
              </fieldset>
            </div>
            )}
          </div>
    </div>
  );
}

