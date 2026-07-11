import { workflowStatusMeta } from "../../utils/workflow";

export default function WorkflowStatusBadge({ status }) {
 const meta = workflowStatusMeta(status);
 return (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: meta.bg, color: meta.color, borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
   <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot }} />
   {meta.label}
  </span>
 );
}
