import { useRef, useState } from "react";
import { api } from "../../../services/api";
import { isAllowedAttachmentFile } from "../../../utils/appraisalFormUtils";

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}


export function SectionCard({ title, subtitle, accent = "#6366f1", scoreBadge, children }) {
  return (
    <div className="fa-section-card appraisal-section-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 18px 50px rgba(17,24,39,0.08)", marginBottom: 24, overflow: "hidden", border: "1px solid #e5e7eb", borderTop: `3px solid ${accent}` }}>
      <div className="appraisal-part-header" style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "linear-gradient(180deg,#ffffff 0%,#fbfbff 100%)" }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span className="appraisal-part-icon" style={{ width: 36, height: 36, borderRadius: 12, background: `${accent}14`, color: accent, border: `1px solid ${accent}2e`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 3 7l9 4 9-4-9-4Z" />
              <path d="M5 10v5c2 2 12 2 14 0v-5" />
              <path d="M12 11v8" />
            </svg>
          </span>
          <div>
            <div className="appraisal-part-title" style={{ fontWeight: 800, fontSize: 18, color: accent, letterSpacing: 0 }}>{title}</div>
            {subtitle && <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>{subtitle}</div>}
          </div>
        </div>
        {scoreBadge && (
          <div className="appraisal-part-score" style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "7px 10px 7px 12px", boxShadow: "0 8px 18px rgba(17,24,39,0.05)" }}>
            <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 800 }}>Total Score</span>
            <span style={{ background: "#eef2ff", color: accent, borderRadius: 10, padding: "6px 11px", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>{scoreBadge}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

export function RowButtons({ onAdd, onDel, canDel = true, addLabel = "+ Add Row", deleteLabel = "- Delete Last" }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
      <button type="button" className="appraisal-add-row-button" style={{ minHeight: 40, padding: "9px 16px", background: "#fff", color: "#5b5ceb", border: "1px solid #5b5ceb", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "inherit" }} onClick={onAdd}>{addLabel}</button>
      {canDel && <button type="button" className="appraisal-danger-button" style={{ minHeight: 40, padding: "9px 16px", background: "#fff", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: "inherit" }} onClick={onDel}>{deleteLabel}</button>}
    </div>
  );
}

export function SectionSaveFooter({ label, saved, saving, locked, onSave, variant = "inline" }) {
  const isCard = variant === "card";
  return (
    <div style={isCard ? { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", boxShadow: "0 10px 24px rgba(17,24,39,0.06)" } : { marginTop: 22, paddingTop: 18, borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <span style={{ color: saved ? "#047857" : "#6b7280", fontSize: 14, fontWeight: isCard ? 800 : 700 }}>
        {locked ? "Submitted and locked" : saved ? `${label} saved to server.` : `Save ${label} draft to server.`}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={locked || saving}
        style={{ minHeight: 40, padding: isCard ? "9px 16px" : "10px 24px", background: locked ? "#9ca3af" : "#5b5ceb", color: "#fff", border: "none", borderRadius: 10, cursor: locked || saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit", opacity: saving ? 0.75 : 1, boxShadow: locked ? "none" : "0 10px 20px rgba(91,92,235,0.22)" }}
      >
        {saving ? "Saving..." : `Save ${label}`}
      </button>
    </div>
  );
}

export function DocCell({ id, docs, setDocs, readOnly = false }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const files = Array.isArray(docs?.[id]) ? docs[id] : docs?.[id] ? [docs[id]] : [];

  const handleFiles = async (fileList) => {
    if (readOnly) return;
    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return;

    const invalidFile = selectedFiles.find((file) => !isAllowedAttachmentFile(file) || file.size > 10 * 1024 * 1024);
    if (invalidFile) {
      setUploadError("Only image or PDF files up to 10 MB are allowed.");
      if (ref.current) ref.current.value = "";
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const uploadedFiles = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `faculty-appraisal/${id}`);
        uploadedFiles.push(await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }));
      }

      setDocs((prev) => ({
        ...prev,
        [id]: [...(Array.isArray(prev[id]) ? prev[id] : prev[id] ? [prev[id]] : []), ...uploadedFiles],
      }));
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message);
      alert(`Unable to upload file.\n\n${err.message}`);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const removeFile = (idx) => {
    setDocs((prev) => {
      const updated = [...(Array.isArray(prev[id]) ? prev[id] : prev[id] ? [prev[id]] : [])];
      updated.splice(idx, 1);
      return { ...prev, [id]: updated };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 110 }}>
      {files.map((file, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 999, padding: "5px 8px" }}>
          <span aria-hidden="true" style={{ color: "#22c55e", fontSize: 10, fontWeight: 900 }}>OK</span>
          <span style={{ fontSize: 11, color: "#14532d", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }} title={file.name}>{file.name}</span>
          {!readOnly && <button type="button" onClick={() => removeFile(idx)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer", fontWeight: 800 }}>Remove</button>}
        </div>
      ))}
      <div role="button" tabIndex={readOnly ? -1 : 0} aria-label="Attach supporting document" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: uploading || readOnly ? "not-allowed" : "pointer", minHeight: 40, padding: "8px 12px", border: "1px dashed #d1d5db", borderRadius: 10, background: "#fff", opacity: uploading || readOnly ? 0.7 : 1, color: "#4b5563", fontWeight: 800 }} onClick={() => !uploading && !readOnly && ref.current?.click()} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !uploading && !readOnly) ref.current?.click(); }}>
        <PaperclipIcon />
        <span style={{ fontSize: 13 }}>{uploading ? "Uploading..." : "Attach"}</span>
        <input ref={ref} type="file" multiple accept="image/*,.pdf,application/pdf" style={{ display: "none" }} disabled={uploading || readOnly} onChange={(event) => handleFiles(event.target.files)} />
      </div>
      {uploadError && <span role="alert" style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>{uploadError}</span>}
    </div>
  );
}

export function ViewCell({ id, docs }) {
  return <ViewDocsCell docKey={id} docs={docs} emptyText="" compact />;
}

export function ViewDocsCell({ docKey, docs, emptyText = "No docs", compact = false }) {
  const docKeys = Array.isArray(docKey) ? docKey : [docKey];
  const files = docKeys.flatMap((key) => Array.isArray(docs?.[key]) ? docs[key] : docs?.[key] ? [docs[key]] : []);

  if (!files.length) {
    return emptyText ? <span style={{ color: "#cbd5e1", fontSize: 10 }}>{emptyText}</span> : null;
  }

  return (
    <div style={{ display: "flex", flexDirection: compact ? "row" : "column", gap: compact ? 5 : 6, alignItems: compact ? "center" : "flex-start", justifyContent: "center", flexWrap: "wrap" }}>
      {files.map((file, idx) => (
        <div key={`${file.url || file.name || "doc"}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${file.name || "document"}`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#4338ca", fontSize: compact ? 0 : 12, textDecoration: "none", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: compact ? "50%" : 999, padding: compact ? 0 : "7px 10px", width: compact ? 34 : "auto", height: compact ? 34 : "auto", whiteSpace: "nowrap", fontWeight: 800 }}
            title={`View ${file.name || "document"}`}
          >
            {file.type?.startsWith("image/") && <img src={file.url} alt="" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 3 }} />}
            <EyeIcon />
            {!compact && <>View {file.name?.length > 16 ? `${file.name.slice(0, 16)}...` : file.name || "Document"}</>}
          </a>
          <a
            href={file.url}
            download={file.name || true}
            aria-label={`Download ${file.name || "document"}`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#047857", fontSize: compact ? 0 : 12, textDecoration: "none", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: compact ? "50%" : 999, padding: compact ? 0 : "7px 10px", width: compact ? 34 : "auto", height: compact ? 34 : "auto", whiteSpace: "nowrap", fontWeight: 800 }}
            title={`Download ${file.name || "document"}`}
          >
            <DownloadIcon />
            {!compact && <>Download</>}
          </a>
        </div>
      ))}
    </div>
  );
}


