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
export default function DirectorSocietyContribution({ ctx }) {
 const { faculty, docs, lectures, courseFile, projects, quals, feedback, deptActs, uniActs, society, industry, acr, journals, books, ict, research, projects2, externalProjects, patents, awards, confs, proposals, products, fdps, training, rows, getDir, setDir, getInnovDir, setInnovDir, innovativeRows } = ctx;
 return (
<>
{/* E: Society */}
<SC title="E. Contribution to Society (Max 10, Max 5 per row)" accent="#10b981">
<div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
 {["applicable", "notApplicable"].map((v) =>(
<label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
<input type="checkbox" checked={(faculty.sectionApplicability?.society || "applicable") === v} readOnly disabled />
 {v === "applicable" ? "Applicable" : "Not Applicable"}
</label>
 ))}
</div>
 {faculty.sectionApplicability?.society !== "notApplicable" &&<table style={T}>
<thead><tr>
<th style={TH}>SN</th><th style={TH}>Activity</th><th style={TH}>Details</th>
<th style={TH}>View Docs</th><th style={TH}>Faculty Score (Max 5)</th><th style={TH_DIR}>Director Score</th>
</tr></thead>
<tbody>
 {rows(society).map((r, i) =>(
<tr key={i} style={societyRowLocked(r) ? { background: "#f1f5f9", opacity: 0.65 } : i % 2 ? { background: "#f8fafc" } : {}}>
<td style={TDC}>{i + 1}</td>
<td style={TD}><RO val={r.label} /></td>
<td style={TD}><RO val={r.details} /></td>
<td style={TDV}><ViewDocsCell docKey={`soc-${i}`} docs={docs} /></td>
<td style={TDS}><RO val={String(r.score ?? "").trim() ? societyRowScore(r) : ""} center /></td>
<td style={TDS_DIR}><DirInput val={societyRowLocked(r) ? "0" : getDir("society", i, "dir")} max={SCORE_LIMITS.societyRow} disabled={societyRowLocked(r)} onChange={v =>setDir("society", i, "dir", v)} /></td>
</tr>
 ))}
</tbody>
</table>}
</SC>
</>
 );
}


