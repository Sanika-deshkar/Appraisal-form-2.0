/**
 * Shared React components used across multiple dashboard pages.
 *
 * - RO               — read-only text cell (shows faculty-entered data)
 * - TI               — free-text / numeric input cell (self-appraisal editing)
 * - WorkflowStatusTracker — approval-chain progress strip (faculty dashboard)
 *
 * Import from here instead of redefining in each dashboard file.
 */
import { useRef, useState } from "react";
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
export function RO({ val, value, center, placeholder }) {
  const actualVal = val !== undefined ? val : value;
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: "inherit",
        color: actualVal ? "#1e293b" : "#94a3b8",
        display: "block",
        textAlign: center ? "center" : "left",
      }}
    >
      {actualVal || (placeholder ? <span style={{ color: "#94a3b8" }}>{placeholder}</span> : <span style={{ color: "#cbd5e1" }}>-</span>)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TI — text / numeric input cell used in self-appraisal sections
// ---------------------------------------------------------------------------
export function TI({
  val,
  value,
  type,
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
  const actualVal = val !== undefined ? val : value;
  const isNumeric = numeric || type === "number" || type === "numeric";
  const isInteger = integer || type === "integer";

  const [textErr, setTextErr] = useState(false);
  const [showFullValue, setShowFullValue] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);
  const displayValue = String(actualVal ?? "");
  const canShowFullValue = displayValue.trim().length > 35;

  const openFullValuePreview = () => {
    if (!canShowFullValue || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPreviewPosition({
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 360),
    });
    setShowFullValue(true);
  };

  const handleChange = (e) => {
    if (readOnly) return;
    let v = e.target.value;
    if (isInteger) {
      v = v.replace(/[^0-9]/g, "");
    } else if (isNumeric) {
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
    if (isNumeric && max !== undefined && trimmed !== "") {
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
    height: 38,
    boxSizing: "border-box",
    border: textErr ? "1.5px solid #ef4444" : "1.25px solid #d8deea",
    borderRadius: 5,
    padding: "8px 12px",
    fontSize: 13,
    lineHeight: 1.25,
    fontFamily: "inherit",
    outline: "none",
    background: readOnly ? "#f9fafb" : "#fcfdff",
    color: "#111827",
    fontWeight: isNumeric || center ? 700 : 500,
    boxShadow: readOnly ? "none" : "inset 0 1px 0 rgba(17,24,39,0.03), 0 1px 2px rgba(17,24,39,0.04)",
  };

  return (
    <div
      className="appraisal-input-preview-wrap"
      style={{ position: "relative", width: "100%" }}
      onMouseEnter={openFullValuePreview}
      onMouseLeave={() => setShowFullValue(false)}
    >
      <input
        ref={inputRef}
        value={actualVal ?? ""}
        disabled={readOnly}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={openFullValuePreview}
        onBlurCapture={() => setShowFullValue(false)}
        placeholder={placeholder || ""}
        title={displayValue}
        inputMode={isInteger ? "numeric" : isNumeric ? "decimal" : undefined}
        style={center ? { ...baseStyle, textAlign: "center" } : baseStyle}
      />
      {showFullValue && (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: previewPosition.top,
            left: Math.max(12, previewPosition.left),
            transform: "none",
            width: "max-content",
            maxWidth: 340,
            minWidth: 220,
            background: "#fff",
            color: "#111827",
            border: "1px solid #dbe3ff",
            borderRadius: 8,
            padding: "9px 11px",
            fontSize: 12,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            boxShadow: "0 16px 38px rgba(17,24,39,0.14)",
          }}
        >
          {displayValue}
        </div>
      )}
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
        className="appraisal-info-banner"
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: "18px 24px",
          fontSize: 13,
          color: "#374151",
          boxShadow: "0 12px 34px rgba(17,24,39,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", background: "#eef2ff", color: "#4338ca", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0, fontSize: 16 }}>i</span>
        <span>Submit the appraisal to see the approval route and live authority status here.</span>
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
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "20px 24px",
        boxShadow: "0 12px 34px rgba(17,24,39,0.07)",
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
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
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
          gridTemplateColumns: `repeat(${authoritySteps.length + 1}, minmax(160px, 1fr))`,
          gap: 12,
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
                borderRadius: 16,
                padding: "14px 15px",
                minHeight: 98,
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
