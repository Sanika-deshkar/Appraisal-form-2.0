import SC from "./SectionCard";

export default function FacultyInfoSection({ info }) {
 return (
<SC title="Faculty Information" accent="#6366f1">
<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
<tbody>
 {[["Name", info.name], ["Qualification", info.qual], ["Designation", info.desig], ["Academic Year", info.ay]].map(([label, val]) =>(
<tr key={label}>
<td style={{ padding: "6px 10px", background: "#f8fafc", fontWeight: 600, border: "1px solid #e2e8f0", width: "35%" }}>{label}</td>
<td style={{ padding: "5px 10px", border: "1px solid #e2e8f0", color: "#334155" }}>{val}</td>
</tr>
 ))}
</tbody>
</table>
</SC>
 );
}
