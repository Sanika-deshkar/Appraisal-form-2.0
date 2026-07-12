export default function SectionShell({ title, children, accent }) {
 return (
<section style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: `3px solid ${accent}`, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
<div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 12 }}>
<div style={{ fontWeight: 800, color: accent, fontSize: 13 }}>{title}</div>
</div>
<div style={{ padding: 12 }}>{children}</div>
</section>
 );
}
