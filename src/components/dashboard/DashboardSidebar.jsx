import { useNavigate } from "react-router-dom";
import { Avatar } from "./dashboardPrimitives";

export default function DashboardSidebar({
  appInfo,
  navItems,
  activeTab,
  onTabSelect,
  showSectionSelector = false,
  sectionTab = "partA",
  onSectionChange,
  isSectionOpen = () => true,
  afterNavItem,
  afterNav,
  profileSubtitle,
  onLogout,
  showLogoutSpacer = false,
}) {
  const navigate = useNavigate();

  return (
    <aside style={{ width: 252, height: "100vh", minHeight: "100vh", boxSizing: "border-box", overflow: "hidden", background: "#0f172a", display: "flex", flexDirection: "column", padding: "22px 16px", gap: 14, position: "sticky", top: 0, alignSelf: "flex-start", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "2px 0 16px rgba(15,23,42,0.14)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>FA</div>
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>{appInfo.PORTAL_NAME}</div>
          <div style={{ color: "#475569", fontSize: 9, lineHeight: 1.3 }}>{appInfo.UNIVERSITY_NAME}</div>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

      {navItems.map((tab) => {
        const button = (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "guidelines") {
                window.open("/faculty-appraisal-guidelines.pdf", "_blank");
                return;
              }
              onTabSelect?.(tab.id);
            }}
            style={{ background: activeTab === tab.id ? "rgba(99,102,241,0.18)" : "transparent", border: "none", borderRadius: 8, padding: "10px 11px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, width: "100%", fontFamily: "inherit", transition: "background 0.15s" }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12 }}>{tab.label}</div>
              <div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>{tab.sub}</div>
            </div>
            {tab.badge > 0 && (
              <div style={{ background: "#f59e0b", color: "#fff", fontWeight: 800, fontSize: 10, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{tab.badge}</div>
            )}
          </button>
        );

        if (afterNavItem?.id === tab.id) {
          return (
            <div key={tab.id} style={afterNavItem.wrapperStyle || { display: "grid", gap: 10 }}>
              {button}
              {afterNavItem.content}
            </div>
          );
        }

        return button;
      })}

      {afterNav}

      {showSectionSelector && (
        <div style={{ marginTop: 6, background: "#1e293b", borderRadius: 8, padding: "9px 10px" }}>
          <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>
            My Appraisal Section
          </div>
          <select
            value={sectionTab}
            onChange={(event) => onSectionChange?.(event.target.value)}
            style={{ width: "100%", border: "1px solid #334155", borderRadius: 7, padding: "7px 8px", fontSize: 12, fontFamily: "inherit", color: "#e2e8f0", background: "#0f172a", outline: "none" }}
          >
            <option value="partA">Part A</option>
            <option value="partB" disabled={!isSectionOpen("partB")}>Part B</option>
            <option value="summary" disabled={!isSectionOpen("summary")}>Summary</option>
          </select>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
      <button
        type="button"
        onClick={() => navigate("/edit-profile")}
        title="Edit profile"
        style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      >
        <Avatar initials={(sessionStorage.getItem("name") || "U").split(" ").map((name) => name[0]).join("").toUpperCase()} color="#6366f1" size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700 }}>{(sessionStorage.getItem("name") || "User").split(" ").slice(0, 2).join(" ")}</div>
          <div style={{ color: "#475569", fontSize: 9 }}>{profileSubtitle}</div>
        </div>
      </button>
      <div style={{ margin: "8px 0", padding: "10px 12px", background: "rgba(37,99,235,0.15)", border: "1px solid #2563eb", borderRadius: 8 }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>For any queries</div>
        <a href="mailto:appraisal@dypiu.ac.in" style={{ color: "#60a5fa", fontWeight: 600, fontSize: 11, wordBreak: "break-all", textDecoration: "none" }}>appraisal@dypiu.ac.in</a>
      </div>
      <button
        onClick={onLogout}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: "none", border: "1px solid #374151", borderRadius: 8, padding: "9px 11px", cursor: "pointer", fontFamily: "inherit" }}
        onMouseEnter={(event) => { event.currentTarget.style.background = "#1e293b"; }}
        onMouseLeave={(event) => { event.currentTarget.style.background = "none"; }}
      >
        {showLogoutSpacer && <span style={{ fontSize: 15 }}></span>}
        <span style={{ color: "#f87171", fontWeight: 700, fontSize: 12 }}>Logout</span>
      </button>
    </aside>
  );
}
