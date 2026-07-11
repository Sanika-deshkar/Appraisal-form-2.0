import WorkflowStatusBadge from "./WorkflowStatusBadge";

export default function ApprovalHistoryTable({ workflow, title = "Approval History" }) {
 const steps = workflow?.approvalSteps || [];
 if (!steps.length) return null;
 return (
  <div style={{ marginBottom: 14 }}>
   <div style={{ color: "#334155", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{title}</div>
   <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
     <thead>
      <tr>
       <th style={TH}>Step</th>
       <th style={{ ...TH, textAlign: "left" }}>Designation</th>
       <th style={TH}>Status</th>
       <th style={{ ...TH, textAlign: "left" }}>Remarks</th>
       <th style={TH}>Reviewed On</th>
      </tr>
     </thead>
     <tbody>
      {steps.map((step, index) =>(
       <tr key={`${step.stepNo}-${step.designation}-${index}`} style={index % 2 ? { background: "#f8fafc" } : undefined}>
        <td style={TDC}>{step.stepNo}</td>
        <td style={TD}>{step.designation || "Approver"}</td>
        <td style={TDC}><WorkflowStatusBadge status={step.status} /></td>
        <td style={TD}>{step.remarks || <span style={{ color: "#94a3b8" }}>-</span>}</td>
        <td style={TDC}>{step.reviewedAt || <span style={{ color: "#94a3b8" }}>-</span>}</td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>
  </div>
 );
}

const TH = { border: "1px solid #334155", padding: "7px 8px", background: "#1e293b", color: "#e2e8f0", fontWeight: 700, textAlign: "center", fontSize: 10, letterSpacing: "0.3px" };
const TD = { border: "1px solid #e2e8f0", padding: "7px 8px", verticalAlign: "top" };
const TDC = { ...TD, textAlign: "center", verticalAlign: "middle" };
