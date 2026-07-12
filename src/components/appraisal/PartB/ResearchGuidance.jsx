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
export default function ResearchGuidance({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, get, set, reviewerLabel, reviewerScoreLabel, innovativeRows, getInnovHod, setInnovHod } = ctx;
 return (
<>
{/* B4: Research Guidance */}
 {faculty.sectionApplicability?.research !== "notApplicable" &&<SC title="B4(a). Research Guidance - PhD / PG (Max 30)" accent="#059669">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Degree</th><th style={TH}>Student Name</th><th style={TH}>Status</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>{reviewerScoreLabel}</th>
</tr></thead>
<tbody>
 {rows(research).map((r, i) =>(
<tr key={i}>
<td style={TDC}>{i + 1}</td>
<td style={TDC}><RO val={r.degree} center /></td>
<td style={TD}><RO val={r.name} /></td>
<td style={TD}><RO val={r.thesis} /></td>
<td style={TDV}><ViewDocsCell docKey={`res-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={r.degree || r.name || r.thesis || r.score ? researchGuidanceScore(r).toFixed(1) : ""} center /></td>
<td style={TDS_HOD}><HodInput val={get("research", i, "hod")} onChange={v =>set("research", i, "hod", v)} /></td>
</tr>
 ))}
</tbody>
</table>
</SC>}
</>
 );
}


