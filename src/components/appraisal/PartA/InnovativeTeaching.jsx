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
export default function InnovativeTeaching({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, get, set, reviewerLabel, reviewerScoreLabel, innovativeRows, getInnovHod, setInnovHod } = ctx;
 return (
<>
{/* A3: Innovative Teaching */}
<SC title="A3. Innovative Teaching-Learning (Max 10)" accent="#8b5cf6">
<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Method</th><th style={TH}>Details</th><th style={TH}>View Docs</th><th style={TH}>Faculty Score</th><th style={TH_HOD}>{reviewerScoreLabel}</th>
</tr></thead>
<tbody>
 {innovativeRows.map((row, index) =>{
 const rowReviewable = rowHasReviewableData("innovRows", row);
 return (
<tr key={index}>
<td style={TDC}>{index + 1}</td>
<td style={TD}><RO val={row.method || faculty.innovDetails} /></td>
<td style={TD}><RO val={row.details} /></td>
<td style={TDV}><ViewDocsCell docKey={index === 0 ? ["innov", "innov-0"] : `innov-${index}`} docs={docs} /></td>
<td style={TDS}><RO val={String(row.score ?? "").trim() ? clampScore(row.score, SCORE_LIMITS.innovativeRow) : ""} center /></td>
<td style={TDS_HOD}><HodInput val={String(getInnovHod(index) ?? "").trim() ? clampScore(getInnovHod(index), SCORE_LIMITS.innovativeRow) : ""} max={SCORE_LIMITS.innovativeRow} disabled={!rowReviewable} onChange={v =>setInnovHod(index, v)} /></td>
</tr>
 );
 })}
</tbody>
</table>
</SC>
</>
 );
}


