import { useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import { APP_INFO, MyAppraisalSection } from "../features/faculty-appraisal";

export default function Dashboard() {
  const [activeMainTab, setActiveMainTab] = useState("myAppraisal");
  const [appraisalSection, setAppraisalSection] = useState("partA");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { id: "myAppraisal", icon: "", label: "My Appraisal", sub: "View your self-appraisal form" },
    { id: "guidelines", icon: "", label: "Guidelines", sub: "Faculty appraisal guidelines AY 2025-26" },
  ];

  const handleSectionChange = (section) => {
    setAppraisalSection(section);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  return (
    <DashboardLayout
      appInfo={APP_INFO}
      showLogoutModal={showLogoutModal}
      onCancelLogout={() => setShowLogoutModal(false)}
      containerStyle={{ display: "flex", minHeight: "100vh", fontFamily: "inherit", background: "#f8fafc", color: "#1e293b" }}
      mainStyle={{ flex: 1, padding: "24px 30px", display: "flex", flexDirection: "column", gap: 18, overflowX: "auto" }}
      sidebar={(
        <DashboardSidebar
          appInfo={APP_INFO}
          navItems={navItems}
          activeTab={activeMainTab}
          onTabSelect={setActiveMainTab}
          showSectionSelector={activeMainTab === "myAppraisal"}
          sectionTab={appraisalSection}
          onSectionChange={handleSectionChange}
          profileSubtitle={`${sessionStorage.getItem("role") || "Faculty"} ${sessionStorage.getItem("department")?.split(" ")[0] || ""}`}
          onLogout={() => setShowLogoutModal(true)}
        />
      )}
    >
      {activeMainTab === "myAppraisal" && (
        <MyAppraisalSection
          sectionTab={appraisalSection}
          onSectionTabChange={handleSectionChange}
        />
      )}
    </DashboardLayout>
  );
}
