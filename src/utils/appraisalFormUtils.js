export const toNumber = (value) =>{
 const parsed = parseFloat(value);
 return Number.isFinite(parsed) ? parsed : 0;
};

export const clampScore = (value, maxScore) =>{
 const max = toNumber(maxScore);
 const score = Math.max(0, toNumber(value));
 return max >0 ? Math.min(score, max) : score;
};

export const scoreRemaining = (earned, maxScore) =>
 Math.max(0, toNumber(maxScore) - clampScore(earned, maxScore));

export const SCORE_LIMITS = {
 courseFileRow: 20,
 innovativeRow: 2,
 qualificationRow: 5,
 acrRow: 5,
 feedbackAverage: 100,
 societyRow: 5,
 fdpRow: 10,
 projectGuidanceDefaultRow: 5,
 researchPhd: 20,
 researchPg: 10,
 researchInternalProjects: 15,
 researchExternalProjects: 30,
};

export const INNOVATIVE_METHODS = [
 "Blended Learning",
 "Virtual Lab",
 "LMS",
 "Project Based Learning",
 "Flip Classroom",
 "Any Other",
];

const normalizedText = (value) =>
 String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const splitListText = (value) =>
 String(value ?? "")
 .split(",")
 .map((item) =>item.trim())
 .filter(Boolean);

const rowMaxValue = (rowMax, row, index) =>
 typeof rowMax === "function" ? rowMax(row, index) : rowMax;

export const innovativeSelectionsFromDetails = (details = "") =>{
 const selected = splitListText(details);
 return INNOVATIVE_METHODS.filter((method) =>
 selected.some((item) =>normalizedText(item) === normalizedText(method)),
 );
};

export const innovativeTeachingScore = (details = "", storedScore = "", maxScore = 10) =>{
 const selectedCount = innovativeSelectionsFromDetails(details).length;
 const calculated = selectedCount * SCORE_LIMITS.innovativeRow;
 return clampScore(selectedCount ? calculated : storedScore, maxScore);
};

export const toggleInnovativeMethod = (details = "", method) =>{
 const selected = splitListText(details);
 const methodKey = normalizedText(method);
 const exists = selected.some((item) =>normalizedText(item) === methodKey);
 return exists
 ? selected.filter((item) =>normalizedText(item) !== methodKey).join(", ")
 : [...selected, method].join(", ");
};

export const courseFileRowScore = (row = {}) =>
 clampScore(row.score, SCORE_LIMITS.courseFileRow);

export const courseFileAverageScore = (rows = [], maxScore = 20) =>{
 const filled = rows.filter((row) =>String(row?.score ?? "").trim() !== "");
 if (!filled.length) return 0;
 const avg = filled.reduce((total, row) =>total + clampScore(row.score, SCORE_LIMITS.courseFileRow), 0) / filled.length;
 return clampScore(avg, maxScore);
};

export const projectGuidanceRowMax = (row = {}) =>{
 const label = normalizedText(row.label);
 if (label.includes("3/batch")) return 3;
 if (label.includes("max 5") || label.includes("award") || label.includes("sponsorship") || label.includes("outcome")) return 5;
 return SCORE_LIMITS.projectGuidanceDefaultRow;
};

export const researchGuidanceRowMax = (row = {}) =>{
 const degree = normalizedText(row.degree);
 if (degree.includes("pg") || degree.includes("post graduate") || degree.includes("postgraduate") || degree.includes("m.tech") || degree.includes("mtech") || degree.includes("master")) {
 return SCORE_LIMITS.researchPg;
 }
 if (degree.includes("phd") || degree.includes("ph.d") || degree.includes("doctor")) {
 return SCORE_LIMITS.researchPhd;
 }
 return 0;
};

export const researchGuidanceScore = (row = {}) =>{
 const rowMax = researchGuidanceRowMax(row);
 if (!rowMax) return 0;
 return rowHasAnyValue(row, ["name", "thesis"])
 ? rowMax
 : clampScore(row.score, rowMax);
};

export const societySelectionForRow = (row = {}) =>{
 const selected = row.participated ?? row.completed ?? row.yesNo ?? row.yes_no ?? "";
 if (selected) return selected;
 return toNumber(row.score) >0 ? "Yes" : "";
};

export const societyRowLocked = () =>
 false;

export const societyRowScore = (row = {}) =>
 clampScore(toNumber(row.score), SCORE_LIMITS.societyRow);

export const effectiveMaxScore = (baseMax, applicability = {}, sections = []) =>
 Math.max(
 0,
 toNumber(baseMax) -
 sections.reduce(
 (total, section) =>
 applicability?.[section.key] === "notApplicable"
 ? total + toNumber(section.max)
 : total,
 0,
 ),
 );

export const selfEffectivePartAMax = (baseMax = 200, applicability = {}, sections = []) =>
 effectiveMaxScore(baseMax, { ...applicability, acr: "notApplicable" }, [
 ...sections.filter((section) => section.key !== "acr"),
 { key: "acr", max: 25 },
 ]);

export const sumSectionScore = (rows = [], maxScore, scoreKey = "score", rowMax) =>
 clampScore(
 rows.reduce((total, row, index) =>{
 const rawScore = toNumber(row?.[scoreKey]);
 const maxForRow = rowMaxValue(rowMax, row, index);
 return total + (maxForRow ? clampScore(rawScore, maxForRow) : rawScore);
 }, 0),
 maxScore,
 );

export const sumCalculatedSectionScore = (rows = [], maxScore, rowScore) =>
 clampScore(
 rows.reduce((total, row, index) =>total + clampScore(rowScore(row, index), maxScore), 0),
 maxScore,
 );

export const averageSectionScore = (rows = [], maxScore, scoreKey = "score") =>{
 const filled = rows.filter((row) =>String(row?.[scoreKey] ?? "").trim() !== "");
 if (!filled.length) return 0;
 return clampScore(
 filled.reduce((total, row) =>total + toNumber(row?.[scoreKey]), 0) / filled.length,
 maxScore,
 );
};

export const feedbackAverage = (row = {}) =>{
 const values = [row.fb1, row.fb2]
 .map((value) =>clampScore(value, SCORE_LIMITS.feedbackAverage))
 .filter((value) =>value >0);
 if (!values.length) return 0;
 return values.reduce((total, value) =>total + value, 0) / values.length;
};

export const feedbackRowScore = (row = {}, maxScore = 10) =>
 clampScore(feedbackAverage(row) / 10, maxScore);

export const feedbackSectionScore = (rows = [], maxScore = 10) =>{
 const filled = rows.filter((row) =>
 ["code", "fb1", "fb2"].some((key) =>String(row?.[key] ?? "").trim() !== ""),
 );
 if (!filled.length) return 0;
 return clampScore(
 filled.reduce((total, row) =>total + feedbackRowScore(row, maxScore), 0) / filled.length,
 maxScore,
 );
};

export const rowMaxForSection = (sectionKey, row = {}, sectionMax = 0) =>{
 if (sectionKey === "courseFile") return SCORE_LIMITS.courseFileRow;
 if (sectionKey === "projects") return projectGuidanceRowMax(row);
 if (sectionKey === "quals") return SCORE_LIMITS.qualificationRow;
 if (sectionKey === "feedback") return 10;
 if (sectionKey === "society") return SCORE_LIMITS.societyRow;
 if (sectionKey === "acr") return SCORE_LIMITS.acrRow;
 if (sectionKey === "research") return researchGuidanceRowMax(row);
 if (sectionKey === "projects2" || sectionKey === "internalProjects") return SCORE_LIMITS.researchInternalProjects;
 if (sectionKey === "externalProjects") return SCORE_LIMITS.researchExternalProjects;
 if (sectionKey === "fdps" || sectionKey === "training") return SCORE_LIMITS.fdpRow;
 return sectionMax;
};

export const scoreSectionRows = (sectionKey, rows = [], maxScore, scoreKey = "score") =>{
 if (sectionKey === "feedback") {
 return scoreKey === "score"
 ? feedbackSectionScore(rows, maxScore)
 : averageSectionScore(rows, maxScore, scoreKey);
 }
 if (sectionKey === "lectures" || sectionKey === "courseFile") {
 return reviewSectionScore(sectionKey, rows, maxScore, scoreKey);
 }
 if (sectionKey === "research" && scoreKey === "score") return sumCalculatedSectionScore(rows, maxScore, (row) =>{
 const stored = String(row?.score ?? "").trim();
 return stored !== "" ? clampScore(stored, researchGuidanceRowMax(row)) : researchGuidanceScore(row);
 });
 if (sectionKey === "society") {
 return sumCalculatedSectionScore(rows, maxScore, (row) =>
 societyRowLocked(row) ? 0 : clampScore(row?.[scoreKey], SCORE_LIMITS.societyRow),
 );
 }
 return sumSectionScore(rows, maxScore, scoreKey, (row) =>rowMaxForSection(sectionKey, row, maxScore));
};

const hasScoreValue = (row = {}, key = "score") =>
 String(row?.[key] ?? "").trim() !== "";

const hasFeedbackScoreValues = (row = {}) =>
 ["fb1", "fb2"].some((key) =>String(row?.[key] ?? "").trim() !== "");

const innovRowsScore = (rows = []) =>{
 const hasAnyScore = rows.some((row) =>hasScoreValue(row));
 if (!hasAnyScore) return "";
 return String(clampScore(rows.reduce((total, row) =>total + clampScore(row?.score, SCORE_LIMITS.innovativeRow), 0), 10));
};

export const normalizeAutoScores = (form = {}) =>({
 ...form,
 innovScore: Array.isArray(form.innovRows) && form.innovRows.length
 ? innovRowsScore(form.innovRows)
 : (String(form.innovDetails ?? "").trim() || String(form.innovScore ?? "").trim()
 ? String(innovativeTeachingScore(form.innovDetails, form.innovScore, 10))
 : ""),
 courseFile: (form.courseFile || []).map((row) =>({
 ...row,
 score: courseFileRowScore(row) ? String(courseFileRowScore(row)) : "",
 })),
 feedback: (form.feedback || []).map((row) =>({
 ...row,
 score: hasFeedbackScoreValues(row) ? feedbackRowScore(row, 10).toFixed(1) : "",
 })),
 society: (form.society || []).map((row) =>{
 return {
 ...row,
 score: String(clampScore(toNumber(row.score), SCORE_LIMITS.societyRow) || ""),
 };
 }),
 research: (form.research || []).map((row) =>{
 const stored = String(row?.score ?? "").trim();
 const rowMax = researchGuidanceRowMax(row);
 const fallback = researchGuidanceScore(row);
 return {
 ...row,
 score: stored !== "" ? String(clampScore(stored, rowMax)) : (fallback ? String(fallback) : ""),
 };
 }),
 projects: (form.projects || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, projectGuidanceRowMax(row)) || ""),
 })),
 projects2: (form.projects2 || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, SCORE_LIMITS.researchInternalProjects) || ""),
 })),
 internalProjects: (form.internalProjects || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, SCORE_LIMITS.researchInternalProjects) || ""),
 })),
 externalProjects: (form.externalProjects || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, SCORE_LIMITS.researchExternalProjects) || ""),
 })),
 quals: (form.quals || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, SCORE_LIMITS.qualificationRow) || ""),
 })),
 fdps: (form.fdps || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, SCORE_LIMITS.fdpRow) || ""),
 })),
 training: (form.training || []).map((row) =>({
 ...row,
 score: String(clampScore(row.score, SCORE_LIMITS.fdpRow) || ""),
 })),
});

export const isFilled = (value) =>String(value ?? "").trim() !== "";

export const rowHasAnyValue = (row = {}, keys = []) =>
 keys.some((key) =>isFilled(row?.[key]));

export const REVIEW_ROW_VALUE_KEYS = {
 lectures: ["sem", "code", "planned", "conducted"],
 courseFile: ["course", "title", "details"],
 projects: ["label"],
 quals: ["label"],
 feedback: ["code", "fb1", "fb2"],
 deptActs: ["activity", "nature"],
 uniActs: ["activity", "nature"],
 society: ["label", "details", "participated", "completed", "yesNo", "yes_no"],
 industry: ["name", "details"],
 acr: ["label"],
 journals: ["title", "journal", "issn", "index"],
 popularWritings: ["media", "film"],
 books: ["title", "book", "issn", "pub", "publisher", "coauth", "coAuthors", "first"],
 ict: ["title", "desc", "type", "quad"],
 research: ["degree", "name", "thesis"],
 projects2: ["title", "agency", "date", "amount", "role", "status"],
 internalProjects: ["title", "agency", "date", "amount", "role", "status"],
 externalProjects: ["title", "agency", "date", "amount", "role", "status"],
 patents: ["title", "type", "date", "status", "fileNo"],
 awards: ["title", "date", "agency", "level"],
 confs: ["title", "type", "org", "level"],
 proposals: ["title", "duration", "agency", "amount"],
 products: ["details", "usage", "used"],
 fdps: ["program", "duration", "org"],
 training: ["company", "duration", "nature"],
 innovRows: ["method", "details"],
};

export const rowHasReviewableData = (sectionKey, row = {}) =>{
 const keys = REVIEW_ROW_VALUE_KEYS[sectionKey] || [];
 return keys.length ? rowHasAnyValue(row, keys) : false;
};

export const reviewRowMaxForSection = (sectionKey, row = {}, sectionMax = 0) =>
 sectionKey === "innovRows"
 ? SCORE_LIMITS.innovativeRow
 : rowMaxForSection(sectionKey, row, sectionMax);

export const clampReviewScore = (sectionKey, row = {}, value, sectionMax = 0) =>{
 if (!rowHasReviewableData(sectionKey, row)) return "";
 if (!isFilled(value)) return "";
 const maxForRow = reviewRowMaxForSection(sectionKey, row, sectionMax);
 return String(maxForRow ? clampScore(value, maxForRow) : clampScore(value, sectionMax));
};

export const reviewSectionScore = (sectionKey, rows = [], maxScore = 0, scoreKey = "score") =>{
 const reviewableRows = rows.filter((row) =>rowHasReviewableData(sectionKey, row));
 if (!reviewableRows.length) return 0;

 if (sectionKey === "lectures" || sectionKey === "courseFile" || sectionKey === "feedback") {
 const scoredRows = reviewableRows.filter((row) =>isFilled(row?.[scoreKey]));
 if (!scoredRows.length) return 0;
 const total = scoredRows.reduce((sum, row) =>{
 const rowMax = reviewRowMaxForSection(sectionKey, row, maxScore);
 return sum + (rowMax ? clampScore(row?.[scoreKey], rowMax) : toNumber(row?.[scoreKey]));
 }, 0);
 return clampScore(total / scoredRows.length, maxScore);
 }

 return clampScore(
 reviewableRows.reduce((sum, row) =>{
 const rowMax = reviewRowMaxForSection(sectionKey, row, maxScore);
 return sum + (rowMax ? clampScore(row?.[scoreKey], rowMax) : toNumber(row?.[scoreKey]));
 }, 0),
 maxScore,
 );
};

export const rowMissingFields = (row = {}, keys = []) =>
 keys.filter((key) =>!isFilled(row?.[key]));

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_REQUIREMENT_TEXT = "Only image or PDF files up to 10 MB are allowed.";

export const isAllowedAttachmentFile = (file = {}) =>{
 const type = String(file.type || "").toLowerCase();
 const name = String(file.name || file.url || "").toLowerCase();
 const size = Number(file.size || 0);
 const validType = type === "application/pdf" ||
 type.startsWith("image/") ||
 /\.(pdf|png|jpe?g|webp|gif|bmp)$/i.test(name);
 const validSize = !size || size<= MAX_ATTACHMENT_SIZE_BYTES;
 return validType && validSize;
};

export const filesForDocValue = (value) =>
 (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

export const docsForRow = (docs = {}, docPrefix = "", index = 0, docKey) =>{
 if (docKey) return filesForDocValue(docs?.[docKey]);
 if (!docPrefix) return [];
 return filesForDocValue(docs?.[`${docPrefix}-${index}`]);
};

const docPrefixForSectionLabel = (label = "") =>{
 const text = normalizedText(label);
 if (text.includes("lectures")) return "lec";
 if (text.includes("innovative")) return "innov";
 if (text.includes("project") && text.includes("external")) return "externalProject";
 if (text.includes("project") && (text.includes("internal") || text.includes("b4(b)"))) return "project2";
 if (text.includes("a(iv)") || text.includes("project guidance") || text === "projects") return "proj";
 if (text.includes("qualification")) return "qual";
 if (text.includes("department")) return "dept";
 if (text.includes("university")) return "uni";
 if (text.includes("society")) return "soc";
 if (text.includes("industry connect")) return "ind";
 if (text.includes("journal")) return "jour";
 if (text.includes("book")) return "book";
 if (text.includes("ict")) return "ict";
 if (text.includes("research guidance")) return "res";
 if (text.includes("patent") || text.includes("ipr")) return "pat";
 if (text.includes("award")) return "awd";
 if (text.includes("conference")) return "conf";
 if (text.includes("proposal")) return "prop";
 if (text.includes("product")) return "prod";
 if (text.includes("fdp") || text.includes("workshop")) return "fdp";
 if (text.includes("industrial training")) return "train";
 return "";
};

const isAverageScoredSectionLabel = (labelText = "") =>
 labelText.includes("course file") ||
 (labelText.includes("lectures") && labelText.includes("tutorials") && labelText.includes("practicals"));

export const validateCompleteRows = (sections = [], defaultDocs) =>{
 const errors = [];

 sections.forEach(({ label, rows = [], fields = [], skip = false, rowMax, maxScore, scoreField = "score", docs = defaultDocs, docPrefix, docKey, requireAttachment }) =>{
 if (skip) return;
 const labelText = normalizedText(label);
 const isB8Section = /^b8(?:\(|\.)/.test(labelText);
 const inferredRowMax = rowMax ?? (labelText.includes("fdp") || labelText.includes("industrial training") ? SCORE_LIMITS.fdpRow : undefined);
 const resolvedDocPrefix = docPrefix ?? (docs ? docPrefixForSectionLabel(label) : "");
 const shouldRequireAttachment = requireAttachment ?? Boolean(resolvedDocPrefix || docKey);

 rows.forEach((row, index) =>{
 if (!rowHasAnyValue(row, fields)) return;

 const missing = rowMissingFields(row, fields);
 if (missing.length) {
 errors.push(`${label}, row ${index + 1}: fill all fields or clear the row.`);
 }

 const requireAttachmentForRow = typeof shouldRequireAttachment === "function"
 ? shouldRequireAttachment(row, index)
 : shouldRequireAttachment;

 if (requireAttachmentForRow) {
 const files = docsForRow(docs, resolvedDocPrefix, index, typeof docKey === "function" ? docKey(row, index) : docKey);
 if (!files.length) {
 errors.push(`${label}, row ${index + 1}: attach an image or PDF.`);
 } else if (files.some((file) =>!isAllowedAttachmentFile(file))) {
 errors.push(`${label}, row ${index + 1}: attachment must be an image or PDF up to 10 MB.`);
 }
 }

 const maxForRow = rowMaxValue(inferredRowMax, row, index);
 if (maxForRow && isFilled(row?.[scoreField]) && toNumber(row?.[scoreField]) >maxForRow) {
 errors.push(`${label}, row ${index + 1}: score cannot exceed ${maxForRow}.`);
 }
 });

 if (maxScore && rows.length && !isB8Section) {
 const total = isAverageScoredSectionLabel(labelText)
 ? averageSectionScore(rows, maxScore, scoreField)
 : rows.reduce((sum, row, index) =>{
 const maxForRow = rowMaxValue(inferredRowMax, row, index);
 const score = maxForRow ? clampScore(row?.[scoreField], maxForRow) : toNumber(row?.[scoreField]);
 return sum + score;
 }, 0);
 if (total >toNumber(maxScore)) {
 errors.push(`${label}: total score cannot exceed ${maxScore}.`);
 }
 }
 });

 return errors;
};

export const maskDateDDMMYYYY = (value) =>{
 const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
 if (digits.length<= 2) return digits;
 if (digits.length<= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
 return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const isValidDDMMYYYY = (value) =>{
 const text = String(value ?? "").trim();
 const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
 if (!match) return false;

 const day = Number(match[1]);
 const month = Number(match[2]);
 const year = Number(match[3]);
 const date = new Date(year, month - 1, day);

 return (
 date.getFullYear() === year &&
 date.getMonth() === month - 1 &&
 date.getDate() === day
 );
};

export const normalizeSingleFileDocs = (docs = {}) =>
 Object.fromEntries(
 Object.entries(docs || {}).map(([key, files]) =>[
 key,
 filesForDocValue(files),
 ]),
 );

export const scoreSummaryText = (earned, maxScore) =>({
 earned: clampScore(earned, maxScore),
 max: toNumber(maxScore),
 remaining: scoreRemaining(earned, maxScore),
});
