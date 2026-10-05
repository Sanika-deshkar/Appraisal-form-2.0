// Read-only view of a dynamic form's Registrar-only part (the admin-flagged
// equivalent of Standard Appraisal's "Part D → Registrar" section), shown to
// every reviewer role EXCEPT the Registrar (HOD/Director/Dean/VC never score
// this part — it bypasses their chain entirely, same as Standard's Part D).
//
// Deliberately a fresh, self-contained component rather than reusing/importing
// src/components/appraisal/PartD/LeaveManagementReadOnly.jsx — that component
// is hardcoded to Standard's fixed Leave & Attendance row shape and must stay
// untouched. This one is schema-driven, matching whatever an admin configured.
import { ClipboardList } from 'lucide-react';
import { SchemaFieldCell } from '../../faculty-appraisal/components/SchemaSectionTable';
import { SectionInfoButton, ViewCell } from '../../faculty-appraisal/components/formPrimitives';
import { T, TH, TD, TDC } from '../../faculty-appraisal/components/formPrimitiveStyles';
import { schemaTableGuideline } from '../../../utils/schemaPreview';
import '../../faculty-appraisal/components/dynamicAppraisalTable.css';

// Same status vocabulary Standard's Part D already uses on the subject/queue-item
// (partDStatus/registrarPartDScore/registrarPartDRemarks) — reused here as-is
// since it comes off the same generic Declaration/queue-item shape, not
// anything Standard-specific to the field values themselves.
function RegistrarStatusBanner({ subject }) {
  const status = String(subject?.partDStatus || subject?.part_d_status || '').trim().toLowerCase();
  const released = status === 'released';
  const score = subject?.registrarPartDScore ?? subject?.registrar_part_d_score;
  const remarks = subject?.registrarPartDRemarks ?? subject?.registrar_part_d_remarks;
  return <div style={{
    padding: '12px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, lineHeight: 1.5,
    background: released ? '#ecfdf5' : '#fffbeb', color: released ? '#065f46' : '#92400e',
    border: `1px solid ${released ? '#a7f3d0' : '#fde68a'}`,
  }}>
    {released
      ? <>Registrar reviewed this part{score !== undefined && score !== null ? ` — score: ${score}` : ''}.{remarks ? ` Remarks: ${remarks}` : ''}</>
      : 'This part is reviewed only by the Registrar and has not been completed yet — it is not part of your review chain.'}
  </div>;
}

function ReadOnlyTable({ field, rows, docs }) {
  const columns = (field.columns || []).flatMap((column) => column.type === 'file'
    ? [column, { key: `${column.name || column.key}__viewDocs`, isView: true, source: column }] : [column]);
  const count = columns.length + (field.autoSerial ? 1 : 0);
  if (!count) return <p style={{ color: '#64748b', fontSize: 13 }}>No active columns are configured for this table.</p>;
  return <div style={{ overflowX: 'auto' }}><table className="dynamic-appraisal-table" style={T}>
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
    </tbody>
  </table></div>;
}

export default function DynamicRegistrarPartView({ part, form, docs, subject }) {
  // minWidth: 0 on the grid/its row items is required here, not decorative —
  // without it a wide table's intrinsic content width forces this whole grid
  // (and every fixed-width ancestor up to the page) to grow to match instead
  // of letting the table's own overflowX:auto scrollbar contain it, which is
  // what was pushing the page into horizontal scroll.
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <RegistrarStatusBanner subject={subject} />
    {part.fields.map((field, index) => <section key={field.key || index} style={{ minWidth: 0 }}>
      <div className="appraisal-subsection-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4338ca', fontWeight: 800, marginBottom: 8 }}>
        <span className="appraisal-subsection-icon"><ClipboardList size={18} /></span>
        <span>{field.label || field.recordTitle || field.key}</span>
        <SectionInfoButton titleText={field.label} customGuideline={schemaTableGuideline(field)} popoverWidth={460} popoverClassName="dynamic-table-guidelines" />
      </div>
      {field.type === 'table'
        ? <ReadOnlyTable field={field} rows={Array.isArray(form?.[field.sectionCode]) ? form[field.sectionCode] : []} docs={docs} />
        : <SchemaFieldCell field={field} value={form?.[field.sectionCode]?.[field.key]} readOnly docId={field.key} docs={docs} />}
    </section>)}
  </div>;
}
