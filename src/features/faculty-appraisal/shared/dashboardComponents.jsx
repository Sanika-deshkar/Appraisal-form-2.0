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
import { createPortal } from "react-dom";
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
import "./approvalFlow.css";
import { InlineSvgIcon, SUMMARY_ICONS } from "../components/summaryUi";

function HoverPreviewCard({ value, position }) {
  if (!value) return null;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: "fixed",
        zIndex: 99999,
        top: position.top,
        left: Math.max(12, position.left),
        width: "max-content",
        maxWidth: "min(360px, calc(100vw - 24px))",
        minWidth: 170,
        height: "auto",
        maxHeight: "min(280px, calc(100vh - 24px))",
        overflowY: "auto",
        background: "#fff",
        color: "#0f172a",
        border: "1px solid #dbe3ef",
        borderRadius: 8,
        padding: "9px 11px",
        fontSize: 12,
        fontWeight: 650,
        lineHeight: 1.45,
        textAlign: "left",
        whiteSpace: "normal",
        overflowWrap: "break-word",
        wordBreak: "normal",
        pointerEvents: "none",
        boxShadow: "0 14px 34px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -5,
          left: 18,
          width: 10,
          height: 10,
          background: "#fff",
          borderLeft: "1px solid #dbe3ef",
          borderTop: "1px solid #dbe3ef",
          transform: "rotate(45deg)",
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{value}</span>
    </div>,
    document.body
  );
}

function hasHiddenOverflow(element) {
  if (!element) return false;
  return (
    element.scrollWidth > element.clientWidth + 1 ||
    element.scrollHeight > element.clientHeight + 1
  );
}

// ---------------------------------------------------------------------------
// RO — read-only display cell
// ---------------------------------------------------------------------------
export function RO({ val, value, center, placeholder }) {
  const actualVal = val !== undefined ? val : value;
  const displayValue = String(actualVal || "");

  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: "inherit",
        color: actualVal ? "#1e293b" : "#94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        width: "100%",
        minHeight: 34,
        textAlign: center ? "center" : "left",
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "normal",
      }}
    >
      {displayValue || (placeholder ? <span style={{ color: "#94a3b8" }}>{placeholder}</span> : <span style={{ color: "#cbd5e1" }}>-</span>)}
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
  const textAreaRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const displayValue = String(actualVal ?? "");

  const showPreview = () => {
    const el = textAreaRef.current;
    if (!displayValue.trim() || !hasHiddenOverflow(el)) return;
    const rect = el.getBoundingClientRect();
    setPreview({ top: rect.bottom + 6, left: rect.left });
  };

  const handleChange = (e) => {
    if (readOnly) return;
    let v = e.target.value;
    if (isInteger) {
      v = v.replace(/[^0-9]/g, "");
      if (v !== "" && max !== undefined) {
        v = String(clampScore(v, max));
      }
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
    if ((isNumeric || isInteger) && max !== undefined && trimmed !== "") {
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
    minHeight: 38,
    boxSizing: "border-box",
    border: textErr ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    lineHeight: 1.25,
    fontFamily: "inherit",
    outline: "none",
    background: readOnly ? "#fafafa" : "#fff",
    color: "#1e293b",
    fontWeight: isNumeric || center ? 700 : 500,
    boxShadow: "none",
  };
  const textStyle = {
    ...baseStyle,
    height: 38,
    overflow: "hidden",
    resize: "none",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflowWrap: "normal",
    wordBreak: "keep-all",
  };

  return (
    <div
      className="appraisal-input-preview-wrap"
      style={{ position: "relative", width: "100%", minHeight: 38, display: "flex", alignItems: "center" }}
    >
      {isNumeric ? (
        <input
          value={actualVal ?? ""}
          disabled={readOnly}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || ""}
          aria-label={displayValue || placeholder || "Appraisal field"}
          inputMode={isInteger ? "numeric" : "decimal"}
          style={center ? { ...baseStyle, height: 38, textAlign: "center" } : { ...baseStyle, height: 38 }}
        />
      ) : (
        <textarea
          ref={textAreaRef}
          value={actualVal ?? ""}
          disabled={readOnly}
          onChange={handleChange}
          onFocus={showPreview}
          onMouseEnter={showPreview}
          onMouseLeave={() => setPreview(null)}
          onBlur={(event) => {
            setPreview(null);
            handleBlur(event);
          }}
          placeholder={placeholder || ""}
          aria-label={displayValue || placeholder || "Appraisal field"}
          rows={1}
          wrap="off"
          style={center ? { ...textStyle, textAlign: "center" } : textStyle}
        />
      )}
      {!isNumeric && preview && <HoverPreviewCard value={displayValue} position={preview} />}
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
export function WorkflowStatusTracker({ declaration, reviews, profile, showPartD = false }) {
  const chain = getReviewChain(profile);
  const status = declaration?.status || "";
  const reviewList = reviewListFrom(reviews);
  const reviewByRole = new Map(reviewList.map((review) => [review.reviewer_role, review]));
  const rejected = hasActiveRejection(declaration, reviews);
  const partDStatus = String(declaration?.part_d_status || declaration?.partDStatus || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  const registrarReview = reviewList.find((review) => review.reviewer_role === "registrar");
  const partDReleased = ["released", "released to vc"].includes(partDStatus);
  const partDLabel = partDReleased
    ? "Released to VC"
    : ["registrar approved pending release", "reviewed", "registrar reviewed"].includes(partDStatus)
      ? "Reviewed - awaiting release"
      : ["pending", "pending registrar", "pending registrar review"].includes(partDStatus)
        ? "Pending Registrar"
        : "Status unavailable";
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
    Submitted: { emoji: "📤", bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd", chip: "#dbeafe" },
    Pending:   { emoji: "⏳", bg: "#fffbeb", color: "#92400e", border: "#fcd34d", chip: "#fef3c7" },
    Approved:  { emoji: "✅", bg: "#ecfdf5", color: "#166534", border: "#86efac", chip: "#dcfce7" },
    Rejected:  { emoji: "⚠️", bg: "#fef2f2", color: "#991b1b", border: "#fca5a5", chip: "#fee2e2" },
    Waiting:   { emoji: "🕒", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", chip: "#f1f5f9" },
    Stopped:   { emoji: "⛔", bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0", chip: "#f1f5f9" },
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
    icon: "send",
    label: "Faculty Submission",
    state: "Submitted",
    timestamp: declaration.submitted_at,
  };

  const authoritySteps = chain.map((role) => {
    const review = reviewByRole.get(role);
    return {
      label: roleLabel(role),
      icon: ({ hod: "user", director: "building", dean: "book", vc: "building", center_head: "user" })[role] || "user",
      state: stepState(role),
      timestamp: review?.reviewed_at,
    };
  });

  return (
    <div
      className="appraisal-approval-tracker"
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
          display: showPartD ? "none" : "grid",
          gridTemplateColumns: `repeat(${authoritySteps.length + 1}, minmax(0, 1fr))`,
          gap: 16,
          overflowX: "visible",
          paddingBottom: 4,
        }}
      >
        {[submittedStep, ...authoritySteps].map((step, index, steps) => {
          const colors = stateStyle[step.state] || stateStyle.Waiting;
          const isLast = index === steps.length - 1;
          return (
            <div
              key={step.label}
              style={{
                border: `1px solid ${colors.border}`,
                background: `linear-gradient(180deg, ${colors.bg} 0%, #ffffff 100%)`,
                borderRadius: 18,
                padding: "10px 12px",
                minHeight: 84,
                boxShadow: "0 10px 24px rgba(15,23,42,0.07)",
                position: "relative",
                overflow: "visible",
              }}
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: -17,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    color: "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 900,
                    zIndex: 3,
                    boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
                  }}
                >
                  →
                </span>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 10,
                  color: colors.color,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: colors.chip,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.65)",
                  }}
                >
                  {colors.emoji}
                </span>
                <span>{step.state}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#0f172a", lineHeight: 1.18 }}>
                {step.label}
              </div>
              <div style={{ marginTop: 4, fontSize: 10, color: "#64748b", lineHeight: 1.25 }}>
                {step.timestamp
                  ? new Date(step.timestamp).toLocaleString()
                  : "No timestamp yet"}
              </div>
            </div>
          );
        })}
      </div>
      {showPartD && (
        <div className="approval-flow-scroll">
          <div className="approval-flow" aria-label="Submission branches to academic authorities and Registrar, then joins at VC">
            <FlowNode step={submittedStep} colors={stateStyle.Submitted} />
            <div className="approval-flow__branches">
              <div className="approval-flow__lane">
                {authoritySteps.filter((step) => step.label !== roleLabel("vc")).map((step) => (
                  <FlowNode key={step.label} step={step} colors={stateStyle[step.state] || stateStyle.Waiting} />
                ))}
                {authoritySteps.length === 1 && chain[0] === "vc" && (
                  <div className="approval-flow__direct" aria-label="Direct VC review" />
                )}
              </div>
              <div className="approval-flow__lane">
                <FlowNode step={{ label: "Registrar - Part D", icon: "calendar", state: partDLabel, timestamp: registrarReview?.reviewed_at }}
                  colors={partDReleased ? stateStyle.Approved : partDLabel === "Status unavailable" ? stateStyle.Waiting : stateStyle.Pending} />
              </div>
            </div>
            {authoritySteps.find((step) => step.label === roleLabel("vc")) && (
              <FlowNode step={authoritySteps.find((step) => step.label === roleLabel("vc"))}
                colors={stateStyle[stepState("vc")] || stateStyle.Waiting} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlowNode({ step, colors }) {
  return (
    <div className="approval-flow__node" style={{ background: colors.bg, borderColor: colors.border }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: colors.color }}>{step.state}</div>
      <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
        <span aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0, color: colors.color }}>
          <InlineSvgIcon paths={SUMMARY_ICONS[step.icon] || SUMMARY_ICONS.user} size={16} />
        </span>
        <span style={{ minWidth: 0 }}>{step.label}</span>
      </div>
      {step.timestamp && <div style={{ marginTop: 5, fontSize: 10, color: "#64748b" }}>{new Date(step.timestamp).toLocaleString()}</div>}
    </div>
  );
}
