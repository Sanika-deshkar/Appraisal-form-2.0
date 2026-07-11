// - HOD-editable score input -
import { clampScore } from "../utils/appraisalFormUtils";

export function HodInput({ val, onChange, max, disabled = false }) {
  return (
    <input
      type="number"
      min="0"
      step="0.5"
      value={val ?? ""}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
      style={{
        width: 58,
        height: 30,
        boxSizing: "border-box",
        textAlign: "center",
        border: "1.5px solid #6366f1",
        borderRadius: 5,
        padding: "5px 6px",
        fontSize: 11,
        fontFamily: "Georgia, serif",
        outline: "none",
        background: disabled ? "#f1f5f9" : "#f0f4ff",
        cursor: disabled ? "not-allowed" : "text",
      }}
    />
  );
}

