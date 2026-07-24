import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storeUserSession } from "../auth/session";
import { APP_INFO } from "../constants/formConfig";
import { normalizeNonTeachingRole } from "../constants/nonTeachingHierarchy";
import { api } from "../services/api";
import { getMe } from "../services/authService";
import { loadReviewerDraft, saveReviewerDraft } from "../services/reviewWorkflow";
import { isAllowedAttachmentFile, isFilled } from "../utils/appraisalFormUtils";
import {
  NON_TEACHING_MAX,
  NON_TEACHING_STATUS,
  RATING_SCALE,
  RATING_SECTIONS,
  SELF_ITEMS,
  calculateNonTeachingTotals,
  emptyNonTeachingForm,
  fetchNonTeachingQueueForRole,
  isNonTeachingRejectedStatus,
  loadNonTeachingAppraisal,
  loadNonTeachingWorkflow,
  nonTeachingRoleLabel,
  normalizeNonTeachingStatus,
  openNonTeachingReport,
  primeFormForReviewer,
  saveNonTeachingDraft,
  submitNonTeachingReview,
  submitNonTeachingSelfAppraisal,
  validateNonTeachingForm,
  visibleNonTeachingReviewRoles,
  workflowDesignationForNonTeachingRole,
} from "../services/nonTeachingWorkflow";
import { clampScore, scoreRemaining } from "../utils/appraisalFormUtils";
import { profileFromsessionStorage } from "../utils/hierarchy";
import { n, pct } from "../features/faculty-appraisal/shared";
import AppraisalHeaderImage from "../components/AppraisalHeaderImage";
import RejectionNotice from "../components/RejectionNotice";
import SummaryOtherInfoField from "../components/SummaryOtherInfoField";

const ACCENT = "#1d4ed8";
const REG_ACCENT = "#155e75";
const VC_ACCENT = "#6d28d9";
const clampOptionalScore = (value, max) => String(value ?? "").trim() === "" ? "" : clampScore(value, max);

const T = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const TH = { border: "1px solid #334155", padding: "7px 8px", background: "#1e293b", color: "#e2e8f0", fontWeight: 700, textAlign: "center", fontSize: 10, letterSpacing: "0.3px" };
const TD = { border: "1px solid #e2e8f0", padding: "7px 8px", verticalAlign: "top" };
const TDC = { ...TD, textAlign: "center", verticalAlign: "middle" };

const roleAccent = (role) => {
  const normalized = normalizeNonTeachingRole(role, role);
  if (normalized === "registrar") return REG_ACCENT;
  if (normalized === "vc") return VC_ACCENT;
  return ACCENT;
};

const initials = (name = "User") =>
  String(name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const emptyWorkflow = {
  workflowId: null,
  workflowName: "Approval Workflow",
  currentStep: null,
  status: "NOT_STARTED",
  steps: [],
  approvalSteps: [],
};

function Avatar({ name, color = ACCENT, size = 38 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}99)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.34, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

function ScoreBar({ score, max, color = ACCENT }) {
  return (
    <div style={{ height: 5, borderRadius: 5, background: "#e2e8f0", overflow: "hidden" }}>
      <div style={{ width: `${pct(score, max)}%`, height: "100%", background: color }} />
    </div>
  );
}

function SectionCard({ title, subtitle, accent = ACCENT, children }) {
  return (
    <section className="fa-section-card" style={{ background: "#fff", border: "1px solid #e8ecf0", borderTop: `3px solid ${accent}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(15,23,42,0.07)", marginBottom: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: accent }}>{title}</div>
        {subtitle && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "14px 15px" }}>{children}</div>
    </section>
  );
}

function TextInput({ value, onChange, readOnly = false, placeholder = "", type = "text" }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      style={{ width: "100%", boxSizing: "border-box", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 9px", fontSize: 12, fontFamily: "inherit", outline: "none", background: readOnly ? "#f8fafc" : "#fff", color: "#0f172a" }}
    />
  );
}

function TextArea({ value, onChange, readOnly = false, placeholder = "", rows = 3 }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", background: readOnly ? "#f8fafc" : "#fff", color: "#0f172a" }}
    />
  );
}

function MarksInput({ value, onChange, max, readOnly = false, accent = ACCENT }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input
        type="number"
        min="0"
        max={max}
        step="0.5"
        value={value ?? ""}
        onChange={(event) => onChange(clampOptionalScore(event.target.value, max))}
        readOnly={readOnly}
        style={{ width: 62, textAlign: "center", border: `1.5px solid ${accent}`, borderRadius: 6, padding: "5px 6px", fontSize: 12, fontFamily: "inherit", outline: "none", background: readOnly ? "#f8fafc" : "#eff6ff" }}
      />
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>/ {max}</span>
    </div>
  );
}

function RatingPicker({ value, onChange, readOnly = false }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
      {RATING_SCALE.map((rating) => {
        const active = n(value) === rating.value;
        return (
          <button
            key={rating.value}
            type="button"
            title={`${rating.label} (${rating.value})`}
            disabled={readOnly}
            onClick={() => onChange(rating.value)}
            style={{ width: 30, height: 30, border: active ? `1.5px solid ${rating.color}` : "1px solid #e2e8f0", borderRadius: 5, background: active ? rating.bg : "#fff", color: active ? rating.color : "#94a3b8", fontWeight: 800, cursor: readOnly ? "default" : "pointer", fontFamily: "inherit" }}
          >
            {rating.value}
          </button>
        );
      })}
    </div>
  );
}

function DocCell({ id, docs, setDocs, readOnly = false }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const files = Array.isArray(docs?.[id]) ? docs[id] : docs?.[id] ? [docs[id]] : [];

  const handleFiles = async (selectedFiles) => {
    if (readOnly) return;
    const fileList = Array.from(selectedFiles || []);
    if (!fileList.length) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of fileList) {
        let uploaded = null;
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("folder", `non-teaching-appraisal/${id}`);
          const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
          if (res) {
            uploaded = typeof res === "string" ? { url: res, name: file.name, type: file.type } : {
              url: res.url || res.fileUrl || res.path || res.location || res.data?.url,
              name: res.name || file.name,
              type: res.type || file.type,
              size: file.size,
            };
          }
        } catch (err) {
          console.warn("Upload fallback to local file:", err);
        }

        if (!uploaded || !uploaded.url) {
          const localUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => resolve(URL.createObjectURL(file));
            reader.readAsDataURL(file);
          });
          uploaded = { name: file.name, url: localUrl, type: file.type || "application/pdf", size: file.size };
        }

        uploadedFiles.push(uploaded);
      }
      setDocs((current) => ({
        ...current,
        [id]: [...(Array.isArray(current[id]) ? current[id] : current[id] ? [current[id]] : []), ...uploadedFiles],
      }));
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Unable to upload file.\n\n${err.message}`);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const removeFile = (index) => {
    setDocs((current) => {
      const nextFiles = [...(current[id] || [])];
      nextFiles.splice(index, 1);
      return { ...current, [id]: nextFiles };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {files.length === 0 && readOnly && <span style={{ color: "#94a3b8", fontSize: 10 }}>No documents</span>}
      {files.map((file, index) => (
        <div key={`${file.url || file.name}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 5, padding: "4px 7px" }}>
          <a href={file.url} target="_blank" rel="noreferrer" style={{ minWidth: 0, flex: 1, color: ACCENT, fontSize: 10, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.name}>
            {file.name || "Document"}
          </a>
          {!readOnly && (
            <button type="button" onClick={() => removeFile(index)} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: 800, fontSize: 11 }}>x</button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading} style={{ border: "1px dashed #cbd5e1", background: "#f8fafc", borderRadius: 5, padding: "5px 8px", color: "#64748b", cursor: uploading ? "wait" : "pointer", fontSize: 10, fontFamily: "inherit" }}>
          {uploading ? "Uploading..." : "Attach supporting documents"}
          <input ref={ref} type="file" multiple accept="image/*,.pdf,application/pdf" onChange={(event) => handleFiles(event.target.files)} style={{ display: "none" }} />
        </button>
      )}
    </div>
  );
}

function SelfAppraisalTable({ form, setForm, readOnly, accent }) {
  const setItem = (key, field, value) => {
    setForm((current) => ({
      ...current,
      [key]: { ...(current[key] || {}), [field]: value },
    }));
  };

  const setDocs = (updater) => {
    setForm((current) => ({
      ...current,
      docs: typeof updater === "function" ? updater(current.docs || {}) : updater,
    }));
  };

  return (
    <SectionCard title="Part A - Self Appraisal Details" subtitle={`Max ${NON_TEACHING_MAX.partA} marks. Attach proof wherever applicable.`} accent={accent}>
      <div style={{ overflowX: "auto" }}>
        <table style={T}>
          <thead>
            <tr>
              <th style={TH}>SN</th>
              <th style={{ ...TH, textAlign: "left" }}>Particular</th>
              <th style={{ ...TH, textAlign: "left" }}>Description</th>
              <th style={TH}>Documents</th>
              <th style={TH}>Marks Claimed</th>
            </tr>
          </thead>
          <tbody>
            {SELF_ITEMS.map((item, index) => (
              <tr key={item.key} style={index % 2 ? { background: "#f8fafc" } : undefined}>
                <td style={TDC}>{index + 1}</td>
                <td style={{ ...TD, minWidth: 170, fontWeight: 700, color: "#0f172a" }}>
                  {item.label}
                  <div style={{ color: "#64748b", fontSize: 10, marginTop: 3, fontWeight: 500 }}>Max {item.max}</div>
                </td>
                <td style={{ ...TD, minWidth: 300 }}>
                  <TextArea
                    value={form[item.key]?.text}
                    onChange={(value) => setItem(item.key, "text", value)}
                    readOnly={readOnly}
                    placeholder={`Enter ${item.label.toLowerCase()}...`}
                    rows={3}
                  />
                </td>
                <td style={{ ...TD, minWidth: 190 }}>
                  <DocCell id={item.key} docs={form.docs || {}} setDocs={setDocs} readOnly={readOnly} />
                </td>
                <td style={TDC}>
                  <MarksInput
                    value={form[item.key]?.marks}
                    max={item.max}
                    accent={accent}
                    readOnly={readOnly}
                    onChange={(value) => setItem(item.key, "marks", value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function SummaryPanel({ form, onSubmit, onUpdateRemarks, onUpdateSummaryOtherInfo, onReport, submitting, locked, confirmed, setConfirmed, accent, showReport = true }) {
  const self = calculateNonTeachingTotals(form, "self");
  const selfMax = NON_TEACHING_MAX.partA;
  const scoreCards = [["Self Claimed", self.total, ACCENT]];

  return (
    <SectionCard title={`Summary of Total Score (Max ${selfMax})`} accent="#059669">
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${scoreCards.length}, minmax(0, 1fr))`, gap: 10, marginBottom: 14 }}>
        {scoreCards.map(([label, value, color]) => (
          <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", background: "#f8fafc" }}>
            <div style={{ color: "#64748b", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
            <div style={{ color, fontSize: 18, fontWeight: 900, margin: "4px 0" }}>{n(value).toFixed(1)} / {selfMax}</div>
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, marginBottom: 5 }}>Remaining Credits: {scoreRemaining(value, selfMax).toFixed(1)}</div>
            <ScoreBar score={value} max={selfMax} color={color} />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14, padding: "10px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, color: "#1e3a8a", fontSize: 12, lineHeight: 1.6 }}>
        Current visible score: <strong>{self.total.toFixed(1)} / {selfMax}</strong>
      </div>

      <SummaryOtherInfoField
        value={form.summaryOtherInfo}
        onChange={onUpdateSummaryOtherInfo}
        readOnly={locked}
      />

      <label style={{ fontSize: 12, color: "#334155", fontWeight: 800, display: "block", marginBottom: 6 }}>Remarks</label>
      <TextArea
        value={form.remarks}
        readOnly={locked}
        rows={3}
        placeholder="Optional remarks for the next authority..."
        onChange={onUpdateRemarks}
      />

      {!locked && (
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, padding: "11px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} style={{ marginTop: 3 }} />
          <span>I have verified all the details and confirm that the information provided is correct.</span>
        </label>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        {showReport && (
          <button type="button" onClick={onReport} style={{ padding: "9px 18px", border: "none", borderRadius: 7, background: "#f1f5f9", color: "#475569", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }}>
            Generate Report
          </button>
        )}
        {!locked && (
          <button type="button" onClick={onSubmit} disabled={!confirmed || submitting} style={{ padding: "10px 24px", border: "none", borderRadius: 7, background: confirmed ? accent : "#94a3b8", color: "#fff", cursor: confirmed && !submitting ? "pointer" : "not-allowed", fontWeight: 800, fontFamily: "inherit" }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </SectionCard>
  );
}

export function NonTeachingAppraisalForm({ role = sessionStorage.getItem("role"), embedded = false }) {
  const normalizedRole = normalizeNonTeachingRole(role, "non_teaching_staff");
  const navigate = useNavigate();
  const [form, setForm] = useState(() => emptyNonTeachingForm(profileFromsessionStorage(), normalizedRole));
  const [tab, setTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const accent = roleAccent(normalizedRole);
  const locked = form.status !== NON_TEACHING_STATUS.DRAFT && !isNonTeachingRejectedStatus(form.status);
  const sidebarWorkflowText = (workflow?.approvalSteps || workflow?.steps || [])
    .filter((stage) => !stage.isInitial)
    .map((stage) => stage.designation)
    .join(" to ") || "Submit your appraisal to begin the review process.";

  useEffect(() => {
    let active = true;
    const loadForm = async () => {
      try {
        let profile = profileFromsessionStorage();
        try {
          const latestProfile = await getMe();
          storeUserSession({ profile: latestProfile });
          profile = profileFromsessionStorage();
        } catch (profileErr) {
          console.warn("Could not refresh non-teaching profile:", profileErr?.message || profileErr);
        }
        const saved = await loadNonTeachingAppraisal({
          email: profile.email,
          academicYear: APP_INFO.DEFAULT_AY,
          profile,
          role: normalizedRole,
        });
        const liveWorkflow = await loadNonTeachingWorkflow({
          email: profile.email,
          academicYear: APP_INFO.DEFAULT_AY,
        }).catch(() => null);
        if (!active) return;
        setForm(saved?.form || emptyNonTeachingForm(profile, normalizedRole));
        setWorkflow(liveWorkflow);
      } catch (err) {
        console.error("Could not load non-teaching appraisal:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadForm();
    return () => { active = false; };
  }, [normalizedRole]);

  const updateInfo = (field, value) => {
    setForm((current) => ({ ...current, info: { ...(current.info || {}), [field]: value } }));
  };

  const updateRemarks = (value) => {
    setForm((current) => ({ ...current, remarks: value }));
  };

  const updateSummaryOtherInfo = (value) => {
    setForm((current) => ({ ...current, summaryOtherInfo: value }));
  };

  const handleSaveDraft = async () => {
    if (locked) return;
    setSavingDraft(true);
    try {
      const saved = await saveNonTeachingDraft({
        form,
        role: normalizedRole,
        profile: profileFromsessionStorage(),
      });
      setForm(saved.form);
      const liveWorkflow = await loadNonTeachingWorkflow({
        email: saved.form?.info?.email || profileFromsessionStorage().email,
        academicYear: saved.form?.info?.ay || APP_INFO.DEFAULT_AY,
      }).catch(() => null);
      setWorkflow(liveWorkflow);
      setDraftSaved(true);
    } catch (err) {
      if (err?.statusCode === 403 || err?.response?.status === 403) {
        setForm((current) => ({ ...current, status: NON_TEACHING_STATUS.SUBMITTED }));
        return;
      }
      alert(`Unable to save draft.\n\n${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      alert("Please confirm the accuracy declaration before submitting.");
      return;
    }
    const attachmentErrors = SELF_ITEMS.flatMap((item) => {
      const row = form[item.key] || {};
      const rowHasData = isFilled(row.text) || isFilled(row.marks);
      const docValue = form.docs?.[item.key];
      const files = Array.isArray(docValue) ? docValue : docValue ? [docValue] : [];
      if (!rowHasData) return [];
      if (!files.length) return [`${item.label}: attach an image or PDF.`];
      if (files.some((file) => !isAllowedAttachmentFile(file))) return [`${item.label}: attachment must be an image or PDF up to 10 MB.`];
      return [];
    });
    if (attachmentErrors.length) {
      alert(attachmentErrors.join("\n"));
      return;
    }
    try {
      validateNonTeachingForm(form, "self", false);
    } catch (err) {
      alert(err.message);
      return;
    }
    if (!window.confirm("Submit your non-teaching appraisal? It will be locked and forwarded in the hierarchy.")) return;

    setSubmitting(true);
    try {
      const saved = await submitNonTeachingSelfAppraisal({
        form,
        role: normalizedRole,
        profile: profileFromsessionStorage(),
      });
      setForm(saved.form);
      const liveWorkflow = await loadNonTeachingWorkflow({
        email: saved.form?.info?.email || profileFromsessionStorage().email,
        academicYear: saved.form?.info?.ay || APP_INFO.DEFAULT_AY,
      }).catch(() => null);
      setWorkflow(liveWorkflow);
      setConfirmed(false);
      alert("Non-teaching appraisal submitted successfully.");
    } catch (err) {
      console.error("Could not submit non-teaching appraisal:", err);
      alert(`Unable to submit appraisal.\n\n${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const handleReport = () => {
    openNonTeachingReport({
      item: {
        name: form.info?.name,
        employeeId: form.info?.employeeId,
        designation: form.info?.designation,
        department: form.info?.department,
        appraisalRole: normalizedRole,
        status: form.status,
        academicYear: form.info?.ay,
      },
      form,
      visibleRoles: ["self"],
      includePartB: false,
    });
  };

  const content = (
    <main style={{ flex: 1, minWidth: 0, marginLeft: embedded ? 0 : 230, padding: embedded ? 0 : "22px 26px", overflowX: "auto" }}>
      {loading ? (
        <div style={{ color: "#64748b", padding: 30 }}>Loading appraisal...</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>Non-Teaching Staff Appraisal</h1>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>{nonTeachingRoleLabel(normalizedRole)} | AY {form.info?.ay || APP_INFO.DEFAULT_AY}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => navigate("/edit-profile")} style={S.headerButton}>Edit Profile</button>
              <AppraisalHeaderImage />
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              ["info", "General Information"],
              ["partA", "Part A"],
              ["summary", "Summary"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => {
                setTab(id);
                requestAnimationFrame(() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                });
              }} style={{ border: "none", borderRadius: 7, padding: "8px 16px", background: tab === id ? accent : "#e2e8f0", color: tab === id ? "#fff" : "#475569", fontFamily: "inherit", fontWeight: 800, cursor: "pointer", fontSize: 12 }}>
                {label}
              </button>
            ))}
          </div>

          <RejectionNotice
            form={form}
            status={form.status}
            alertOnceKey={`${form.info?.email || profileFromsessionStorage().email}:${form.info?.ay || APP_INFO.DEFAULT_AY}:${form.status || ""}`}
          />

          {tab === "info" && (
            <SectionCard title="General Information" accent={accent}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {[
                  ["Name", "name"],
                  ["Employee ID", "employeeId"],
                  ["Designation", "designation"],
                  ["Department / Office", "department"],
                  ["Reporting Head", "reportingHead"],
                  ["Academic Year", "ay"],
                ].map(([label, key]) => (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ color: "#334155", fontSize: 11, fontWeight: 800 }}>{label}</span>
                    <TextInput value={form.info?.[key]} onChange={(value) => updateInfo(key, value)} readOnly={locked && key !== "reportingHead"} />
                  </label>
                ))}
              </div>
            </SectionCard>
          )}

          {tab === "partA" && <SelfAppraisalTable form={form} setForm={setForm} readOnly={locked} accent={accent} />}
          {(tab === "info" || tab === "partA") && !locked && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
              <span style={{ color: draftSaved ? "#047857" : "#64748b", fontSize: 12, fontWeight: 800 }}>
                {draftSaved ? "Draft saved to server." : "Save this section draft to server."}
              </span>
              <button type="button" onClick={handleSaveDraft} disabled={savingDraft} style={{ ...S.headerButton, background: savingDraft ? "#94a3b8" : accent, color: "#fff", border: "none", cursor: savingDraft ? "wait" : "pointer" }}>
                {savingDraft ? "Saving..." : `Save ${tab === "info" ? "General Information" : "Part A"}`}
              </button>
            </div>
          )}
          {tab === "summary" && (
            <SummaryPanel
              form={form}
              role={normalizedRole}
              onSubmit={handleSubmit}
              onUpdateRemarks={updateRemarks}
              onUpdateSummaryOtherInfo={updateSummaryOtherInfo}
              onReport={handleReport}
              submitting={submitting}
              locked={locked}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              accent={accent}
              showReport={normalizedRole !== "registrar"}
            />
          )}
        </>
      )}
    </main>
  );

  if (embedded) return content;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f1f5f9", fontFamily: "inherit", color: "#0f172a" }}>
      <aside style={{ width: 230, height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 20, boxSizing: "border-box", background: "#0f172a", padding: "18px 14px 110px", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: 12, borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "2px 0 16px rgba(15,23,42,0.14)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={sessionStorage.getItem("name") || "Staff"} color={accent} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{sessionStorage.getItem("name") || "Staff"}</div>
            <div style={{ color: "#94a3b8", fontSize: 10 }}>{nonTeachingRoleLabel(normalizedRole)}</div>
          </div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
          {sidebarWorkflowText}
        </div>
        <div style={{ margin: "8px 0", padding: "10px 12px", background: "rgba(37,99,235,0.15)", border: "1px solid #2563eb", borderRadius: 8 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>For any queries</div>
          <a href="mailto:appraisal@dypiu.ac.in" style={{ color: "#60a5fa", fontWeight: 600, fontSize: 11, wordBreak: "break-all", textDecoration: "none" }}>appraisal@dypiu.ac.in</a>
        </div>
        <div style={S.sideActions}>
          <button type="button" onClick={() => setShowLogoutModal(true)} style={{ ...S.sideButton, color: "#f87171" }}>Logout</button>
        </div>
      </aside>
      {content}
      {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={() => { sessionStorage.clear(); navigate("/login", { replace: true }); }} />}
    </div>
  );
}

function AuthorityPartA({ form, setForm, reviewerRole, readOnly, visibleRoles = [] }) {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  const editableKey = role === "vc" ? "vcMarks" : role === "registrar" ? "regMarks" : "roMarks";
  const accent = roleAccent(role);
  const showReportingOfficer = visibleRoles.includes("ro");
  const showRegistrar = visibleRoles.includes("registrar");
  const showVc = visibleRoles.includes("vc");
  const reportingOfficerLabel = workflowDesignationForNonTeachingRole(form, "reporting_officer");
  const registrarLabel = workflowDesignationForNonTeachingRole(form, "registrar");
  const vcLabel = workflowDesignationForNonTeachingRole(form, "vc");
  const setMark = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: { ...(current[key] || {}), [editableKey]: value },
    }));
  };

  return (
    <SectionCard title="Part A - Self Appraisal Review" accent={accent}>
      <div style={{ overflowX: "auto" }}>
        <table style={T}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left" }}>Particular</th>
              <th style={{ ...TH, textAlign: "left" }}>Staff Description</th>
              <th style={TH}>Docs</th>
              <th style={TH}>Self</th>
              {showReportingOfficer && <th style={TH}>{reportingOfficerLabel}</th>}
              {showRegistrar && <th style={TH}>{registrarLabel}</th>}
              {showVc && <th style={TH}>{vcLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {SELF_ITEMS.map((item, index) => (
              <tr key={item.key} style={index % 2 ? { background: "#f8fafc" } : undefined}>
                <td style={{ ...TD, minWidth: 160, fontWeight: 800 }}>{item.label}<div style={{ color: "#64748b", fontSize: 10, fontWeight: 500 }}>Max {item.max}</div></td>
                <td style={{ ...TD, minWidth: 260 }}>{form[item.key]?.text || <span style={{ color: "#94a3b8" }}>No description</span>}</td>
                <td style={{ ...TD, minWidth: 180 }}><DocCell id={item.key} docs={form.docs || {}} readOnly /></td>
                <td style={TDC}>{form[item.key]?.marks || "-"}</td>
                {showReportingOfficer && (
                  <td style={TDC}>
                    {role === "reporting_officer" ? (
                      <MarksInput value={form[item.key]?.roMarks} max={item.max} readOnly={readOnly} accent={accent} onChange={(value) => setMark(item.key, value)} />
                    ) : form[item.key]?.roMarks || "-"}
                  </td>
                )}
                {showRegistrar && (
                  <td style={TDC}>
                    {role === "registrar" ? (
                      <MarksInput value={form[item.key]?.regMarks} max={item.max} readOnly={readOnly} accent={accent} onChange={(value) => setMark(item.key, value)} />
                    ) : form[item.key]?.regMarks || "-"}
                  </td>
                )}
                {showVc && (
                  <td style={TDC}>
                    <MarksInput value={form[item.key]?.vcMarks} max={item.max} readOnly={readOnly} accent={accent} onChange={(value) => setMark(item.key, value)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function AuthorityPartB({ form, setForm, reviewerRole, readOnly, visibleRoles = [] }) {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  const suffix = role === "vc" ? "vc" : role === "registrar" ? "reg" : "ro";
  const showReportingOfficer = visibleRoles.includes("ro");
  const showRegistrar = visibleRoles.includes("registrar");
  const showVc = visibleRoles.includes("vc");
  const reportingOfficerLabel = workflowDesignationForNonTeachingRole(form, "reporting_officer");
  const registrarLabel = workflowDesignationForNonTeachingRole(form, "registrar");
  const vcLabel = workflowDesignationForNonTeachingRole(form, "vc");
  const setRating = (sectionKey, index, value) => {
    setForm((current) => ({
      ...current,
      partB: {
        ...(current.partB || {}),
        [sectionKey]: {
          ...(current.partB?.[sectionKey] || {}),
          [`p${index}_${suffix}`]: value,
        },
      },
    }));
  };

  return (
    <>
      {RATING_SECTIONS.map((section) => (
        <SectionCard key={section.key} title={`${section.title} (Max ${section.max})`} accent={section.accent}>
          <div style={{ overflowX: "auto" }}>
            <table style={T}>
              <thead>
                <tr>
                  <th style={TH}>SN</th>
                  <th style={{ ...TH, textAlign: "left" }}>Parameter</th>
                  {showReportingOfficer && <th style={TH}>{reportingOfficerLabel}</th>}
                  {showRegistrar && <th style={TH}>{registrarLabel}</th>}
                  {showVc && <th style={TH}>{vcLabel}</th>}
                </tr>
              </thead>
              <tbody>
                {section.params.map((param, index) => {
                  const row = form.partB?.[section.key] || {};
                  return (
                    <tr key={param} style={index % 2 ? { background: "#f8fafc" } : undefined}>
                      <td style={TDC}>{index + 1}</td>
                      <td style={TD}>{param}</td>
                      {showReportingOfficer && (
                        <td style={TDC}>
                          {role === "reporting_officer" ? (
                            <RatingPicker value={row[`p${index}_ro`]} readOnly={readOnly} onChange={(value) => setRating(section.key, index, value)} />
                          ) : row[`p${index}_ro`] || "-"}
                        </td>
                      )}
                      {showRegistrar && (
                        <td style={TDC}>
                          {role === "registrar" ? (
                            <RatingPicker value={row[`p${index}_reg`]} readOnly={readOnly} onChange={(value) => setRating(section.key, index, value)} />
                          ) : row[`p${index}_reg`] || "-"}
                        </td>
                      )}
                      {showVc && (
                        <td style={TDC}>
                          <RatingPicker value={row[`p${index}_vc`]} readOnly={readOnly} onChange={(value) => setRating(section.key, index, value)} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ))}
    </>
  );
}

export function NonTeachingAuthorityReviewPanel({ item, reviewerRole, onBack, onSubmitted, readOnly = false }) {
  const role = normalizeNonTeachingRole(reviewerRole, reviewerRole);
  const [form, setForm] = useState(() => primeFormForReviewer(item.form, role));
  const [tab, setTab] = useState("partA");
  const [remarks, setRemarks] = useState(role === "vc" ? item.form?.vcRemarks : role === "registrar" ? item.form?.registrarRemarks : item.form?.roRemarks);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [workflow, setWorkflow] = useState(item.workflow || null);
  const finalisedByVc = role === "vc" && (
    normalizeNonTeachingStatus(item.status) === NON_TEACHING_STATUS.VC_APPROVED ||
    n(item.vcTotal) > 0
  );
  const [editingFinalised, setEditingFinalised] = useState(false);
  const locked = finalisedByVc
    ? !editingFinalised
    : readOnly;
  const accent = roleAccent(role);
  const subjectEmail = item.email || item.staff_email || form.info?.email;
  const academicYear = item.academicYear || item.academic_year || form.info?.ay || APP_INFO.DEFAULT_AY;
  useEffect(() => {
    let active = true;
    loadNonTeachingWorkflow({
      email: item.email || item.staff_email,
      academicYear: item.academicYear || item.academic_year || form.info?.ay || APP_INFO.DEFAULT_AY,
    })
      .then((liveWorkflow) => {
        if (active) setWorkflow(liveWorkflow);
      })
      .catch(() => {
        if (active) setWorkflow(item.workflow || emptyWorkflow);
      });
    return () => { active = false; };
  }, [item, form.info?.ay]);
  const displayWorkflow = workflow || emptyWorkflow;
  const visibleRoles = visibleNonTeachingReviewRoles(role, { ...item, workflow: displayWorkflow });
  const reviewerDesignation = workflowDesignationForNonTeachingRole({ ...item, form, workflow: displayWorkflow }, role);
  const selfTotals = calculateNonTeachingTotals(form, "self");
  const totals = calculateNonTeachingTotals(form, role === "vc" ? "vc" : role);
  const authorityScoreLabel = role === "vc" ? "Vice Chancellor Score" : `${reviewerDesignation} Score`;
  const remarksLabel = role === "vc" ? "Vice Chancellor Remarks and Grade" : `${reviewerDesignation} Remarks`;
  useEffect(() => {
    let active = true;
    if (locked || !subjectEmail) return undefined;
    loadReviewerDraft({ subjectEmail, academicYear, reviewerRole: role })
      .then((draft) => {
        if (!active || !draft?.payload) return;
        const draftForm = draft.payload.form || draft.payload.section_scores;
        if (draftForm) setForm(primeFormForReviewer(draftForm, role));
        setRemarks(draft.payload.remarks ?? "");
        setDraftStatus(draft.updated_at ? `Last saved: ${new Date(draft.updated_at).toLocaleString()}` : "Draft loaded");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Could not load non-teaching reviewer draft:", err);
        setDraftStatus(err?.message || "Could not load draft.");
      });
    return () => { active = false; };
  }, [academicYear, locked, role, subjectEmail]);

  const buildDraftForm = () => ({
    ...form,
    roRemarks: role === "reporting_officer" ? remarks : form.roRemarks,
    registrarRemarks: role === "registrar" ? remarks : form.registrarRemarks,
    vcRemarks: role === "vc" ? remarks : form.vcRemarks,
  });

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      const draftForm = buildDraftForm();
      await saveReviewerDraft({
        subjectEmail,
        academicYear,
        reviewerRole: role,
        payload: {
          part_a_score: totals.partA,
          part_b_score: totals.partB,
          total_score: totals.total,
          remarks,
          section_scores: draftForm,
          form: draftForm,
        },
      });
      setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
    } catch (err) {
      console.error("Could not save non-teaching reviewer draft:", err);
      alert(err?.message || "Unable to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      alert("Please verify and confirm the accuracy declaration before submitting the review.");
      return;
    }
    if (!remarks?.trim()) {
      alert("Remarks are mandatory. Please enter your remarks before submitting the review.");
      return;
    }
    try {
      validateNonTeachingForm(form, role === "vc" ? "vc" : role, true);
    } catch (err) {
      alert(err.message);
      return;
    }
    if (!window.confirm(finalisedByVc ? `Edit and resubmit ${reviewerDesignation} review?` : `Submit ${reviewerDesignation} review?`)) return;

    setSubmitting(true);
    try {
      const updated = await submitNonTeachingReview({
        item,
        form,
        reviewerRole: role,
        remarks,
      });
      alert(finalisedByVc ? `${reviewerDesignation} review resubmitted.` : `${reviewerDesignation} review submitted.`);
      onSubmitted?.(updated);
    } catch (err) {
      console.error("Could not submit non-teaching review:", err);
      alert(`Unable to submit review.\n\n${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = () => {
    openNonTeachingReport({
      item,
      form: {
        ...form,
        roRemarks: role === "reporting_officer" ? remarks : form.roRemarks,
        registrarRemarks: role === "registrar" ? remarks : form.registrarRemarks,
        vcRemarks: role === "vc" ? remarks : form.vcRemarks,
      },
      visibleRoles,
    });
  };

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: 10, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" onClick={onBack} style={{ background: "#1e293b", color: "#cbd5e1", border: "none", borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit" }}>Back</button>
        <Avatar name={item.name} color={item.avatarColor || accent} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#f8fafc", fontSize: 15, fontWeight: 800 }}>{item.name}</div>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>{item.roleLabel} | {item.designation} | {item.employeeId}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{reviewerDesignation} Total</div>
          <div style={{ color: accent, fontWeight: 900, fontSize: 16 }}>{totals.total.toFixed(1)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          ["partA", "Part A"],
          ["partB", "Part B"],
          ["remarks", "Summary"],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => {
            setTab(id);
            requestAnimationFrame(() => {
              window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            });
          }} style={{ border: "none", borderRadius: 7, padding: "8px 16px", background: tab === id ? accent : "#e2e8f0", color: tab === id ? "#fff" : "#475569", cursor: "pointer", fontFamily: "inherit", fontWeight: 800 }}>
            {label}
          </button>
        ))}
      </div>

      {finalisedByVc && locked && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => {
              setEditingFinalised(true);
              setConfirmed(false);
            }}
            style={{ padding: "10px 28px", background: accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 800, fontSize: 13, fontFamily: "inherit" }}
          >
            Edit Form
          </button>
        </div>
      )}

      <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
        {tab === "partA" && <AuthorityPartA form={form} setForm={setForm} reviewerRole={role} readOnly={locked} visibleRoles={visibleRoles} />}
        {tab === "partB" && <AuthorityPartB form={form} setForm={setForm} reviewerRole={role} readOnly={locked} visibleRoles={visibleRoles} />}
      </fieldset>
      {(tab === "partA" || tab === "partB") && !locked && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, margin: "12px 0 14px", flexWrap: "wrap" }}>
          <span style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>{draftStatus}</span>
          <button type="button" onClick={handleSaveDraft} disabled={savingDraft} style={{ padding: "10px 24px", border: "none", borderRadius: 7, background: savingDraft ? "#94a3b8" : "#2563eb", color: "#fff", cursor: savingDraft ? "not-allowed" : "pointer", fontWeight: 800, fontFamily: "inherit" }}>
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
        </div>
      )}

      {tab === "remarks" && (
        <SectionCard title={locked ? "Submitted Review" : `${reviewerDesignation} Remarks & Submission`} accent={accent}>
          {role === "vc" && visibleRoles.includes("ro") && form.roRemarks && <PriorRemark label={`${workflowDesignationForNonTeachingRole({ ...item, form }, "reporting_officer")} Remarks`} value={form.roRemarks} color={ACCENT} />}
          {role === "vc" && visibleRoles.includes("registrar") && form.registrarRemarks && <PriorRemark label={`${workflowDesignationForNonTeachingRole({ ...item, form }, "registrar")} Remarks`} value={form.registrarRemarks} color={REG_ACCENT} />}

          <div style={{ color: "#334155", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Staff Submitted Score</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              ["Part A", selfTotals.partA, NON_TEACHING_MAX.partA],
              ["Part B", selfTotals.partB, NON_TEACHING_MAX.partB],
              ["Grand Total", selfTotals.total, NON_TEACHING_MAX.grand],
            ].map(([label, value, max]) => (
              <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: "10px 12px" }}>
                <div style={{ color: "#64748b", fontSize: 10, fontWeight: 800 }}>{label}</div>
                <div style={{ color: "#1d4ed8", fontSize: 18, fontWeight: 900 }}>{n(value).toFixed(1)} / {max}</div>
              </div>
            ))}
          </div>

          <div style={{ color: "#334155", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{authorityScoreLabel}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              ["Part A", totals.partA, NON_TEACHING_MAX.partA],
              ["Part B", totals.partB, NON_TEACHING_MAX.partB],
              ["Grand Total", totals.total, NON_TEACHING_MAX.grand],
            ].map(([label, value, max]) => (
              <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: "10px 12px" }}>
                <div style={{ color: "#64748b", fontSize: 10, fontWeight: 800 }}>{label}</div>
                <div style={{ color: accent, fontSize: 18, fontWeight: 900 }}>{n(value).toFixed(1)} / {max}</div>
              </div>
            ))}
          </div>

          <label style={{ fontSize: 12, color: "#334155", fontWeight: 800, display: "block", marginBottom: 6 }}>{remarksLabel}</label>
          <TextArea value={remarks} onChange={setRemarks} readOnly={locked} rows={4} placeholder="Enter review remarks and recommendations..." />

          {!locked && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, padding: "11px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} style={{ marginTop: 3 }} />
              <span>I have verified all details and confirm that this review is accurate.</span>
            </label>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>{draftStatus}</span>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={onBack} style={{ padding: "9px 18px", border: "none", borderRadius: 7, background: "#f1f5f9", color: "#475569", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }}>{locked ? "Close" : "Cancel"}</button>
            {role !== "registrar" && (
              <button type="button" onClick={handleReport} style={{ padding: "9px 18px", border: "none", borderRadius: 7, background: "#e2e8f0", color: "#475569", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }}>Generate Report</button>
            )}
            {!locked && (
              <>
              <button type="button" onClick={handleSaveDraft} disabled={savingDraft} style={{ padding: "10px 24px", border: "none", borderRadius: 7, background: savingDraft ? "#94a3b8" : "#2563eb", color: "#fff", cursor: savingDraft ? "not-allowed" : "pointer", fontWeight: 800, fontFamily: "inherit" }}>
                {savingDraft ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" onClick={handleSubmit} disabled={!confirmed || !remarks.trim() || submitting} style={{ padding: "10px 24px", border: "none", borderRadius: 7, background: (confirmed && remarks.trim()) ? accent : "#94a3b8", color: "#fff", cursor: confirmed && remarks.trim() && !submitting ? "pointer" : "not-allowed", fontWeight: 800, fontFamily: "inherit" }}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
              </>
            )}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function PriorRemark({ label, value, color }) {
  return (
    <div style={{ background: `${color}12`, border: `1px solid ${color}35`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
      <div style={{ color, fontSize: 10, textTransform: "uppercase", fontWeight: 900, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function QueueCard({ item, active, onClick, accent }) {
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", border: "none", borderLeft: active ? `3px solid ${accent}` : "3px solid transparent", borderRadius: 8, padding: "10px 11px", textAlign: "left", background: active ? `${accent}22` : "transparent", cursor: "pointer", marginBottom: 6, fontFamily: "inherit" }}>
      <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 12 }}>{item.name}</div>
      <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{item.roleLabel}</div>
    </button>
  );
}

export function NonTeachingReviewDashboard({ reviewerRole, title, subtitle, accent = ACCENT }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("review");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const queue = await fetchNonTeachingQueueForRole({
        reviewerRole,
        academicYear: APP_INFO.DEFAULT_AY,
      });
      setItems(queue);
      if (selectedId && !queue.some((item) => item.id === selectedId)) {
        setSelectedId("");
      }
    } catch (err) {
      console.error("Could not load non-teaching queue:", err);
      setLoadError(err.message || "Could not load non-teaching review queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadQueue, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewerRole]);

  const selected = items.find((item) => item.id === selectedId);
  const pendingCount = items.length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f1f5f9", color: "#0f172a", fontFamily: "inherit" }}>
      <aside style={{ width: 244, height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 20, boxSizing: "border-box", background: "#0f172a", color: "#e2e8f0", display: "flex", flexDirection: "column", padding: "18px 14px 86px", gap: 12, borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "2px 0 16px rgba(15,23,42,0.14)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={sessionStorage.getItem("name") || title} color={accent} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 900 }}>{title}</div>
            <div style={{ color: "#94a3b8", fontSize: 10 }}>{subtitle}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["review", "Review Queue"],
            ["self", "My Appraisal"],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => {
              setTab(id);
              requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
              });
            }} style={{ flex: 1, border: "none", borderRadius: 7, padding: "7px 6px", background: tab === id ? accent : "#1e293b", color: tab === id ? "#fff" : "#94a3b8", cursor: "pointer", fontSize: 10, fontWeight: 800, fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "review" && (
          <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px", color: "#94a3b8", fontSize: 11 }}>
            <strong style={{ color: "#e2e8f0" }}>{pendingCount}</strong> appraisals pending your review
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "review" && (
            loading ? (
              <div style={{ color: "#64748b", fontSize: 11, padding: "10px 4px" }}>Loading queue...</div>
            ) : loadError ? (
              <div style={{ color: "#fecaca", background: "#7f1d1d", border: "1px solid #991b1b", borderRadius: 8, fontSize: 11, padding: "10px 11px", lineHeight: 1.45 }}>{loadError}</div>
            ) : items.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 11, padding: "10px 4px" }}>No appraisals in your queue.</div>
            ) : items.map((item) => (
              <QueueCard key={item.id} item={item} active={selectedId === item.id} onClick={() => setSelectedId(item.id)} accent={accent} />
            ))
          )}
        </div>

        <div style={{ margin: "8px 0", padding: "10px 12px", background: "rgba(37,99,235,0.15)", border: "1px solid #2563eb", borderRadius: 8 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>For any queries</div>
          <a href="mailto:appraisal@dypiu.ac.in" style={{ color: "#60a5fa", fontWeight: 600, fontSize: 11, wordBreak: "break-all", textDecoration: "none" }}>appraisal@dypiu.ac.in</a>
        </div>
        <div style={S.sideActions}>
          <button type="button" onClick={() => setShowLogoutModal(true)} style={{ ...S.sideButton, color: "#f87171" }}>Logout</button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, marginLeft: 244, padding: "22px 26px", overflowX: "auto" }}>
        {tab === "self" ? (
          <NonTeachingAppraisalForm role={reviewerRole} embedded />
        ) : loadError ? (
          <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, padding: "16px 18px", fontSize: 13, marginTop: 28 }}>
            Unable to load the review queue. {loadError}
          </div>
        ) : !selected ? (
          <div style={{ color: "#64748b", fontSize: 14, marginTop: 40, textAlign: "center" }}>
            {items.length === 0 ? "No submitted appraisals to review." : "Select an appraisal from the queue."}
          </div>
        ) : (
          <NonTeachingAuthorityReviewPanel
            item={selected}
            reviewerRole={reviewerRole}
            readOnly={false}
            onBack={() => setSelectedId("")}
            onSubmitted={(updated) => {
              setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
              setSelectedId("");
              loadQueue();
            }}
          />
        )}
      </main>

      {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={() => { sessionStorage.clear(); navigate("/login", { replace: true }); }} />}
    </div>
  );
}

function LogoutModal({ onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "grid", placeItems: "center" }} onClick={onCancel}>
      <div style={{ width: "min(380px, 92vw)", background: "#fff", borderRadius: 12, padding: "26px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ color: "#0f172a", fontWeight: 900, fontSize: 17, marginBottom: 8 }}>Confirm Logout</div>
        <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>You are about to leave {APP_INFO.PORTAL_NAME}. Any unsaved edits will be lost.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, border: "none", borderRadius: 8, background: "#f1f5f9", color: "#475569", padding: "10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, border: "none", borderRadius: 8, background: "#dc2626", color: "#fff", padding: "10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Logout</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  headerButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
    color: "#0f172a",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    fontFamily: "inherit",
  },
  sideButton: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: 8,
    background: "#1e293b",
    color: "#e2e8f0",
    padding: "9px 11px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    fontFamily: "inherit",
  },
  sideActions: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 10,
    borderTop: "1px solid #1e293b",
    background: "#0f172a",
  },
};

export default function NonTeachingStaffDashboard() {
  return <NonTeachingAppraisalForm role="non_teaching_staff" />;
}
