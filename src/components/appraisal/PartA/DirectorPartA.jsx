import DirectorLecturesTable from "./DirectorLecturesTable";
import DirectorCourseFileTable from "./DirectorCourseFileTable";
import DirectorInnovativeTeaching from "./DirectorInnovativeTeaching";
import DirectorProjects from "./DirectorProjects";
import DirectorQualification from "./DirectorQualification";
import DirectorStudentFeedback from "./DirectorStudentFeedback";
import DirectorDepartmentActivities from "./DirectorDepartmentActivities";
import DirectorUniversityActivities from "./DirectorUniversityActivities";
import DirectorSocietyContribution from "./DirectorSocietyContribution";
import DirectorIndustryConnect from "./DirectorIndustryConnect";
import DirectorACR from "./DirectorACR";

export default function DirectorPartA({ ctx }) {
 return (
<>
 {/* - PART A - */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#dbeafe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART A - Teaching & Academic Activities</div>
<DirectorLecturesTable ctx={ctx} />
<DirectorCourseFileTable ctx={ctx} />
<DirectorInnovativeTeaching ctx={ctx} />
<DirectorProjects ctx={ctx} />
<DirectorQualification ctx={ctx} />
<DirectorStudentFeedback ctx={ctx} />
<DirectorDepartmentActivities ctx={ctx} />
<DirectorUniversityActivities ctx={ctx} />
<DirectorSocietyContribution ctx={ctx} />
<DirectorIndustryConnect ctx={ctx} />
<DirectorACR ctx={ctx} />
</>
 );
}

