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
export default function ExternalProjects({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, get, set, reviewerLabel, reviewerScoreLabel, innovativeRows, getInnovHod, setInnovHod } = ctx;
 return (
<>
<SC title="B4(c). Research / Consultancy External Projects (Max 30)" accent="#059669">
<div style={{ overflowX: "auto" }}>
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Agency</th>
<th style={TH}>Sanction Date</th><th style={TH}>Amount</th><th style={TH}>Role</th><th style={TH}>Status</th>
<th style={TH}>Faculty Score</th><th style={TH_HOD}>{reviewerScoreLabel}</th>
</tr></thead>
<tbody>
 {rows(faculty.externalProjects).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.date} center /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TD}><RO val={r.role} /></td>
<td style={TD}><RO val={r.status} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("externalProjects", i, "hod")} max={SCORE_LIMITS.researchExternalProjects} onChange={v =>set("externalProjects", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</div>
</SC>
</>
 );
}


