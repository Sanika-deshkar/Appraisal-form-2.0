import LecturesTable from "./LecturesTable";
import CourseFileTable from "./CourseFileTable";
import InnovativeTeaching from "./InnovativeTeaching";
import Projects from "./Projects";
import Qualification from "./Qualification";
import StudentFeedback from "./StudentFeedback";
import DepartmentActivities from "./DepartmentActivities";
import UniversityActivities from "./UniversityActivities";
import SocietyContribution from "./SocietyContribution";
import IndustryConnect from "./IndustryConnect";
import ACR from "./ACR";

export default function PartA({ ctx }) {
 return (
<>
 {/* - PART A - */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#dbeafe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART A - Teaching & Academic Activities</div>
<LecturesTable ctx={ctx} />
<CourseFileTable ctx={ctx} />
<InnovativeTeaching ctx={ctx} />
<Projects ctx={ctx} />
<Qualification ctx={ctx} />
<StudentFeedback ctx={ctx} />
<DepartmentActivities ctx={ctx} />
<UniversityActivities ctx={ctx} />
<SocietyContribution ctx={ctx} />
<IndustryConnect ctx={ctx} />
<ACR ctx={ctx} />
</>
 );
}

