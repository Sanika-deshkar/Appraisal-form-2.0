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
export default function DirectorResearchProposals({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, getDir, setDir, getInnovDir, setInnovDir, innovativeRows } = ctx;
 return (
<>
{/* B7: Proposals */}
<SC title="B7(a). Submitted Research Proposals (Max 10)" accent="#0ea5e9">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Title</th><th style={TH}>Duration</th>
<th style={TH}>Funding Agency</th><th style={TH}>Amount</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(proposals).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.title} /></td>
<td style={TDC}><RO val={r.duration} center /></td>
<td style={TD}><RO val={r.agency} /></td>
<td style={TDC}><RO val={r.amount} center /></td>
<td style={TDV}><ViewDocsCell docKey={`prop-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_DIR}><DirInput val={getDir("proposals", i, "dir")} onChange={v =>setDir("proposals", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>
</>
 );
}


