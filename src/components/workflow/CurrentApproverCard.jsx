import { currentWorkflowStep, isWorkflowComplete } from "../../utils/workflow";
import WorkflowStatusBadge from "./WorkflowStatusBadge";

export default function CurrentApproverCard({ workflow }) {
 const current = currentWorkflowStep(workflow);
 const complete = isWorkflowComplete(workflow);
 const label = complete ? "Workflow Complete" : "Current Approver";
 const designation = complete ? "All approval levels completed" : current?.designation || "No pending approver";
 return (
  <div style={{ border: "1px solid #bfdbfe", background: complete ? "#f0fdf4" : "#eff6ff", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
   <div style={{ color: "#64748b", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>{label}</div>
   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 900 }}>{designation}</div>
    {current && <WorkflowStatusBadge status={current.status} />}
   </div>
  </div>
 );
}
