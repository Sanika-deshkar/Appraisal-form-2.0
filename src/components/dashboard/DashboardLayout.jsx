import { useNavigate } from "react-router-dom";
import { LogoutConfirmModal } from "./dashboardPrimitives";

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
