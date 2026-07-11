import { currentWorkflowStep } from "../../utils/workflow";
import ApprovalStepCard from "./ApprovalStepCard";

export default function WorkflowTimeline({ workflow, title = "Approval Workflow", emptyText = "Workflow details are not available." }) {
 const steps = workflow?.steps || [];
 const current = currentWorkflowStep(workflow);
 return (
  <section style={{ background: "#fff", border: "1px solid #e8ecf0", borderTop: "3px solid #0f172a", borderRadius: 10, boxShadow: "0 1px 4px rgba(15,23,42,0.07)", marginBottom: 14, overflow: "hidden" }}>
   <div style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9" }}>
    <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{title}</div>
    {workflow?.workflowName && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{workflow.workflowName}</div>}
   </div>
   <div style={{ padding: "14px 15px" }}>
    {steps.length ? (
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
      {steps.map((step, index) =>(
       <ApprovalStepCard key={`${step.stepNo}-${step.designation}-${index}`} step={step} index={index} active={current && current.stepNo === step.stepNo} />
      ))}
     </div>
    ) : (
     <div style={{ color: "#64748b", fontSize: 12 }}>{emptyText}</div>
    )}
   </div>
  </section>
 );
}
