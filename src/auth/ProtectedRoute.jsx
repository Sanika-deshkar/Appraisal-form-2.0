import { Navigate } from "react-router-dom";
import { normalizeRole, VALID_ROLES } from "./session";

export default function ProtectedRoute({ children }) {
  const role = normalizeRole(sessionStorage.getItem("role"), "");

  if (!VALID_ROLES.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
