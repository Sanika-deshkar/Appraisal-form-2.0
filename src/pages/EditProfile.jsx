import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_INFO } from "../constants/formConfig";
import {
  SCHOOL_OPTIONS,
  SOEMR_DEPARTMENTS,
  canonicalDepartmentValue,
  canonicalSchoolValue,
  isCisrSchool,
  isSoemrSchool,
  isValidSchool,
  isValidSoemrDepartment,
} from "../constants/universityHierarchy";
import { isNonTeachingRole } from "../constants/nonTeachingHierarchy";
import { buildProfilePayload, normalizeRole, storeUserSession } from "../auth/session";
import { updateProfile } from "../services/authService";
import {
  isValidPhone, isValidName, isValidEmployeeId, isValidExperience,
  sanitizeText, filterNumeric, filterPhone,
} from "../utils/validation";

// - Pseudo-class styles (hover / focus) injected once on mount -
const EP_CSS = `
  .ep-inp { transition: border-color .15s, box-shadow .15s; }
  .ep-inp:hover:not(:disabled) { border-color: #93c5fd; }
  .ep-inp:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,.10) !important; }
  .ep-cancel:hover { background: #f8fafc !important; border-color: #94a3b8 !important; color: #0f172a !important; }
  .ep-save:hover:not(:disabled) { background: #1d4ed8 !important; box-shadow: 0 4px 14px rgba(37,99,235,.35) !important; }
  .ep-save:active:not(:disabled) { transform: translateY(1px); }
  .ep-back:hover { color: #2563eb !important; }
  @media (max-width: 620px) { .ep-grid { grid-template-columns: 1fr !important; } }
`;

function CssInjector() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = EP_CSS;
    el.setAttribute("data-ep", "1");
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

// - Constants -
const ROLE_LABEL = {
  faculty: "Faculty",
  hod: "Head of Department",
  center_head: "Center Head",
  non_teaching_staff: "Non-Teaching Staff",
  reporting_officer: "Reporting Officer",
  registrar: "Registrar",
  director: "Director",
  dean: "Dean",
  vc: "Vice Chancellor",
};

const BASE_ROLE_OPTIONS = [
  { value: "faculty", label: "Faculty" },
  { value: "hod", label: "HOD" },
  { value: "center_head", label: "Center Head" },
  { value: "dean", label: "Dean" },
  { value: "director", label: "Director" },
  { value: "vc", label: "Vice Chancellor" },
  { value: "registrar", label: "Registrar" },
  { value: "reporting_officer", label: "Reporting Officer" },
  { value: "non_teaching_staff", label: "Non-Teaching Staff" },
];

const STAFF_TYPE_LABEL = { teaching: "Teaching", non_teaching: "Non-Teaching" };

const initialsFromName = (name = "") =>
  String(name || "U").trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";

// - Sub-components -
function SectionHead({ title, badge, badgeColor = "#64748b", badgeBack = "#f1f5f9" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>{title}</span>
      <span style={{ fontSize: 10, fontWeight: 700, background: badgeBack, color: badgeColor, borderRadius: 20, padding: "3px 10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {badge}
      </span>
    </div>
  );
}

function FrozenField({ label, value, wide }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ minHeight: 40, display: "flex", alignItems: "center", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "0 13px", fontSize: 13, color: value ? "#4b5563" : "#c4c9d4" }}>
        {value || "-"}
      </div>
    </div>
  );
}

function InputField({ label, required, hint, wide, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, ...(wide ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 10, color: "#9ca3af" }}>{hint}</span>}
    </label>
  );
}

// - Shared style tokens -
const CARD = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "24px 28px",
  boxShadow: "0 1px 3px rgba(15,23,42,.05), 0 4px 16px rgba(15,23,42,.04)",
};

const INP = {
  width: "100%",
  boxSizing: "border-box",
  height: 40,
  border: "1.5px solid #d1d5db",
  borderRadius: 8,
  padding: "0 13px",
  fontSize: 13,
  color: "#0f172a",
  fontFamily: "inherit",
  background: "#fff",
};

// - Main Component -
export default function EditProfile() {
  const navigate = useNavigate();
  const initialRole = normalizeRole(sessionStorage.getItem("role"), "faculty");
  const initialSchool = canonicalSchoolValue(sessionStorage.getItem("school"));
  const initialDepartment = isNonTeachingRole(initialRole)
    ? sessionStorage.getItem("department") || ""
    : canonicalDepartmentValue(sessionStorage.getItem("department"));

  const [formData, setFormData] = useState({
    staffType: isNonTeachingRole(initialRole) ? "non_teaching" : "teaching",
    email: sessionStorage.getItem("username") || "",
    name: sessionStorage.getItem("name") || "",
    employeeId: sessionStorage.getItem("employeeId") || "",
    designation: sessionStorage.getItem("designation") || "",
    qualification: sessionStorage.getItem("qualification") || "",
    experience: sessionStorage.getItem("experience") || "",
    phone: sessionStorage.getItem("phone") || "",
    school: initialSchool,
    department: initialDepartment,
    role: initialRole,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSchool = useMemo(() => canonicalSchoolValue(formData.school), [formData.school]);
  const selectedRole = normalizeRole(formData.role, "");
  const isNonTeaching = formData.staffType === "non_teaching";
  const requiresSchool = !isNonTeaching && selectedRole !== "vc";
  const schoolNeedsDepartment = isSoemrSchool(selectedSchool);
  const isCisr = isCisrSchool(selectedSchool);
  const needsDepartment = !isNonTeaching && schoolNeedsDepartment;
  const roleOptions = BASE_ROLE_OPTIONS.filter((role) => {
    const optionIsNonTeaching = isNonTeachingRole(role.value);
    if (isNonTeaching) return optionIsNonTeaching;
    if (optionIsNonTeaching) return false;
    if (role.value === "hod") return schoolNeedsDepartment;
    if (role.value === "center_head") return isCisr;
    if (isCisr && (role.value === "director" || role.value === "dean")) return false;
    return true;
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      if (name === "school") return { ...prev, school: value, role: "", department: "" };
      if (name === "experience") return { ...prev, experience: filterNumeric(value) };
      if (name === "phone") return { ...prev, phone: filterPhone(value) };
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formData.employeeId.trim()) { setError("Employee ID is required."); return; }
    if (!isValidEmployeeId(formData.employeeId)) { setError("Employee ID must be 2-30 characters and contain only letters, numbers, /, - or _."); return; }
    if (!formData.designation.trim()) { setError("Designation is required."); return; }
    if (formData.experience && !isValidExperience(formData.experience)) { setError("Experience must be a number between 0 and 80."); return; }
    if (formData.phone && !isValidPhone(formData.phone)) { setError("Please enter a valid phone number."); return; }

    setSaving(true);
    try {
      const email = String(formData.email || "").trim().toLowerCase();
      const role = normalizeRole(formData.role, "");
      const nonTeaching = formData.staffType === "non_teaching";
      const school = canonicalSchoolValue(formData.school);
      const department = nonTeaching
        ? String(formData.department || "").trim()
        : isSoemrSchool(school) ? canonicalDepartmentValue(formData.department) : "";

      const cleanFormData = {
        ...formData,
        email,
        name: sanitizeText(formData.name),
        employeeId: sanitizeText(formData.employeeId),
        designation: sanitizeText(formData.designation),
        qualification: sanitizeText(formData.qualification),
        experience: sanitizeText(formData.experience),
        phone: sanitizeText(formData.phone),
        role,
        school: nonTeaching ? "" : school,
        department,
      };
      const profilePayload = buildProfilePayload(cleanFormData, APP_INFO.DEFAULT_AY);
      const savedProfile = await updateProfile(profilePayload);
      storeUserSession({ profile: savedProfile || profilePayload, fallbackEmail: email });
      setMessage("Profile updated successfully.");
      setTimeout(() => navigate("/dashboard", { replace: true }), 450);
    } catch (err) {
      setError(err?.message || "Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initials = initialsFromName(formData.name);
  const roleLabel = ROLE_LABEL[formData.role] || "User";

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "inherit", color: "#0f172a" }}>
      <CssInjector />

      {/* - Sticky white navbar - */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(15,23,42,.06)" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: 0.5 }}>FA</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", lineHeight: 1.1 }}>{APP_INFO.PORTAL_NAME}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{APP_INFO.UNIVERSITY_NAME}</div>
            </div>
          </div>
          {/* Back link */}
          <button
            className="ep-back"
            onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "6px 0", transition: "color .15s" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Back to Dashboard
          </button>
        </div>
      </nav>

      {/* - Main content - */}
      <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* - Profile hero - */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 78, height: 78, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 24, letterSpacing: 1, boxShadow: "0 4px 18px rgba(99,102,241,.3)" }}>
              {initials}
            </div>
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "#22c55e", border: "2.5px solid #fff" }} />
          </div>
          {/* Name + tags */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {formData.name || "Your Profile"}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "3px 11px" }}>
                {roleLabel}
              </span>
              {formData.school && !isNonTeaching && (
                <span style={{ fontSize: 12, fontWeight: 500, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "3px 11px" }}>
                  {formData.school}
                </span>
              )}
              {formData.email && (
                <span style={{ fontSize: 12, color: "#64748b" }}>{formData.email}</span>
              )}
            </div>
          </div>
          {/* Divider line decoration */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
            <div style={{ width: 36, height: 3, borderRadius: 2, background: "linear-gradient(90deg,#6366f1,#2563eb)" }} />
            <div style={{ width: 24, height: 3, borderRadius: 2, background: "#bfdbfe" }} />
            <div style={{ width: 14, height: 3, borderRadius: 2, background: "#dbeafe" }} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* - Alerts - */}
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fff5f5", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 10, padding: "13px 16px", marginBottom: 22, fontSize: 13, lineHeight: 1.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}
          {message && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 10, padding: "13px 16px", marginBottom: 22, fontSize: 13, lineHeight: 1.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6L9 17l-5-5" /></svg>
              {message}
            </div>
          )}

          {/* - Card 1: Account Information (read-only) - */}
          <div style={CARD}>
            <SectionHead title="Account Information" badge="Read-only" badgeColor="#64748b" badgeBack="#f1f5f9" />
            <div className="ep-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
              <FrozenField label="Staff Type" value={STAFF_TYPE_LABEL[formData.staffType]} />
              <FrozenField label="Role" value={ROLE_LABEL[formData.role] || formData.role} />
              {!isNonTeaching && (
                <FrozenField label="School" value={formData.school} wide />
              )}
              {(needsDepartment || isNonTeaching) && (
                <FrozenField
                  label={isNonTeaching ? "Department / Office" : "SoEMR Department"}
                  value={formData.department}
                />
              )}
              <FrozenField label="Email Address" value={formData.email} />
              <FrozenField label="Full Name" value={formData.name} />
            </div>
          </div>

          {/* - Card 2: Editable Details - */}
          <div style={{ ...CARD, marginTop: 20 }}>
            <SectionHead title="Personal Details" badge="Editable" badgeColor="#2563eb" badgeBack="#eff6ff" />
            <div className="ep-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
              <InputField label="Employee ID" required hint="e.g. EMP001 - letters, numbers, / - _">
                <input
                  className="ep-inp"
                  style={INP}
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                  maxLength={30}
                  placeholder="EMP001"
                />
              </InputField>

              <InputField label="Designation" required hint="e.g. Assistant Professor">
                <input
                  className="ep-inp"
                  style={INP}
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Assistant Professor"
                />
              </InputField>

              <InputField label="Qualification" hint="e.g. Ph.D, M.Tech">
                <input
                  className="ep-inp"
                  style={INP}
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="Ph.D, M.Tech"
                />
              </InputField>

              <InputField label="Experience (years)" hint="0 to 80 years">
                <input
                  className="ep-inp"
                  style={INP}
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  inputMode="decimal"
                  maxLength={4}
                  placeholder="e.g. 10"
                />
              </InputField>

              <InputField label="Phone" hint="+91 98765 43210" wide>
                <input
                  className="ep-inp"
                  style={INP}
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  inputMode="tel"
                  maxLength={20}
                  placeholder="+91 98765 43210"
                />
              </InputField>
            </div>

            {/* - Actions - */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 30, paddingTop: 22, borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                className="ep-cancel"
                onClick={() => navigate("/dashboard")}
                style={{ border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 9, padding: "0 22px", height: 40, cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: 13, transition: "all .15s" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="ep-save"
                style={{ display: "flex", alignItems: "center", gap: 7, border: "none", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", borderRadius: 9, padding: "0 24px", height: 40, cursor: saving ? "wait" : "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 13, transition: "all .18s", boxShadow: saving ? "none" : "0 2px 8px rgba(37,99,235,.25)" }}
              >
                {saving ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Saving...
                  </>
                ) : (
                  <>
                    Save Profile
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

        {/* Spinner keyframe (for save button loading state) */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  );
}
