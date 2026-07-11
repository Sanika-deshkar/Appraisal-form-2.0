const percent = (score, max) => Math.min(100, Math.round(((parseFloat(score) || 0) / (parseFloat(max) || 1)) * 100)) || 0;

export function Avatar({ initials, color = "#6366f1", size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}99)`, color: "#fff", fontWeight: 800, fontSize: size * 0.32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, letterSpacing: 0.5 }}>
      {initials}
    </div>
  );
}

export function ScoreBar({ score, max, color = "#6366f1" }) {
  return (
    <div style={{ width: "100%", background: "#f1f5f9", borderRadius: 4, height: 5, overflow: "hidden" }}>
      <div style={{ width: `${percent(score, max)}%`, height: "100%", background: color, borderRadius: 4, transition: "width .5s" }} />
    </div>
  );
}

export function CompactSummaryCard({ title, subtitle, totals, maxScores, accent = "#312e81", remarksTitle, remarksContent }) {
  const rows = [
    ["Part A", totals.partA, maxScores.partA, "#6366f1"],
    ["Part B", totals.partB, maxScores.partB, "#0ea5e9"],
    ["Total", totals.total, maxScores.grand, "#059669"],
  ];
  const hasRemarks = Boolean(remarksContent);

  return (
    <div style={{ background: "#fff", border: "1px solid #dbe3ef", borderRadius: 8, padding: 12, display: "grid", gridTemplateColumns: hasRemarks ? "minmax(300px, 0.95fr) minmax(280px, 1.05fr)" : "1fr", gap: 12, alignItems: "stretch", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "grid", gap: 9, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{title}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
          </div>
          <div style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}33`, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>
            {(parseFloat(totals.total) || 0).toFixed(1)} / {maxScores.grand}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {rows.map(([label, value, max, color]) => (
            <div key={label} style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 7, padding: "8px 9px", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>{label}</span>
                <span style={{ fontSize: 11, color, fontWeight: 900, whiteSpace: "nowrap" }}>{(parseFloat(value) || 0).toFixed(1)} / {max}</span>
              </div>
              <ScoreBar score={value} max={max} color={color} />
            </div>
          ))}
        </div>
      </div>
      {hasRemarks && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "9px 10px", minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: accent, fontSize: 12, marginBottom: 5 }}>{remarksTitle}</div>
          {remarksContent}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status = "Pending Review" }) {
  const map = {
    Submitted: { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    "Pending Review": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    "Pending HOD Review": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    "Pending Director Review": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    "Pending Dean Review": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    "Pending VC Review": { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    Reviewed: { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
    "HOD Reviewed": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    "Director Reviewed": { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
    "Director Approved": { bg: "#cffafe", color: "#164e63", dot: "#06b6d4" },
    "Dean Reviewed": { bg: "#ede9fe", color: "#5b21b6", dot: "#7c3aed" },
    "VC Reviewed": { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
    Rejected: { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
    "HOD Rejected": { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
    "Director Rejected": { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
    "Dean Rejected": { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
    "VC Rejected": { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
  };
  const resolved = status || "Pending Review";
  const s = map[resolved] || map["Pending Review"];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {resolved}
    </span>
  );
}

export function LogoutConfirmModal({ onCancel, onConfirm, portalName = "the portal", confirmLabel = "Yes, Logout" }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "grid", placeItems: "center" }} onClick={onCancel}>
      <div style={{ width: "min(380px, 92vw)", background: "#fff", borderRadius: 12, padding: "26px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", fontFamily: "inherit" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ color: "#0f172a", fontWeight: 900, fontSize: 17, marginBottom: 8 }}>Confirm Logout</div>
        <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>You are about to leave {portalName}. Any unsaved edits will be lost.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, border: "none", borderRadius: 8, background: "#f1f5f9", color: "#475569", padding: "10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, border: "none", borderRadius: 8, background: "#dc2626", color: "#fff", padding: "10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
