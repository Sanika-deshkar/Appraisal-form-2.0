// Dynamic (admin-built custom schema) appraisal review panel.
//
// This is a deliberately separate module from src/features/faculty-appraisal — it
// reviews admin-configured custom-schema submissions, whose section layout is not
// known until the schema is fetched at runtime, unlike the fixed-section Standard
// and Creative School appraisal forms. Nothing here is shared with, or should be
// coupled to, StandardReviewPanel / CreativeSchoolAuthorityReviewPanel logic.
//
// It reuses only generic, dynamic-schema-specific rendering primitives that already
// live outside those two flows (src/utils/schemaPreview.js, src/utils/schemaTableScore.js,
// the SchemaFieldCell/SchemaSectionTable renderers, and the shared reviewer-draft
// persistence endpoints in src/services/reviewWorkflow.js, which are generic
// infrastructure already reused across every reviewer role).
import { useEffect, useState } from 'react';
import DynamicRowHeaderTable from '../../faculty-appraisal/components/DynamicRowHeaderTable';
import DynamicMatrixTable from '../../faculty-appraisal/components/DynamicMatrixTable';
import { matrixAnswersFromRows } from '../../faculty-appraisal/components/dynamicMatrixAdapter';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import FacultyInfoSection from '../../../components/appraisal/common/FacultyInfoSection';
import { useReviewFeedback } from '../../../components/reviewFeedbackContext';
import { fetchDynamicFormSchema } from '../services/dynamicFormSchemaCache';
import DynamicRegistrarPartView from './DynamicRegistrarPartView';
import { canReviewerRejectProfile, roleLabel, visiblePreviousReviewRoles } from '../../../utils/hierarchy';
import { dynamicReviewForm } from '../../../utils/dynamicAppraisalData';
import { buildSchemaPreview, schemaTableGuideline } from '../../../utils/schemaPreview';
import { schemaTableScore } from '../../../utils/schemaTableScore';
import { loadReviewerDraft, saveReviewerDraft } from '../../../services/reviewWorkflow';
import { loadAppraisalDocuments } from '../../../services/appraisalPersistence';
import { useSchools } from '../../../services/schoolsService';
import { getSchoolByValue } from '../../../constants/universityHierarchy';
import SchemaSectionTable, { SchemaFieldCell } from '../../faculty-appraisal/components/SchemaSectionTable';
import { SectionCard, SectionInfoButton, ViewCell, ViewDocsCell } from '../../faculty-appraisal/components/formPrimitives';
import { T, TH, TD, TDC, TDS } from '../../faculty-appraisal/components/formPrimitiveStyles';
import { n, clampScore } from '../utils/scoreMath';
import '../../faculty-appraisal/components/dynamicAppraisalTable.css';
import './dynamicReviewLayout.css';

const ROLE_PREFIX = { center_head: 'hod' };
const prefixForRole = (role) => ROLE_PREFIX[role] || role;

// Read-only rendering of a submitted table's saved answers, no scoring involved.
// Used only for the recovery view and for the "already reviewed" (readOnly) state.
function SubmittedTable({ field, rows, docs }) {
  switch (field.layout || 'columns') {
    case 'matrix':
      // Matrix saving/loading is unverified backend-side (see dynamicMatrixAdapter.js) —
      // this best-effort reads whatever was already saved as plain rows, read-only.
      return <DynamicMatrixTable field={field} answers={matrixAnswersFromRows(field, rows)} docs={docs} readOnly />;
    case 'rows':
      return <DynamicRowHeaderTable field={field} rows={rows} docs={docs} />;
    default:
      break;
  }
  const columns = (field.columns || []).flatMap((column) => column.type === 'file'
    ? [column, { key: `${column.name || column.key}__viewDocs`, isView: true, source: column }] : [column]);
  const compact = (column) => {
    const label = String(column.label || column.name || column.key || '').trim().toLowerCase();
    return label === 'sn' ? 80 : label === 'faculty score' ? 120 : null;
  };
  const fixed = (field.autoSerial ? 80 : 0) + columns.reduce((sum, column) => sum + (compact(column) || 0), 0);
  const flexible = columns.filter((column) => compact(column) === null).length;
  const count = columns.length + (field.autoSerial ? 1 : 0);
  if (!count) return <p>No active columns are configured for this table.</p>;
  const total = schemaTableScore(field.columns || [], rows);
  return <div style={{ overflowX: 'auto' }}><table className="dynamic-appraisal-table" style={{ ...T, ...(!flexible ? { width: fixed, minWidth: fixed } : {}) }}>
    <colgroup>{field.autoSerial && <col style={{ width: 80 }} />}{columns.map((column, index) => <col key={index} style={{ width: compact(column) ?? `calc((100% - ${fixed}px) / ${flexible || 1})` }} />)}</colgroup>
    <thead><tr>{field.autoSerial && <th style={TH}>SN</th>}{columns.map((column, index) => <th key={index} style={TH}>{column.isView ? 'View Docs' : column.label || column.name || column.key}</th>)}</tr></thead>
    <tbody>
      {rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>
        {field.autoSerial && <td style={TDC}>{rowIndex + 1}</td>}
        {columns.map((column, index) => {
          const source = column.source || column;
          const key = source.name || source.key;
          const docId = `${field.key}-${key}-${rowIndex}`;
          return <td key={index} style={TD}>{column.isView ? <ViewCell id={docId} docs={docs} />
            : <SchemaFieldCell field={column} value={row?.[key]} readOnly mode="self" center={['number', 'integer'].includes(column.type)} docId={docId} docs={docs} />}</td>;
        })}
      </tr>) : <tr><td colSpan={count} style={{ ...TDC, color: '#4338ca' }}>No rows were submitted for this table.</td></tr>}
      {Number(field.maxMarks) > 0 && <tr>{count > 1 && <td colSpan={count - 1} style={{ ...TDC, background: '#f0f2ff', fontWeight: 800 }}>Total Score (Max {field.maxMarks})</td>}
        <td className="dynamic-total-value" style={{ ...TDS, background: '#f0f2ff' }}>{count === 1 ? `Total Score (Max ${field.maxMarks}): ` : ''}{total.toFixed(1)}</td></tr>}
    </tbody>
  </table></div>;
}

// Raw fallback for submissions whose saved section keys no longer match any
// current schema (or match ambiguously) — same safety behaviour as before:
// show whatever was saved, verbatim, without attempting to score it.
function RecoverySavedAnswers({ subject, onBack }) {
  const display = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
  const form = dynamicReviewForm(subject) || {};
  const response = subject.previousYearResponse || subject;
  const academicYear = response.academic_year || response.payload?.academic_year || subject.academicYear;
  const subjectEmail = response.faculty_email || subject.email || subject.faculty_email;
  const baseDocs = response.payload?.docs || response.docs || subject.docs || {};
  // See the note in DynamicAuthorityReviewPanel above: uploaded files live in a
  // separate AppraisalDocument table, not in the snapshot payload — fetch them
  // the same way so attachments show up in this recovery view too.
  const [fetchedDocs, setFetchedDocs] = useState({});
  useEffect(() => {
    if (!subjectEmail || !academicYear) return;
    loadAppraisalDocuments({ facultyEmail: subjectEmail, academicYear, setDocs: setFetchedDocs });
  }, [subjectEmail, academicYear]);
  const docs = { ...baseDocs, ...fetchedDocs };
  const sections = Object.entries(form).filter(([key, value]) => /^custom_.+_s_.+/.test(key) && value && typeof value === 'object');
  return <section className="appraisal-form-shell" style={{ background: '#fff', padding: 24, border: '1px solid #cbd5e1', borderRadius: 6 }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <ClipboardList size={24} color="#4f46e5" aria-hidden="true" />
      <div style={{ flex: 1 }}><h2 style={{ margin: 0, fontSize: 20 }}>Submitted dynamic appraisal</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b' }}>{subject.name || response.payload?.submitter_profile?.name} · {response.academic_year || subject.academicYear}</p></div>
      <button type="button" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}><ArrowLeft size={16} />Back</button>
    </header>
    <p role="status" style={{ padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, color: '#92400e', lineHeight: 1.6 }}>
      Saved answers are shown below, read-only. This submission does not include a verified schema snapshot.
      Original table titles, part grouping, column order and guidelines cannot be restored safely.
      Scoring is unavailable in this recovery view until the schema snapshot can be verified.
    </p>
    {sections.map(([key, value], index) => {
      const rows = Array.isArray(value) ? value : [value];
      const columns = [...new Set(rows.flatMap((row) => row && typeof row === 'object' ? Object.keys(row) : ['Saved value']))];
      return <section key={key} style={{ marginTop: 24 }}>
        <h3 style={{ color: '#4338ca', fontSize: 16 }}>Saved custom section {index + 1}</h3>
        <details style={{ color: '#64748b', fontSize: 12, marginBottom: 10, overflowWrap: 'anywhere' }}><summary>Section identifier</summary>{key}</details>
        {!rows.length ? <p style={{ color: '#64748b' }}>No rows were submitted for this section. Its column definitions are not included in the saved response.</p>
          : <div style={{ overflowX: 'auto' }}><table className="dynamic-appraisal-table" style={T}>
            <colgroup><col style={{ width: 80 }} />{columns.map((column) => <col key={column} style={/^(faculty|self) score$/i.test(column.trim()) ? { width: 120 } : undefined} />)}</colgroup>
            <thead><tr><th style={TH}>SN</th>{columns.map((column) => <th key={column} style={TH}>{column}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}><td style={{ ...TD, textAlign: 'center' }}>{rowIndex + 1}</td>
              {columns.map((column) => <td key={column} style={TD}>{display(row && typeof row === 'object' ? row[column] : row)}</td>)}</tr>)}</tbody>
          </table></div>}
      </section>;
    })}
    {!!Object.keys(docs).length && <section style={{ marginTop: 24 }}><h3>Submitted documents</h3><ViewDocsCell docKey={Object.keys(docs)} docs={docs} /></section>}
    {form.summaryOtherInfo && <section style={{ marginTop: 24 }}><h3>Additional information</h3><p style={{ whiteSpace: 'pre-wrap' }}>{display(form.summaryOtherInfo)}</p></section>}
  </section>;
}

// Part-level row only — table-by-table detail lives on each Part page itself,
// the summary table is meant to give a fast, scannable per-part total.
function SummaryRows({ part, onOpen, showAuthorityColumn }) {
  return <tr className="dynamic-review-summary-part"><th><button type="button" onClick={onOpen}>{part.label}</button></th><td>{part.score.toFixed(1)}</td>
    {part.previousScores.map((entry) => <td key={entry.role}>{entry.score === null ? '—' : entry.score.toFixed(1)}</td>)}
    {showAuthorityColumn && <td>{part.authorityScore.toFixed(1)}</td>}<td>{part.max ?? 'Not configured'}</td></tr>;
}

// Per-role accent used only for the "previous reviewer feedback" cards, so each
// prior reviewer in the chain (HOD, Director, Dean, ...) is visually distinct.
const ROLE_ACCENT = {
  hod: { color: '#4f46e5', bg: '#eef2ff' },
  center_head: { color: '#4f46e5', bg: '#eef2ff' },
  director: { color: '#0369a1', bg: '#eff6ff' },
  dean: { color: '#7c3aed', bg: '#f5f3ff' },
  vc: { color: '#b45309', bg: '#fffbeb' },
};

// Part index → fixed A/B/C/D score slot, since the review-draft/submit API only
// accepts four part-score buckets while an admin-built schema can define any
// number of parts. Parts beyond the fourth fold into the D slot.
const partSlotFor = (index) => (index === 0 ? 'partA' : index === 1 ? 'partB' : index === 2 ? 'partC' : 'partD');

export default function DynamicAuthorityReviewPanel({ subject, onBack, onSubmit, readOnly = false, reviewerRole = 'hod', reviewerLabel }) {
  const confirmDialog = useReviewFeedback();
  useSchools(); // keeps the school→form-family config (incl. admin-assigned custom forms) fresh
  const label = reviewerLabel || roleLabel(reviewerRole);
  const prefix = prefixForRole(reviewerRole);
  const reviewKey = `review_${reviewerRole}`;

  const form = dynamicReviewForm(subject) || {};
  const response = subject.previousYearResponse || subject;
  const academicYear = response.academic_year || response.payload?.academic_year || subject.academicYear;
  const baseDocs = response.payload?.docs || response.docs || subject.docs || {};
  const subjectEmail = response.faculty_email || subject.email || subject.faculty_email;
  const savedKeys = Object.keys(form).filter((key) => /^custom_.+_s_.+/.test(key));
  const keysIdentity = JSON.stringify(savedKeys.sort());
  const identity = `${subjectEmail}:${academicYear}:${keysIdentity}`;
  // GET /appraisal/form-schema resolves form_family from the CALLING user's own
  // school by default — fine for a faculty member fetching their own schema, but
  // wrong for a reviewer looking up someone else's. An HOD/Director reviewing
  // within their own school gets lucky (same school, same family); a Dean or VC
  // reviewing across schools does not, and the schema lookup below fails to find
  // any matching family at all. Resolve the SUBJECT's own school→family here and
  // pass it explicitly, so the lookup no longer depends on who happens to be
  // reviewing.
  const subjectSchool = subject.school || response.payload?.submitter_profile?.school
    || response.payload?.submitterProfile?.school || form.info?.school || '';
  const subjectSchoolConfig = getSchoolByValue(subjectSchool);
  const assignedFormFamily = subjectSchoolConfig?.defaultForm || subjectSchoolConfig?.formVariant || '';

  // Every earlier reviewer in the approval chain (e.g. HOD → Director → Dean before
  // the VC) already has a genuine, final AppraisalReview row with its own
  // section_scores JSON and remarks — GET /dashboard/faculty/{email} returns all of
  // them as `reviews`. Unlike the per-row CustomSectionRow columns (still unmapped
  // for dynamic forms, see the backend follow-up), this is real final-submission
  // data, not a draft cache, so it's safe to show as each previous reviewer's
  // official score and feedback.
  const subjectDepartment = subject.department || response.payload?.submitter_profile?.department
    || response.payload?.submitterProfile?.department || form.info?.department || '';
  const subjectProfile = { school: subjectSchool, department: subjectDepartment, appraisal_role: subject.appraisalRole || subject.appraisal_role || subject.role };
  // Only the VC gets to see earlier reviewers' scores — same rule as the
  // hardcoded Standard/Creative forms (visiblePreviousReviewRoles returns []
  // for every role except vc), so e.g. a Director reviewing after the HOD
  // never sees the HOD's marks, only the faculty's own self-score.
  const previousRoles = visiblePreviousReviewRoles(reviewerRole, subjectProfile);
  const reviewsList = Array.isArray(response.reviews) ? response.reviews : [];
  const previousReviews = previousRoles.map((role) => {
    const entry = reviewsList.find((r) => (r.reviewer_role || r.reviewerRole) === role);
    return {
      role, label: roleLabel(role),
      remarks: entry?.remarks || '',
      sectionScores: entry?.section_scores || entry?.sectionScores || {},
      total: entry ? n(entry.total_score ?? entry.totalScore) : null,
    };
  });

  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [navigation, setNavigation] = useState(null);
  const [reviewRows, setReviewRows] = useState({});
  const [remarks, setRemarks] = useState(subject?.[`${prefix}Remarks`] || '');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchedDocs, setFetchedDocs] = useState({});
  // Uploaded files are stored server-side as normalized AppraisalDocument rows,
  // not inside the snapshot's JSON payload (PUT /appraisal/snapshot writes them
  // to a separate table) — the reviewer-facing GET /dashboard/faculty/{email}
  // response never includes them under payload.docs. Standard/Creative School
  // reviews already fetch them this same way via loadAppraisalDocuments(); this
  // was simply missing here, which is why attachments weren't showing up.
  useEffect(() => {
    if (!subjectEmail || !academicYear) return;
    loadAppraisalDocuments({ facultyEmail: subjectEmail, academicYear, setDocs: setFetchedDocs });
  }, [subjectEmail, academicYear]);
  const docs = { ...baseDocs, ...fetchedDocs };

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetchDynamicFormSchema({ formFamily: assignedFormFamily, academicYear, signal: controller.signal }).then((records) => {
      if (!Array.isArray(records)) throw new Error('Unsupported schema response.');
      const keys = JSON.parse(keysIdentity);
      const matchedFamilies = [...new Set(records.filter((record) => keys.includes(record.section_key || record.code)).map((record) => record.form_family).filter(Boolean))];
      // Prefer the subject's own resolved family when it's actually present among
      // the matched records; only fall back to "exactly one candidate" when we
      // couldn't resolve it up front (e.g. subject school missing/unrecognized).
      const resolvedFamily = assignedFormFamily && matchedFamilies.includes(assignedFormFamily)
        ? assignedFormFamily
        : matchedFamilies.length === 1 ? matchedFamilies[0] : null;
      if (!resolvedFamily) throw new Error('A single matching custom schema could not be identified.');
      const preview = buildSchemaPreview(records, resolvedFamily);
      if (!preview.parts.length) throw new Error('The matching schema has no active fields.');
      const fields = preview.parts.flatMap((part) => part.fields);
      const tableSections = fields.filter((field) => field.type === 'table').map((field) => field.sectionCode);
      if (new Set(tableSections).size !== tableSections.length) throw new Error('Multiple tables share a saved section key; their answers cannot be mapped unambiguously.');
      if (!cancelled) setResult({ identity, preview });
    }).catch((error) => { if (!cancelled) setResult({ identity, error: error.message || 'Unable to load matching schema.' }); });
    return () => { cancelled = true; controller.abort(); };
  }, [identity, academicYear, keysIdentity, attempt, assignedFormFamily]);

  const current = result?.identity === identity ? result : null;

  // Faculty-saved rows render immediately via the tableRowsFor() fallback below
  // (reviewRows[sectionCode] ?? rows built fresh from `form`), so this effect only
  // needs to layer a previously saved reviewer draft on top once the schema and
  // draft have both loaded — it never seeds state synchronously.
  //
  // This also runs when readOnly (already reviewed): the backend deletes the
  // ReviewerSnapshot draft the instant a final review lands ("superseded by the
  // final review"), but submitReview() below immediately re-saves it as a
  // read-only cache of the per-row scores — because the final-submit endpoint
  // does not yet persist per-section detail itself for dynamic schemas (see the
  // backend follow-up). Loading it here is what makes that cache visible again.
  // Reviews submitted before this change won't have a cached draft, so the
  // per-row detail just isn't shown for those (falls back to the aggregate total).
  useEffect(() => {
    if (!current?.preview || !subjectEmail || !academicYear) return undefined;
    let cancelled = false;
    const fields = current.preview.parts.flatMap((part) => part.fields).filter((field) => field.type === 'table');
    loadReviewerDraft({ subjectEmail, academicYear, reviewerRole }).then((draft) => {
      if (cancelled || !draft?.payload) return;
      const sectionScores = draft.payload.section_scores || {};
      setReviewRows((prev) => {
        const next = { ...prev };
        fields.forEach((field) => {
          const saved = sectionScores[field.sectionCode];
          if (!Array.isArray(saved)) return;
          const base = next[field.sectionCode]
            || (Array.isArray(form[field.sectionCode]) ? form[field.sectionCode] : []).map((row) => ({ ...row, [reviewKey]: '' }));
          next[field.sectionCode] = base.map((row, index) =>
            saved[index] !== undefined ? { ...row, [reviewKey]: saved[index] === 0 ? 0 : (saved[index] || '') } : row);
        });
        return next;
      });
      if (draft.payload.remarks) setRemarks(draft.payload.remarks);
      setDraftStatus(draft.updated_at ? `Last saved: ${new Date(draft.updated_at).toLocaleString()}` : 'Draft loaded');
      }).catch((err) => { if (!cancelled) console.error('Could not load dynamic reviewer draft:', err); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.identity, readOnly]);

  if (!current) return <section><button type="button" onClick={onBack}>Back</button><p role="status">Loading matching dynamic schema…</p></section>;
  if (current.error) return <><p role="alert">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry schema</button></p><RecoverySavedAnswers subject={subject} onBack={onBack} /></>;

  const fields = current.preview.parts.flatMap((part) => part.fields);
  const parts = current.preview.parts;
  const chosen = navigation?.identity === identity ? navigation.key : null;
  const activeKey = chosen === 'summary' || parts.some((part) => `part:${part.label}` === chosen) ? chosen : `part:${parts[0].label}`;
  const isSummary = activeKey === 'summary';
  const navigate = (key) => setNavigation({ identity, key });
  const savedProfile = response.payload?.submitter_profile || response.payload?.submitterProfile || {};
  const profile = { ...subject, ...(form.info || {}), ...savedProfile };
  const name = profile.name || profile.full_name || 'Faculty';

  const tableRowsFor = (field) => reviewRows[field.sectionCode]
    ?? (Array.isArray(form[field.sectionCode]) ? form[field.sectionCode] : []);
  const authorityTableScore = (field) => clampScore(
    tableRowsFor(field).reduce((sum, row) => sum + n(row?.[reviewKey]), 0), field.maxMarks);
  // Once reviewed, per-row detail only exists if it was cached (see the draft
  // effect above) — never fabricate it when no cached draft was found.
  const hasRowDetail = (field) => !readOnly || Boolean(reviewRows[field.sectionCode]);
  // A previous reviewer's per-table score, from their real AppraisalReview.section_scores
  // (see the previousReviews note above) — null (not 0) when that reviewer's record has no
  // entry for this table, so "not yet reviewed" never gets shown as a zero score.
  const previousReviewerTableScore = (reviewer, field) => {
    const rows = reviewer.sectionScores?.[field.sectionCode];
    if (!Array.isArray(rows)) return null;
    return clampScore(rows.reduce((sum, value) => sum + n(value), 0), field.maxMarks);
  };

  // Registrar-only parts never count toward this reviewer's own score/total —
  // same as Standard's Part D, which is scored solely by the Registrar and
  // excluded from HOD/Director/Dean/VC's own Part A-D totals. Re-indexed after
  // filtering so partSlotFor's A/B/C/D mapping only counts scoreable parts.
  const scoreableParts = parts.filter((part) => !part.isRegistrarPart);
  const summary = scoreableParts.map((part, partIndex) => {
    const tables = part.fields.filter((field) => field.type === 'table').map((field) => ({
      key: field.key || field.sectionCode, title: field.label || field.recordTitle || field.key,
      score: schemaTableScore(field.columns || [], Array.isArray(form[field.sectionCode]) ? form[field.sectionCode] : []),
      authorityScore: hasRowDetail(field) ? authorityTableScore(field) : 0,
      hasDetail: hasRowDetail(field),
      previousScores: previousReviews.map((reviewer) => ({ role: reviewer.role, score: previousReviewerTableScore(reviewer, field) })),
      max: field.maxMarks == null || !Number.isFinite(Number(field.maxMarks)) ? null : Number(field.maxMarks),
    }));
    return {
      label: part.label, tables, partIndex,
      score: tables.reduce((sum, table) => sum + table.score, 0),
      authorityScore: tables.reduce((sum, table) => sum + table.authorityScore, 0),
      previousScores: previousReviews.map((reviewer) => {
        const values = tables.map((table) => table.previousScores.find((p) => p.role === reviewer.role)?.score);
        const known = values.filter((value) => value !== null && value !== undefined);
        return { role: reviewer.role, score: known.length ? known.reduce((sum, value) => sum + value, 0) : null };
      }),
      max: tables.length && tables.every((table) => table.max !== null) ? tables.reduce((sum, table) => sum + table.max, 0) : null,
    };
  });
  const grandScore = summary.reduce((sum, part) => sum + part.score, 0);
  const grandMax = summary.every((part) => part.max !== null) ? summary.reduce((sum, part) => sum + part.max, 0) : null;
  const previousGrandScores = previousReviews.map((reviewer) => {
    const values = summary.map((part) => part.previousScores.find((p) => p.role === reviewer.role)?.score);
    const known = values.filter((value) => value !== null && value !== undefined);
    return { role: reviewer.role, score: known.length ? known.reduce((sum, value) => sum + value, 0) : null };
  });
  const partSlots = { partA: 0, partB: 0, partC: 0, partD: 0 };
  summary.forEach((part) => { partSlots[partSlotFor(part.partIndex)] += part.authorityScore; });
  const authorityTotal = partSlots.partA + partSlots.partB + partSlots.partC + partSlots.partD;
  const showAuthorityColumn = !readOnly || summary.some((part) => part.tables.some((table) => table.hasDetail));

  const buildSectionScores = () => {
    const out = {};
    fields.filter((field) => field.type === 'table').forEach((field) => {
      out[field.sectionCode] = tableRowsFor(field).map((row) => n(row?.[reviewKey]));
    });
    return out;
  };

  const canReject = !readOnly && canReviewerRejectProfile(reviewerRole, subject);
  const canGiveScore = reviewConfirmed && remarks.trim().length > 0;

  const handleSaveDraft = async () => {
    if (!subjectEmail || !academicYear) return;
    setSavingDraft(true);
    try {
      await saveReviewerDraft({
        subjectEmail, academicYear, reviewerRole,
        partAScore: partSlots.partA, partBScore: partSlots.partB, partCScore: partSlots.partC, partDScore: partSlots.partD,
        totalScore: authorityTotal, remarks, sectionScores: buildSectionScores(),
      });
      setDraftStatus(`Draft saved: ${new Date().toLocaleString()}`);
    } catch (err) {
      console.error('Could not save dynamic reviewer draft:', err);
      setDraftStatus(err?.message || 'Unable to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveAndNext = async () => {
    await handleSaveDraft();
    const currentIndex = parts.findIndex((part) => `part:${part.label}` === activeKey);
    const nextPart = currentIndex >= 0 ? parts[currentIndex + 1] : null;
    navigate(nextPart ? `part:${nextPart.label}` : 'summary');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const submitReview = async (decision) => {
    setSubmitting(true);
    const finalScores = { partA: partSlots.partA, partB: partSlots.partB, partC: partSlots.partC, partD: partSlots.partD, total: authorityTotal };
    const finalSectionScores = buildSectionScores();
    try {
      await onSubmit(subject.id, finalScores, remarks, finalSectionScores, reviewConfirmed, decision);
      // The final-submit endpoint deletes the reviewer draft ("superseded by the
      // final review") and does not yet persist per-row scores for dynamic-schema
      // sections itself. Re-save the draft as a read-only cache so the per-row
      // detail stays visible on the "already reviewed" view — see the draft
      // effect above and the dynamic-appraisal backend follow-up. Best-effort:
      // this must never surface as a failure of the review that already succeeded.
      if (subjectEmail && academicYear) {
        try {
          await saveReviewerDraft({
            subjectEmail, academicYear, reviewerRole,
            partAScore: finalScores.partA, partBScore: finalScores.partB, partCScore: finalScores.partC, partDScore: finalScores.partD,
            totalScore: finalScores.total, remarks, sectionScores: finalSectionScores,
          });
        } catch (err) {
          console.warn('Could not cache per-row dynamic review scores after submit:', err);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const ok = await confirmDialog('Reject this appraisal and send it back to the user for editing?', 'reject');
    if (ok) submitReview('rejected');
  };

  return <div className="appraisal-form-shell dynamic-review-layout" style={{ display: 'grid', gap: 20 }}>
    <header className="dynamic-review-header"><span className="dynamic-review-header-icon"><ClipboardList size={24} aria-hidden="true" /></span>
      <div className="dynamic-review-heading"><span className="dynamic-review-eyebrow">FACULTY APPRAISAL{readOnly ? ' · REVIEWED' : ` · ${label.toUpperCase()} REVIEW`}</span>
        <h2>Submitted dynamic appraisal</h2><p>{name} · {academicYear || 'Academic year unavailable'}</p></div>
      <button className="dynamic-review-back" type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back</button></header>
    {!current.preview.orderVerified && <p style={{ margin: 0, color: '#64748b' }}>Some schema ordering metadata is absent; those items follow the API response order, as in the faculty form.</p>}
    <nav className="dynamic-review-nav" aria-label="Appraisal sections">
      {parts.map((part, index) => <button key={part.label} type="button" aria-current={activeKey === `part:${part.label}` ? 'page' : undefined} onClick={() => navigate(`part:${part.label}`)}>
        <span className="dynamic-review-nav-step">{index + 1}</span>{part.label}
      </button>)}
      <button className="dynamic-review-nav-summary" type="button" aria-current={isSummary ? 'page' : undefined} onClick={() => navigate('summary')}>
        <span className="dynamic-review-nav-step">Σ</span>Summary
      </button>
    </nav>
    <div key={activeKey} className="dynamic-review-tab-content">
    {activeKey === `part:${parts[0].label}` && <FacultyInfoSection rows={[
      ['Academic Year', academicYear], ['Name', name], ['Qualification', profile.qual || profile.qualification],
      ['Designation', profile.desig || profile.designation], ['School', profile.school],
      ['Experience', String(profile.experience ?? profile.teaching_experience ?? '—')],
      ['Email', response.faculty_email || subject.email || subject.faculty_email],
    ]} />}
    {parts.filter((part) => activeKey === `part:${part.label}`).map((part) => {
      // Registrar-only part (the dynamic-form equivalent of Standard Appraisal's
      // "Part D → Registrar"): every reviewer role sees it read-only, with no
      // score input and no Save Draft/Next footer — it bypasses this chain
      // entirely and is scored only from the Registrar's own Part D queue.
      if (part.isRegistrarPart) return <SectionCard key={part.label} title={part.label} subtitle="Reviewed only by the Registrar — not part of your review chain" accent="#0e7490">
        <DynamicRegistrarPartView part={part} form={form} docs={docs} subject={subject} />
      </SectionCard>;
      // Reviewer-only part: faculty never fills this in (see AssignedSchemaPreview.jsx
      // / useCustomFormParts.js, which hide it from their form entirely), so it's
      // scored directly by this reviewer with no faculty submission to reference —
      // same table/row UI as a normal part, just seeded empty instead of from
      // faculty answers (SchemaSectionTable already supports adding rows in review
      // mode regardless of whether any faculty rows exist).
      const subtitle = part.isReviewerOnlyPart
        ? (readOnly ? `${label} scores · Read-only` : `Reviewer-only part · Enter your ${label} score directly — no faculty submission for this part`)
        : (readOnly ? 'Submitted faculty responses · Read-only' : `Faculty responses · Enter your ${label} score per table`);
      return <SectionCard key={part.label} title={part.label} subtitle={subtitle} accent="#5b5ceb">
      {part.fields.map((field, index) => {
        if (field.type !== 'table') return <section key={field.key || index} style={{ marginBottom: 24 }}>
          <div className="appraisal-subsection-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4338ca', fontWeight: 800 }}><span className="appraisal-subsection-icon"><ClipboardList size={18} /></span><span>{field.label || field.recordTitle || field.key}</span></div>
          <SchemaFieldCell field={field} value={form[field.sectionCode]?.[field.key]} readOnly docId={field.key} docs={docs} />
        </section>;
        const facultyScore = schemaTableScore(field.columns || [], Array.isArray(form[field.sectionCode]) ? form[field.sectionCode] : []);
        const showAuthorityStat = hasRowDetail(field);
        return <div key={field.key || index} className="dynamic-review-table-card">
          <div className="dynamic-review-table-card-head">
            <div className="dynamic-review-table-title"><span className="appraisal-subsection-icon"><ClipboardList size={18} /></span><span>{field.label || field.recordTitle || field.key}</span><SectionInfoButton titleText={field.label} customGuideline={schemaTableGuideline(field)} popoverWidth={460} popoverClassName="dynamic-table-guidelines" /></div>
            <div className="dynamic-review-stat-row">
              {!part.isReviewerOnlyPart && <span className="dynamic-review-stat-pill dynamic-review-stat-pill--faculty">Faculty <b>{facultyScore.toFixed(1)}</b></span>}
              {showAuthorityStat && <span className="dynamic-review-stat-pill dynamic-review-stat-pill--authority">{label} <b>{authorityTableScore(field).toFixed(1)}</b></span>}
              {Number(field.maxMarks) > 0 && <span className="dynamic-review-stat-pill dynamic-review-stat-pill--max">Max <b>{field.maxMarks}</b></span>}
            </div>
          </div>
          <div className="dynamic-review-table-card-body">
            {readOnly && !reviewRows[field.sectionCode]
              ? <SubmittedTable field={field} rows={Array.isArray(form[field.sectionCode]) ? form[field.sectionCode] : []} docs={docs} />
              // No `title` in the section object below: the card head above already
              // shows the table's name and scores — repeating them inside
              // SchemaSectionTable's own header would show them twice (hidden via CSS too).
              : <SchemaSectionTable
                  section={{ code: field.sectionCode, maxMarks: field.maxMarks, fields: [field] }}
                  mode="review"
                  rows={tableRowsFor(field)}
                  onRowsChange={(rows) => setReviewRows((prev) => ({ ...prev, [field.sectionCode]: rows }))}
                  reviewerRole={reviewerRole}
                  reviewerLabel={label}
                  reviewMax={field.maxMarks}
                  docs={docs}
                  locked={readOnly}
                  previousReviewers={previousReviews}
                />}
          </div>
        </div>;
      })}
      {!readOnly && <div className="dynamic-review-part-footer">
        {draftStatus && <span className="dynamic-review-part-footer-status">{draftStatus}</span>}
        <button type="button" className="dynamic-review-btn-draft" disabled={savingDraft} onClick={handleSaveDraft}>{savingDraft ? 'Saving...' : 'Save Draft'}</button>
        <button type="button" className="dynamic-review-btn-next" disabled={savingDraft} onClick={handleSaveAndNext}>
          {savingDraft ? 'Saving...' : (parts.findIndex((p) => `part:${p.label}` === activeKey) === parts.length - 1 ? 'Save & Go to Summary' : 'Save & Next')}
        </button>
      </div>}
    </SectionCard>;
    })}
    {isSummary && previousReviews.length > 0 && <div className="dynamic-review-previous-feedback">
      <h3>Previous reviewer feedback</h3>
      <div className="dynamic-review-previous-feedback-grid">
        {previousReviews.map((review) => {
          const accent = ROLE_ACCENT[review.role] || { color: '#475569', bg: '#f1f5f9' };
          return <div key={review.role} className="dynamic-review-previous-feedback-card" style={{ '--accent': accent.color, '--accent-bg': accent.bg }}>
            <div className="dynamic-review-previous-feedback-head">
              <span className="dynamic-review-previous-feedback-avatar">{review.label.charAt(0)}</span>
              <span className="dynamic-review-previous-feedback-role">{review.label}</span>
              {review.total !== null && <span className="dynamic-review-previous-feedback-score">{review.total.toFixed(1)}</span>}
            </div>
            <p className="dynamic-review-previous-feedback-remarks">{review.remarks || 'No remarks were entered.'}</p>
          </div>;
        })}
      </div>
    </div>}
    {isSummary && <SectionCard title="Appraisal Summary" subtitle={readOnly ? 'Faculty scores from saved answers; maximum marks from the current matching schema.' : `Faculty scores alongside your ${label} scores.`} accent="#5b5ceb">
      {form.summaryOtherInfo && <div className="dynamic-review-other-info">
        <h3>Additional information</h3>
        <p>{String(form.summaryOtherInfo)}</p>
      </div>}
      <div style={{ overflowX: 'auto' }}><table className="dynamic-review-summary">
        {/* Explicit <colgroup> instead of relying on table-layout: fixed's implicit
            equal-distribution (unreliable once column count varies with the review
            chain length) — this deterministically gives every score column the same
            share of the remaining width no matter how many reviewer columns exist. */}
        <colgroup>
          <col style={{ width: '14%' }} />
          {Array.from({ length: 1 + previousReviews.length + (showAuthorityColumn ? 1 : 0) + 1 }).map((_, index) => (
            <col key={index} style={{ width: `${86 / (1 + previousReviews.length + (showAuthorityColumn ? 1 : 0) + 1)}%` }} />
          ))}
        </colgroup>
        <thead><tr><th>Part</th><th>Faculty Score</th>
        {previousReviews.map((reviewer) => <th key={reviewer.role}>{reviewer.label} Score</th>)}
        {showAuthorityColumn && <th>{label} Score</th>}<th>Maximum Marks</th></tr></thead>
        <tbody>{summary.map((part) => <SummaryRows key={part.label} part={part} onOpen={() => navigate(`part:${part.label}`)} showAuthorityColumn={showAuthorityColumn} />)}</tbody>
        <tfoot><tr><th>Grand Total</th><td>{grandScore.toFixed(1)}</td>
          {previousGrandScores.map((entry) => <td key={entry.role}>{entry.score === null ? '—' : entry.score.toFixed(1)}</td>)}
          {showAuthorityColumn && <td>{authorityTotal.toFixed(1)}</td>}<td>{grandMax ?? 'Not configured'}</td></tr></tfoot>
      </table></div>
      {readOnly
        ? <p className="dynamic-review-summary-note">{`${label} score: ${n(subject?.[`${prefix}Total`]).toFixed(1)}`}{subject?.[`${prefix}Remarks`] ? ` · Remarks: ${subject[`${prefix}Remarks`]}` : ''}</p>
        : <div className="dynamic-review-authority-card">
            <div className="dynamic-review-authority-totals">
              <div><span>Part A</span><b>{partSlots.partA.toFixed(1)}</b></div>
              <div><span>Part B</span><b>{partSlots.partB.toFixed(1)}</b></div>
              <div><span>Part C</span><b>{partSlots.partC.toFixed(1)}</b></div>
              <div><span>Part D</span><b>{partSlots.partD.toFixed(1)}</b></div>
              <div className="dynamic-review-authority-total-cell"><span>Total</span><b>{authorityTotal.toFixed(1)}</b></div>
            </div>
            <label className="dynamic-review-authority-label">{label} Remarks <span>*</span></label>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Enter your remarks here..." />
            <label className="dynamic-review-confirm-row">
              <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} style={{ marginTop: 2 }} />
              I have verified the entered scores and confirm this review is accurate and complete.
            </label>
            <div className="dynamic-review-authority-actions">
              {draftStatus && <span className="dynamic-review-authority-draft-status">{draftStatus}</span>}
              <button type="button" className="dynamic-review-btn-draft" disabled={savingDraft} onClick={handleSaveDraft}>{savingDraft ? 'Saving...' : 'Save Draft'}</button>
              {canReject && <button type="button" className="dynamic-review-btn-reject" disabled={submitting} onClick={handleReject}>Reject Form</button>}
              <button type="button" className="dynamic-review-btn-submit" disabled={!canGiveScore || submitting} onClick={() => submitReview('approved')}>{submitting ? 'Submitting...' : 'Give Score'}</button>
            </div>
          </div>}
    </SectionCard>}
    </div>
  </div>;
}
