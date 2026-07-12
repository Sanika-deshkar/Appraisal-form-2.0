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
export default function DirectorIndustrialTraining({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, getDir, setDir, getInnovDir, setInnovDir, innovativeRows } = ctx;
 return (
<>
<SC title="B8(b). Industrial Training" accent="#10b981">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Company</th><th style={TH}>Duration</th><th style={TH}>Nature</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(training).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.company} /></td>
<td style={TDC}><RO val={r.duration} center /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`train-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? clampScore(r.score, SCORE_LIMITS.fdpRow) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("training", i, "dir")} max={SCORE_LIMITS.fdpRow} onChange={v =>setDir("training", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>
<table style={{ ...T, marginTop: 4 }}>
<tbody>
<tr style={{ background: "#f3e8ff" }}>
<td style={{ ...TDC, fontWeight: "bold" }} colSpan={5}>Total B8 Score (Max 10)</td>
<td style={{ ...TDS, fontWeight: "bold" }}>
 {clampScore(
 (fdps || []).reduce((s, r) =>s + clampScore(parseFloat(r.score) || 0, SCORE_LIMITS.fdpRow), 0) +
 (training || []).reduce((s, r) =>s + clampScore(parseFloat(r.score) || 0, SCORE_LIMITS.fdpRow), 0),
 10
 ).toFixed(1)}
</td>
<td style={{ ...TDS_DIR, fontWeight: "bold" }}>
 {clampScore(
 (fdps || []).reduce((s, r, i) =>s + clampScore(parseFloat(getDir("fdps", i, "dir")) || 0, SCORE_LIMITS.fdpRow), 0) +
 (training || []).reduce((s, r, i) =>s + clampScore(parseFloat(getDir("training", i, "dir")) || 0, SCORE_LIMITS.fdpRow), 0),
 10
 ).toFixed(1)}
</td>
</tr>
</tbody>
</table>
</>
 );
}


