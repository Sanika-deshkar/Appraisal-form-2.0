import { SectionInfoButton } from "../../../../features/faculty-appraisal/components/formPrimitives";
import { stripMaxMarksFromTitle } from "../../../../utils/appraisalFormUtils";

export default function SectionShell({ title, children, accent = "#4f46e5" }) {
  const displayTitle = stripMaxMarksFromTitle(title);

  return (
    <section className="fa-section-card appraisal-section-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 10px 28px rgba(17,24,39,0.06)", marginBottom: 20, overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <div className="appraisal-part-header" style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "linear-gradient(180deg,#ffffff 0%,#fbfbff 100%)" }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <span className="appraisal-part-icon" style={{ width: 32, height: 32, borderRadius: 8, background: "#e0e7ff", color: "#4338ca", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 3 7l9 4 9-4-9-4Z" />
              <path d="M5 10v5c2 2 12 2 14 0v-5" />
              <path d="M12 11v8" />
            </svg>
          </span>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1e1b4b", letterSpacing: 0, display: "flex", alignItems: "center" }}>
            <span>{displayTitle}</span>
            <SectionInfoButton titleText={title} />
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </section>
  );
}
