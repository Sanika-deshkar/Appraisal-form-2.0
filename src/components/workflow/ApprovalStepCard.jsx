import { normalizeWorkflowStatus, workflowStatusMeta, WORKFLOW_STATUSES } from "../../utils/workflow";

export default function ApprovalStepCard({ step, index, active = false }) {
 const status = normalizeWorkflowStatus(step?.status);
 const meta = workflowStatusMeta(status);
 const approved = [WORKFLOW_STATUSES.APPROVED, WORKFLOW_STATUSES.COMPLETED].includes(status);
 const rejected = status === WORKFLOW_STATUSES.REJECTED;
 return (
  <div style={{ minHeight: 74, border: `1px solid ${active ? meta.dot : "#e2e8f0"}`, borderRadius: 8, background: rejected ? "#fef2f2" : approved ? "#f0fdf4" : active ? "#eff6ff" : "#f8fafc", padding: "10px 9px", textAlign: "center", boxSizing: "border-box" }}>
   <div style={{ margin: "0 auto 7px", width: 26, height: 26, borderRadius: "50%", background: meta.dot, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 900 }}>
    {approved ? "OK" : rejected ? "R" : index + 1}
   </div>
   <div style={{ color: active ? "#1d4ed8" : approved ? "#166534" : rejected ? "#991b1b" : "#334155", fontSize: 11, fontWeight: 900, lineHeight: 1.25 }}>
    {step?.designation || "Approver"}
   </div>
   <div style={{ color: meta.color, fontSize: 9, fontWeight: 800, marginTop: 4 }}>{meta.label}</div>
  </div>
 );
}
