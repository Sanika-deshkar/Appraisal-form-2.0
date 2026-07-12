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
export default function IndustryConnect({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, get, set, reviewerLabel, reviewerScoreLabel, innovativeRows, getInnovHod, setInnovHod } = ctx;
 return (
<>
{/* F: Industry */}
<SC title="F. Industry Connect (Max 5)" accent="#10b981">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Industry Name</th><th style={TH}>Details</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>{reviewerScoreLabel}</th>
</tr></thead>
<tbody>
 {rows(industry).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.name} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`ind-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.score} center /></td>
<td style={TDS_HOD}><HodInput val={get("industry", i, "hod")} onChange={v =>set("industry", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>
</>
 );
}


