import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_INFO } from "../../constants/formConfig";
import { LogoutConfirmModal } from "./dashboardPrimitives";

const readAcademicYearOptions = () => {
  const storedAcademicYear = sessionStorage.getItem("academicYear") || APP_INFO.DEFAULT_AY;
  const options = [];
  const seen = new Set();

  const addOption = (value) => {
    const academicYear = String(value || "").trim();
    if (!academicYear || seen.has(academicYear)) {
      return;
    }
    seen.add(academicYear);
    options.push(academicYear);
  };

  addOption("2025-2026");
  addOption("2026-2027");

  try {
    const parsedCycles = JSON.parse(sessionStorage.getItem("availableCycles") || "[]");
    if (Array.isArray(parsedCycles)) {
      parsedCycles.forEach((cycle) => {
        const academicYear = typeof cycle === "string" ? cycle : cycle?.academic_year || cycle?.year;
        addOption(academicYear);
      });
    }
  } catch {
    // Ignore invalid stored cycles and fall back to the current selection.
  }

  addOption(storedAcademicYear);

  const selectedAcademicYear = options.includes(storedAcademicYear) ? storedAcademicYear : APP_INFO.DEFAULT_AY;

  return { selectedAcademicYear, options };
};

export default function DashboardLayout({
  children,
  sidebar,
  appInfo,
  showLogoutModal,
  onCancelLogout,
  onAfterLogout,
  containerStyle,
  mainStyle,
}) {
  const navigate = useNavigate();
  const [academicYearState, setAcademicYearState] = useState(() => readAcademicYearOptions());

  useEffect(() => {
    const syncAcademicYear = () => {
      setAcademicYearState(readAcademicYearOptions());
    };

    window.addEventListener("academicYearChanged", syncAcademicYear);
    return () => window.removeEventListener("academicYearChanged", syncAcademicYear);
  }, []);

  const handleAcademicYearChange = (event) => {
    const nextAcademicYear = event.target.value;
    sessionStorage.setItem("academicYear", nextAcademicYear);
    setAcademicYearState({ selectedAcademicYear: nextAcademicYear, options: academicYearState.options.includes(nextAcademicYear) ? academicYearState.options : [nextAcademicYear, ...academicYearState.options] });
    window.dispatchEvent(new CustomEvent("academicYearChanged", { detail: { academicYear: nextAcademicYear } }));
  };

  const handleConfirmLogout = () => {
    onCancelLogout?.();
    sessionStorage.removeItem("user");
    sessionStorage.clear();
    if (onAfterLogout) {
      onAfterLogout();
      return;
    }
    navigate("/login", { replace: true });
  };

  return (
    <div style={containerStyle}>
      {sidebar}
      <main style={mainStyle}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #dbe3ef", borderRadius: 999, padding: "8px 12px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", fontSize: 13, color: "#334155", fontWeight: 600 }}>
            <span>Academic year</span>
            <select
              value={academicYearState.selectedAcademicYear}
              onChange={handleAcademicYearChange}
              style={{ border: "none", background: "transparent", outline: "none", color: "#0f172a", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
            >
              {academicYearState.options.map((academicYear) => (
                <option key={academicYear} value={academicYear}>
                  {academicYear}
                </option>
              ))}
            </select>
          </label>
        </div>
        {children}
      </main>

      {showLogoutModal && (
        <LogoutConfirmModal
          onCancel={onCancelLogout}
          onConfirm={handleConfirmLogout}
          portalName={appInfo.PORTAL_NAME}
        />
      )}
    </div>
  );
}
