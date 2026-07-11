import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { register } from "../services/authService";
import { buildProfilePayload, normalizeRole } from "../auth/session";
import {
  isValidEmail, isValidPhone, isStrongPassword, passwordRequirements,
  isValidName, isValidEmployeeId, isValidExperience,
  normalizeEmail, sanitizeText, filterNumeric, filterPhone,
} from "../utils/validation";

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

const STAFF_TYPE_OPTIONS = [
  { value: "teaching", label: "Teaching" },
  { value: "non_teaching", label: "Non-Teaching" },
];

const DEFAULT_DESIGNATION_BY_ROLE = {
  faculty: "Assistant Professor",
  hod: "HOD",
  center_head: "Center Head",
  dean: "Dean",
  director: "Director",
  vc: "Vice Chancellor",
  registrar: "Registrar",
  reporting_officer: "Reporting Officer",
  non_teaching_staff: "",
};

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    staffType: "teaching",
    name: "",
    email: "",
    password: "",
    role: "",
    employeeId: "",
    designation: "Assistant Professor",
    department: "",
    school: "",
    qualification: "",
    experience: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedSchool = canonicalSchoolValue(formData.school);
  const selectedRole = normalizeRole(formData.role, "");
  const isNonTeachingType = formData.staffType === "non_teaching";
  const isTeachingType = formData.staffType === "teaching";
  const requiresSchool = isTeachingType && selectedRole !== "vc";
  const schoolNeedsDepartment = isSoemrSchool(selectedSchool);
  const isCisr = isCisrSchool(selectedSchool);
  const needsDepartment = isTeachingType && schoolNeedsDepartment;
  const roleOptions = BASE_ROLE_OPTIONS.filter((role) => {
    const roleIsNonTeaching = isNonTeachingRole(role.value);

    if (isNonTeachingType) return roleIsNonTeaching;
    if (roleIsNonTeaching) return false;
    if (role.value === "hod") return schoolNeedsDepartment;
    if (role.value === "center_head") return isCisr;
    if (isCisr && (role.value === "director" || role.value === "dean")) return false;
    return true;
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "staffType") {
        return {
          ...prev,
          staffType: value,
          role: "",
          school: "",
          department: "",
          designation: value === "teaching" ? "Assistant Professor" : "",
        };
      }
      if (name === "school") {
        return { ...prev, school: value, role: "", department: "" };
      }
      if (name === "role") {
        return { ...prev, role: value, designation: DEFAULT_DESIGNATION_BY_ROLE[value] ?? prev.designation };
      }
      if (name === "experience") {
        return { ...prev, experience: filterNumeric(value) };
      }
      if (name === "phone") {
        return { ...prev, phone: filterPhone(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const school = canonicalSchoolValue(formData.school);
    const department = canonicalDepartmentValue(formData.department);
    const role = normalizeRole(formData.role, "");
    const nonTeaching = formData.staffType === "non_teaching";
    const roleIsNonTeaching = isNonTeachingRole(role);
    const schoolRequired = formData.staffType === "teaching" && role !== "vc";

    if (!formData.staffType) {
      setError("Please select Teaching or Non-Teaching.");
      return;
    }

    if (!formData.name || !formData.email || !formData.password || !formData.employeeId || !formData.role || (schoolRequired && !school)) {
      setError("Please fill in all required fields (Staff Type, School, Role, Name, Email, Password, Employee ID).");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isValidName(formData.name)) {
      setError("Full name must be between 2 and 100 characters.");
      return;
    }

    if (!isValidEmployeeId(formData.employeeId)) {
      setError("Employee ID must be 2-30 characters and contain only letters, numbers, /, - or _.");
      return;
    }

    const pwErrors = passwordRequirements(formData.password);
    if (pwErrors.length > 0) {
      setError(`Password must have: ${pwErrors.join(', ')}.`);
      return;
    }

    if (formData.experience && !isValidExperience(formData.experience)) {
      setError("Experience must be a number between 0 and 80.");
      return;
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (formData.staffType === "teaching" && roleIsNonTeaching) {
      setError("Please select a teaching role for Teaching staff type.");
      return;
    }

    if (formData.staffType === "non_teaching" && !roleIsNonTeaching) {
      setError("Please select a non-teaching role for Non-Teaching staff type.");
      return;
    }

    if (schoolRequired && !isValidSchool(school)) {
      setError("Please select one of the approved schools or centers from the dropdown.");
      return;
    }

    if (nonTeaching && !String(formData.department || "").trim()) {
      setError("Please enter the department/office for non-teaching staff.");
      return;
    }

    if (isSoemrSchool(school) && (!department || !isValidSoemrDepartment(department))) {
      setError("Please select the correct SoEMR department from the dropdown.");
      return;
    }

    if (formData.role === "hod" && !isSoemrSchool(school)) {
      setError("HOD accounts are allowed only for SoEMR departments in this hierarchy.");
      return;
    }

    if (formData.role === "center_head" && !isCisrSchool(school)) {
      setError("Center Head accounts are allowed only for CISR.");
      return;
    }

    if (isCisrSchool(school) && (formData.role === "director" || formData.role === "dean" || formData.role === "hod")) {
      setError("CISR uses only Center Head and Faculty roles below VC.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const cleanFormData = {
        ...formData,
        email: normalizeEmail(formData.email),
        name: sanitizeText(formData.name),
        employeeId: sanitizeText(formData.employeeId),
        designation: sanitizeText(formData.designation),
        qualification: sanitizeText(formData.qualification),
        experience: sanitizeText(formData.experience),
        phone: sanitizeText(formData.phone),
        role,
        school: nonTeaching ? "" : school,
        department: nonTeaching
          ? sanitizeText(formData.department)
          : isSoemrSchool(school)
            ? department
            : "",
      };

      const profilePayload = buildProfilePayload(cleanFormData, APP_INFO.DEFAULT_AY);
      await register(profilePayload, formData.password);

      navigate("/login", {
        replace: true,
        state: {
          message: "Account created. You can now log in.",
        },
      });
    } catch (err) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
  *, *::before, *::after { box-sizing: border-box; }

  .dyp-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    box-sizing: border-box;
  }
  .dyp-input::placeholder { color: #94a3b8; }
  .dyp-input:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
  }
  .dyp-btn {
    width: 100%;
    padding: 11px 16px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    letter-spacing: 0.2px;
  }
  .dyp-btn:hover:not(:disabled) { background: #1d4ed8; }
  .dyp-btn:disabled { opacity: 0.65; cursor: not-allowed; }
`}</style>

      {/* - Top bar - */}
      <div style={s.topBar}>
        <div style={s.logoWrap}>
          <img src="/image.png" alt="University Logo" style={s.uniLogo} />
          <div>
            <div style={s.portalName}>PBAS Portal</div>
            <div style={s.uniSub}>D.Y. Patil International University, Akurdi, Pune</div>
          </div>
        </div>
        <img src="/IQAS.png" alt="IQAC Logo" style={s.iqacLogo} />
      </div>

      {/* - Form container - */}
      <div style={s.container}>
        <div style={s.card} className="fa-scale-in">
          <div style={s.right}>
            <h2 style={s.panelTitle}>Create Account</h2>
            <p style={s.sub}>Fill in your details to get started</p>

            {error && <div style={s.error}>{error}</div>}

            <form onSubmit={handleSignup} style={s.formGrid}>
              <div style={{ ...s.inputGroup, gridColumn: "1 / -1" }}>
                <label style={s.label}>Staff Type *</label>
                <select className="dyp-input" name="staffType" value={formData.staffType} onChange={handleChange} required>
                  {STAFF_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {isTeachingType && (
                <div style={{ ...s.inputGroup, gridColumn: "1 / -1" }}>
                  <label style={s.label}>School {requiresSchool ? "*" : "(Optional for VC)"}</label>
                  <select className="dyp-input" name="school" value={formData.school} onChange={handleChange} required={requiresSchool}>
                    <option value="">Select school</option>
                    {SCHOOL_OPTIONS.map((school) => (
                      <option key={school.value} value={school.value}>{school.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={s.inputGroup}>
                <label style={s.label}>Role *</label>
                <select className="dyp-input" name="role" value={formData.role} onChange={handleChange} required>
                  <option value="">Select role</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              {needsDepartment && (
                <div style={s.inputGroup}>
                  <label style={s.label}>SoEMR Department *</label>
                  <select className="dyp-input" name="department" value={formData.department} onChange={handleChange} required>
                    <option value="">Select department</option>
                    {SOEMR_DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </div>
              )}

              {isNonTeachingType && (
                <div style={s.inputGroup}>
                  <label style={s.label}>Department / Office *</label>
                  <input className="dyp-input" type="text" name="department" placeholder="e.g. Administration" value={formData.department} onChange={handleChange} required />
                </div>
              )}

              <div style={s.inputGroup}>
                <label style={s.label}>Full Name *</label>
                <input className="dyp-input" type="text" name="name" value={formData.name} onChange={handleChange} required maxLength={100} placeholder="e.g. Dr. Jane Smith" />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Email Address *</label>
                <input className="dyp-input" type="email" name="email" value={formData.email} onChange={handleChange} required maxLength={254} placeholder="e.g. jane@dypatil.edu" />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Password *</label>
                <input className="dyp-input" type="password" name="password" value={formData.password} onChange={handleChange} required maxLength={128} placeholder="Min 8 chars, upper, lower, number" autoComplete="new-password" />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Employee ID *</label>
                <input className="dyp-input" type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} required maxLength={30} placeholder="e.g. EMP001" />
              </div>

              <div style={s.inputGroup}>
                <label style={s.label}>Designation</label>
                <input
                  className="dyp-input"
                  type="text"
                  name="designation"
                  placeholder={isNonTeachingType ? "e.g. Registrar, Reporting Officer" : "e.g. Assistant Professor"}
                  value={formData.designation}
                  onChange={handleChange}
                  maxLength={100}
                />
              </div>

              <div style={s.inputGroup}>
                <label style={s.label}>Qualification</label>
                <input className="dyp-input" type="text" name="qualification" placeholder="e.g. Ph.D, M.Tech" value={formData.qualification} onChange={handleChange} maxLength={100} />
              </div>

              <div style={s.inputGroup}>
                <label style={s.label}>{isNonTeachingType ? "Experience (Years)" : "Teaching Experience (Years)"}</label>
                <input className="dyp-input" type="text" name="experience" inputMode="decimal" placeholder="e.g. 10" value={formData.experience} onChange={handleChange} maxLength={4} />
              </div>

              <div style={{ ...s.inputGroup, gridColumn: "1 / -1" }}>
                <label style={s.label}>Phone Number</label>
                <input className="dyp-input" type="text" name="phone" inputMode="tel" placeholder="e.g. +91 98765 43210" value={formData.phone} onChange={handleChange} maxLength={20} />
              </div>

              <button
                type="submit"
                className="dyp-btn"
                style={{ gridColumn: "1 / -1", marginTop: 10, opacity: loading ? 0.72 : 1 }}
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p style={s.loginText}>
              Already have an account?{" "}
              <Link to="/login" style={s.loginLink}>Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// - Styles -
const s = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "inherit",
    color: "#1e293b",
  },

  /* - Top bar - */
  topBar: {
    background: "#0f172a",
    padding: "12px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  uniLogo: {
    height: 46,
  },
  portalName: {
    color: "#f1f5f9",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: "-0.2px",
  },
  uniSub: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
  },
  iqacLogo: {
    height: 46,
  },

  /* - Form container - */
  container: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "36px 24px 56px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8ecf0",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },
  right: {
    padding: "32px 36px",
  },

  /* - Card header - */
  panelTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 4,
    marginTop: 0,
    letterSpacing: "-0.3px",
  },
  sub: {
    fontSize: 13,
    color: "#64748b",
    margin: "0 0 24px",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 1.6,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px 16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#475569",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  loginText: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 13,
    color: "#64748b",
    paddingTop: 20,
    borderTop: "1px solid #f1f5f9",
  },
  loginLink: {
    color: "#2563eb",
    fontWeight: 700,
    textDecoration: "none",
  },
};

