import { HodInput } from "../../Inputs";
import { clampScore } from "../../../features/faculty-appraisal";

export { HodInput };

export function DirectorInput({ val, onChange, max, disabled = false }) {
 return (
<input type="number" min="0" step="0.5" value={val ?? ""}
 max={max}
 disabled={disabled}
 onChange={e =>onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
 style={{ width: 58, textAlign: "center", border: "1.5px solid #0ea5e9", borderRadius: 5, padding: "3px 5px", fontSize: 11, fontFamily: "inherit", outline: "none", background: disabled ? "#f1f5f9" : "#f0fbff", cursor: disabled ? "not-allowed" : "text" }}
 />
 );
}
