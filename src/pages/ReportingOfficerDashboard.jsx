import { NonTeachingReviewDashboard } from "./NonTeachingStaffDashboard";

export default function ReportingOfficerDashboard() {
  return (
    <NonTeachingReviewDashboard
      reviewerRole="reporting_officer"
      title="Reporting Officer"
      subtitle="Non-teaching staff review"
      accent="#1d4ed8"
    />
  );
}

