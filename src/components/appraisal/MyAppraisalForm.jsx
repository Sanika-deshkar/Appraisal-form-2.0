/* eslint-disable no-unused-vars */
import {
  SCORE_LIMITS,
  clampReviewScore,
  mergeFacultyInfo,
  reviewSectionScore,
} from "../../features/faculty-appraisal";
import FacultyInfoSection from "./common/FacultyInfoSection";
import PartA from "./PartA/PartA";
import DirectorPartA from "./PartA/DirectorPartA";
import PartB from "./PartB/PartB";
import DirectorPartB from "./PartB/DirectorPartB";

const REVIEW_SECTION_MAX = {
  lectures: 50,
  courseFile: 20,
  projects: 10,
  quals: 10,
  feedback: 10,
  deptActs: 20,
  uniActs: 30,
  society: 10,
  industry: 5,
  acr: 25,
  journals: 120,
  books: 50,
  ict: 20,
  research: 30,
  projects2: SCORE_LIMITS.researchInternalProjects,
  externalProjects: SCORE_LIMITS.researchExternalProjects,
  patents: 40,
  awards: 10,
  confs: 30,
  proposals: 10,
  products: 10,
  fdps: 10,
  training: 10,
};

// - Faculty Form in HOD Review Mode -
export default function MyAppraisalForm({ faculty, hodData, setHodData, reviewerLabel = "HOD", sectionView = "partA" }) {
 const set = (section, idx, field, val) =>{
 setHodData(prev =>{
 const updated = { ...prev };
 if (!updated[section]) updated[section] = JSON.parse(JSON.stringify(faculty[section] || []));
 const nextVal = field === "hod" && idx !== null
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

 const info = mergeFacultyInfo(faculty.info, faculty);
 const { lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, docs } = faculty;
 const rows = (arr) =>arr && arr.length >0 ? arr : [{}];
 const reviewerScoreLabel = `${reviewerLabel} Score`;
 const innovativeRows = Array.isArray(faculty.innovRows) && faculty.innovRows.length
 ? faculty.innovRows
 : [{ method: faculty.innovDetails || "Innovative / participatory teaching methods used", details: faculty.innovDetails || "", score: faculty.innovScore || "" }];
 const getInnovHod = (index) =>hodData.innovRows?.[index]?.hod ?? innovativeRows[index]?.hod ?? "";
 const setInnovHod = (index, value) =>{
 const sourceRow = innovativeRows[index] || {};
 const nextValue = clampReviewScore("innovRows", sourceRow, value, 10);
 setHodData(prev =>{
 const sourceRows = Array.isArray(prev.innovRows) && prev.innovRows.length ? prev.innovRows : JSON.parse(JSON.stringify(innovativeRows));
 const nextRows = sourceRows.map((row, rowIndex) =>rowIndex === index ? { ...row, hod: nextValue } : row);
 const total = reviewSectionScore("innovRows", nextRows.map((row, rowIndex) =>({ ...innovativeRows[rowIndex], ...row })), 10, "hod");
 return { ...prev, innovRows: nextRows, innovHod: total ? String(total) : "" };
 });
 };
 const ctx = { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, get, set, reviewerLabel, reviewerScoreLabel, innovativeRows, getInnovHod, setInnovHod };

 return (
<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
<div style={{ background: "linear-gradient(90deg,#312e81,#4338ca)", color: "#e0e7ff", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
<span style={{ fontSize: 18 }}></span>
<div>
<strong>{reviewerLabel} Review Mode</strong>- Faculty self-scores are read-only. Only<span style={{ color: "#c7d2fe", fontWeight: 700 }}>{reviewerScoreLabel}</span>columns are editable. Click<span style={{ color: "#c7d2fe" }}>View Doc</span>links to open uploaded files.
</div>
</div>
<FacultyInfoSection info={info} />
{sectionView === "partA" && <PartA ctx={ctx} />}
{sectionView === "partB" && <PartB ctx={ctx} />}
</div>
 );
}

// - Faculty Form in Director Review Mode -
export function DirectorFacultyReviewForm({ faculty, hodData, setHodData, dirData, setDirData, sectionView = "partA" }) {
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
 const ctx = { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, set, getDir, setDir, getInnovDir, setInnovDir, innovativeRows };

 return (
<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
<div style={{ background: "linear-gradient(90deg,#065f46,#059669)", color: "#d1fae5", borderRadius: 8, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
<span style={{ fontSize: 18 }}></span>
<div>
<strong>Director Review Mode</strong>- Faculty self-scores are read-only. Only<span style={{ color: "#6ee7b7", fontWeight: 700 }}>Director Score</span>columns are editable. Click<span style={{ color: "#6ee7b7" }}>View Doc</span>links to open uploaded files.
</div>
</div>
<FacultyInfoSection info={info} />
{sectionView === "partA" && <DirectorPartA ctx={ctx} />}
{sectionView === "partB" && <DirectorPartB ctx={ctx} />}
</div>
 );
}


