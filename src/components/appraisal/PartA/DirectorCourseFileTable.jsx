/* eslint-disable no-unused-vars */
import { HodInput } from "../../Inputs";
import {
  SCORE_LIMITS,
  clampScore,
  courseFileRowScore,
  projectGuidanceRowMax,
  researchGuidanceScore,
  rowHasReviewableData,
  societyRowLocked,
  societyRowScore,
  ViewDocsCell,
  SectionCard as SC,
  T,
  TH,
  TH_HOD,
  TH_DIR,
  TD,
  TDC,
  TDS,
  TDS_HOD,
  TDS_DIR,
  TDV,
} from "../../../features/faculty-appraisal";
import { n, RO } from "../../../features/faculty-appraisal/shared";
import { DirectorInput as DirInput } from "../common/ReviewerInput";
export default function DirectorCourseFileTable({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, getDir, setDir, getInnovDir, setInnovDir, innovativeRows } = ctx;
 return (
<>
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
</>
 );
}


