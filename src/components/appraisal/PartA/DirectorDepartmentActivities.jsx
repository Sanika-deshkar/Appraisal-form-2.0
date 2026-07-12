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
export default function DirectorDepartmentActivities({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, getDir, setDir, getInnovDir, setInnovDir, innovativeRows } = ctx;
 return (
<>
{/* C: Dept Activities */}
<SC title="C. Departmental Activities (Max 20)" accent="#f59e0b">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Nature</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(deptActs).map((r, i) =>(
<tr key={i} style={i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.activity} /></td>
<td style={TD}><RO val={r.nature} /></td>
<td style={TDV}><ViewDocsCell docKey={`dept-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("deptActs", i, "dir")} onChange={v =>setDir("deptActs", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>
</>
 );
}


