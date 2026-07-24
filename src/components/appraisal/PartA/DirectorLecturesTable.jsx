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
export default function DirectorLecturesTable({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, getDir, setDir, getInnovDir, setInnovDir, innovativeRows } = ctx;
 return (
<>
{/* A1: Lectures */}
<SC title="A1. Lectures / Tutorials / Practicals (Max 50)" accent="#6366f1">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Semester</th><th style={TH}>Course Code / Name</th>
<th style={TH}>Classes (as per course structure)</th><th style={TH}>Classes Actually Conducted</th>
<th style={TH}>% Conducted</th>
<th style={TH}>View Docs</th>
<th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(lectures).slice(0, 4).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.sem} /></td>
<td style={TD}><RO val={r.code} /></td>
<td style={TDC}><RO val={r.planned} center /></td>
<td style={TDC}><RO val={r.conducted} center /></td>
<td style={TDC}><RO val={r.pctConducted || (Number(r.planned) > 0 && Number(r.conducted) >= 0 ? `${((Number(r.conducted) / Number(r.planned)) * 100).toFixed(1)}%` : "")} center /></td>
<td style={TDV}><ViewDocsCell docKey={`lec-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("lectures", i, "dir")} onChange={v =>setDir("lectures", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>
</>
 );
}


