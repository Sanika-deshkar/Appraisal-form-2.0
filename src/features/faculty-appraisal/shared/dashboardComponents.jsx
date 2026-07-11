/**
 * Shared React components used across multiple dashboard pages.
 *
 * - RO               — read-only text cell (shows faculty-entered data)
 * - TI               — free-text / numeric input cell (self-appraisal editing)
 * - WorkflowStatusTracker — approval-chain progress strip (faculty dashboard)
 *
 * Import from here instead of redefining in each dashboard file.
 */
import { useState } from "react";
import { StatusBadge } from "../../../components/dashboard/dashboardPrimitives";
import {
  getReviewChain,
  hasActiveRejection,
  isRejectedStatus,
  pendingStatusFor,
  reviewListFrom,
  roleLabel,
} from "../../../utils/hierarchy";
import { clampScore } from "../../../utils/appraisalFormUtils";

// ---------------------------------------------------------------------------
// RO — read-only display cell
// ---------------------------------------------------------------------------
export function RO({ val, center }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: "inherit",
        color: "#1e293b",
        display: "block",
        textAlign: center ? "center" : "left",
      }}
    >
      {val || <span style={{ color: "#cbd5e1" }}>-</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TI — text / numeric input cell used in self-appraisal sections
// ---------------------------------------------------------------------------
export function TI({
  val,
  onChange,
  center,
  placeholder,
  readOnly = false,
  numeric = false,
  integer = false,
  textOnly = false,
  max,
  deferClampWhileTyping = false,
}) {
  const [textErr, setTextErr] = useState(false);

  const handleChange = (e) => {
    if (readOnly) return;
    let v = e.target.value;
    if (integer) {
      v = v.replace(/[^0-9]/g, "");
    } else if (numeric) {
      v = v
        .replace(/[^0-9.]/g, "")
        .replace(/^\./, "0.")
        .replace(/(\.\d*)\./g, "$1");
      if (
        v !== "" &&
        max !== undefined &&
        !(deferClampWhileTyping && v.endsWith("."))
      ) {
        v = String(clampScore(v, max));
      }
    }
    if (textOnly && textErr) setTextErr(false);
    onChange?.(v);
  };

  const handleBlur = (e) => {
    if (readOnly || !onChange) return;
    const trimmed = e.target.value.trim();
    if (numeric && max !== undefined && trimmed !== "") {
      onChange(String(clampScore(trimmed, max)));
    } else if (trimmed !== e.target.value) {
      onChange(trimmed);
    }
    if (textOnly && trimmed.length > 0 && /^[\d\s.,+\-/\\()[\]{}]+$/.test(trimmed)) {
      setTextErr(true);
    }
  };

  const baseStyle = {
    width: "100%",
    maxWidth: "100%",
    height: 30,
    boxSizing: "border-box",
    border: textErr ? "1.5px solid #ef4444" : "1px solid #d1d5db",
    borderRadius: 4,
    padding: "5px 6px",
    fontSize: 11,
    lineHeight: 1.25,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        value={val ?? ""}
        disabled={readOnly}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder || ""}
        inputMode={integer ? "numeric" : numeric ? "decimal" : undefined}
        style={center ? { ...baseStyle, textAlign: "center" } : baseStyle}
      />
      {textErr && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            fontSize: 9,
            color: "#ef4444",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          Text expected
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowStatusTracker — approval-chain strip shown on the faculty dashboard
// ---------------------------------------------------------------------------
export function WorkflowStatusTracker({ declaration, reviews, profile }) {
  const chain = getReviewChain(profile);
  const status = declaration?.status || "";
  const reviewList = reviewListFrom(reviews);
  const reviewByRole = new Map(reviewList.map((review) => [review.reviewer_role, review]));
  const rejected = hasActiveRejection(declaration, reviews);
  const nextRole = rejected
    ? null
    : chain.find((role) => !reviewByRole.has(role));

  const stepState = (role) => {
    const review = reviewByRole.get(role);
    if (review) return isRejectedStatus(review.status) ? "Rejected" : "Approved";
    if (status === pendingStatusFor(role)) return "Pending";
    return rejected ? "Stopped" : "Waiting";
  };

  const stateStyle = {
    Submitted: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
    Pending:   { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
    Approved:  { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    Rejected:  { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    Waiting:   { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    Stopped:   { bg: "#f1f5f9", color: "#94a3b8", border: "#e2e8f0" },
  };

  if (!declaration) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 9,
          padding: "12px 14px",
          fontSize: 12,
          color: "#475569",
        }}
      >
        Submit the appraisal to see the approval route and live authority status here.
      </div>
    );
  }

  const submittedStep = {
    label: "Faculty Submission",
    state: "Submitted",
    timestamp: declaration.submitted_at,
  };

  const authoritySteps = chain.map((role) => {
    const review = reviewByRole.get(role);
    return {
      label: roleLabel(role),
      state: stepState(role),
      timestamp: review?.reviewed_at,
    };
  });

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #dbeafe",
        borderRadius: 9,
        padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
            Approval Status Tracker
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {rejected
              ? "The approval chain has stopped because this submission was rejected."
              : nextRole
              ? `Next: ${roleLabel(nextRole)}`
              : "All approval stages are complete."}
          </div>
        </div>
        <StatusBadge status={rejected ? "Rejected" : nextRole ? "Pending Review" : "Reviewed"} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${authoritySteps.length + 1}, minmax(130px, 1fr))`,
          gap: 8,
          overflowX: "auto",
        }}
      >
        {[submittedStep, ...authoritySteps].map((step) => {
          const colors = stateStyle[step.state] || stateStyle.Waiting;
          return (
            <div
              key={step.label}
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                borderRadius: 8,
                padding: "10px 11px",
                minHeight: 88,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: colors.color,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {step.state}
              </div>
              <div style={{ marginTop: 5, fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                {step.label}
              </div>
              <div style={{ marginTop: 5, fontSize: 10, color: "#64748b" }}>
                {step.timestamp
                  ? new Date(step.timestamp).toLocaleString()
                  : "No timestamp yet"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
