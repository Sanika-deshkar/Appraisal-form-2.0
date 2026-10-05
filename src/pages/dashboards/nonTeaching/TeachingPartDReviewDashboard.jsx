import { useEffect, useMemo, useState } from "react";
import { FilePenLine, X, Send } from "lucide-react";
import "./partDReviewActions.css";
import { APP_INFO } from "../../../constants/formConfig";
import { Avatar } from "../../../components/dashboard/dashboardPrimitives";
import RegistrarLeaveManagement from "../../../components/appraisal/PartD/RegistrarLeaveManagement";
import DynamicPartDReviewPanel from "../../../features/dynamic-appraisal/components/DynamicPartDReviewPanel";
import { dynamicReviewForm } from "../../../utils/dynamicAppraisalData";
import { fetchPartDRegistrarQueue, submitPartDRegistrarReview } from "../../../services/reviewWorkflow";
import { getActiveAcademicYear } from "../../../auth/session";
import { roleLabel } from "../../../utils/hierarchy";
import AppraisalHeaderImage from "../../../components/AppraisalHeaderImage";
import { DEAN_TRACKS, UNIVERSITY_SCHOOLS, getSchoolByValue, normalizeHierarchyText, schoolVisualMeta } from "../../../constants/universityHierarchy";
import { useSchools } from "../../../services/schoolsService";

// Registrar-only queue for Part D (Leave & Attendance) of teaching-staff forms (Faculty/HOD/
// Director/Dean/Center Head, any school) - a track independent of the A/B/C/E chain that never
// routes through HOD/Director/Dean. See PART_D_STATUSES in utils/hierarchy.js.
//
// Pure content, no sidebar/layout of its own - the caller (NonTeachingReviewDashboard) renders
// this inline as one of its own tabs so switching to/from it stays on the same page instead of
// swapping to a differently-chromed dashboard.
// dynamicReviewForm(selected) only recognizes a subject as a dynamic-schema
// form when its queue payload already carries real custom_..._s_... data
// (see the "unverified" note in DynamicPartDReviewPanel.jsx — the Part D
// registrar queue endpoint doesn't always echo that data back). That made a
// dynamic-form subject with a Registrar-only part silently fall through to
// the Standard/Creative hardcoded Leave & Attendance UI below, which has no
// matching fields for it and renders as an empty "User did not fill
// anything" section instead of the subject's real registrar table(s).
// Falling back to the subject's own assigned form family (same "custom_"
// convention used everywhere else a form is identified as dynamic, e.g.
// useAssignedFormAssignment.js) catches that case without touching how any
// other dashboard (HOD/Director/Dean/VC, or the Standard/Creative branch
// here) decides whether a subject is a dynamic form.
const isDynamicPartDSubject = (subject) => {
  if (dynamicReviewForm(subject)) return true;
  const schoolConfig = getSchoolByValue(subject?.school);
  const assignment = schoolConfig?.defaultForm || schoolConfig?.formVariant || "";
  return assignment.startsWith("custom_");
};

const PART_D_DIVISION_META = {
  engineering: { label: "Engineering Schools", color: "#1e40af", bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)" },
  non_engineering: { label: "Non-Engineering Schools", color: "#6b21a8", bg: "linear-gradient(135deg,#f3e8ff,#e9d5ff)" },
  cisr: { label: "CISR", color: "#0f766e", bg: "linear-gradient(135deg,#ccfbf1,#99f6e4)" },
};

const PART_D_DIVISION_SCHOOLS = {
  engineering: {
    id: "engineering",
    code: "DEAN-ENGG",
    name: "Dean of Engineering",
    label: "Engineering Division",
    color: "#4c1d95",
    icon: "DE",
  },
  non_engineering: {
    id: "non_engineering",
    code: "DEAN-NENG",
    name: "Dean of Non-Engineering",
    label: "Non-Engineering Division",
    color: "#7c2d12",
    icon: "DN",
  },
};

const toPartDSchool = (school, index = 0) => {
  const meta = schoolVisualMeta(school, index);
  return {
    id: school.code.toLowerCase(),
    code: school.code,
    name: school.name,
    label: school.label,
    color: meta.color || "#64748b",
    icon: meta.icon || school.code,
  };
};

// Computed fresh on every call (not a module-level snapshot) so it always reflects the current
// UNIVERSITY_SCHOOLS - live data once GET /schools has landed, the fallback table until then.
const getPartDSchoolsByDivision = () => ({
  engineering: UNIVERSITY_SCHOOLS
    .filter((school) => school.deanTrack === DEAN_TRACKS.ENGINEERING)
    .map((school, index) => toPartDSchool(school, index))
    .concat(PART_D_DIVISION_SCHOOLS.engineering),
  non_engineering: UNIVERSITY_SCHOOLS
    .filter((school) => school.deanTrack === DEAN_TRACKS.NON_ENGINEERING)
    .map((school, index) => toPartDSchool(school, index))
    .concat(PART_D_DIVISION_SCHOOLS.non_engineering),
  cisr: UNIVERSITY_SCHOOLS
    .filter((school) => school.deanTrack === DEAN_TRACKS.CISR)
    .map((school, index) => toPartDSchool(school, index)),
});

const schoolIdForPartDItem = (item = {}) => {
  const schoolValue = item.school || item.schoolName || item.school_code || item.schoolCode || item.info?.school || item.form?.info?.school || "";
  const normalizedSchool = normalizeHierarchyText(schoolValue);
  if (normalizedSchool === "engineering") return "engineering";
  if (normalizedSchool === "non engineering" || normalizedSchool === "nonengineering" || normalizedSchool === "non_engineering") return "non_engineering";

  const school = getSchoolByValue(schoolValue);
  return school?.code ? school.code.toLowerCase() : "";
};

const partDSchoolCountsFor = (queue = []) => {
  const counts = {};
  queue.forEach((item) => {
    const id = schoolIdForPartDItem(item);
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
};

const partDDivisionCountsFor = (schoolCounts = {}) => {
  const counts = {};
  Object.entries(getPartDSchoolsByDivision()).forEach(([division, schools]) => {
    counts[division] = schools.reduce((total, school) => total + (schoolCounts[school.id] || 0), 0);
  });
  return counts;
};

const defaultPartDSchoolSelection = (queue = [], preferredDivision = "engineering", preferredSchoolId = "") => {
  const schoolsByDivision = getPartDSchoolsByDivision();
  const schoolCounts = partDSchoolCountsFor(queue);
  const divisionCounts = partDDivisionCountsFor(schoolCounts);
  const preferredSchools = schoolsByDivision[preferredDivision] || [];
  const preferredSchoolHasItems = preferredSchoolId && (schoolCounts[preferredSchoolId] || 0) > 0;

  if (preferredSchoolHasItems) {
    return { division: preferredDivision, schoolId: preferredSchoolId };
  }

  const division = (divisionCounts[preferredDivision] || 0) > 0
    ? preferredDivision
    : Object.keys(PART_D_DIVISION_META).find((key) => (divisionCounts[key] || 0) > 0) || preferredDivision;
  const schools = schoolsByDivision[division] || preferredSchools;
  const school = schools.find((item) => (schoolCounts[item.id] || 0) > 0) || schools[0] || preferredSchools[0];

  return { division, schoolId: school?.id || "" };
};

const normalizedPartDStatus = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ");

// eslint-disable-next-line react-refresh/only-export-components
export const isPartDReviewed = (item = {}) => {
  const status = normalizedPartDStatus(item.partDStatus || item.part_d_status);
  return Boolean(
    item.registrarPartDReviewedAt ||
    item.registrar_part_d_reviewed_at ||
    [
      "registrar approved pending release",
      "released to vc",
      "released",
      "reviewed",
      "registrar reviewed",
    ].includes(status),
  );
};

const partDScoreForInput = (item = {}) => (
  item.hasRegistrarPartDScore || String(item.registrar_part_d_score ?? item.registrarPartDScore ?? "").trim() !== ""
    ? String(item.registrarPartDScore ?? item.registrar_part_d_score ?? "")
    : ""
);

export default function TeachingPartDReviewDashboard({ accent = "#155e75", academicYear: academicYearProp, academicYearOptions = [], onAcademicYearChange }) {
  useSchools(); // subscribes to live schools data so getPartDSchoolsByDivision() re-renders fresh
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [activeDivision, setActiveDivision] = useState("engineering");
  const [activeSchoolId, setActiveSchoolId] = useState("");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [editing, setEditing] = useState(false);
  const [leaveRows, setLeaveRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const academicYear = academicYearProp || getActiveAcademicYear() || APP_INFO.DEFAULT_AY;
  const headerAcademicYearOptions = academicYearOptions.length
    ? academicYearOptions
    : [{ academic_year: academicYear, is_open: true }];

  const loadQueue = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const queue = await fetchPartDRegistrarQueue({ academicYear, includeReviewed: true });
      setItems(queue);
      const nextSelection = defaultPartDSchoolSelection(queue, activeDivision, activeSchoolId);
      setActiveDivision(nextSelection.division);
      setActiveSchoolId(nextSelection.schoolId);
      return queue;
    } catch (err) {
      console.error("Could not load Part D review queue:", err);
      setLoadError(err.message || "Could not load the Part D review queue.");
      setItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadQueue, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  const selected = items.find((item) => item.id === selectedId);
  const selectedReviewed = selected ? isPartDReviewed(selected) : false;
  // This screen is mounted only for the Registrar. Older queue responses do not
  // include can_edit_part_d, so absence of the flag must not hide the Part D editor;
  // an explicit backend denial still keeps the record read-only.
  const canEdit = Boolean(selected && selected.can_edit_part_d !== false);
  const currentSchools = getPartDSchoolsByDivision()[activeDivision] || [];
  const schoolCounts = useMemo(() => partDSchoolCountsFor(items), [items]);
  const divisionCounts = useMemo(() => partDDivisionCountsFor(schoolCounts), [schoolCounts]);
  const activeSchool = currentSchools.find((school) => school.id === activeSchoolId)
    || currentSchools.find((school) => schoolCounts[school.id] > 0)
    || currentSchools[0]
    || null;
  const activeSchoolItems = activeSchool
    ? items.filter((item) => schoolIdForPartDItem(item) === activeSchool.id)
    : items;

  const switchDivision = (division) => {
    const schools = getPartDSchoolsByDivision()[division] || [];
    const firstSchoolWithItems = schools.find((school) => schoolCounts[school.id] > 0);
    setActiveDivision(division);
    setActiveSchoolId((firstSchoolWithItems || schools[0])?.id || "");
    setSelectedId("");
  };

  const switchSchool = (schoolId) => {
    setActiveSchoolId(schoolId);
    setSelectedId("");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selected && isPartDReviewed(selected)) {
        setScore(partDScoreForInput(selected));
        setRemarks(selected.registrarPartDRemarks || selected.registrar_part_d_remarks || "");
      } else {
        setScore("");
        setRemarks("");
      }
      setSaveError("");
      setEditing(false);
      setLeaveRows(selected?.leaveManagement || selected?.leave_management || []);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    selected,
    selectedId,
    selected?.hasRegistrarPartDScore,
    selected?.registrarPartDScore,
    selected?.registrarPartDRemarks,
    selected?.registrar_part_d_remarks,
    selected?.partDStatus,
    selected?.part_d_status,
    selected?.registrarPartDReviewedAt,
    selected?.registrar_part_d_reviewed_at,
  ]);

  const handleSubmit = async () => {
    if (!selected || (selectedReviewed && !editing) || (editing && !canEdit)) return;
    if (score === "" || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 25) {
      setSaveError("Please enter a score between 0 and 25.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await submitPartDRegistrarReview({
        subjectEmail: selected.email,
        academicYear,
        score,
        remarks,
        ...(editing ? { leaveManagement: leaveRows } : {}),
        subjectProfile: selected,
      });
      const reviewedItem = {
        ...selected,
        partDStatus: "released",
        hasRegistrarPartDScore: true,
        registrarPartDScore: Number(score),
        registrarPartDRemarks: remarks,
        registrarPartDReviewedAt: new Date().toISOString(),
        ...(editing ? { leaveManagement: leaveRows, leave_management: leaveRows } : {}),
      };
      setItems((currentItems) => currentItems.map((item) => (
        item.id === selected.id ? reviewedItem : item
      )));
      setSelectedId("");
    } catch (err) {
      setSaveError(err.message || "Could not submit the Part D review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="appraisal-page-header" style={{ background: "#fff", borderRadius: 14, padding: "16px 24px", boxShadow: "0 10px 28px rgba(17,24,39,0.06)", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <AppraisalHeaderImage logo="dypiu" height={78} />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: 0, lineHeight: 1.1 }}>
              Part D - Teaching Staff Leave &amp; Attendance
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 13, color: "#6b7280", fontWeight: 700, flexWrap: "wrap" }}>
              <span>Academic Year:</span>
              <select
                value={academicYear}
                onChange={(event) => onAcademicYearChange?.(event.target.value)}
                className="appraisal-year-select"
                style={{ height: 36, minWidth: 176, border: "1px solid #d1d5db", borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: "inherit", color: "#111827", background: "#fff", outline: "none", fontWeight: 800, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
              >
                {headerAcademicYearOptions.map((cycle) => (
                  <option key={cycle.academic_year} value={cycle.academic_year}>
                    {cycle.academic_year} {cycle.is_open ? "(Active)" : "(Closed / Read-Only)"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <AppraisalHeaderImage logo="iqas" height={78} />
        </div>
      </div>

      {!selected && (
        <>
          <div style={{ marginTop: 14, display: "inline-flex", width: "auto", maxWidth: "max-content", gap: 2, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 9, padding: 3, boxShadow: "0 8px 20px rgba(15,23,42,0.05)" }}>
            {Object.entries(PART_D_DIVISION_META).map(([division, meta]) => {
              const isActive = activeDivision === division;
              const count = divisionCounts[division] || 0;
              return (
                <button
                  key={division}
                  type="button"
                  onClick={() => switchDivision(division)}
                  className="division-selector-option"
                  aria-pressed={isActive}
                  style={{ padding: "9px 18px", border: isActive ? `1.5px solid ${meta.color}44` : "1.5px solid transparent", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800, background: isActive ? meta.bg : "transparent", color: isActive ? meta.color : "#64748b", display: "flex", alignItems: "center", gap: 7, boxShadow: isActive ? `0 2px 10px ${meta.color}1f` : "none" }}
                >
                  {meta.label}
                  {count > 0 && (
                    <span style={{ background: isActive ? meta.color : "#94a3b8", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 900 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {activeSchool && (
            <div style={{ marginTop: 12, display: "flex", background: "#fff", borderRadius: 14, border: "1px solid #eef2f7", boxShadow: "0 10px 26px rgba(15,23,42,0.05)", overflow: "hidden" }}>
              {currentSchools.map((school, index) => {
                const count = schoolCounts[school.id] || 0;
                const isActive = school.id === activeSchool.id;
                const shortName = school.name.replace(/^School of /i, "").replace(/^Dean of /i, "");
                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => switchSchool(school.id)}
                    className="school-selector-option"
                    aria-pressed={isActive}
                    title={school.name}
                    style={{ flex: 1, minWidth: 0, padding: "13px 6px 11px", border: "none", cursor: "pointer", fontFamily: "inherit", background: isActive ? `${school.color}12` : "transparent", borderBottom: isActive ? `3px solid ${school.color}` : "3px solid transparent", borderRight: index < currentSchools.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "background 0.15s ease" }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 9, background: isActive ? `linear-gradient(135deg, ${school.color}2E, ${school.color}14)` : "#f1f5f9", color: isActive ? school.color : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, border: isActive ? `1.5px solid ${school.color}40` : "1.5px solid transparent", boxShadow: isActive ? `0 4px 10px ${school.color}26` : "none" }}>{school.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: isActive ? school.color : "#374151" }}>{school.code}</span>
                    <span style={{ fontSize: 10, color: isActive ? school.color : "#1e293b", fontWeight: 700, lineHeight: 1.3, textAlign: "center", wordBreak: "break-word", maxWidth: "100%" }}>{shortName}</span>
                    {count > 0 && (
                      <span style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#fff", borderRadius: 8, padding: "1px 7px", fontSize: 9, fontWeight: 900, boxShadow: "0 2px 6px rgba(245,158,11,0.35)" }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {loadError && (
        <div style={{ marginTop: 16, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
          {loadError}
        </div>
      )}

      {!selected ? (
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: "#64748b", padding: "18px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>Loading...</div>
          ) : activeSchoolItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>No Part D reviews pending</div>
              <div style={{ color: "#64748b", fontSize: 12.5, marginTop: 4 }}>No pending Part D items for {activeSchool?.code || "this school"}.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {activeSchoolItems.map((item) => (
                <PartDReviewCard key={item.id} item={item} accent={accent} onOpen={() => setSelectedId(item.id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: "100%", boxSizing: "border-box", marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, overflowX: "hidden", boxShadow: "0 10px 28px rgba(17,24,39,0.06)" }}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setSelectedId("")} style={{ background: "#f8fafc", color: "#475569", border: "1px solid #dbe3ef", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>Back</button>
            <Avatar initials={selected.avatar} src={selected.avatarUrl} color={accent} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                {roleLabel(selected.appraisalRole)} - {selected.school || "-"} {selected.department ? `- ${selected.department}` : ""}
              </div>
            </div>
          </div>

          {isDynamicPartDSubject(selected) ? (
            // Dynamic (admin-built custom schema) form: its own separate review UI,
            // reusing the same fetchPartDRegistrarQueue/submitPartDRegistrarReview
            // endpoints as everything above, but with a schema-driven display
            // instead of the fixed Leave & Attendance fields. Standard/Creative
            // subjects always take the branch below, completely unchanged.
            <DynamicPartDReviewPanel
              key={selected.id}
              subject={selected}
              academicYear={academicYear}
              onSubmitted={(patch) => {
                setItems((currentItems) => currentItems.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)));
                setSelectedId("");
              }}
            />
          ) : (
            <>
              {canEdit && (
                <div className="part-d-review-actions">
                  <div>
                    <strong>{editing ? "Editing Part D" : "Part D record"}</strong>
                    <p>{editing ? "Update leave and attendance details below. Cancel to discard these edits." : "Use Edit Part D to update the leave and attendance details."}</p>
                  </div>
                <button className="part-d-review-actions__button" type="button" disabled={saving} onClick={() => {
                  setEditing(!editing);
                  setLeaveRows(selected.leaveManagement || selected.leave_management || []);
                  if (editing) {
                    setScore(partDScoreForInput(selected));
                    setRemarks(selected.registrarPartDRemarks || selected.registrar_part_d_remarks || "");
                  }
                }}>
                  {editing ? <X size={16} aria-hidden="true" /> : <FilePenLine size={16} aria-hidden="true" />}
                  {editing ? "Cancel Edit" : "Edit Part D"}
                </button>
                </div>
              )}
              <RegistrarLeaveManagement
                ctx={{ leaveManagement: editing ? leaveRows : selected.leaveManagement || selected.leave_management }}
                editing={editing}
                onRowsChange={setLeaveRows}
                score={score}
                remarks={remarks}
                onScoreChange={setScore}
                onRemarksChange={setRemarks}
                disabled={saving || (selectedReviewed && !editing)}
              />

              {selectedReviewed && !editing && (
                <div style={{ marginTop: 12, background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#047857", padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                  Registrar review completed. This Part D record is open for viewing only.
                </div>
              )}

              {saveError && (
                <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
                  {saveError}
                </div>
              )}

              {(!selectedReviewed || editing) && (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="part-d-review-actions__button"
                  >
                    <Send size={16} aria-hidden="true" />
                    {saving ? "Submitting..." : "Save & Release Part D to VC"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function PartDReviewCard({ item, accent, onOpen }) {
  const department = String(item.department || "").trim();
  const showDepartment = Boolean(department && department !== "-");
  const reviewed = isPartDReviewed(item);
  const scoreText = item.hasRegistrarPartDScore ? `${item.registrarPartDScore}/25` : "";

  return (
    <div className="vc-review-card fa-fade-up" style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 16px rgba(15,23,42,0.06)", border: "1px solid #eef1f6", display: "flex", flexDirection: "column", gap: 14, transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Avatar initials={item.avatar} src={item.avatarUrl} color={accent} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", letterSpacing: 0, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {roleLabel(item.appraisalRole)} - {item.school || "-"}
          </div>
          <div style={{ display: "inline-flex", fontSize: 9, color: "#94a3b8", fontFamily: "monospace", background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 5, padding: "1px 6px" }}>{item.employeeId || item.email || "-"}</div>
        </div>
        <span style={{ background: reviewed ? "#ecfdf5" : "#fffbeb", color: reviewed ? "#047857" : "#92400e", border: reviewed ? "1px solid #bbf7d0" : "1px solid #fde68a", borderRadius: 999, padding: "4px 9px", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>{reviewed ? "Reviewed" : "Part D"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showDepartment ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 8 }}>
        {showDepartment && (
          <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
            <div style={{ color: "#94a3b8", fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.4 }}>Department</div>
            <div style={{ color: "#334155", fontSize: 11.5, fontWeight: 800, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{department}</div>
          </div>
        )}
        <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
          <div style={{ color: "#94a3b8", fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.4 }}>Academic Year</div>
          <div style={{ color: "#334155", fontSize: 11.5, fontWeight: 800, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.academicYear || item.academic_year || "-"}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
        <div style={{ fontSize: 9.5, color: reviewed ? "#047857" : "#94a3b8", fontWeight: 700 }}>
          {reviewed ? `Registrar reviewed${scoreText ? ` - ${scoreText}` : ""}` : "Registrar scoring pending"}
        </div>
        <button
          type="button"
          onClick={onOpen}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: "8px 18px", background: reviewed ? "#ecfdf5" : "#0f172a", color: reviewed ? "#047857" : "#fff", border: reviewed ? "1px solid #a7f3d0" : "none", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontFamily: "inherit", letterSpacing: 0.2, boxShadow: reviewed ? "0 2px 8px rgba(5,150,105,0.12)" : "0 6px 14px rgba(15,23,42,0.22)" }}
        >
          {reviewed ? "View Part D" : "Review Part D"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
