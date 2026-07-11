import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { normalizeRole } from "../auth/session";
import { departmentHasHod, getDeanTrack } from "../utils/hierarchy";
import { DEAN_TRACKS, getSchoolKey, isCisrSchool, normalizeHierarchyText } from "../constants/universityHierarchy";
import { FORM_TYPES, formTypeForSchool } from "../constants/formRouting";

// Each dashboard is its own async chunk - only the one matching the user's role
// is ever downloaded, cutting the initial JS payload by ~90% vs eager imports.
const Dashboard                 = lazy(() => import("./Dashboard"));
const HODDashboard              = lazy(() => import("./HODDashboard"));
const CISRFacultyDashboard      = lazy(() => import("./CISRFacultyDashboard"));
const CISRCenterHeadDashboard   = lazy(() => import("./CISRCenterHeadDashboard"));
const NonTeachingStaffDashboard = lazy(() => import("./NonTeachingStaffDashboard"));
const ReportingOfficerDashboard = lazy(() => import("./ReportingOfficerDashboard"));
const RegistrarDashboard        = lazy(() => import("./RegistrarDashboard"));
const DeanDashboard             = lazy(() => import("./DeanDashboard"));
const NonEngineeringDeanDashboard = lazy(() => import("./NonEngineeringDeanDashboard"));
const DirectorDashboard         = lazy(() => import("./DirectorDashboard"));
const VCDashboard               = lazy(() => import("./VCDashboard"));
const MediaCommDashboard        = lazy(() => import("./MediaCommDashboard"));
const DesignArtsDashboard       = lazy(() => import("./DesignArtsDashboard"));

function DashboardLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", color: "#64748b", fontSize: 14 }} className="fa-fade-in">
      Loading dashboard...
    </div>
  );
}

function UnknownSchoolDashboard() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", fontFamily: "Georgia, serif", padding: 24 }}>
      <div style={{ maxWidth: 520, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 24, color: "#0f172a" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>School not recognized</h2>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
          Your profile does not have a valid school assigned. Please update your profile with one of the university schools before opening the appraisal workflow.
        </p>
      </div>
    </div>
  );
}

// Inner component: pure routing switch, all branches are lazy dashboard chunks.
function DashboardSwitch({ role, school, department, formType }) {
  switch (role) {
    case "faculty":
      if (isCisrSchool(school)) return <CISRFacultyDashboard />;
      if (formType === FORM_TYPES.MEDIA_COMM) return <MediaCommDashboard fixedRole="faculty" />;
      if (formType === FORM_TYPES.DESIGN_ARTS) return <DesignArtsDashboard fixedRole="faculty" />;
      if (!formType) return <UnknownSchoolDashboard />;
      return <Dashboard />;

    case "center_head":
      if (!isCisrSchool(school)) return <UnknownSchoolDashboard />;
      return <CISRCenterHeadDashboard />;

    case "hod": {
      if (!formType) return <UnknownSchoolDashboard />;
      const hasHod = departmentHasHod(school, department);
      if (!hasHod) return <DirectorDashboard />;
      return <HODDashboard />;
    }

    case "director":
      if (formType === FORM_TYPES.MEDIA_COMM) return <MediaCommDashboard fixedRole="director" />;
      if (formType === FORM_TYPES.DESIGN_ARTS) return <DesignArtsDashboard fixedRole="director" />;
      if (!formType) return <UnknownSchoolDashboard />;
      return <DirectorDashboard />;

    case "dean": {
      const deanTrack = getDeanTrack({ school, department, designation: sessionStorage.getItem("designation") || "" });
      const deanDivisionSchool = ["engineering", "non engineering", "nonengineering"].includes(normalizeHierarchyText(school));
      if (!formType && !deanDivisionSchool) return <UnknownSchoolDashboard />;
      if (deanTrack === DEAN_TRACKS.NON_ENGINEERING) return <NonEngineeringDeanDashboard />;
      return <DeanDashboard />;
    }

    case "vc":
      return <VCDashboard />;

    case "registrar":
      return <RegistrarDashboard />;

    case "reporting_officer":
      return <ReportingOfficerDashboard />;

    case "non_teaching_staff":
      return <NonTeachingStaffDashboard />;

    default:
      return <Navigate to="/login" />;
  }
}

export default function RoleDashboard() {
  const role       = normalizeRole(sessionStorage.getItem("role"), "");
  const school     = sessionStorage.getItem("school") || "";
  const department = sessionStorage.getItem("department") || "";
  const formType   = formTypeForSchool(getSchoolKey(school));

  sessionStorage.setItem("role", role);

  return (
    <Suspense fallback={<DashboardLoader />}>
      <DashboardSwitch role={role} school={school} department={department} formType={formType} />
    </Suspense>
  );
}
