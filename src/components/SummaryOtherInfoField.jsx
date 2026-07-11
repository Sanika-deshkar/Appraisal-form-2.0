export const SUMMARY_OTHER_INFO_LABEL = "Any other information not covered above";

export const summaryOtherInfoValueFrom = (source = {}) => {
  const candidates = [
    source.summaryOtherInfo,
    source.form?.summaryOtherInfo,
    source.payload?.form?.summaryOtherInfo,
    source.payload?.summaryOtherInfo,
    source.declaration?.summaryOtherInfo,
  ];

  for (const value of candidates) {
    if (String(value ?? "").trim()) return value;
  }

  return candidates.find((value) => value != null) ?? "";
};

export default function SummaryOtherInfoField({
  value = "",
  onChange,
  readOnly = false,
  rows = 4,
}) {
  return (
    <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
      <span style={{ color: "#334155", fontSize: 12, fontWeight: 800 }}>
        {SUMMARY_OTHER_INFO_LABEL}
      </span>
      <textarea
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        rows={rows}
        placeholder="Enter any additional information you want to include with this appraisal..."
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "10px 12px",
          color: "#0f172a",
          background: readOnly ? "#f8fafc" : "#fff",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: 1.5,
          resize: "vertical",
        }}
      />
    </label>
  );
}
