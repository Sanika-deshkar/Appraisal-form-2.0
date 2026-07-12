import { useRef, useState } from "react";
import { api } from "../../../services/api";
import { isAllowedAttachmentFile } from "../../../utils/appraisalFormUtils";


export function SectionCard({ title, subtitle, accent = "#6366f1", children }) {
  return (
    <div className="fa-section-card" style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(15,23,42,0.07)", marginBottom: 14, overflow: "hidden", border: "1px solid #e8ecf0", borderTop: `3px solid ${accent}` }}>
      <div style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: accent }}>{title}</div>
        {subtitle && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "13px 15px" }}>{children}</div>
    </div>
  );
}

export function RowButtons({ onAdd, onDel, canDel = true, addLabel = "+ Add Row", deleteLabel = "- Delete Last" }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <button type="button" style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600 }} onClick={onAdd}>{addLabel}</button>
      {canDel && <button type="button" style={{ padding: "6px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600 }} onClick={onDel}>{deleteLabel}</button>}
    </div>
  );
}

export function SectionSaveFooter({ label, saved, saving, locked, onSave, variant = "inline" }) {
  const isCard = variant === "card";
  return (
    <div style={isCard ? { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } : { marginTop: 18, paddingTop: 14, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <span style={{ color: saved ? "#047857" : "#64748b", fontSize: 12, fontWeight: isCard ? 800 : 700 }}>
        {locked ? "Submitted and locked" : saved ? `${label} saved to server.` : `Save ${label} draft to server.`}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={locked || saving}
        style={{ padding: isCard ? "8px 12px" : "9px 22px", background: locked ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 7, cursor: locked || saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit", opacity: saving ? 0.75 : 1 }}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {files.map((file, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: 4, padding: "2px 6px" }}>
          <span style={{ fontSize: 10, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }} title={file.name}>{file.name}</span>
          {!readOnly && <button type="button" onClick={() => removeFile(idx)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 10, cursor: "pointer" }}>Remove</button>}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: uploading || readOnly ? "not-allowed" : "pointer", padding: "4px 6px", border: "1px dashed #cbd5e1", borderRadius: 4, background: "#f8fafc", opacity: uploading || readOnly ? 0.7 : 1 }} onClick={() => !uploading && !readOnly && ref.current?.click()}>
        <span style={{ fontSize: 10, color: "#64748b" }}>{uploading ? "Uploading..." : "Attach"}</span>
        <input ref={ref} type="file" multiple accept="image/*,.pdf,application/pdf" style={{ display: "none" }} disabled={uploading || readOnly} onChange={(event) => handleFiles(event.target.files)} />
      </div>
      {uploadError && <span style={{ color: "#dc2626", fontSize: 9 }}>{uploadError}</span>}
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
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 2 : 3 }}>
      {files.map((file, idx) => (
        <a
          key={`${file.url || file.name || "doc"}-${idx}`}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3b82f6", fontSize: 10, textDecoration: "none", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}
          title={file.name}
        >
          {file.type?.startsWith("image/") && <img src={file.url} alt="" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 3 }} />}
          View {file.name?.length > 16 ? `${file.name.slice(0, 16)}...` : file.name || "Document"}
        </a>
      ))}
    </div>
  );
}


