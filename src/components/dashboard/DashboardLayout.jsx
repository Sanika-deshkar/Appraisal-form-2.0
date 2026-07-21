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

  const normalizeCycleValue = (cycle) => {
    if (!cycle) return "";
    if (typeof cycle === "string") return cycle;
    return cycle?.academic_year || cycle?.academicYear || cycle?.year || cycle?.year_label || "";
  };

  try {
    const parsedCycles = JSON.parse(sessionStorage.getItem("availableCycles") || "[]");
    if (Array.isArray(parsedCycles)) {
      parsedCycles.forEach((cycle) => {
        addOption(normalizeCycleValue(cycle));
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
