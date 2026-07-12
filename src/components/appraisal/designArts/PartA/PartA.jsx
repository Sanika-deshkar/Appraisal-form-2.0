export default function PartA({ sections, SectionTable, InnovativeSection, sectionTableProps }) {
 return (
<>
<div style={{ fontWeight: 900, color: "#1e293b", background: "#fef3c7", padding: "9px 14px", borderRadius: 7, marginBottom: 12 }}>Part A - Teaching Process & Academic Activities</div>
 {sections.slice(0, 2).map((section) =><SectionTable key={section.key} section={section} {...sectionTableProps} />)}
<InnovativeSection {...sectionTableProps} />
 {sections.slice(2).map((section) =><SectionTable key={section.key} section={section} {...sectionTableProps} />)}
</>
 );
}
