// The Registrar's review UI for a dynamic (admin-built custom-schema) form's
// Registrar-only part(s) — the dynamic-form equivalent of Standard Appraisal's
// Part D (Leave & Attendance) review, which src/components/appraisal/PartD/
// RegistrarLeaveManagement.jsx handles and which stays completely untouched.
//
// Mounted by TeachingPartDReviewDashboard.jsx as an alternate branch (only when
// the selected subject's form is a dynamic one) — same shared Registrar queue,
// same submitPartDRegistrarReview endpoint, different (schema-driven) UI.
//
// Backend note: whether GET /dashboard/part-d-queue actually returns a dynamic
// subject's full saved form (with its custom_..._s_... keys) is unverified —
// this degrades gracefully to an explanatory message if that data isn't present,
// same posture as the matrix table work (see dynamicMatrixAdapter.js).
import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import DynamicRegistrarPartView from './DynamicRegistrarPartView';
import { SectionCard } from '../../faculty-appraisal/components/formPrimitives';
import { fetchDynamicFormSchema } from '../services/dynamicFormSchemaCache';
import { buildSchemaPreview } from '../../../utils/schemaPreview';
import { dynamicReviewForm } from '../../../utils/dynamicAppraisalData';
import { submitPartDRegistrarReview } from '../../../services/reviewWorkflow';
import { loadAppraisalDocuments } from '../../../services/appraisalPersistence';
import { getSchoolByValue } from '../../../constants/universityHierarchy';

export default function DynamicPartDReviewPanel({ subject, academicYear, onSubmitted }) {
  const form = dynamicReviewForm(subject) || {};
  const response = subject.previousYearResponse || subject;
  const subjectEmail = response.faculty_email || subject.email || subject.faculty_email;
  const subjectSchool = subject.school || response.payload?.submitter_profile?.school
    || response.payload?.submitterProfile?.school || form.info?.school || '';
  const assignedFormFamily = getSchoolByValue(subjectSchool)?.defaultForm
    || getSchoolByValue(subjectSchool)?.formVariant || '';
  const baseDocs = response.payload?.docs || response.docs || subject.docs || {};

  const [result, setResult] = useState(null);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [fetchedDocs, setFetchedDocs] = useState({});
  // Lazy initializers (not an effect) so switching to a different subject re-syncs
  // correctly — the caller (TeachingPartDReviewDashboard) mounts this with
  // key={selected.id}, so a new subject means a fresh mount, not a prop update.
  const [score, setScore] = useState(() => (subject.hasRegistrarPartDScore
    || String(subject.registrarPartDScore ?? subject.registrar_part_d_score ?? '').trim() !== ''
    ? String(subject.registrarPartDScore ?? subject.registrar_part_d_score ?? '') : ''));
  const [remarks, setRemarks] = useState(() => subject.registrarPartDRemarks || subject.registrar_part_d_remarks || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subjectEmail || !academicYear) return;
    loadAppraisalDocuments({ facultyEmail: subjectEmail, academicYear, setDocs: setFetchedDocs });
  }, [subjectEmail, academicYear]);
  const docs = { ...baseDocs, ...fetchedDocs };

  useEffect(() => {
    let cancelled = false;
    if (!academicYear) return undefined;
    fetchDynamicFormSchema({ formFamily: assignedFormFamily, academicYear }).then((records) => {
      if (!Array.isArray(records)) throw new Error('Unsupported schema response.');
      // `records` was already fetched scoped to assignedFormFamily (see the
      // formFamily param above), so it's the authoritative source for which
      // schema this subject uses — trust it outright rather than requiring
      // this queue item's own `form` to also happen to contain matching
      // custom_..._s_... keys. The Part D registrar queue payload doesn't
      // reliably echo the subject's full saved form back (see the file-top
      // "Backend note"), so that cross-check was failing this subject's
      // schema lookup entirely even though assignedFormFamily was known and
      // correct — only fall back to sniffing `form`'s own keys when the
      // subject's school has no assigned family to go on at all.
      const savedKeys = Object.keys(form).filter((key) => /^custom_.+_s_.+/.test(key));
      const matchedFamilies = [...new Set(records.filter((record) => savedKeys.includes(record.section_key || record.code)).map((record) => record.form_family).filter(Boolean))];
      const resolvedFamily = assignedFormFamily || (matchedFamilies.length === 1 ? matchedFamilies[0] : null);
      if (!resolvedFamily) throw new Error('Could not identify this subject’s schema.');
      const preview = buildSchemaPreview(records, resolvedFamily);
      const registrarParts = preview.parts.filter((part) => part.isRegistrarPart);
      if (!cancelled) setResult({ registrarParts, error: null });
    }).catch((err) => { if (!cancelled) setResult({ registrarParts: [], error: err.message || 'Unable to load this subject’s schema.' }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectEmail, academicYear, assignedFormFamily]);

  if (!result) return <p role="status" style={{ padding: 16, color: '#64748b' }}>Loading this subject's dynamic form…</p>;
  if (result.error) return <p role="alert" style={{ padding: 16, color: '#991b1b' }}>{result.error}</p>;
  if (!result.registrarParts.length) return <p role="status" style={{ padding: 16, color: '#64748b' }}>No Registrar-only part is configured on this subject's form.</p>;

  const registrarMax = result.registrarParts
    .flatMap((part) => part.fields)
    .filter((field) => field.type === 'table')
    .reduce((sum, field) => sum + (Number(field.maxMarks) || 0), 0);

  const handleSubmit = async () => {
    const numericScore = Number(score);
    if (score === '' || !Number.isFinite(numericScore) || numericScore < 0 || (registrarMax > 0 && numericScore > registrarMax)) {
      setError(`Please enter a score between 0 and ${registrarMax || '∞'}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await submitPartDRegistrarReview({ subjectEmail, academicYear, score: numericScore, remarks });
      onSubmitted?.({
        partDStatus: 'released',
        hasRegistrarPartDScore: true,
        registrarPartDScore: numericScore,
        registrarPartDRemarks: remarks,
        registrarPartDReviewedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || 'Could not submit the Part D review.');
    } finally {
      setSaving(false);
    }
  };

  // Multiple Registrar-only parts (e.g. an admin-configured Part C and Part D
  // both flagged registrar-only) used to render stacked one after another,
  // which got unwieldy once a subject had several of them. A dropdown lets
  // the Registrar switch between them one at a time instead — the score/
  // remarks/submit block below still covers all of this subject's
  // Registrar-only parts together, same as before.
  const activePart = result.registrarParts[activePartIndex] || result.registrarParts[0];

  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    {result.registrarParts.length > 1 && (
      <label style={{ display: 'grid', gap: 6, fontSize: 12.5, fontWeight: 800, color: '#0e7490' }}>
        Section
        <select
          value={activePartIndex}
          onChange={(event) => setActivePartIndex(Number(event.target.value))}
          style={{ width: '100%', maxWidth: 360, height: 40, border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: '#fff', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
        >
          {result.registrarParts.map((part, index) => <option key={part.label} value={index}>{part.label}</option>)}
        </select>
      </label>
    )}
    {/* Same SectionCard shell/accent used for this exact part in the HOD/Director/
        Dean/VC read-only view (DynamicAuthorityReviewPanel.jsx) — the Registrar's
        own screen previously rendered this bare (no card, no header bar), which
        looked inconsistent with the rest of the app next to that screen. */}
    {activePart && (
      <SectionCard title={activePart.label} subtitle="Reviewed only by the Registrar — not part of your review chain" accent="#0e7490">
        <DynamicRegistrarPartView key={activePart.label} part={activePart} form={form} docs={docs} subject={subject} />
      </SectionCard>
    )}

    <SectionCard
      title="Registrar Decision"
      subtitle="Your score and remarks for the Registrar-only part(s) above"
      accent="#0e7490"
      scoreBadge={registrarMax > 0 ? `${score || 0} / ${registrarMax}` : undefined}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>
          Registrar Score {registrarMax > 0 ? `(Max ${registrarMax})` : ''} <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input type="number" min="0" max={registrarMax || undefined} step="0.5" value={score} onChange={(event) => setScore(event.target.value)}
          style={{ width: 160, height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }} />
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>Registrar Remarks</label>
        <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13 }} />
      </div>
      {error && <p role="alert" style={{ margin: 0, color: '#991b1b', fontSize: 12.5, fontWeight: 700 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleSubmit} disabled={saving} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none',
          background: saving ? '#94a3b8' : '#0e7490', color: '#fff', fontWeight: 800, fontFamily: 'inherit', fontSize: 13,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}><Send size={16} aria-hidden="true" />{saving ? 'Submitting...' : 'Save & Release Part D to VC'}</button>
      </div>
    </SectionCard>
  </div>;
}
