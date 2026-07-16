import { useNavigate } from "react-router-dom";
import { Avatar } from "./dashboardPrimitives";

function SidebarIcon({ id, active }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  const color = active ? "#fff" : "#cbd5e1";

  if (id === "guidelines") {
    return (
      <svg {...common} style={{ color }}>
        <path d="M4 19.5V5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-1.5Z" />
        <path d="M13 3h5a2 2 0 0 1 2 2v14.5A2 2 0 0 0 18 18h-5V3Z" />
      </svg>
    );
  }

  if (id?.includes("review") || id?.includes("faculty")) {
    return (
      <svg {...common} style={{ color }}>
        <path d="M8 4h8l2 2v14H6V4h2Z" />
        <path d="M9 10h6" />
        <path d="M9 14h4" />
        <path d="M16 4v3h3" />
      </svg>
    );
  }

  return (
    <svg {...common} style={{ color }}>
      <path d="M7 3h7l3 3v15H7V3Z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

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
    <aside className="appraisal-sidebar" style={{ width: 260, height: "100vh", minHeight: "100vh", boxSizing: "border-box", overflow: "hidden", background: "#111827", display: "flex", flexDirection: "column", padding: "22px 16px", gap: 14, position: "sticky", top: 0, alignSelf: "flex-start", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)", boxShadow: "12px 0 40px rgba(17,24,39,0.30)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#5b5ceb,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 13, boxShadow: "0 10px 22px rgba(91,92,235,0.34)" }}>FA</div>
        <div>
          <div style={{ color: "#f9fafb", fontWeight: 800, fontSize: 13, lineHeight: 1.15 }}>{appInfo.PORTAL_NAME}</div>
          <div style={{ color: "#9ca3af", fontSize: 10, lineHeight: 1.25, marginTop: 3 }}>{appInfo.UNIVERSITY_NAME}</div>
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
            className={activeTab === tab.id ? "is-active" : ""}
            style={{ background: activeTab === tab.id ? "linear-gradient(135deg,rgba(91,92,235,0.95),rgba(79,70,229,0.72))" : "transparent", border: "1px solid transparent", borderRadius: 14, padding: "11px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, width: "100%", fontFamily: "inherit", transition: "background 0.15s" }}
          >
            <span style={{ width: 30, height: 30, borderRadius: 9, background: activeTab === tab.id ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
              <SidebarIcon id={tab.id} active={activeTab === tab.id} />
            </span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: "#f9fafb", fontWeight: 800, fontSize: 12 }}>{tab.label}</div>
              <div style={{ color: activeTab === tab.id ? "#e0e7ff" : "#9ca3af", fontSize: 10.5, marginTop: 3, lineHeight: 1.32 }}>{tab.sub}</div>
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
        <div style={{ marginTop: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 13px" }}>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
            My Appraisal Section
          </div>
          <select
            value={sectionTab}
            onChange={(event) => onSectionChange?.(event.target.value)}
            style={{ width: "100%", height: 40, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 11, padding: "0 11px", fontSize: 12, fontFamily: "inherit", color: "#f9fafb", background: "#1f2937", outline: "none", fontWeight: 700 }}
          >
            <option value="partA">Part A</option>
            <option value="partB" disabled={!isSectionOpen("partB")}>Part B</option>
            <option value="partC" disabled={!isSectionOpen("partC")}>Part C</option>
            <option value="partD" disabled={!isSectionOpen("partD")}>Part D</option>
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
        style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 12, width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
      >
        <Avatar initials={(sessionStorage.getItem("name") || "U").split(" ").map((name) => name[0]).join("").toUpperCase()} color="#6d28d9" size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#f9fafb", fontSize: 12, fontWeight: 800 }}>{(sessionStorage.getItem("name") || "User").split(" ").slice(0, 2).join(" ")}</div>
          <div style={{ color: "#9ca3af", fontSize: 10.5, marginTop: 2 }}>{profileSubtitle}</div>
        </div>
      </button>
      <div style={{ margin: "7px 0", padding: "12px 13px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14 }}>
        <div style={{ color: "#f9fafb", fontWeight: 800, fontSize: 12, marginBottom: 4 }}>Need Help?</div>
        <a href="mailto:appraisal@dypiu.ac.in" style={{ color: "#93c5fd", fontWeight: 700, fontSize: 11, wordBreak: "break-all", textDecoration: "none" }}>appraisal@dypiu.ac.in</a>
      </div>
      <button
        onClick={onLogout}
        style={{ width: "100%", minHeight: 44, display: "flex", alignItems: "center", gap: 9, background: "none", border: "1px solid rgba(239,68,68,0.45)", borderRadius: 12, padding: "10px 13px", cursor: "pointer", fontFamily: "inherit" }}
        onMouseEnter={(event) => { event.currentTarget.style.background = "#1e293b"; }}
        onMouseLeave={(event) => { event.currentTarget.style.background = "none"; }}
      >
        {showLogoutSpacer && <span style={{ fontSize: 15 }}></span>}
        <span style={{ color: "#f87171", fontWeight: 800, fontSize: 11.5 }}>Logout</span>
      </button>
    </aside>
  );
}
