export default function PartB({ sections, SectionTable, sectionTableProps, sectionView }) {
 return (
<>
<div style={{ fontWeight: 900, color: "#134e4a", background: "#ccfbf1", padding: "9px 14px", borderRadius: 7, margin: sectionView === "all" ? "18px 0 12px" : "0 0 12px" }}>Part B - Research and Academic Contributions</div>
 {sections.map((section) =><SectionTable key={section.key} section={section} {...sectionTableProps} />)}
</>
 );
}
