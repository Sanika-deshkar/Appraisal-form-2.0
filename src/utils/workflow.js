const clean = (value) =>String(value ?? "").trim();

export const WORKFLOW_STATUSES = {
 DRAFT: "DRAFT",
 APPROVED: "APPROVED",
 REJECTED: "REJECTED",
 PENDING: "PENDING",
 WAITING: "WAITING",
 COMPLETED: "COMPLETED",
 SKIPPED: "SKIPPED",
};

export const normalizeWorkflowStatus = (status) =>{
 const normalized = clean(status).toUpperCase().replace(/[-\s]+/g, "_");
 if (["APPROVE", "APPROVED", "REVIEWED", "DONE"].includes(normalized)) return WORKFLOW_STATUSES.APPROVED;
 if (["REJECT", "REJECTED", "DECLINED"].includes(normalized)) return WORKFLOW_STATUSES.REJECTED;
 if (["PENDING", "PENDING_REVIEW", "IN_PROGRESS", "CURRENT"].includes(normalized)) return WORKFLOW_STATUSES.PENDING;
 if (["WAIT", "WAITING", "NOT_STARTED", "QUEUED"].includes(normalized)) return WORKFLOW_STATUSES.WAITING;
 if (["COMPLETE", "COMPLETED", "FINALISED", "FINALIZED"].includes(normalized)) return WORKFLOW_STATUSES.COMPLETED;
 if (["SKIP", "SKIPPED"].includes(normalized)) return WORKFLOW_STATUSES.SKIPPED;
 if (["DRAFT", "NEW"].includes(normalized)) return WORKFLOW_STATUSES.DRAFT;
 return normalized || WORKFLOW_STATUSES.WAITING;
};

export const workflowStatusMeta = (status) =>{
 const normalized = normalizeWorkflowStatus(status);
 const map = {
 [WORKFLOW_STATUSES.APPROVED]: { label: "Approved", bg: "#d1fae5", color: "#065f46", dot: "#10b981", icon: "OK" },
 [WORKFLOW_STATUSES.COMPLETED]: { label: "Completed", bg: "#d1fae5", color: "#065f46", dot: "#10b981", icon: "OK" },
 [WORKFLOW_STATUSES.PENDING]: { label: "Pending", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b", icon: "P" },
 [WORKFLOW_STATUSES.WAITING]: { label: "Waiting", bg: "#f1f5f9", color: "#475569", dot: "#94a3b8", icon: "W" },
 [WORKFLOW_STATUSES.REJECTED]: { label: "Rejected", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444", icon: "R" },
 [WORKFLOW_STATUSES.SKIPPED]: { label: "Skipped", bg: "#f1f5f9", color: "#64748b", dot: "#cbd5e1", icon: "S" },
 [WORKFLOW_STATUSES.DRAFT]: { label: "Draft", bg: "#f1f5f9", color: "#475569", dot: "#94a3b8", icon: "D" },
 };
 return map[normalized] || { label: clean(status) || "Waiting", bg: "#f1f5f9", color: "#475569", dot: "#94a3b8", icon: "W" };
};

export const workflowSourceFrom = (source = {}) =>
 source.workflow ||
 source.workflowData ||
 source.workflow_data ||
 source.approvalWorkflow ||
 source.approval_workflow ||
 source.reviewWorkflow ||
 source.review_workflow ||
 source.payload?.workflow ||
 source.payload?.workflowData ||
 source.payload?.approvalWorkflow ||
 source.form?.workflow ||
 source.form?.workflowData ||
 null;

export const normalizeWorkflowSteps = (steps = []) =>{
 if (!Array.isArray(steps)) return [];
 return steps
 .map((step, index) =>({
  ...step,
  stepNo: Number(step.stepNo ?? step.step_no ?? step.order ?? index + 1) || index + 1,
  designation: clean(step.designation || step.approverDesignation || step.approver_designation || step.roleDesignation || step.label || step.name) || `Level ${index + 1}`,
  status: normalizeWorkflowStatus(step.status),
  remarks: clean(step.remarks || step.comment || step.reviewRemarks || step.review_remarks),
  reviewedAt: clean(step.reviewedAt || step.reviewed_at || step.completedAt || step.completed_at || step.updatedAt || step.updated_at),
 }))
 .sort((a, b) =>a.stepNo - b.stepNo);
};

export const normalizeApprovalWorkflow = (source = {}, options = {}) =>{
 const rawWorkflow = Array.isArray(source) ? { steps: source } : (source || {});
 const steps = normalizeWorkflowSteps(rawWorkflow.approvalSteps || rawWorkflow.approval_steps || rawWorkflow.steps || rawWorkflow.workflowSteps || rawWorkflow.workflow_steps || []);
 const workflowStatus = normalizeWorkflowStatus(rawWorkflow.status || options.status || "");
 const firstPending = steps.find((step) =>normalizeWorkflowStatus(step.status) === WORKFLOW_STATUSES.PENDING);
 const currentStep = Number(rawWorkflow.currentStep ?? rawWorkflow.current_step ?? firstPending?.stepNo ?? 0) || 0;
 const includeInitial = options.includeInitial !== false;
 const initialDesignation = clean(options.initialDesignation) || "Staff";
 const initialStatus = steps.length && steps.every((step) =>normalizeWorkflowStatus(step.status) === WORKFLOW_STATUSES.WAITING)
 ? WORKFLOW_STATUSES.DRAFT
 : WORKFLOW_STATUSES.APPROVED;
 const displaySteps = includeInitial
 ? [{ stepNo: 0, designation: initialDesignation, status: initialStatus, isInitial: true }, ...steps]
 : steps;

 return {
  workflowId: rawWorkflow.workflowId ?? rawWorkflow.workflow_id ?? options.workflowId ?? null,
  workflowName: clean(rawWorkflow.workflowName || rawWorkflow.workflow_name || options.workflowName),
  currentStep,
  status: workflowStatus,
  steps: displaySteps,
  approvalSteps: steps,
 };
};

export const currentWorkflowStep = (workflow = {}) =>
 (workflow.steps || []).find((step) =>normalizeWorkflowStatus(step.status) === WORKFLOW_STATUSES.PENDING) ||
 (workflow.steps || []).find((step) =>Number(step.stepNo) === Number(workflow.currentStep)) ||
 null;

export const isWorkflowComplete = (workflow = {}) =>{
 const steps = workflow.approvalSteps || workflow.steps || [];
 return steps.length >0 && steps.every((step) =>
  [WORKFLOW_STATUSES.APPROVED, WORKFLOW_STATUSES.COMPLETED, WORKFLOW_STATUSES.SKIPPED].includes(normalizeWorkflowStatus(step.status))
 );
};
