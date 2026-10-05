/**
 * SchemaSectionTable — schema-driven renderer for one appraisal form section.
 *
 * The top-level `SchemaSectionTable` default export is scaffolding, not wired into
 * any route yet. `SchemaFieldCell`, however, is used directly by
 * AssignedSchemaPreview.jsx to render custom (admin-built) forms for faculty.
 * StandardMyAppraisal.jsx, CreativeSchoolAppraisalForm.jsx and PartA-D/*.jsx remain
 * the live, hand-coded forms for the built-in form families.
 *
 * Every visual primitive below (T/TH/TD/TDC/TDS style objects, TI, RO, DocCell,
 * ViewCell, RowButtons, the raw <select> styling, the HOD/Director score-input
 * styling, the "delete only removes the last row" convention) is copied from the
 * existing hand-coded forms rather than redesigned — see the imports.
 *
 * Field/column `type` is the closed enum from the task spec:
 *   text | textarea | number | integer | date | dropdown | conditionalText |
 *   checkbox | computed | file | table
 * A field of type "table" on a section describes the per-row grid (its `columns`
 * array is the column list); any other fields on the section are singular,
 * non-tabular inputs rendered above the grid.
 *
 * Scoring is intentionally NOT computed generically here — the task requires every
 * existing scoring formula to be ported verbatim from utils/appraisalFormUtils.js,
 * keyed by section code, not re-derived from field metadata. Callers pass the
 * already-computed section score in via `sectionScore`.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clampScore, maskDateDDMMYYYY } from "../../../utils/appraisalFormUtils";
import { T, TH, TH_HOD, TH_DIR, TH_DEAN, TH_VC, TD, TDC, TDS, TDS_HOD, TDS_DIR, TDS_DEAN, TDS_VC } from "./formPrimitiveStyles";
import { SectionCard as SC, RowButtons, DocCell, ViewCell, EmptySectionRow } from "./formPrimitives";
import { TI, RO } from "../shared";

// Custom-built dropdown for "dropdown"/"conditionalText" fields. A plain <select>'s
// option list is native OS/browser chrome (Chromium in particular ignores almost
// every CSS property on <option>), so it can't be made to match the app's own
// panel/hover styling — this renders the open menu as a normal styled <div> instead.
const DROPDOWN_TRANSITION_MS = 160;

function SchemaDropdown({ value, options, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  // `mounted` keeps the menu in the DOM slightly past `open` turning false, so
  // its close transition (opacity/transform) has time to play instead of the
  // menu just vanishing on the same frame the click is registered.
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuRect, setMenuRect] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  const openMenu = () => {
    clearTimeout(closeTimerRef.current);
    setMounted(true);
    // Mount closed first, then flip to open on the next frame so the browser
    // has a "from" state to transition out of instead of starting at "open".
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
  };

  const closeMenu = () => {
    setOpen(false);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setMounted(false), DROPDOWN_TRANSITION_MS);
  };

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // The trigger lives inside a narrow, overflow-clipped table cell, so the open
  // menu can't be a normal absolutely-positioned child (it gets clipped by the
  // cell and squeezed to the column's width). Portal it to <body> instead and
  // compute its position from the trigger's real screen position.
  useLayoutEffect(() => {
    if (!mounted) return undefined;

    const reposition = () => {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < Math.min(menuHeight + 12, 260) && rect.top > spaceBelow;
      const width = Math.max(rect.width, 200);
      setMenuRect({
        left: Math.min(rect.left, window.innerWidth - width - 8),
        width,
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return undefined;
    const handleClickOutside = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted]);

  const normalized = (options || []).map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value, label: opt.label ?? opt.value }
  );
  const selected = normalized.find((opt) => opt.value === value);
  const highlighted = open || focused;

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          border: `1px solid ${disabled ? "#e2e8f0" : highlighted ? "#6366f1" : hover ? "#a5b4fc" : "#cbd5e1"}`,
          borderRadius: 8,
          background: disabled ? "#fafafa" : "#fff",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 500,
          padding: "0 12px",
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: highlighted && !disabled ? "0 0 0 3px rgba(99, 102, 241, 0.14)" : "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: disabled ? "#94a3b8" : selected ? "#1e293b" : "#94a3b8",
            fontWeight: selected ? 600 : 500,
          }}
        >
          {selected ? selected.label : placeholder || "Select"}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke={disabled ? "#94a3b8" : "#6366f1"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {mounted &&
        !disabled &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: menuRect?.left ?? 0,
              top: menuRect?.top,
              bottom: menuRect?.bottom,
              width: menuRect?.width,
              visibility: menuRect ? "visible" : "hidden",
              zIndex: 1000,
              boxSizing: "border-box",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 20px 40px -8px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.06)",
              padding: 8,
              maxHeight: 260,
              overflowY: "auto",
              textAlign: "left",
              fontFamily: "inherit",
              opacity: open ? 1 : 0,
              transform: `translateY(${open ? 0 : menuRect?.bottom !== undefined ? 4 : -4}px) scale(${open ? 1 : 0.97})`,
              transformOrigin: menuRect?.bottom !== undefined ? "bottom" : "top",
              pointerEvents: open ? "auto" : "none",
              transition: `opacity ${DROPDOWN_TRANSITION_MS}ms ease, transform ${DROPDOWN_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            <div style={{ paddingBottom: 6, marginBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
              <SchemaDropdownOption
                label={placeholder || "Select"}
                muted
                onClick={() => {
                  onChange?.("");
                  closeMenu();
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {normalized.map((opt) => (
                <SchemaDropdownOption
                  key={opt.value}
                  label={opt.label}
                  selected={opt.value === value}
                  onClick={() => {
                    onChange?.(opt.value);
                    closeMenu();
                  }}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function SchemaDropdownOption({ label, selected, muted, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        color: selected ? "#4338ca" : muted ? "#94a3b8" : "#1e293b",
        fontStyle: muted ? "italic" : "normal",
        background: selected ? "#eef2ff" : hover ? "#f8fafc" : "transparent",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {selected && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2.5 7.2l3 3 6-6.4" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// Matches the "Any other..." free-text reveal used for conditionalText fields
// (e.g. innovative-method "methodOther" input, StandardMyAppraisal.jsx:2151).
const conditionalTextStyle = {
  width: "100%",
  height: 30,
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  background: "#fff",
  fontFamily: "inherit",
  fontSize: 11,
  marginTop: 6,
  padding: "0 8px",
  boxSizing: "border-box",
};

// No table-cell checkbox exists anywhere in the current hardcoded forms to copy —
// the only precedent is the summary declaration checkbox (StandardMyAppraisal.jsx:3427).
// This adapts that same accentColor/sizing to a table-cell context; flag for review
// once a real "checkbox" field shows up in a live schema response.
function SchemaCheckbox({ checked, onChange, disabled, accent = "#2563eb" }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
      style={{ width: 18, height: 18, accentColor: accent, cursor: disabled ? "not-allowed" : "pointer" }}
    />
  );
}

// Role-specific reviewer score input, matching DirectorInput (ReviewerInput.jsx)
// and HodInput (Inputs.jsx) styling exactly (border/shadow color keyed by role).
const REVIEW_ROLE_STYLE = {
  hod: { border: "#6366f1", shadow: "rgba(99,102,241,0.08)", th: TH_HOD, tds: TDS_HOD },
  center_head: { border: "#6366f1", shadow: "rgba(99,102,241,0.08)", th: TH_HOD, tds: TDS_HOD },
  director: { border: "#0ea5e9", shadow: "rgba(14,165,233,0.08)", th: TH_DIR, tds: TDS_DIR },
  dean: { border: "#7c3aed", shadow: "rgba(124,58,237,0.08)", th: TH_DEAN, tds: TDS_DEAN },
  vc: { border: "#d97706", shadow: "rgba(217,119,6,0.08)", th: TH_VC, tds: TDS_VC },
  registrar: { border: "#0891b2", shadow: "rgba(8,145,178,0.08)", th: TH_DIR, tds: TDS_DIR },
};

function ReviewScoreInput({ val, onChange, max, disabled = false, role = "director" }) {
  const roleStyle = REVIEW_ROLE_STYLE[role] || REVIEW_ROLE_STYLE.director;
  return (
    <input
      type="number"
      min="0"
      step="0.5"
      value={val ?? ""}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" || max === undefined ? e.target.value : String(clampScore(e.target.value, max)))}
      style={{
        width: 74,
        height: 34,
        boxSizing: "border-box",
        textAlign: "center",
        border: disabled ? "1px solid #cbd5e1" : `1.5px solid ${roleStyle.border}`,
        borderRadius: 9,
        padding: "6px 8px",
        fontSize: 13,
        fontFamily: "inherit",
        fontWeight: 800,
        color: disabled ? "#94a3b8" : "#111827",
        outline: "none",
        background: disabled ? "#f8fafc" : "#ffffff",
        cursor: disabled ? "not-allowed" : "text",
        boxShadow: disabled ? "none" : `0 0 0 3px ${roleStyle.shadow}, 0 8px 18px ${roleStyle.shadow}`,
        transition: "border-color 180ms ease, box-shadow 180ms ease, background 180ms ease",
      }}
    />
  );
}

/**
 * Renders one field's value according to its schema `type`. Used both for
 * singular section-level fields and for one column inside a table row.
 */
export function SchemaFieldCell({ field, value, onChange, mode = "self", readOnly = false, center = false, docId, docs, setDocs }) {
  const isReview = mode === "review";
  const disabled = readOnly || isReview;
  const type = field?.type;

  if (type === "computed") {
    return <RO val={value} center={center} />;
  }

  if (isReview) {
    // Review mode never edits the faculty's own data — always read-only display,
    // matching every Director*/Hod* PartA-D reviewer view (e.g. DirectorLecturesTable.jsx).
    if (type === "file") return <ViewCell id={docId} docs={docs} />;
    if (type === "checkbox") return <SchemaCheckbox checked={value} disabled />;
    return <RO val={value} center={center} />;
  }

  switch (type) {
    case "number":
      return <TI val={value} onChange={onChange} numeric center={center} readOnly={disabled} max={field?.maxMarks} />;
    case "integer":
      return <TI val={value} onChange={onChange} integer center={center} readOnly={disabled} max={field?.maxMarks} />;
    case "date":
      return (
        <TI
          val={value}
          onChange={(v) => onChange?.(maskDateDDMMYYYY(v))}
          placeholder="DD/MM/YYYY"
          readOnly={disabled}
        />
      );
    case "dropdown":
      return (
        <SchemaDropdown
          value={value}
          options={field?.options}
          onChange={onChange}
          disabled={disabled}
          placeholder={field?.label ? `Select ${field.label}` : "Select"}
        />
      );
    case "conditionalText":
      return (
        <>
          <SchemaDropdown
            value={value?.selected}
            options={field?.options}
            onChange={(v) => onChange?.({ ...value, selected: v })}
            disabled={disabled}
            placeholder={field?.label ? `Select ${field.label}` : "Select"}
          />
          {value?.selected === field?.triggerValue && (
            <input
              type="text"
              value={value?.extra || ""}
              disabled={disabled}
              onChange={(e) => onChange?.({ ...value, extra: e.target.value })}
              placeholder={field?.extraLabel || ""}
              style={conditionalTextStyle}
            />
          )}
        </>
      );
    case "checkbox":
      return <SchemaCheckbox checked={value} onChange={onChange} disabled={disabled} />;
    case "file":
      return <DocCell id={docId} docs={docs} setDocs={setDocs} readOnly={disabled} compact />;
    case "textarea":
      return <TI val={value} onChange={onChange} readOnly={disabled} placeholder={field?.label} />;
    case "text":
    default:
      return <TI val={value} onChange={onChange} readOnly={disabled} center={center} placeholder={field?.label} textOnly />;
  }
}

/**
 * Renders the per-row grid for a section's single `type: "table"` field.
 * Mirrors the exact table shell used across StandardMyAppraisal.jsx sections:
 * <table style={T]}> / <thead><th style={TH}>…</th></thead> / alternating row
 * background / SN column / RowButtons below (delete removes only the last row).
 */
function SchemaTableField({ field, rows, onRowsChange, mode, reviewerRole, reviewerLabel, reviewMax, rowDisabled, docs, setDocs, locked, previousReviewers = [] }) {
  const rawColumns = field?.columns || [];
  const isReview = mode === "review";
  // Rule: a "file" column always gets an automatic read-only "View Docs" column
  // immediately to its right, matching the built-in appraisal forms' Attachment/View
  // Docs pairing. Applies to every table in the dynamic (custom-schema) form.
  //
  // In review mode, the original file column itself is dropped from what renders —
  // a reviewer only ever needs "View Docs" to open the attachment; keeping both
  // showed two document-shaped cells for the same one file, which read as two
  // clickable buttons. Faculty's own fill-in view (mode="self") keeps both, since
  // that original column is where they actually upload.
  const columns = rawColumns.flatMap((col) => col.type === "file"
    ? (isReview ? [{ name: `${col.name}__viewDocs`, isAutoViewDocs: true, sourceColumn: col }]
      : [col, { name: `${col.name}__viewDocs`, isAutoViewDocs: true, sourceColumn: col }])
    : [col]);
  const safeRows = Array.isArray(rows) ? rows : [];

  const blankRow = () => {
    const row = {};
    rawColumns.forEach((col) => {
      row[col.name] = col.type === "checkbox" ? false : "";
    });
    return row;
  };

  const setCell = (rowIndex, colName, value) => {
    const next = safeRows.map((r, i) => (i === rowIndex ? { ...r, [colName]: value } : r));
    onRowsChange(next);
  };

  const setReview = (rowIndex, value) => {
    const next = safeRows.map((r, i) => (i === rowIndex ? { ...r, [`review_${reviewerRole}`]: value } : r));
    onRowsChange(next);
  };

  const addRow = () => onRowsChange([...safeRows, blankRow()]);
  const deleteLastRow = () => onRowsChange(safeRows.length > 1 ? safeRows.slice(0, -1) : safeRows);

  const scoreColumn = columns.find((c) => c.type === "computed" || c.type === "number" || c.type === "integer");
  const roleStyle = REVIEW_ROLE_STYLE[reviewerRole] || REVIEW_ROLE_STYLE.director;
  const snWidth = field?.autoSerial ? 30 : 0;
  const dataColWidth = columns.length ? `calc((100% - ${snWidth}px) / ${columns.length})` : undefined;

  // Rule: whenever the table has a configured max marks, an automatic "Total Score"
  // footer bar appears, summing every number/integer column across all rows.
  const showTotal = !isReview && Number(field?.maxMarks) > 0 && columns.length > 0;
  const totalScore = showTotal
    ? safeRows.reduce((rowSum, row) => rowSum + rawColumns.reduce((sum, col) => {
        if (!["number", "integer"].includes(col.type)) return sum;
        const value = Number(row[col.name]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0), 0)
    : 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={T}>
        <thead>
          <tr>
            {field?.autoSerial && <th style={{ ...TH, width: 30, minWidth: 30, maxWidth: 30 }}>SN</th>}
            {columns.map((col) => (
              <th key={col.name} style={{ ...TH, width: dataColWidth }}>
                {col.isAutoViewDocs ? "View Docs" : (col.label || col.name)}
              </th>
            ))}
            {isReview && previousReviewers.map((reviewer) => {
              const prevStyle = REVIEW_ROLE_STYLE[reviewer.role] || REVIEW_ROLE_STYLE.director;
              return <th key={reviewer.role} style={prevStyle.th}>{reviewer.label} Score</th>;
            })}
            {isReview && <th style={roleStyle.th}>{reviewerLabel ? `${reviewerLabel} Score` : reviewerRole ? `${reviewerRole[0].toUpperCase()}${reviewerRole.slice(1)} Score` : "Review Score"}</th>}
          </tr>
        </thead>
        <tbody>
          {safeRows.length === 0 ? (
            <EmptySectionRow colSpan={columns.length + (field?.autoSerial ? 1 : 0) + (isReview ? previousReviewers.length + 1 : 0)} />
          ) : (
            safeRows.map((row, i) => (
              <tr key={i} style={i % 2 === 1 ? { background: "#f8fafc" } : {}}>
                {field?.autoSerial && <td style={{ ...TDC, width: 30, minWidth: 30, maxWidth: 30 }}>{i + 1}</td>}
                {columns.map((col) => {
                  if (col.isAutoViewDocs) {
                    return (
                      <td key={col.name} style={{ ...TDC, width: dataColWidth }}>
                        {/* Must match the faculty-side upload docId scheme exactly
                            (AssignedSchemaPreview.jsx: `${field.key}-${colKey}-${rowIndex}`,
                            no section-code prefix) or previously uploaded files won't resolve. */}
                        <ViewCell id={`${field.key}-${col.sourceColumn.name}-${i}`} docs={docs} />
                      </td>
                    );
                  }
                  const isScoreCol = col === scoreColumn;
                  return (
                    <td key={col.name} style={{ ...(isScoreCol ? TDS : col.type === "number" || col.type === "computed" ? TDC : TD), width: dataColWidth }}>
                      <SchemaFieldCell
                        field={{ ...col, key: col.name, maxMarks: col.maxMarks }}
                        value={row[col.name]}
                        onChange={(v) => setCell(i, col.name, v)}
                        mode={mode}
                        readOnly={locked}
                        center={isScoreCol || col.type === "number" || col.type === "computed"}
                        docId={`${field.key}-${col.name}-${i}`}
                        docs={docs}
                        setDocs={setDocs}
                      />
                    </td>
                  );
                })}
                {isReview && previousReviewers.map((reviewer) => {
                  const prevStyle = REVIEW_ROLE_STYLE[reviewer.role] || REVIEW_ROLE_STYLE.director;
                  const rowScores = reviewer.sectionScores?.[field?.sectionCode];
                  const value = Array.isArray(rowScores) ? rowScores[i] : undefined;
                  return <td key={reviewer.role} style={prevStyle.tds}>{value === undefined || value === null || value === '' ? '—' : value}</td>;
                })}
                {isReview && (
                  <td style={roleStyle.tds}>
                    <ReviewScoreInput
                      val={row[`review_${reviewerRole}`]}
                      onChange={(v) => setReview(i, v)}
                      max={scoreColumn?.maxMarks ?? reviewMax}
                      role={reviewerRole}
                      disabled={locked || (rowDisabled ? rowDisabled(row, i) : false)}
                    />
                  </td>
                )}
              </tr>
            ))
          )}
          {showTotal && (
            <tr style={{ background: "#eff6ff" }}>
              <td style={{ ...TDC, fontWeight: "bold" }} colSpan={(field?.autoSerial ? 1 : 0) + columns.length - 1}>Total Score (Max {field.maxMarks})</td>
              <td style={{ ...TDS, fontWeight: "bold", color: "#1e3a5f" }}>{totalScore.toFixed(1)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {!isReview && (
        <RowButtons onAdd={addRow} onDel={deleteLastRow} canAdd={!locked} canDel={!locked && safeRows.length > 1} />
      )}
    </div>
  );
}

/**
 * Top-level entry point: renders one section (its singular fields, if any,
 * followed by its row-table, if it has one) inside the standard SectionCard
 * shell used by every existing part of the form.
 */
export default function SchemaSectionTable({
  section,
  mode = "self",
  values = {},
  onValuesChange,
  rows = [],
  onRowsChange,
  sectionScore,
  reviewerRole,
  reviewerLabel,
  reviewMax,
  rowDisabled,
  docs,
  setDocs,
  locked = false,
  accent = "#4f46e5",
  previousReviewers = [],
}) {
  const fields = section?.fields || [];
  const tableField = fields.find((f) => f.type === "table");
  const scalarFields = fields.filter((f) => f.type !== "table");
  const sectionMax = section?.maxMarks ?? section?.max_marks;

  return (
    <SC
      title={section?.title || section?.label}
      accent={accent}
      scoreBadge={sectionScore !== undefined ? `${sectionScore}${sectionMax !== undefined ? ` / ${sectionMax}` : ""}` : undefined}
    >
      {scalarFields.map((field) => (
        <div key={field.id || field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
            {field.label}
            {field.required && <span style={{ color: "#dc2626" }}> *</span>}
          </label>
          <SchemaFieldCell
            field={field}
            value={values[field.key]}
            onChange={(v) => onValuesChange?.({ ...values, [field.key]: v })}
            mode={mode}
            readOnly={locked}
            docId={`${section.code}-${field.key}`}
            docs={docs}
            setDocs={setDocs}
          />
        </div>
      ))}

      {tableField && (
        <SchemaTableField
          field={tableField}
          rows={rows}
          onRowsChange={onRowsChange}
          mode={mode}
          reviewerRole={reviewerRole}
          reviewerLabel={reviewerLabel}
          reviewMax={reviewMax}
          rowDisabled={rowDisabled}
          docs={docs}
          setDocs={setDocs}
          locked={locked}
          previousReviewers={previousReviewers}
        />
      )}
    </SC>
  );
}
