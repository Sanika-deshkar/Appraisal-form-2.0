export default function PartB({ sections, SectionTable, B8SectionTable, sectionTableProps, sectionView }) {
 return (
<>
<div style={{ fontWeight: 900, color: "#134e4a", background: "#ccfbf1", padding: "9px 14px", borderRadius: 7, margin: sectionView === "all" ? "18px 0 12px" : "0 0 12px" }}>Part B - Research and Academic Contributions</div>
 {sections.map((section) =>(
 section.key === "fdps" || section.key === "training"
 ?<B8SectionTable key={section.key} section={section} {...sectionTableProps} showTotal={section.key === "training"} />
 :<SectionTable key={section.key} section={section} {...sectionTableProps} />
 ))}
</>
 );
}
