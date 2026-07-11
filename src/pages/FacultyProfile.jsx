import { useState } from "react";
import { APP_INFO } from "../constants/formConfig";
import { updateProfile } from "../services/authService";
import { storeUserSession } from "../auth/session";

export default function FacultyProfile({ user, onProceed }) {
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [edits, setEdits] = useState({
    designation: user.designation || "",
    qualification: user.qualification || "",
    experience: user.experience || "",
    phone: user.phone || "",
  });

  const set = (field, value) => setEdits((prev) => ({ ...prev, [field]: value }));

  const ROLE_LABEL = {
    faculty: "Faculty (Self-Appraisal)",
    hod: "Head of Department",
    center_head: "Center Head",
    non_teaching_staff: "Non-Teaching Staff",
    reporting_officer: "Reporting Officer",
    registrar: "Registrar",
    dean: "Dean",
    director: "Director",
    vc: "Vice Chancellor",
  };

  const roleColor = {
    faculty:  { bg: "#ede9fe", color: "#6d28d9" },
    hod:      { bg: "#fef3c7", color: "#b45309" },
    center_head: { bg: "#e0f2fe", color: "#0369a1" },
    non_teaching_staff: { bg: "#dbeafe", color: "#1e40af" },
    reporting_officer: { bg: "#cffafe", color: "#155e75" },
    registrar: { bg: "#ede9fe", color: "#5b21b6" },
    dean:     { bg: "#d1fae5", color: "#065f46" },
    director: { bg: "#cffafe", color: "#0e7490" },
    vc:       { bg: "#fee2e2", color: "#991b1b" },
  }[user.role] || { bg: "#f1f5f9", color: "#475569" };

  const handleProceed = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        email: sessionStorage.getItem("username") || "",
        full_name: user.name,
        employee_id: user.employeeId || null,
        school: user.school || null,
        department: user.department || null,
        appraisal_role: user.role,
        academic_year: user.ay,
        designation: edits.designation.trim() || null,
        qualification: edits.qualification.trim() || null,
        teaching_experience: edits.experience.trim() || null,
        phone: edits.phone.trim() || null,
      };
      const saved = await updateProfile(payload);
      storeUserSession({ profile: saved || payload });
      onProceed();
    } catch {
      setSaveError("Failed to save profile changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar} className="fa-slide-top">
        <div style={S.logoWrap}>
          <div style={S.logoMark}>FA</div>
          <div>
            <div style={S.logoName}>{APP_INFO.PORTAL_NAME}</div>
            <div style={S.logoSub}>{APP_INFO.UNIVERSITY_NAME}</div>
          </div>
        </div>
        <div style={S.ayPill}>Academic Year {user.ay}</div>
      </div>

      {/* Content */}
      <div style={S.content} className="fa-page-enter">

        {/* Greeting */}
        <div style={S.greeting}>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>Welcome back,</div>
          <div style={S.greetName}>{user.name}</div>
          <div style={{ marginTop: 8 }}>
            <span style={{ ...S.roleBadge, background: roleColor.bg, color: roleColor.color }}>
              {ROLE_LABEL[user.role] || user.role}
            </span>
          </div>
        </div>

        {/* Profile card */}
        <div style={S.card}>
          {/* Avatar section */}
          <div style={S.avatarSection}>
            <div style={S.avatar}>{user.avatar}</div>
            <div style={S.avatarInfo}>
              <div style={S.avatarName}>{user.name}</div>
              <div style={S.avatarDesig}>{edits.designation} - {user.department}</div>
              <div style={S.avatarId}>{user.employeeId}</div>
            </div>
          </div>

          <div style={S.divider} />

          {/* Frozen fields */}
          <div style={{ marginBottom: 10 }}>
            <div style={S.sectionHeading}>Account Information <span style={S.frozenBadge}> Read-only</span></div>
            <div style={S.editGrid}>
              {[
                ["Employee ID",      user.employeeId],
                ["Full Name",        user.name],
                ["School / Faculty", user.school],
                ["Department",       user.department],
                ["Appraisal Role",   ROLE_LABEL[user.role] || user.role],
                ["Academic Year",    user.ay],
              ].map(([label, value]) => (
                <div key={label} style={S.fieldWrap}>
                  <label style={S.fieldLabel}>{label}</label>
                  <div style={S.frozenInput}>{value || "-"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.divider} />

          {/* Editable fields */}
          <div style={{ marginBottom: 6 }}>
            <div style={S.sectionHeading}>Your Details <span style={S.editableBadge}>Editable</span></div>
            <div style={S.editGrid}>

              <div style={S.fieldWrap}>
                <label style={S.fieldLabel}>Designation</label>
                <input
                  style={S.input}
                  value={edits.designation}
                  onChange={(e) => set("designation", e.target.value)}
                  placeholder="e.g. Assistant Professor"
                />
              </div>

              <div style={S.fieldWrap}>
                <label style={S.fieldLabel}>Qualification</label>
                <input
                  style={S.input}
                  value={edits.qualification}
                  onChange={(e) => set("qualification", e.target.value)}
                  placeholder="e.g. M.Tech, PhD"
                />
              </div>

              <div style={S.fieldWrap}>
                <label style={S.fieldLabel}>Teaching Experience</label>
                <input
                  style={S.input}
                  value={edits.experience}
                  onChange={(e) => set("experience", e.target.value)}
                  placeholder="e.g. 8 years"
                />
              </div>

              <div style={S.fieldWrap}>
                <label style={S.fieldLabel}>Contact / Phone</label>
                <input
                  style={S.input}
                  type="tel"
                  value={edits.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="e.g. 9876543210"
                  maxLength={15}
                />
              </div>

            </div>
          </div>

          <div style={S.divider} />

          {/* Confirmation */}
          <div style={S.confirmRow}>
            <label style={S.checkLabel}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#0f172a", cursor: "pointer" }}
              />
              <span>
                I confirm that the above information is correct and I wish to proceed with my{" "}
                <strong>{user.ay}</strong> performance appraisal.
              </span>
            </label>
          </div>

          {saveError && (
            <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 10, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 12px" }}>
              {saveError}
            </div>
          )}

          {/* Proceed button */}
          <button
            onClick={handleProceed}
            disabled={!confirmed || saving}
            style={{
              ...S.proceedBtn,
              opacity: (confirmed && !saving) ? 1 : 0.45,
              cursor: (confirmed && !saving) ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving..." : "Proceed to Appraisal Dashboard"}
          </button>

          {!confirmed && (
            <div style={S.hintText}>Please check the box above to confirm your details before proceeding.</div>
          )}
        </div>

        {/* Info note */}
        <div style={S.noteBox}>
          <span style={{ fontWeight: 700 }}>Note:</span> Name, School, and Role are managed by the admin and cannot be changed here. For corrections, please contact your HR department or IT helpdesk.
        </div>
      </div>
    </div>
  );
}

// - Styles -
const S = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "inherit",
    color: "#1e293b",
  },

  topBar: {
    background: "#0f172a",
    padding: "14px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 36, height: 36, borderRadius: 8,
    background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0,
  },
  logoName: { color: "#f1f5f9", fontWeight: 700, fontSize: 13 },
  logoSub:  { color: "#64748b", fontSize: 9, marginTop: 1 },
  ayPill: {
    background: "#1e293b", color: "#94a3b8", fontSize: 11,
    padding: "5px 12px", borderRadius: 20, fontWeight: 600,
  },

  content: { maxWidth: 760, margin: "0 auto", padding: "40px 24px 56px" },

  greeting: { marginBottom: 28 },
  greetName: { fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5 },
  roleBadge: {
    display: "inline-block", fontSize: 12, fontWeight: 700,
    padding: "4px 12px", borderRadius: 20, letterSpacing: 0.2,
  },

  card: {
    background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
    boxShadow: "0 10px 26px rgba(15,23,42,0.08)", padding: "28px 32px", marginBottom: 18,
  },

  avatarSection: { display: "flex", alignItems: "center", gap: 18, marginBottom: 22 },
  avatar: {
    width: 64, height: 64, borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 20, flexShrink: 0, letterSpacing: 1,
  },
  avatarInfo: {},
  avatarName:  { fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 3 },
  avatarDesig: { fontSize: 13, color: "#475569", marginBottom: 3 },
  avatarId:    { fontSize: 11, color: "#94a3b8", fontFamily: "monospace", letterSpacing: 0.5 },

  divider: { height: 1, background: "#f1f5f9", margin: "20px 0" },

  sectionHeading: {
    fontSize: 11, fontWeight: 700, color: "#475569",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14,
    display: "flex", alignItems: "center", gap: 8,
  },
  frozenBadge: {
    fontSize: 9, fontWeight: 700, background: "#f1f5f9", color: "#94a3b8",
    border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 7px",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  editableBadge: {
    fontSize: 9, fontWeight: 700, background: "#eff6ff", color: "#2563eb",
    border: "1px solid #bfdbfe", borderRadius: 4, padding: "2px 7px",
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" },
  infoItem: {},
  infoLabel: {
    fontSize: 10, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3,
  },
  infoValue: { fontSize: 13, color: "#1e293b", fontWeight: 500 },

  editGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 5 },
  fieldLabel: {
    fontSize: 10, fontWeight: 700, color: "#475569",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  input: {
    padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 7,
    fontSize: 13, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc",
    outline: "none", transition: "border-color 0.15s",
  },
  frozenInput: {
    padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 7,
    fontSize: 13, fontFamily: "inherit", color: "#94a3b8", background: "#f1f5f9",
    cursor: "not-allowed", userSelect: "none",
  },

  confirmRow: { marginBottom: 18 },
  checkLabel: {
    display: "flex", alignItems: "flex-start", gap: 10,
    fontSize: 13, color: "#374151", cursor: "pointer", lineHeight: 1.6,
  },

  proceedBtn: {
    width: "100%", padding: "14px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
    fontFamily: "inherit", letterSpacing: 0.3,
    transition: "background 0.15s, opacity 0.2s",
    display: "block", textAlign: "center",
  },
  hintText: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 10 },

  noteBox: {
    background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 9,
    padding: "12px 16px", fontSize: 12, color: "#713f12", lineHeight: 1.6,
  },
};
