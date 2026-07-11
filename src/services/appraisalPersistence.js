import { api } from "./api";
import { storeUserSession } from "../auth/session";
import { getDeanTrack, getReviewChain, normalizeRoleForWorkflow, pendingStatusFor } from "../utils/hierarchy";
import { DEAN_TRACKS } from "../constants/universityHierarchy";
import { attachSubmittedScoreSummary } from "../utils/reviewSummaryTotals";
import { filesForDocValue } from "../utils/appraisalFormUtils";

const SNAPSHOT_SETTERS = {
 info: "setInfo",
 lectures: "setLectures",
 courseFile: "setCourseFile",
 innovRows: "setInnovRows",
 innovDetails: "setInnovDetails",
 innovScore: "setInnovScore",
 innovHod: "setInnovHod",
 innovDirector: "setInnovDirector",
 innovDean: "setInnovDean",
 innovVc: "setInnovVc",
 projects: "setProjects",
 quals: "setQuals",
 feedback: "setFeedback",
 deptActs: "setDeptActs",
 uniActs: "setUniActs",
 society: "setSociety",
 industry: "setIndustry",
 acr: "setAcr",
 journals: "setJournals",
 popularWritings: "setPopularWritings",
 books: "setBooks",
 ict: "setIct",
 research: "setResearch",
 projects2: "setProjects2",
 internalProjects: "setInternalProjects",
 externalProjects: "setExternalProjects",
 ipr: "setIpr",
 patents: "setPatents",
 awards: "setAwards",
 confs: "setConfs",
 proposals: "setProposals",
 products: "setProducts",
 fdps: "setFdps",
 training: "setTraining",
 summaryOtherInfo: "setSummaryOtherInfo",
 sectionApplicability: "setSectionApplicability",
 sectionSaveStatus: "setSectionSaveStatus",
};

const snapshotFormFromPayload = (payload) =>{
 if (!payload) return null;
 if (payload.form && typeof payload.form === "object") return payload.form;
 if (payload.data && typeof payload.data === "object") return payload.data;
 return null;
};

const applySnapshotToSetters = (snapshotPayload, setters) =>{
 const snapshotForm = normalizeFetchedForm(snapshotFormFromPayload(snapshotPayload));
 if (!snapshotForm || !setters) return;

 Object.entries(SNAPSHOT_SETTERS).forEach(([formKey, setterKey]) =>{
 if (Object.prototype.hasOwnProperty.call(snapshotForm, formKey)) {
 if (formKey === "info") {
 setters[setterKey]?.((current = {}) =>normalizeInfo(snapshotForm[formKey], current, snapshotForm, snapshotPayload));
 } else {
 setters[setterKey]?.(snapshotForm[formKey]);
 }
 }
 });

 if (snapshotPayload?.docs) {
 setters.setDocs?.(normalizeDocsMap(snapshotPayload.docs));
 }
};

const normalizeDocsMap = (docs = {}) =>
 Object.fromEntries(
 Object.entries(docs || {}).map(([key, files]) =>[key, filesForDocValue(files)]),
 );

export const loadAppraisalSnapshot = async ({ facultyEmail, academicYear }) =>{
 if (!facultyEmail || !academicYear) return null;
 try {
 const data = await api.get("/appraisal/snapshot", {
 params: { academic_year: academicYear },
 });
 return data?.payload ?? data ?? null;
 } catch {
 return null;
 }
};

export const saveAppraisalDraftSection = async ({
 facultyEmail,
 academicYear,
 form,
 docs = {},
 totals = {},
 submitterProfile,
 sectionSaveStatus = {},
}) =>{
 if (!facultyEmail) throw new Error("Please login again before saving. Your email was not found in this session.");
 if (!academicYear) throw new Error("Academic year is required before saving.");

 return api.put("/appraisal/snapshot", {
 academic_year: academicYear,
 payload: {
 form: { ...form, sectionSaveStatus },
 totals,
 submitterProfile,
 savedAt: new Date().toISOString(),
 },
 docs: normalizeDocsMap(docs),
 });
};

export const docsToRows = (docs, facultyEmail, academicYear) =>{
 const docSectionFromKey = (docKey) =>docKey.replace(/-\d+$/, "").replace(/\d+$/, "");
 const docRowFromKey = (docKey) =>{
 const match = docKey.match(/(\d+)$/);
 return match ? Number(match[1]) + 1 : null;
 };

 return Object.entries(docs || {}).flatMap(([docKey, files]) =>
 filesForDocValue(files)
 .filter((file) =>file?.url && !String(file.url).startsWith("blob:"))
 .map((file) =>({
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
};

export const loadAppraisalDocuments = async ({ facultyEmail, academicYear, setDocs }) =>{
 if (!facultyEmail || !academicYear || !setDocs) return;

 try {
 const data = await api.get("/appraisal-documents", {
 params: { academic_year: academicYear },
 });

 const groupedDocs = {};
 (data || []).forEach((row) =>{
 const key = row.doc_key || `${row.section}-${Math.max((row.row_no || 1) - 1, 0)}`;
 if (!groupedDocs[key]) groupedDocs[key] = [];
 groupedDocs[key].push({
 name: row.file_name,
 type: row.file_type,
 url: row.file_url,
 publicId: row.storage_path,
 });
 });

 setDocs(groupedDocs);
 } catch {
 // non-fatal
 }
};

export const loadSavedAppraisal = async ({ facultyEmail, academicYear, setters }) =>{
 if (!facultyEmail || !academicYear || !setters) return;

 const snapshotPayload = await loadAppraisalSnapshot({ facultyEmail, academicYear });
 if (snapshotPayload) {
 applySnapshotToSetters(snapshotPayload, setters);
 }
};

// Used by reviewWorkflow to load any faculty's appraisal for authority review.
export const fetchSavedAppraisal = async ({ facultyEmail, academicYear }) =>{
 if (!facultyEmail) throw new Error("Faculty email is required to open the submitted form.");
 if (!academicYear) throw new Error("Academic year is required to open the submitted form.");
 try {
 const data = await api.get(
 `/dashboard/faculty/${encodeURIComponent(facultyEmail)}`,
 { params: { academic_year: academicYear } }
 );
 return readSubmittedAppraisalResponse(data, facultyEmail, academicYear);
 } catch (err) {
 if (err?.statusCode === 403) {
 const repaired = await repairDeanDivisionProfile();
 if (repaired) {
 try {
 const data = await api.get(
 `/dashboard/faculty/${encodeURIComponent(facultyEmail)}`,
 { params: { academic_year: academicYear } }
 );
 return readSubmittedAppraisalResponse(data, facultyEmail, academicYear);
 } catch {
 // Fall through to the explicit authority message below.
 }
 }
 throw new Error("Access denied while opening this submitted form. I tried the Dean division-profile repair, but the backend still rejected the request. Please log out and log in again so the refreshed profile/token is used. If it still fails, the backend faculty_profiles.school for this Dean must be updated to 'engineering' or 'non_engineering'.", { cause: err });
 }
 throw err;
 }
};

const readSubmittedAppraisalResponse = (data, facultyEmail, academicYear) =>{
 if (!data) {
 throw new Error(`No saved appraisal snapshot was found for ${facultyEmail} in academic year ${academicYear}. Check that the academic year matches the submitted record.`);
 }
 const normalized = normalizeFetchedAppraisal(data);
 const form = normalized.payload?.form || normalized.form;
 if (!hasSubmittedFormData(form)) {
 throw new Error(`The saved appraisal snapshot for ${facultyEmail} does not contain submitted form section data. The user may need to resubmit the appraisal for academic year ${academicYear}.`);
 }
 return normalized;
};

const repairDeanDivisionProfile = async () =>{
 const role = normalizeRoleForWorkflow(sessionStorage.getItem("role"));
 if (role !== "dean") return false;

 const profile = {
 school: sessionStorage.getItem("school") || "",
 department: sessionStorage.getItem("department") || "",
 designation: sessionStorage.getItem("designation") || "",
 };
 if (!profile.school) return false;
 const deanTrack = getDeanTrack(profile);
 if (![DEAN_TRACKS.ENGINEERING, DEAN_TRACKS.NON_ENGINEERING].includes(deanTrack)) return false;

 try {
 await api.put("/auth/me", { school: deanTrack });
 const refreshedProfile = await api.get("/auth/me").catch(() =>null);
 if (refreshedProfile) {
 storeUserSession({ profile: refreshedProfile });
 }
 sessionStorage.setItem("school", deanTrack);
 sessionStorage.setItem("hasHod", "false");
 sessionStorage.setItem("hasHOD", "false");
 return true;
 } catch {
 return false;
 }
};

const FORM_SECTION_KEYS = [
 "lectures", "courseFile", "projects", "quals", "feedback", "deptActs", "uniActs",
 "society", "industry", "acr", "journals", "books", "ict", "research", "projects2",
 "internalProjects", "externalProjects", "ipr", "patents", "awards", "confs",
 "proposals", "products", "fdps", "training", "popularWritings",
];

const REVIEW_FIELD_BY_ROLE = {
 hod: "hod",
 center_head: "hod",
 director: "director",
 dean: "dean",
 vc: "vc",
};

const REVIEW_INNOV_FIELD_BY_ROLE = {
 hod: "innovHod",
 center_head: "innovHod",
 director: "innovDirector",
 dean: "innovDean",
 vc: "innovVc",
};

const hasSubmittedFormData = (form = {}) =>
 Boolean(form && FORM_SECTION_KEYS.some((key) =>Array.isArray(form[key]) && form[key].length >0));

const firstPresent = (...values) =>
 values.find((value) =>value !== undefined && value !== null && String(value).trim() !== "");

const infoFromProfileSources = (...sources) =>{
 const profileSources = sources.flatMap((source) =>[
 source,
 source?.info,
 source?.profile,
 source?.faculty,
 source?.facultyProfile,
 source?.faculty_profile,
 source?.submitterProfile,
 source?.submitter_profile,
 source?.payload?.submitterProfile,
 source?.payload?.submitter_profile,
 ]).filter(Boolean);

 const pick = (...keys) =>firstPresent(
 ...profileSources.flatMap((source) =>keys.map((key) =>source?.[key])),
 );

 return {
 name: pick("name", "full_name", "fullName", "faculty_name", "facultyName"),
 qual: pick("qual", "qualification", "educational_qualifications", "educationalQualifications"),
 desig: pick("desig", "designation", "present_designation", "presentDesignation"),
 school: pick("school", "schoolName", "department", "departmentName"),
 experience: pick("experience", "teaching_experience", "teachingExperience"),
 ay: pick("ay", "academic_year", "academicYear"),
 };
};

const normalizeInfo = (info = {}, ...fallbackSources) =>{
 const fallback = infoFromProfileSources(...fallbackSources);
 return {
 ...info,
 name: firstPresent(info.name, info.full_name, info.fullName, fallback.name) || "",
 qual: firstPresent(info.qual, info.qualification, info.educational_qualifications, info.educationalQualifications, fallback.qual) || "",
 desig: firstPresent(info.desig, info.designation, info.present_designation, info.presentDesignation, fallback.desig) || "",
 school: firstPresent(info.school, info.schoolName, info.department, info.departmentName, fallback.school) || "",
 experience: firstPresent(info.experience, info.teaching_experience, info.teachingExperience, fallback.experience, info.expTotal) || "",
 ay: firstPresent(info.ay, info.academic_year, info.academicYear, fallback.ay) || "",
 };
};

export const mergeFacultyInfo = (info = {}, ...fallbackSources) =>
 normalizeInfo(info || {}, ...fallbackSources);

const parseMaybeJson = (value) =>{
 if (typeof value !== "string") return value;
 const trimmed = value.trim();
 if (!trimmed || !["{", "["].includes(trimmed[0])) return value;
 try {
 return JSON.parse(trimmed);
 } catch {
 return value;
 }
};

const reviewArrayFrom = (value) =>{
 const parsed = parseMaybeJson(value);
 if (!parsed) return [];
 if (Array.isArray(parsed)) return parsed.map(parseMaybeJson);
 if (typeof parsed !== "object") return [];

 return Object.entries(parsed).map(([role, review]) =>{
 const parsedReview = parseMaybeJson(review);
 if (parsedReview && typeof parsedReview === "object" && !Array.isArray(parsedReview)) {
 return { reviewer_role: parsedReview.reviewer_role || parsedReview.reviewerRole || role, ...parsedReview };
 }
 return { reviewer_role: role, section_scores: parsedReview };
 });
};

const syntheticReviewFromRoleFields = (source = {}) =>
 ["hod", "center_head", "director", "dean", "vc"].flatMap((role) =>{
 const camel = role.replace(/_([a-z])/g, (_, letter) =>letter.toUpperCase());
 const sectionScores = parseMaybeJson(
 source[`${role}_section_scores`] ||
 source[`${role}_sectionScores`] ||
 source[`${role}_scores`] ||
 source[`${role}_review_scores`] ||
 source[`${camel}SectionScores`] ||
 source[`${camel}Scores`] ||
 source[`${camel}ReviewScores`],
 );
 if (!sectionScores) return [];
 return [{
 reviewer_role: role,
 section_scores: sectionScores,
 part_a_score: source[`${role}_part_a`] || source[`${camel}PartA`],
 part_b_score: source[`${role}_part_b`] || source[`${camel}PartB`],
 total_score: source[`${role}_total`] || source[`${camel}Total`],
 remarks: source[`${role}_remarks`] || source[`${camel}Remarks`],
 }];
 });

const reviewsFromRoleScoreMap = (source = {}) =>{
 const explicitMap = parseMaybeJson(
 source.section_scores_by_role ||
 source.sectionScoresByRole ||
 source.review_scores_by_role ||
 source.reviewScoresByRole ||
 source.reviewer_scores ||
 source.reviewerScores ||
 source.role_scores ||
 source.roleScores,
 );
 const directSectionScores = parseMaybeJson(source.section_scores || source.sectionScores);
 const roleWrappedSectionScores =
 directSectionScores &&
 typeof directSectionScores === "object" &&
 !Array.isArray(directSectionScores) &&
 ["hod", "center_head", "director", "dean", "vc"].some((role) =>directSectionScores[role])
 ? directSectionScores
 : null;
 const scoreMap = explicitMap || roleWrappedSectionScores;

 if (!scoreMap || typeof scoreMap !== "object" || Array.isArray(scoreMap)) return [];

 return Object.entries(scoreMap).map(([role, sectionScores]) =>({
 reviewer_role: role,
 section_scores: sectionScores,
 }));
};

const reviewsFromAppraisalResponse = (data = {}) =>[
 ...reviewArrayFrom(data.reviews),
 ...reviewArrayFrom(data.review_history),
 ...reviewArrayFrom(data.reviewHistory),
 ...reviewArrayFrom(data.appraisal_reviews),
 ...reviewArrayFrom(data.appraisalReviews),
 ...reviewArrayFrom(data.payload?.reviews),
 ...reviewArrayFrom(data.payload?.review_history),
 ...reviewArrayFrom(data.payload?.reviewHistory),
 ...reviewArrayFrom(data.payload?.appraisal_reviews),
 ...reviewArrayFrom(data.payload?.appraisalReviews),
 ...reviewsFromRoleScoreMap(data),
 ...reviewsFromRoleScoreMap(data.payload || {}),
 ...syntheticReviewFromRoleFields(data),
 ...syntheticReviewFromRoleFields(data.payload || {}),
];

const reviewRowScore = (row, roleField, role) =>{
 const parsedRow = parseMaybeJson(row);
 if (parsedRow === undefined || parsedRow === null) return undefined;
 if (typeof parsedRow !== "object" || Array.isArray(parsedRow)) return parsedRow;
 return firstPresent(
 parsedRow[roleField],
 parsedRow[role],
 parsedRow[`${roleField}_score`],
 parsedRow[`${role}_score`],
 parsedRow[`${roleField}_marks`],
 parsedRow[`${role}_marks`],
 parsedRow.reviewScore,
 parsedRow.review_score,
 parsedRow.reviewerScore,
 parsedRow.reviewer_score,
 parsedRow.value,
 parsedRow.total,
 );
};

const mergeSectionReviewScore = (rows, sectionScore, roleField, role) =>{
 const baseRows = Array.isArray(rows) ? rows : [];

 const parsedSectionScore = parseMaybeJson(sectionScore);

 if (Array.isArray(parsedSectionScore)) {
 const length = Math.max(baseRows.length, parsedSectionScore.length);
 return Array.from({ length }, (_, index) =>{
 const existing = baseRows[index] || {};
 const reviewValue = reviewRowScore(parsedSectionScore[index], roleField, role);
 return reviewValue === undefined ? existing : { ...existing, [roleField]: reviewValue };
 });
 }

 if (parsedSectionScore && typeof parsedSectionScore === "object") {
 const numericEntries = Object.entries(parsedSectionScore)
 .filter(([key]) =>/^\d+$/.test(key))
 .sort(([a], [b]) =>Number(a) - Number(b));
 if (numericEntries.length) {
 return mergeSectionReviewScore(baseRows, numericEntries.map(([, value]) =>value), roleField, role);
 }
 }

 const reviewValue = reviewRowScore(parsedSectionScore, roleField, role);
 if (reviewValue === undefined) return rows;
 if (!baseRows.length) return [{ [roleField]: reviewValue }];
 return baseRows.map((row, index) =>index === 0 ? { ...row, [roleField]: reviewValue } : row);
};

const REVIEW_SECTION_KEY_ALIASES = {
 teaching_process: "lectures",
 teachingProcess: "lectures",
 lectures_tutorials_practicals: "lectures",
 lecturesTutorialsPracticals: "lectures",
 innovativeTeachingRows: "innovRows",
 innovative_teaching_rows: "innovRows",
 course_file: "courseFile",
 courseFiles: "courseFile",
 course_files: "courseFile",
 projects_guided: "projects",
 projectsGuided: "projects",
 qualification_enhancement: "quals",
 qualificationEnhancement: "quals",
 qualifications: "quals",
 student_feedback: "feedback",
 studentFeedback: "feedback",
 departmental_activities: "deptActs",
 departmentalActivities: "deptActs",
 department_activities: "deptActs",
 departmentActivities: "deptActs",
 dept_acts: "deptActs",
 university_activities: "uniActs",
 universityActivities: "uniActs",
 uni_acts: "uniActs",
 social_contributions: "society",
 socialContributions: "society",
 contribution_to_society: "society",
 contributionToSociety: "society",
 industry_connect: "industry",
 industryConnect: "industry",
 acr_scores: "acr",
 acrScores: "acr",
 annual_confidential_report: "acr",
 annualConfidentialReport: "acr",
 journal_publication: "journals",
 journalPublication: "journals",
 journal_publications: "journals",
 journalPublications: "journals",
 research_papers: "journals",
 researchPapers: "journals",
 research_papers_journal_publications: "journals",
 researchPapersJournalPublications: "journals",
 popular_writings: "popularWritings",
 popularWritings: "popularWritings",
 book_publications: "books",
 bookPublications: "books",
 book_chapters: "books",
 bookChapters: "books",
 books_book_chapters: "books",
 booksBookChapters: "books",
 ict_pedagogy: "ict",
 ictPedagogy: "ict",
 e_content: "ict",
 eContent: "ict",
 ict_e_content: "ict",
 ictEContent: "ict",
 research_guidance: "research",
 researchGuidance: "research",
 research_projects: "projects2",
 researchProjects: "projects2",
 internal_projects: "projects2",
 internalProjects: "projects2",
 consultancy_internal_projects: "projects2",
 consultancyInternalProjects: "projects2",
 external_research_projects: "externalProjects",
 externalResearchProjects: "externalProjects",
 external_projects: "externalProjects",
 external_projects_consultancy: "externalProjects",
 externalProjectsConsultancy: "externalProjects",
 ipr_records: "ipr",
 iprRecords: "ipr",
 awards: "awards",
 conferences: "confs",
 invited_lectures: "confs",
 invitedLectures: "confs",
 research_proposals: "proposals",
 researchProposals: "proposals",
 submitted_research_proposals: "proposals",
 submittedResearchProposals: "proposals",
 products_developed: "products",
 productsDeveloped: "products",
 fdp_workshops: "fdps",
 fdpWorkshops: "fdps",
 self_development: "fdps",
 selfDevelopment: "fdps",
 industrial_training: "training",
 industrialTraining: "training",
};

const normalizeReviewSectionScores = (scores = {}) =>{
 const parsedScores = parseMaybeJson(scores);
 if (!parsedScores || typeof parsedScores !== "object" || Array.isArray(parsedScores)) return parsedScores;
 const normalized = { ...parsedScores };
 Object.entries(parsedScores).forEach(([key, value]) =>{
 const target = REVIEW_SECTION_KEY_ALIASES[key];
 if (target && normalized[target] === undefined) normalized[target] = value;
 });
 return normalized;
};

const applyReviewToForm = (form = {}, review = {}) =>{
 const role = normalizeRoleForWorkflow(review.reviewer_role || review.reviewerRole || review.role);
 const roleField = REVIEW_FIELD_BY_ROLE[role];
 if (!roleField) return form;

 const rawScores = parseMaybeJson(
 review.section_scores ||
 review.sectionScores ||
 review.review_scores ||
 review.reviewScores ||
 review.scores ||
 review,
 );
 const scores = normalizeReviewSectionScores(
 rawScores?.form ||
 rawScores?.payload?.form ||
 rawScores?.section_scores ||
 rawScores?.sectionScores ||
 rawScores,
 );
 if (!scores || typeof scores !== "object") return form;

 const next = { ...form };
 FORM_SECTION_KEYS.forEach((key) =>{
 if (!Object.prototype.hasOwnProperty.call(scores, key)) return;
 next[key] = mergeSectionReviewScore(next[key], scores[key], roleField, role);
 });

 if (Object.prototype.hasOwnProperty.call(scores, "innovRows")) {
 next.innovRows = mergeSectionReviewScore(next.innovRows, scores.innovRows, roleField, role);
 }

 const innovField = REVIEW_INNOV_FIELD_BY_ROLE[role];
 const innovScore = firstPresent(
 reviewRowScore(scores.innovativeTeaching, roleField, role),
 scores[innovField],
 scores.innovative_teaching,
 scores.innovativeTeachingScore,
 );
 if (innovField && innovScore !== undefined) next[innovField] = innovScore;

 return next;
};

const mergeReviewScoresIntoForm = (form = {}, reviews = []) =>
 (reviews || []).reduce((current, review) =>applyReviewToForm(current, review), form);

const aliasKeys = (rows, mapping) =>
 (rows || []).map((row) =>{
 const out = { ...row };
 Object.entries(mapping).forEach(([from, to]) =>{
 const targets = Array.isArray(to) ? to : [to];
 targets.forEach((target) =>{
 if (out[target] == null && out[from] != null) out[target] = out[from];
 });
 });
 return out;
 });

const ROW_SOURCE_IGNORE_KEYS = new Set([
 "id", "_id", "faculty_email", "academic_year", "form_family", "section_title", "max_marks",
 "row_no", "created_at", "updated_at", "score", "hod", "director", "dean", "vc",
 "hod_score", "director_score", "dean_score", "vc_score",
]);

const rowHasDisplayData = (row = {}) =>
 Object.entries(row || {}).some(([key, value]) =>
 !ROW_SOURCE_IGNORE_KEYS.has(key) &&
 value !== undefined &&
 value !== null &&
 String(value).trim() !== ""
 );

const firstArraySource = (source = {}, keys = []) =>{
 const arrays = keys.map((key) =>source?.[key]).filter(Array.isArray);
 return arrays.find((rows) =>rows.some(rowHasDisplayData)) || arrays[0] || null;
};

const normalizeSectionRows = (normalized, targetKey, sourceKeys = [], mapping = {}) =>{
 const rows = firstArraySource(normalized, [targetKey, ...sourceKeys]);
 if (rows) normalized[targetKey] = aliasKeys(rows, mapping);
 return normalized[targetKey];
};

const REVIEW_SCORE_ALIASES = {
 hod_score: "hod",
 hodScore: "hod",
 hod_marks: "hod",
 hodMarks: "hod",
 center_head_score: "hod",
 centerHeadScore: "hod",
 center_head_marks: "hod",
 centerHeadMarks: "hod",
 director_score: "director",
 directorScore: "director",
 director_marks: "director",
 directorMarks: "director",
 dean_score: "dean",
 deanScore: "dean",
 dean_marks: "dean",
 deanMarks: "dean",
 vc_score: "vc",
 vcScore: "vc",
 vc_marks: "vc",
 vcMarks: "vc",
};

const LECTURE_ROW_ALIASES = {
 sem: "sem",
 semester: "sem",
 semester_name: "sem",
 semesterName: "sem",
 course_code: "code",
 courseCode: "code",
 course_name: "code",
 courseName: "code",
 course_title: "code",
 courseTitle: "code",
 planned_classes: "planned",
 plannedClasses: "planned",
 classes_as_per_course_structure: "planned",
 classesAsPerCourseStructure: "planned",
 class_planned: "planned",
 classPlanned: "planned",
 total_classes: "planned",
 totalClasses: "planned",
 conducted_classes: "conducted",
 conductedClasses: "conducted",
 classes_actually_conducted: "conducted",
 classesActuallyConducted: "conducted",
 actual_classes: "conducted",
 actualClasses: "conducted",
 class_conducted: "conducted",
 classConducted: "conducted",
};

const COURSE_FILE_ROW_ALIASES = {
 course_name: "course",
 courseName: "course",
 course_paper: "course",
 coursePaper: "course",
 paper: "course",
 year: "title",
 program_semester: "title",
 programSemester: "title",
 program_and_semester: "title",
 programAndSemester: "title",
 "program_&_semester": "title",
 "program & semester": "title",
 Program_Semester: "title",
 ProgramAndSemester: "title",
 "Program & Semester": "title",
 "Program and Semester": "title",
 availability: "details",
 iqac_format: "details",
 iqacFormat: "details",
 availability_iqac: "details",
 availabilityIqac: "details",
 availability_as_per_iqac_format: "details",
 availabilityAsPerIqacFormat: "details",
};

const LABEL_ROW_ALIASES = {
 category: "label",
 project_category: "label",
 projectCategory: "label",
 qualification: "label",
 qualification_category: "label",
 qualificationCategory: "label",
 attribute: "label",
};

const FEEDBACK_ROW_ALIASES = {
 course_code: "code",
 courseCode: "code",
 course_name: "code",
 courseName: "code",
 feedback_1: "fb1",
 feedback1: "fb1",
 first_feedback: "fb1",
 firstFeedback: "fb1",
 feedback_2: "fb2",
 feedback2: "fb2",
 second_feedback: "fb2",
 secondFeedback: "fb2",
};

const SOCIETY_ROW_ALIASES = {
 activity: "label",
 society_activity: "label",
 societyActivity: "label",
 status: "participated",
 participation: "participated",
 yes_no: "participated",
 yesNo: "participated",
};

const JOURNAL_ROW_ALIASES = {
 indexing: "index",
 index_name: "index",
 indexName: "index",
 journal_name: "journal",
 journalName: "journal",
 paper_title: "title",
 paperTitle: "title",
 issn_no: "issn",
 issnNo: "issn",
 ...REVIEW_SCORE_ALIASES,
};

const BOOK_ROW_ALIASES = {
 publisher: ["pub", "publisher"],
 pub: ["pub", "publisher"],
 coauthor: ["coauth", "coAuthors"],
 co_author: ["coauth", "coAuthors"],
 coAuthor: ["coauth", "coAuthors"],
 coauth: ["coauth", "coAuthors"],
 coAuthors: ["coauth", "coAuthors"],
 first_author: "first",
 firstAuthor: "first",
};

const ICT_ROW_ALIASES = {
 description: "desc",
 short_description: "desc",
 shortDescription: "desc",
 quadrant: "quad",
 quadrants: "quad",
};

const RESEARCH_ROW_ALIASES = {
 student_name: "name",
 studentName: "name",
};

const RESEARCH_PROJECT_ROW_ALIASES = {
 sanction_date: "date",
 sanctionDate: "date",
 project_date: "date",
 projectDate: "date",
 project_status: "status",
 projectStatus: "status",
};

const IPR_ROW_ALIASES = {
 ipr_date: "date",
 iprDate: "date",
 ipr_status: "status",
 iprStatus: "status",
 file_no: "fileNo",
 fileNo: "fileNo",
};

const PATENT_ROW_ALIASES = {
 patent_date: "date",
 patentDate: "date",
 patent_status: "status",
 patentStatus: "status",
 file_no: "fileNo",
 fileNo: "fileNo",
};

const AWARD_ROW_ALIASES = {
 award_date: "date",
 awardDate: "date",
};

const CONF_ROW_ALIASES = {
 organization: "org",
 organisation: "org",
 organizer: "org",
 organiser: "org",
};

const PRODUCT_ROW_ALIASES = {
 usage: ["usage", "used"],
 used: ["usage", "used"],
 product_details: "details",
 productDetails: "details",
};

const FDP_ROW_ALIASES = {
 organization: "org",
 organisation: "org",
 organizer: "org",
 organiser: "org",
};

const POPULAR_WRITING_ROW_ALIASES = {
 newspaper_magazine_website: "media",
 newspaperMagazineWebsite: "media",
 media_name: "media",
 mediaName: "media",
 film_documentary: "film",
 filmDocumentary: "film",
};

const INDUSTRY_ROW_ALIASES = {
 industry_name: "name",
 industryName: "name",
 company: "name",
 organization: "name",
};

const INNOVATIVE_ROW_ALIASES = {
 methods_used: "method",
 methodsUsed: "method",
 method_used: "method",
 methodUsed: "method",
 description: "details",
};

const normalizeReviewScoreAliasesOnRows = (normalized) =>{
 FORM_SECTION_KEYS.forEach((key) =>{
 if (Array.isArray(normalized[key])) {
 normalized[key] = aliasKeys(normalized[key], REVIEW_SCORE_ALIASES);
 }
 });
 if (Array.isArray(normalized.innovRows)) {
 normalized.innovRows = aliasKeys(normalized.innovRows, REVIEW_SCORE_ALIASES);
 }
 return normalized;
};

const normalizeInnovativeReviewScoreAliases = (normalized) =>{
 const mapping = {
 innov_hod: "innovHod",
 innov_hod_score: "innovHod",
 innovHodScore: "innovHod",
 innov_center_head: "innovHod",
 innov_center_head_score: "innovHod",
 innovCenterHead: "innovHod",
 innovCenterHeadScore: "innovHod",
 innov_director: "innovDirector",
 innov_director_score: "innovDirector",
 innovDirectorScore: "innovDirector",
 innov_dean: "innovDean",
 innov_dean_score: "innovDean",
 innovDeanScore: "innovDean",
 innov_vc: "innovVc",
 innov_vc_score: "innovVc",
 innovVC: "innovVc",
 innovVcScore: "innovVc",
 };
 Object.entries(mapping).forEach(([from, to]) =>{
 if (normalized[to] == null && normalized[from] != null) normalized[to] = normalized[from];
 });
 return normalized;
};

const normalizeFetchedForm = (form = {}) =>{
 if (!form || typeof form !== "object") return form;
 const normalized = { ...form };
 normalized.info = normalizeInfo(normalized.info || {}, normalized);

 normalizeSectionRows(normalized, "lectures", [
 "teaching_process",
 "teachingProcess",
 "lectures_tutorials_practicals",
 "lecturesTutorialsPracticals",
 ], LECTURE_ROW_ALIASES);

 normalizeSectionRows(normalized, "courseFile", [
 "course_file",
 "courseFiles",
 "course_files",
 ], COURSE_FILE_ROW_ALIASES);

 normalizeSectionRows(normalized, "projects", [
 "projects_guided",
 "projectsGuided",
 ], LABEL_ROW_ALIASES);

 normalizeSectionRows(normalized, "quals", [
 "qualification_enhancement",
 "qualificationEnhancement",
 "qualifications",
 ], LABEL_ROW_ALIASES);

 normalizeSectionRows(normalized, "feedback", [
 "student_feedback",
 "studentFeedback",
 ], FEEDBACK_ROW_ALIASES);

 normalizeSectionRows(normalized, "deptActs", [
 "department_activities",
 "departmentActivities",
 "departmental_activities",
 "departmentalActivities",
 "dept_acts",
 ]);

 normalizeSectionRows(normalized, "uniActs", [
 "university_activities",
 "universityActivities",
 "uni_acts",
 ]);

 normalizeSectionRows(normalized, "society", [
 "social_contributions",
 "socialContributions",
 "contribution_to_society",
 "contributionToSociety",
 ], SOCIETY_ROW_ALIASES);

 normalizeSectionRows(normalized, "industry", [
 "industry_connect",
 "industryConnect",
 ], INDUSTRY_ROW_ALIASES);

 normalizeSectionRows(normalized, "acr", [
 "acr_scores",
 "acrScores",
 "annual_confidential_report",
 "annualConfidentialReport",
 ], LABEL_ROW_ALIASES);

 normalizeSectionRows(normalized, "journals", [
 "journal_publications",
 "journalPublications",
 "research_papers",
 "researchPapers",
 "research_papers_journal_publications",
 "researchPapersJournalPublications",
 "journal_publication",
 "journalPublication",
 ], JOURNAL_ROW_ALIASES);

 normalizeSectionRows(normalized, "popularWritings", [
 "popular_writings",
 "popularWritings",
 ], POPULAR_WRITING_ROW_ALIASES);

 normalizeSectionRows(normalized, "books", [
 "book_publications",
 "bookPublications",
 "book_chapters",
 "bookChapters",
 "books_book_chapters",
 "booksBookChapters",
 ], BOOK_ROW_ALIASES);

 normalizeSectionRows(normalized, "ict", [
 "ict_pedagogy",
 "ictPedagogy",
 "e_content",
 "eContent",
 "ict_e_content",
 "ictEContent",
 ], ICT_ROW_ALIASES);

 normalizeSectionRows(normalized, "research", [
 "research_guidance",
 "researchGuidance",
 ], RESEARCH_ROW_ALIASES);

 const standardProjectRows = normalizeSectionRows(normalized, "projects2", [
 "research_projects",
 "researchProjects",
 "internal_projects",
 "internalProjects",
 "consultancy_internal_projects",
 "consultancyInternalProjects",
 ], RESEARCH_PROJECT_ROW_ALIASES);
 const internalProjectRows = normalizeSectionRows(normalized, "internalProjects", [
 "research_projects",
 "researchProjects",
 "projects2",
 "internal_projects",
 "consultancy_internal_projects",
 "consultancyInternalProjects",
 ], RESEARCH_PROJECT_ROW_ALIASES);
 if (!Array.isArray(normalized.projects2) && internalProjectRows) {
 normalized.projects2 = aliasKeys(internalProjectRows, RESEARCH_PROJECT_ROW_ALIASES);
 }
 if (!Array.isArray(normalized.internalProjects) && standardProjectRows) {
 normalized.internalProjects = aliasKeys(standardProjectRows, RESEARCH_PROJECT_ROW_ALIASES);
 }

 normalizeSectionRows(normalized, "externalProjects", [
 "external_research_projects",
 "externalResearchProjects",
 "external_projects",
 "external_projects_consultancy",
 "externalProjectsConsultancy",
 ], RESEARCH_PROJECT_ROW_ALIASES);

 normalizeSectionRows(normalized, "ipr", [
 "ipr_records",
 "iprRecords",
 ], IPR_ROW_ALIASES);

 normalizeSectionRows(normalized, "patents", [
 "patent_records",
 "patentRecords",
 ], PATENT_ROW_ALIASES);

 normalizeSectionRows(normalized, "awards", [
 "research_awards",
 "researchAwards",
 ], AWARD_ROW_ALIASES);

 normalizeSectionRows(normalized, "confs", [
 "conferences",
 "invited_lectures",
 "invitedLectures",
 ], CONF_ROW_ALIASES);

 normalizeSectionRows(normalized, "proposals", [
 "research_proposals",
 "researchProposals",
 "submitted_research_proposals",
 "submittedResearchProposals",
 ]);

 normalizeSectionRows(normalized, "products", [
 "products_developed",
 "productsDeveloped",
 ], PRODUCT_ROW_ALIASES);

 normalizeSectionRows(normalized, "fdps", [
 "self_development",
 "selfDevelopment",
 "fdp_workshops",
 "fdpWorkshops",
 ], FDP_ROW_ALIASES);

 normalizeSectionRows(normalized, "training", [
 "industrial_training",
 "industrialTraining",
 ]);

 const innovRows = normalizeSectionRows(normalized, "innovRows", [
 "innovativeTeachingRows",
 "innovative_teaching_rows",
 ], INNOVATIVE_ROW_ALIASES);
 const innovativeTeaching = normalized.innovativeTeaching || normalized.innovative_teaching;
 if (innovativeTeaching && typeof innovativeTeaching === "object" && !Array.isArray(innovativeTeaching)) {
 if (normalized.innovDetails == null && innovativeTeaching.details != null) {
 normalized.innovDetails = innovativeTeaching.details;
 }
 if (normalized.innovScore == null && innovativeTeaching.score != null) {
 normalized.innovScore = innovativeTeaching.score;
 }
 if (!innovRows) {
 normalized.innovRows = [{
 method: innovativeTeaching.method || innovativeTeaching.methods_used || innovativeTeaching.details || "",
 details: innovativeTeaching.details || "",
 score: innovativeTeaching.score ?? "",
 hod: innovativeTeaching.hod ?? innovativeTeaching.hod_score,
 director: innovativeTeaching.director ?? innovativeTeaching.director_score,
 dean: innovativeTeaching.dean ?? innovativeTeaching.dean_score,
 vc: innovativeTeaching.vc ?? innovativeTeaching.vc_score,
 }];
 }
 }

 return normalizeInnovativeReviewScoreAliases(normalizeReviewScoreAliasesOnRows(normalized));
};

const normalizeFetchedAppraisal = (data = {}) =>{
 const reviews = reviewsFromAppraisalResponse(data);
 const payload = data.payload ? { ...data.payload } : null;
 const declaration = data.declaration || payload?.declaration || null;
 const withResponseInfo = (form = {}, ...sources) =>({
 ...form,
 info: normalizeInfo(form.info || {}, form, ...sources),
 });
 const payloadForm = payload?.form ? attachSubmittedScoreSummary(
 mergeReviewScoresIntoForm(withResponseInfo(normalizeFetchedForm(payload.form), payload, data), reviews),
 data,
 payload,
 payload.totals,
 ) : null;
 const directForm = data.form ? attachSubmittedScoreSummary(
 mergeReviewScoresIntoForm(withResponseInfo(normalizeFetchedForm(data.form), data, payload), reviews),
 data,
 data.totals,
 ) : null;
 const directData = attachSubmittedScoreSummary(
 mergeReviewScoresIntoForm(withResponseInfo(normalizeFetchedForm(data), data, payload), reviews),
 data,
 data.totals,
 payload,
 payload?.totals,
 );

 return {
 ...directData,
 declaration,
 status: declaration?.status || data.status || directData.status,
 workflowStatus: declaration?.status || data.workflowStatus || data.workflow_status || directData.workflowStatus,
 ...(directForm ? { form: directForm } : {}),
 ...(payload ? { payload: { ...payload, ...(payloadForm ? { form: payloadForm } : {}) } } : {}),
 };
};

const renameKeys = (rows, mapping) =>
 (rows || []).map((row) =>{
 const out = { ...row };
 Object.entries(mapping).forEach(([from, to]) =>{
 if (from in out) { out[to] = out[from]; delete out[from]; }
 });
 return out;
 });

const dropKeys = (rows, keys = []) =>
 (rows || []).map((row) =>{
 const out = { ...row };
 keys.forEach((key) =>{ delete out[key]; });
 return out;
 });

const isMediaOrDesignForm = (form = {}) =>
 Array.isArray(form.popularWritings) || Array.isArray(form.ipr);

const mapFormForSubmit = (form = {}) =>{
 const mediaOrDesign = isMediaOrDesignForm(form);
 const books = mediaOrDesign
 ? dropKeys(renameKeys(form.books, { coAuthors: "coauthor", first: "first_author" }), ["pub", "coauth"])
 : dropKeys(renameKeys(form.books, { pub: "publisher", coauth: "coauthor", first: "first_author" }), ["coAuthors"]);

 return {
 ...form,
 lectures: renameKeys(form.lectures, {
 sem: "semester", code: "course_code",
 planned: "planned_classes", conducted: "conducted_classes",
 }),
 feedback: renameKeys(form.feedback, {
 code: "course_code", fb1: "feedback_1", fb2: "feedback_2",
 }),
 society: renameKeys(form.society, { label: "activity", participated: "status" }),
 journals: renameKeys(form.journals, { index: "indexing" }),
 books,
 ict: renameKeys(form.ict, { desc: "description", quad: "quadrant" }),
 research: renameKeys(form.research, { name: "student_name" }),
 projects2: renameKeys(form.projects2, {
 date: "sanction_date", status: "project_status",
 }),
 internalProjects: renameKeys(form.internalProjects, {
 date: "sanction_date", status: "project_status",
 }),
 externalProjects: renameKeys(form.externalProjects, {
 date: "sanction_date", status: "project_status",
 }),
 ipr: renameKeys(form.ipr, {
 date: "ipr_date", status: "ipr_status", fileNo: "file_no",
 }),
 patents: renameKeys(form.patents, {
 date: "patent_date", status: "patent_status", fileNo: "file_no",
 }),
 awards: renameKeys(form.awards, { date: "award_date" }),
 confs: renameKeys(form.confs, { org: "organization" }),
 products: mediaOrDesign ? renameKeys(form.products, { used: "usage" }) : dropKeys(form.products, ["used"]),
 fdps: renameKeys(form.fdps, { org: "organization" }),
 };
};

export const submitAppraisal = async ({
 facultyEmail,
 academicYear,
 form,
 totals,
 docs,
 submitterProfile,
 activeProfile,
}) =>{
 if (!facultyEmail) throw new Error("Please login again. Your email was not found in this session.");
 if (!academicYear) throw new Error("Academic year is required before submitting.");

 const workflowProfile = submitterProfile || activeProfile || {};
 const reviewChain = getReviewChain(workflowProfile);
 const nextReviewer = reviewChain[0] || "";
 const workflowStatus = nextReviewer ? pendingStatusFor(nextReviewer) : "Submitted";
 const basePayload = {
 academic_year: academicYear,
 form: mapFormForSubmit(form),
 totals,
 docs: normalizeDocsMap(docs),
 submitter_profile: submitterProfile || activeProfile,
 };

 try {
 await api.post("/appraisal/submit", {
 ...basePayload,
 status: workflowStatus,
 workflow_status: workflowStatus,
 next_reviewer: nextReviewer,
 next_reviewer_role: nextReviewer,
 review_chain: reviewChain,
 });
 } catch (err) {
 if (![400, 422].includes(err?.response?.status)) throw err;
 await api.post("/appraisal/submit", basePayload);
 }
};

// Section rows to used by the review workflow to get section data from snapshot rows.
export const sectionRowsFromSnapshot = (snapshotPayload) =>{
 const form = snapshotFormFromPayload(snapshotPayload);
 if (!form) return {};
 return normalizeFetchedForm(form);
};

export const saveAppraisal = saveAppraisalDraftSection;
