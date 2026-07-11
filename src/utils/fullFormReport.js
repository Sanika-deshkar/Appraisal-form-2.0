import {
  clampScore,
  researchGuidanceScore,
  reviewSectionScore,
  rowMaxForSection,
  societyRowScore,
  SCORE_LIMITS,
  projectGuidanceRowMax,
} from "./appraisalFormUtils";

import { feedbackRowScore, feedbackSectionScore } from "./appraisalFormUtils";

const n = (value) => parseFloat(value) || 0;
const percentOf = (score, max) => {
  const maximum = n(max);
  return maximum > 0 ? ((n(score) / maximum) * 100).toFixed(2) : "0.00";
};

export const safeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const scoreKeyForInnov = (role) =>
  ({
    hod: "innovHod",
    director: "innovDirector",
    dean: "innovDean",
    vc: "innovVc",
  })[role] || "innovScore";

const displayValue = (value) => {
  const text = String(value ?? "").trim();
  return text ? safeHtml(text) : "&nbsp;";
};

const firstFilled = (...values) =>
  values.find((value) => String(value ?? "").trim() !== "") ?? "";

const displayWithOptionalYears = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "&nbsp;";
  return /year/i.test(text) ? safeHtml(text) : `${safeHtml(text)} years`;
};

const qualificationValue = (info = {}, form = {}) =>
  firstFilled(
    info.qual,
    info.qualification,
    info.educationalQualifications,
    info.educational_qualifications,
    form.qualification,
    form.educationalQualifications,
    form.educational_qualifications,
    form.profile?.qualification,
    form.submitterProfile?.qualification,
  );

const experienceValue = (info = {}, form = {}) =>
  firstFilled(
    info.experience,
    info.teaching_experience,
    info.teachingExperience,
    form.experience,
    form.teaching_experience,
    form.teachingExperience,
    form.profile?.teaching_experience,
    form.profile?.experience,
    form.submitterProfile?.teaching_experience,
    form.submitterProfile?.experience,
    info.expTotal,
  );

const splitExperienceValue = (info = {}) => {
  const parts = [
    ["DYPIU", info.expDyp],
    ["Previous", info.expPrev],
    ["Total", info.expTotal],
  ].filter(([, value]) => String(value ?? "").trim() !== "");
  return parts
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join(" / ");
};

const displayExperience = (info = {}, form = {}) => {
  const singleValue = experienceValue(info, form);
  if (singleValue) return displayWithOptionalYears(singleValue);
  const splitValue = splitExperienceValue(info);
  return splitValue ? displayWithOptionalYears(splitValue) : "&nbsp;";
};

export const buildReviewRemarks = ({
  source = {},
  currentRole = "",
  currentRemarks = "",
  roleLabels = {},
} = {}) => {
  const remarkRoles = [
    {
      role: "hod",
      label: roleLabels.hod || "HOD Remarks",
      keys: [
        "hodRemarks",
        "hod_remarks",
        "centerHeadRemarks",
        "center_head_remarks",
      ],
    },
    {
      role: "director",
      label: roleLabels.director || "Director Remarks",
      keys: ["directorRemarks", "director_remarks"],
    },
    {
      role: "dean",
      label: roleLabels.dean || "Dean Remarks",
      keys: ["deanRemarks", "dean_remarks"],
    },
    {
      role: "vc",
      label: roleLabels.vc || "Vice Chancellor Remarks and Grade",
      keys: ["vcRemarks", "vc_remarks"],
    },
  ];

  return remarkRoles
    .map(({ role, label, keys }) => {
      const value = firstFilled(
        role === currentRole ||
          (role === "hod" && currentRole === "center_head")
          ? currentRemarks
          : "",
        ...keys.map((key) => source?.[key]),
      );
      return { label, remarks: value };
    })
    .filter((item) => String(item.remarks ?? "").trim() !== "");
};

const renderReviewRemarks = (sections = []) =>
  sections.length
    ? `
  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">REVIEW REMARKS</h3>
  ${sections
    .map(
      (section) => `
    <h3>${safeHtml(section.label)}</h3>
    <div class="remarks">${safeHtml(section.remarks || "No remarks recorded.")}</div>
  `,
    )
    .join("")}
`
    : "";

const renderSummaryOtherInfo = (value) =>
  String(value ?? "").trim()
    ? `<h3>Any other information not covered above</h3><div class="remarks">${safeHtml(value)}</div>`
    : "";

const docsFor = (docs, key) => {
  const files = docs?.[key] || [];
  if (!files.length) return "&nbsp;";
  return files
    .map((file) => {
      const label = safeHtml(file.name || file.url || "Document");
      return file.url
        ? `<a href="${safeHtml(file.url)}" target="_blank" rel="noreferrer">${label}</a>`
        : label;
    })
    .join("<br/>");
};

const roleColumnLabel = (role, roleLabel = (value) => value) =>
  role === "score" ? "Faculty Score" : `${safeHtml(roleLabel(role))} Score`;

const displaySectionScore = (section, row, role) => {
  if (section.key === "research" && role === "score")
    return researchGuidanceScore(row).toFixed(1);
  if (section.key === "feedback" && role === "score") {
    const hasFeedback =
      String(row?.fb1 ?? "").trim() !== "" ||
      String(row?.fb2 ?? "").trim() !== "";
    return hasFeedback ? feedbackRowScore(row, section.max).toFixed(1) : "";
  }
  if (role === "score")
    return clampScore(
      row?.[role],
      rowMaxForSection(section.key, row, section.max),
    );
  return row?.[role];
};

const sectionTotalScore = (section, rows, role) => {
  if (!rows.length) return 0;
  if (section.key === "feedback" && role === "score") {
    return feedbackSectionScore(rows, section.max);
  }
  if (
    section.key === "lectures" ||
    section.key === "courseFile" ||
    section.key === "feedback"
  )
    return reviewSectionScore(section.key, rows, section.max, role);
  const sum = rows.reduce(
    (acc, row) => acc + n(displaySectionScore(section, row, role)),
    0,
  );
  return clampScore(sum, section.max);
};

const renderSection = ({
  section,
  rows = [],
  docs = {},
  scoreRoles = ["score"],
  roleLabel,
  showTotal = false,
}) => `
  <h3>${safeHtml(section.title)} <span>(Max ${safeHtml(section.max)})</span></h3>
  <table>
    <thead>
      <tr>
        <th>SN</th>
        ${section.fields.map(([, label]) => `<th>${safeHtml(label)}</th>`).join("")}
        <th>Documents</th>
        ${scoreRoles.map((role) => `<th>${roleColumnLabel(role, roleLabel)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${(rows.length ? rows : [{}])
        .map(
          (row, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          ${section.fields.map(([key]) => `<td>${displayValue(row?.[key])}</td>`).join("")}
          <td>${docsFor(docs, `${section.doc}-${index}`)}</td>
          ${scoreRoles.map((role) => `<td class="center">${displayValue(displaySectionScore(section, row, role))}</td>`).join("")}
        </tr>
      `,
        )
        .join("")}
      ${
        showTotal
          ? `
      <tr class="tr">
        <td colspan="${section.fields.length + 2}" class="c b">Total Score (Max ${safeHtml(section.max)})</td>
        ${scoreRoles.map((role) => `<td class="c b">${sectionTotalScore(section, rows.length ? rows : [{}], role).toFixed(1)}</td>`).join("")}
      </tr>`
          : ""
      }
    </tbody>
  </table>`;

const buildSignaturePage = ({
  facultyName = "",
  submittedAt = "",
  reviewChain = [],
}) => {
  const submissionDate = submittedAt
    ? safeHtml(
        new Date(submittedAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      )
    : "&nbsp;";
  const reviewerRows = reviewChain.length
    ? reviewChain
        .map(
          (r) => `
        <tr>
          <td style="width:30%"><strong>${safeHtml(r.label || r.role)}</strong></td>
          <td style="width:40%;border-bottom:1px solid #000">${r.name ? safeHtml(r.name) : "&nbsp;"}</td>
          <td style="width:15%;border-bottom:1px solid #000">${r.date ? safeHtml(r.date) : "&nbsp;"}</td>
          <td style="width:15%;border-bottom:1px solid #000">&nbsp;</td>
        </tr>`,
        )
        .join("")
    : "";
  return `
  <h3 style="text-align:center;font-size:14px;background:#d9d9d9;padding:6px;margin-top:16px">DECLARATION BY FACULTY</h3>
  <table style="border:none;margin-bottom:14px">
    <tr>
      <td style="border:none;vertical-align:top;width:32px;font-size:18px">&#10003;</td>
      <td style="border:none;line-height:1.7;font-size:11px">
        I, <strong>${safeHtml(facultyName) || "________________________"}</strong>, hereby declare that all the
        information furnished in this Self-Appraisal Report is true, complete, and correct to the best of my
        knowledge and belief. I understand that in the event of any information being found false or incorrect,
        I shall be solely responsible for the consequences thereof and shall be liable for any disciplinary
        action as deemed fit by the University authorities.
      </td>
    </tr>
  </table>
  <table style="border:none;margin-bottom:20px">
    <tr>
      <td style="border:none;width:50%">
        <div style="border-bottom:1px solid #000;min-height:36px;margin-bottom:4px">&nbsp;</div>
        <div><strong>Signature of Faculty</strong></div>
        <div style="margin-top:6px"><strong>Name:</strong> ${safeHtml(facultyName) || "&nbsp;"}</div>
        <div style="margin-top:4px"><strong>Date of Submission:</strong> ${submissionDate}</div>
      </td>
      <td style="border:none;width:50%">&nbsp;</td>
    </tr>
  </table>
  ${
    reviewChain.length
      ? `
  <h3 style="text-align:center;font-size:13px;background:#d9d9d9;padding:4px">REVIEWERS' ACKNOWLEDGEMENT</h3>
  <p style="font-size:10px;margin:4px 0 10px">The following authorities acknowledge that they have reviewed the details submitted by the faculty and confirm the accuracy of scores assigned.</p>
  <table>
    <thead>
      <tr>
        <th style="width:30%">Reviewer Role</th>
        <th style="width:40%">Name &amp; Signature</th>
        <th style="width:15%">Date</th>
        <th style="width:15%">Stamp</th>
      </tr>
    </thead>
    <tbody>
      ${reviewerRows}
    </tbody>
  </table>`
      : ""
  }`;
};

const isSectionReportable = (form, section) => {
  const applicability = form?.sectionApplicability || {};
  if (applicability[section.key] === "notApplicable") return false;
  if (
    section.applicabilityKey &&
    applicability[section.applicabilityKey] === "notApplicable"
  )
    return false;
  return true;
};

const renderInnovativeSection = ({
  form,
  docs,
  scoreRoles,
  roleLabel,
  showTotal = false,
}) => {
  const rows = form.innovRows?.length
    ? form.innovRows
    : [{ method: form.innovDetails, details: "" }];
  const innovTotal = (role) =>
    role === "score"
      ? clampScore(
          rows.reduce(
            (acc, row) => acc + n(row.score || form.innovScore || 0),
            0,
          ),
          10,
        )
      : clampScore(n(form[scoreKeyForInnov(role)]), 10);
  return `
  <h3>A(iii). Innovative Teaching Methods <span>(Max 10)</span></h3>
  <table>
    <thead>
      <tr>
        <th>Methods Used</th>
        <th>Details</th>
        <th>Documents</th>
        ${scoreRoles.map((role) => `<th>${roleColumnLabel(role, roleLabel)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, index) => `
        <tr>
          <td>${displayValue(row.method || form.innovDetails)}</td>
          <td>${displayValue(row.details)}</td>
          <td>${docsFor(docs, `innov-${index}`)}</td>
          ${scoreRoles.map((role) => `<td class="center">${displayValue(role === "score" ? row.score || form.innovScore : form[scoreKeyForInnov(role)])}</td>`).join("")}
        </tr>
      `,
        )
        .join("")}
      ${
        showTotal
          ? `
      <tr class="tr">
        <td colspan="3" class="c b">Total Score (Max 10)</td>
        ${scoreRoles.map((role) => `<td class="c b">${innovTotal(role).toFixed(1)}</td>`).join("")}
      </tr>`
          : ""
      }
    </tbody>
  </table>`;
};

export const openFullFormReport = async ({
  title,
  subtitle = "",
  form = {},
  docs = {},
  partASections = [],
  partBSections = [],
  totals = {},
  maxScores = {},
  scoreRoles = ["score"],
  roleLabel,
  status = "",
  remarksLabel = "",
  remarks = "",
  remarksSections = null,
  generatedBy = "",
  showTotal = false,
  declaration = null,
  reviewChain = [],
  hideAcr = false,
}) => {
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) {
    alert("Please allow popups to generate the report.");
    return;
  }

  let logoSrc = `${window.location.origin}/image.png`;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    logoSrc = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    /* use URL fallback */
  }

  const info = form.info || {};
  const displayPartAMax = n(maxScores.partA || 0);
  const displayPartA = n(totals.partA || 0);
  const displayGrandMax = n(maxScores.grand || 0);
  const displayGrand = n(totals.total || 0);
  const displayPartAPercentage = percentOf(displayPartA, displayPartAMax);
  const displayPartBPercentage = percentOf(
    n(totals.partB || 0),
    n(maxScores.partB || 0),
  );
  const displayTotalPercentage = percentOf(displayGrand, displayGrandMax);

  const sectionAllowed = (section) =>
    isSectionReportable(form, section) && !(hideAcr && section.key === "acr");
  const html = `<!doctype html>
<html>
<head>
  <title>${safeHtml(title)}</title>
  <style>
    @page{size:A4;margin:15mm}
    body{font-family:"Times New Roman",serif;font-size:11px;color:#000}
    h1{text-align:center;font-size:15px;margin:4px 0}
    h2{text-align:center;font-size:13px;margin:3px 0}
    h3{font-size:12px;margin:10px 0 4px}
    h3 span{color:#555;font-size:10px;font-weight:400}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed}
    th,td{border:1px solid #000;padding:4px 6px;vertical-align:top;word-wrap:break-word}
    th{background:#d9d9d9;text-align:center;font-weight:700}
    a{color:#1d4ed8}
    .c{text-align:center}.b{font-weight:bold}
    .page-break{page-break-before:always}
    .tr{background:#f2f2f2;font-weight:bold}
    .ht{width:100%;border:none;margin-bottom:6px}.ht td{border:none;padding:2px}
    .logo{width:22mm;height:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .st th{background:#bfbfbf}
    .remarks{white-space:pre-wrap;border:1px solid #000;padding:8px;min-height:40px}
  </style>
</head>
<body>
  <table class="ht"><tr>
    <td style="width:20%;text-align:left"><img class="logo" src="${logoSrc}" alt="DYPIU"/></td>
    <td style="text-align:center">
      <h1>D Y PATIL INTERNATIONAL UNIVERSITY, AKURDI, PUNE</h1>
      <h2>${safeHtml(title)}</h2>
      ${subtitle ? `<h2>${safeHtml(subtitle)}</h2>` : ""}
    </td>
    <td style="width:20%"></td>
  </tr></table>
  <table>
    <tr><td class="b" style="width:35%">Name of Faculty</td><td>${displayValue(info.name || form.name)}</td></tr>
    <tr><td class="b">Educational Qualifications</td><td>${displayValue(qualificationValue(info, form))}</td></tr>
    <tr><td class="b">Present Designation</td><td>${displayValue(info.desig || form.designation || form.appraisalRole)}</td></tr>
    <tr><td class="b">School / Department</td><td>${displayValue(info.school || form.schoolName || form.school)}</td></tr>
    <tr><td class="b">Experience</td><td>${displayExperience(info, form)}</td></tr>
    <tr><td class="b">Academic Year</td><td>${displayValue(info.ay || form.academicYear)}</td></tr>
    <tr><td class="b">Generated On</td><td>${safeHtml(new Date().toLocaleString())}</td></tr>
    ${generatedBy ? `<tr><td class="b">Generated By</td><td>${safeHtml(generatedBy)}</td></tr>` : ""}
  </table>

  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART A - Teaching Process &amp; Academic Activities</h3>
  ${partASections
    .slice(0, 2)
    .filter((section) => sectionAllowed(section))
    .map((section) =>
      renderSection({
        section,
        rows: form[section.key],
        docs,
        scoreRoles,
        roleLabel,
        showTotal,
      }),
    )
    .join("")}
  ${renderInnovativeSection({ form, docs, scoreRoles, roleLabel, showTotal })}
  ${partASections
    .slice(2)
    .filter((section) => sectionAllowed(section))
    .map((section) =>
      renderSection({
        section,
        rows: form[section.key],
        docs,
        scoreRoles,
        roleLabel,
        showTotal,
      }),
    )
    .join("")}

  <div class="page-break"></div>
  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART B - Research &amp; Academic Contributions</h3>
  ${partBSections
    .filter((section) => isSectionReportable(form, section))
    .map((section) =>
      renderSection({
        section,
        rows: form[section.key],
        docs,
        scoreRoles,
        roleLabel,
        showTotal,
      }),
    )
    .join("")}

  <div class="page-break"></div>
  <h3 style="text-align:center;font-size:13px">SUMMARY</h3>
  <table class="st">
    <thead><tr><th>Section</th><th>Score</th><th>Maximum</th></tr></thead>
    <tbody>
      <tr><td>Part A</td><td class="c">${displayPartA.toFixed(1)}</td><td class="c">${safeHtml(String(displayPartAMax))}</td></tr>
      <tr><td>Part A Marks Obtained (%)</td><td colspan="2" class="c">${displayPartAPercentage}%</td></tr>
      <tr><td>Part B</td><td class="c">${n(totals.partB).toFixed(1)}</td><td class="c">${safeHtml(String(maxScores.partB ?? ""))}</td></tr>
      <tr><td>Part B Marks Obtained (%)</td><td colspan="2" class="c">${displayPartBPercentage}%</td></tr>
      <tr class="tr"><td>Grand Total</td><td class="c">${displayGrand.toFixed(1)}</td><td class="c">${safeHtml(String(displayGrandMax))}</td></tr>
      <tr class="tr"><td>Marks Obtained (%)</td><td colspan="2" class="c">${displayTotalPercentage}%</td></tr>
      ${status ? `<tr><td>Status</td><td colspan="2">${safeHtml(status)}</td></tr>` : ""}
    </tbody>
  </table>
  ${renderReviewRemarks(Array.isArray(remarksSections) ? remarksSections : remarksLabel ? [{ label: remarksLabel, remarks }] : [])}
  ${renderSummaryOtherInfo(form.summaryOtherInfo)}
  ${buildSignaturePage({
    facultyName: form.info?.name || form.name || "",
    submittedAt: declaration?.submitted_at || "",
    reviewChain,
  })}
<script>window.addEventListener('load', function(){ window.focus(); window.print(); });</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
};

export const generateMediaCommReport = async ({
  title,
  subtitle = "",
  form = {},
  docs = {},
  partASections = [],
  partBSections = [],
  totals = {},
  maxScores = {},
  generatedBy = "",
  detailedSummaryRows = null,
  declaration = null,
  reviewChain = [],
  remarksSections = [],
  hideAcr = false,
}) => {
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) {
    alert("Please allow popups to generate the report.");
    return;
  }
  let logoSrc = `${window.location.origin}/image.png`;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    logoSrc = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    /* use URL fallback */
  }

  const info = form.info || {};
  const scoreRoles = ["score"];
  const displayPartA = n(totals.partA);
  const displayPartAMax = n(maxScores.partA || 0);
  const displayPartB = n(totals.partB);
  const displayGrand = n(totals.total);
  const displayGrandMax = n(maxScores.grand || 0);
  const partAPercentage = percentOf(displayPartA, displayPartAMax);
  const partBPercentage = percentOf(displayPartB, maxScores.partB);
  const totalPercentage = percentOf(displayGrand, displayGrandMax);
  const rowsToRender =
    hideAcr && Array.isArray(detailedSummaryRows)
      ? detailedSummaryRows.filter(
          (r) => !/annual confidential report|acr/i.test(r.label || ""),
        )
      : detailedSummaryRows;

  const html = `<!doctype html>
<html>
<head>
  <title>${safeHtml(title)}</title>
  <style>
    @page{size:A4;margin:15mm}
    body{font-family:"Times New Roman",serif;font-size:11px;color:#000}
    h1{text-align:center;font-size:15px;margin:4px 0}
    h2{text-align:center;font-size:13px;margin:3px 0}
    h3{font-size:12px;margin:10px 0 4px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed}
    th,td{border:1px solid #000;padding:4px 6px;vertical-align:top;word-wrap:break-word}
    th{background:#d9d9d9;text-align:center;font-weight:700}
    a{color:#1d4ed8}
    .c{text-align:center}.b{font-weight:bold}
    .pb{page-break-before:always}
    .tr{background:#f2f2f2;font-weight:bold}
    .ht{width:100%;border:none;margin-bottom:6px}.ht td{border:none;padding:2px}
    .logo{width:22mm;height:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .st th{background:#bfbfbf}
    .remarks{white-space:pre-wrap;border:1px solid #000;padding:8px;min-height:40px}
    h3 span{color:#555;font-size:10px;font-weight:400}
  </style>
</head>
<body>
  <table class="ht"><tr>
    <td style="width:20%;text-align:left"><img class="logo" src="${logoSrc}" alt="DYPIU"/></td>
    <td style="text-align:center">
      <h1>D Y PATIL INTERNATIONAL UNIVERSITY, AKURDI, PUNE</h1>
      <h2>${safeHtml(title)}</h2>
      ${subtitle ? `<h2>${safeHtml(subtitle)}</h2>` : ""}
    </td>
    <td style="width:20%"></td>
  </tr></table>
  <table>
    <tr><td class="b" style="width:35%">Name of Faculty</td><td>${displayValue(info.name)}</td></tr>
    <tr><td class="b">Educational Qualifications</td><td>${displayValue(qualificationValue(info, form))}</td></tr>
    <tr><td class="b">Present Designation</td><td>${displayValue(info.desig)}</td></tr>
    <tr><td class="b">School / Department</td><td>${displayValue(info.school)}</td></tr>
    <tr><td class="b">Experience</td><td>${displayExperience(info, form)}</td></tr>
    <tr><td class="b">Academic Year</td><td>${displayValue(info.ay)}</td></tr>
    <tr><td class="b">Generated On</td><td>${safeHtml(new Date().toLocaleString())}</td></tr>
    ${generatedBy ? `<tr><td class="b">Generated By</td><td>${safeHtml(generatedBy)}</td></tr>` : ""}
  </table>

  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART A - Teaching Process &amp; Academic Activities</h3>
  ${partASections
    .slice(0, 2)
    .filter((s) => isSectionReportable(form, s))
    .map((s) =>
      renderSection({
        section: s,
        rows: form[s.key],
        docs,
        scoreRoles,
        roleLabel: undefined,
        showTotal: true,
      }),
    )
    .join("")}
  ${renderInnovativeSection({ form, docs, scoreRoles, roleLabel: undefined, showTotal: true })}
  ${partASections
    .slice(2)
    .filter((s) => isSectionReportable(form, s))
    .map((s) =>
      renderSection({
        section: s,
        rows: form[s.key],
        docs,
        scoreRoles,
        roleLabel: undefined,
        showTotal: true,
      }),
    )
    .join("")}

  <div class="pb"></div>
  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART B - Research &amp; Academic Contributions</h3>
  ${partBSections
    .filter((s) => isSectionReportable(form, s))
    .map((s) =>
      renderSection({
        section: s,
        rows: form[s.key],
        docs,
        scoreRoles,
        roleLabel: undefined,
        showTotal: true,
      }),
    )
    .join("")}

  <div class="pb"></div>
  ${
    rowsToRender
      ? `
  <h3 style="text-align:center;font-size:13px">SUMMARY OF API SCORES - AY ${safeHtml(info.ay || "")}</h3>
  <table class="st">
    <tr><th>Sr.No.</th><th>Criteria</th><th>Max Score</th><th>Faculty Score</th></tr>
    ${rowsToRender
      .map((row, i) =>
        row.isHeader
          ? `<tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">${safeHtml(row.label)}</td></tr>`
          : row.isGrandTotal
            ? `<tr style="background:#bfbfbf;font-weight:bold;font-size:13px"><td colspan="2" class="c">${safeHtml(row.label)}</td><td class="c">${safeHtml(String(row.max))}</td><td class="c">${n(row.score).toFixed(1)}</td></tr>`
            : row.isTotal
              ? `<tr class="tr"><td colspan="2" class="c b">${safeHtml(row.label)}</td><td class="c b">${safeHtml(String(row.max))}</td><td class="c b">${n(row.score).toFixed(1)}</td></tr>${
                  /^part a/i.test(row.label)
                    ? `<tr class="tr"><td colspan="2" class="c b">Part A Marks Obtained (%)</td><td colspan="2" class="c b">${partAPercentage}%</td></tr>`
                    : /^part b/i.test(row.label)
                      ? `<tr class="tr"><td colspan="2" class="c b">Part B Marks Obtained (%)</td><td colspan="2" class="c b">${partBPercentage}%</td></tr>`
                      : ""
                }`
              : `<tr><td class="c">${safeHtml(row.id || String(i + 1))}</td><td>${safeHtml(row.label)}</td><td class="c">${safeHtml(String(row.max))}</td><td class="c">${n(row.score).toFixed(1)}</td></tr>`,
      )
      .join("")}
    <tr class="tr"><td colspan="2" class="c b">Marks Obtained (%)</td><td colspan="2" class="c b">${totalPercentage}%</td></tr>
  </table>`
      : `
  <h2>Summary</h2>
  <table class="st">
    <tr><th>Section</th><th>Score</th><th>Maximum</th></tr>
    <tr><td>Part A</td><td class="c">${displayPartA.toFixed(1)}</td><td class="c">${safeHtml(String(displayPartAMax || ""))}</td></tr>
    <tr><td>Part A Marks Obtained (%)</td><td colspan="2" class="c">${partAPercentage}%</td></tr>
    <tr><td>Part B</td><td class="c">${displayPartB.toFixed(1)}</td><td class="c">${safeHtml(String(maxScores.partB || ""))}</td></tr>
    <tr><td>Part B Marks Obtained (%)</td><td colspan="2" class="c">${partBPercentage}%</td></tr>
    <tr class="tr"><td>Grand Total</td><td class="c">${displayGrand.toFixed(1)}</td><td class="c">${safeHtml(String(displayGrandMax || ""))}</td></tr>
    <tr class="tr"><td>Marks Obtained (%)</td><td colspan="2" class="c">${totalPercentage}%</td></tr>
  </table>`
  }
  ${renderReviewRemarks(remarksSections)}
  ${renderSummaryOtherInfo(form.summaryOtherInfo)}
  ${buildSignaturePage({
    facultyName: info.name || "",
    submittedAt: declaration?.submitted_at || "",
    reviewChain,
  })}
<script>window.addEventListener('load', function(){ window.focus(); window.print(); });</script>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
};

export const generateStandardReport = async ({
  info,
  lectures,
  courseFile,
  innovRows,
  innovTotal,
  projects,
  quals,
  feedback,
  deptActs,
  uniActs,
  society,
  industry,
  acr,
  journals,
  books,
  ict,
  research,
  projects2,
  externalProjects,
  patents,
  awards,
  confs,
  proposals,
  products,
  fdps,
  training,
  sectionApplicability,
  totalLecScore,
  courseFileScore,
  teachingRaw,
  stuFeedbackScore,
  deptScore,
  uniScore,
  societyScore,
  industryScore,
  acrScore,
  partATotal,
  effectivePartAMax,
  journalScore,
  bookScore,
  ictScore,
  researchScore,
  projectBScore,
  externalProjectScore,
  patentScore,
  awardScore,
  confScore,
  proposalScore,
  productScore,
  fdpScore,
  trainScore,
  partBTotal,
  effectivePartBMax,
  grandTotal,
  effectiveGrandMax,
  researchGuidanceScore: rgs,
  summaryOtherInfo = "",
  declaration = null,
  reviewChain = [],
  hideAcr = false,
}) => {
  const n = (v) => parseFloat(v) || 0;
  const applicability = sectionApplicability || {};
  const teachingMax = applicability.projects === "notApplicable" ? 90 : 100;
  const researchGuidanceProjectMax =
    applicability.research === "notApplicable" ? 45 : 75;
  const selfAcrExcluded = hideAcr || applicability.acr === "notApplicable";
  const acrSummaryMax = selfAcrExcluded ? "N/A" : "25";
  const acrSummaryScore = selfAcrExcluded ? 0 : acrScore;
  const partAPercentage = percentOf(partATotal, effectivePartAMax);
  const partBPercentage = percentOf(partBTotal, effectivePartBMax);
  const totalPercentage = percentOf(grandTotal, effectiveGrandMax);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow popups to generate the report.");
    return;
  }
  let logoSrc = `${window.location.origin}/image.png`;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    logoSrc = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    /* use URL fallback */
  }
  const html = `<html><head><title>Faculty Appraisal</title><style>
    @page{size:A4;margin:15mm}
    body{font-family:"Times New Roman",serif;font-size:11px;color:#000}
    h1{text-align:center;font-size:15px;margin:4px 0}
    h2{text-align:center;font-size:13px;margin:3px 0}
    h3{font-size:12px;margin:10px 0 4px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px}
    th,td{border:1px solid #000;padding:4px 6px;word-wrap:break-word;vertical-align:top}
    th{background:#d9d9d9;text-align:center;font-weight:bold}
    .c{text-align:center}.b{font-weight:bold}
    .pb{page-break-before:always}
    .tr{background:#f2f2f2;font-weight:bold}
    .ht{width:100%;border:none;margin-bottom:6px}.ht td{border:none;padding:2px}
    .logo{width:22mm;height:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .st th{background:#bfbfbf}
  </style></head><body>
  <table class="ht"><tr>
    <td style="width:20%;text-align:left"><img class="logo" src="${logoSrc}" alt="DYPIU"/></td>
    <td style="text-align:center"><h1>D Y PATIL INTERNATIONAL UNIVERSITY, AKURDI, PUNE</h1><h2>Faculty Appraisal Form - Academic Year ${info.ay || ""}</h2></td>
    <td style="width:20%"></td>
  </tr></table>
  <table>
    <tr><td class="b" style="width:35%">Name of Faculty</td><td>${info.name || "&nbsp;"}</td></tr>
    <tr><td class="b">Educational Qualifications</td><td>${displayValue(qualificationValue(info))}</td></tr>
    <tr><td class="b">Present Designation</td><td>${info.desig || "&nbsp;"}</td></tr>
    <tr><td class="b">School / Department</td><td>${info.school || "&nbsp;"}</td></tr>
    <tr><td class="b">Experience</td><td>${displayExperience(info)}</td></tr>
  </table>
  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART A - Teaching Process &amp; Academic Activities</h3>
  <h3>(i) Lectures / Tutorials / Practicals (Max 50)</h3>
  <table><tr><th>SN</th><th>Semester</th><th>Course Code/Name</th><th>Classes as per Course Structure</th><th>Classes Actually Conducted</th><th>API Score</th></tr>
  ${lectures.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${l.sem || "&nbsp;"}</td><td>${l.code || "&nbsp;"}</td><td class="c">${l.planned || "&nbsp;"}</td><td class="c">${l.conducted || "&nbsp;"}</td><td class="c">${l.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Average Score (Max 50)</td><td class="c">${totalLecScore.toFixed(1)}</td></tr></table>
  <h3>(ii) Course File (Max 20)</h3>
  <table><tr><th>SN</th><th>Course/Paper</th><th>Title</th><th>Details</th><th>API Score</th></tr>
  ${courseFile.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.course || "&nbsp;"}</td><td>${c.title || "&nbsp;"}</td><td>${c.details || "&nbsp;"}</td><td class="c">${c.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="4" class="c b">Average Score (Max 20)</td><td class="c">${courseFileScore.toFixed(1)}</td></tr></table>
  <h3>(iii) Innovative Teaching-Learning Methodologies (Max 10)</h3>
  <table><tr><th>SN</th><th>Methods Used</th><th>Details</th><th>API Score</th></tr>
  ${(innovRows || []).map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.method || r.details || "&nbsp;"}</td><td>${r.details || "&nbsp;"}</td><td class="c">${r.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="3" class="c b">Total Score (Max 10)</td><td class="c">${innovTotal.toFixed(1)}</td></tr></table>
  ${
    applicability.projects === "notApplicable"
      ? ""
      : `<h3>(iv) Projects (Max 10)</h3>
  <table><tr><th>SN</th><th>Project Type</th><th>API Score</th></tr>
  ${projects.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.label || "&nbsp;"}</td><td class="c">${clampScore(p.score, projectGuidanceRowMax(p)) || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="2" class="c b">Total Score (Max 10)</td><td class="c">${projects.reduce((a, p) => a + n(p.score), 0).toFixed(1)}</td></tr></table>`
  }
  <h3>(v) Qualification Enhancement (Max 10)</h3>
  <table><tr><th>SN</th><th>Qualification / Category</th><th>API Score</th></tr>
  ${quals.map((q, i) => `<tr><td class="c">${i + 1}</td><td>${q.label || "&nbsp;"}</td><td class="c">${q.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="2" class="c b">Total Score (Max 10)</td><td class="c">${quals.reduce((a, q) => a + n(q.score), 0).toFixed(1)}</td></tr></table>
  <h3>B. Students' Feedback (Max 10)</h3>
  <table><tr><th>SN</th><th>Course Code/Name</th><th>First Feedback(%)</th><th>Second Feedback(%)</th><th>Average</th><th>API Score</th></tr>
  ${feedback.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${f.code || "&nbsp;"}</td><td class="c">${f.fb1 || "&nbsp;"}</td><td class="c">${f.fb2 || "&nbsp;"}</td><td class="c">${f.fb1 || f.fb2 ? ((n(f.fb1) + n(f.fb2)) / ((f.fb1 ? 1 : 0) + (f.fb2 ? 1 : 0) || 1)).toFixed(2) : "&nbsp;"}</td><td class="c">${f.fb1 || f.fb2 ? ((n(f.fb1) + n(f.fb2)) / ((f.fb1 ? 1 : 0) + (f.fb2 ? 1 : 0) || 1) / 10).toFixed(2) : "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr></table>
  <h3>C. Departmental / School Activities (Max 20)</h3>
  <table><tr><th>SN</th><th>Activity</th><th>Nature of Activity</th><th>API Score</th></tr>
  ${deptActs.map((d, i) => `<tr><td class="c">${i + 1}</td><td>${d.activity || "&nbsp;"}</td><td>${d.nature || "&nbsp;"}</td><td class="c">${d.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="3" class="c b">Total (Max 20)</td><td class="c">${deptScore.toFixed(1)}</td></tr></table>
  <h3>D. University Level Activities (Max 30)</h3>
  <table><tr><th>SN</th><th>Activity</th><th>Nature of Activity</th><th>API Score</th></tr>
  ${uniActs.map((u, i) => `<tr><td class="c">${i + 1}</td><td>${u.activity || "&nbsp;"}</td><td>${u.nature || "&nbsp;"}</td><td class="c">${u.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="3" class="c b">Total (Max 30)</td><td class="c">${uniScore.toFixed(1)}</td></tr></table>
  <h3>E. Contribution to Society (Max 10)</h3>
  ${
    applicability.society === "notApplicable"
      ? "<p><em>Not Applicable</em></p>"
      : `<table><tr><th>SN</th><th>Activity</th><th>Details</th><th>API Score</th></tr>
  ${society.map((s, i) => `<tr><td class="c">${i + 1}</td><td>${s.label || "&nbsp;"}</td><td>${s.details || "&nbsp;"}</td><td class="c">${societyRowScore(s)}</td></tr>`).join("")}
  <tr class="tr"><td colspan="3" class="c b">Total (Max 10)</td><td class="c">${societyScore.toFixed(1)}</td></tr></table>`
  }
  <h3>F. Industry Connect Activity (Max 5)</h3>
  <table><tr><th>SN</th><th>Name of Industry</th><th>Details of Activity</th><th>API Score</th></tr>
  ${industry.map((ind, i) => `<tr><td class="c">${i + 1}</td><td>${ind.name || "&nbsp;"}</td><td>${ind.details || "&nbsp;"}</td><td class="c">${ind.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="3" class="c b">Total (Max 5)</td><td class="c">${industryScore.toFixed(1)}</td></tr></table>
  <h3>G. Annual Confidential Report (${selfAcrExcluded ? "Not counted in self score" : "Max 25"})</h3>
  <table><tr><th>SN</th><th>Parameter</th><th>API Score</th></tr>
  ${acr.map((a, i) => `<tr><td class="c">${i + 1}</td><td>${a.label || "&nbsp;"}</td><td class="c">${a.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="2" class="c b">Total (${selfAcrExcluded ? "Not counted in self score" : "Max 25"})</td><td class="c">${acrSummaryScore.toFixed(1)}</td></tr></table>
  <table class="st">
    <tr><th>Part A Summary</th><th>Max</th><th>Faculty Score</th></tr>
    <tr><td>Teaching Process (i+ii+iii+iv+v)</td><td class="c">${teachingMax}</td><td class="c">${teachingRaw.toFixed(1)}</td></tr>
    <tr><td>Students' Feedback</td><td class="c">10</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr>
    <tr><td>Departmental Activities</td><td class="c">20</td><td class="c">${deptScore.toFixed(1)}</td></tr>
    <tr><td>University Activity</td><td class="c">30</td><td class="c">${uniScore.toFixed(1)}</td></tr>
    <tr><td>Contribution to Society</td><td class="c">${applicability.society === "notApplicable" ? "N/A" : "10"}</td><td class="c">${societyScore.toFixed(1)}</td></tr>
    <tr><td>Industry Connect</td><td class="c">5</td><td class="c">${industryScore.toFixed(1)}</td></tr>
    <tr><td>Annual Confidential Report</td><td class="c">${acrSummaryMax}</td><td class="c">${acrSummaryScore.toFixed(1)}</td></tr>
    <tr class="tr"><td class="b">PART A TOTAL</td><td class="c b">${effectivePartAMax}</td><td class="c b">${partATotal.toFixed(1)}</td></tr>
    <tr class="tr"><td class="b">PART A MARKS OBTAINED (%)</td><td colspan="2" class="c b">${partAPercentage}%</td></tr>
  </table>
  <div class="pb"></div>
  <h3 style="background:#d9d9d9;padding:4px;text-align:center;font-size:13px">PART B - Research &amp; Academic Contributions</h3>
  <h3>1) Published Papers in Journals (Max 120)</h3>
  <table><tr><th>SN</th><th>Title with Page Nos.</th><th>Journal Details</th><th>ISSN/ISBN No.</th><th>Journal Indexing</th><th>API Score</th></tr>
  ${journals.map((j, i) => `<tr><td class="c">${i + 1}</td><td>${j.title || "&nbsp;"}</td><td>${j.journal || "&nbsp;"}</td><td class="c">${j.issn || "&nbsp;"}</td><td class="c">${j.index || "&nbsp;"}</td><td class="c">${j.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Total (Max 120)</td><td class="c">${journalScore.toFixed(1)}</td></tr></table>
  <h3>2) Articles / Chapters in Books (Max 50)</h3>
  <table><tr><th>SN</th><th>Title</th><th>Book &amp; Publisher</th><th>ISBN</th><th>Type</th><th>Co-authors</th><th>First Author</th><th>API Score</th></tr>
  ${books.map((b, i) => `<tr><td class="c">${i + 1}</td><td>${b.title || "&nbsp;"}</td><td>${b.book || "&nbsp;"}</td><td class="c">${b.issn || "&nbsp;"}</td><td>${b.pub || "&nbsp;"}</td><td>${b.coauth || "&nbsp;"}</td><td class="c">${b.first || "&nbsp;"}</td><td class="c">${b.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="7" class="c b">Total (Max 50)</td><td class="c">${bookScore.toFixed(1)}</td></tr></table>
  <h3>3) ICT Mediated Teaching Learning Pedagogy (Max 20)</h3>
  <table><tr><th>SN</th><th>Title</th><th>Short Description</th><th>Type / Link</th><th>Quadrants</th><th>API Score</th></tr>
  ${ict.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.title || "&nbsp;"}</td><td>${r.desc || "&nbsp;"}</td><td>${r.type || "&nbsp;"}</td><td class="c">${r.quad || "&nbsp;"}</td><td class="c">${r.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Total (Max 20)</td><td class="c">${ictScore.toFixed(1)}</td></tr></table>
  ${
    applicability.research === "notApplicable"
      ? ""
      : `<h3>4a) Research Guidance - PhD / PG (Max 30)</h3>
  <table><tr><th>SN</th><th>Degree</th><th>Name of Student</th><th>Thesis / Status</th><th>API Score</th></tr>
  ${research.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="c">${r.degree || "&nbsp;"}</td><td>${r.name || "&nbsp;"}</td><td>${r.thesis || "&nbsp;"}</td><td class="c">${rgs(r).toFixed(1)}</td></tr>`).join("")}
  <tr class="tr"><td colspan="4" class="c b">Total (Max 30)</td><td class="c">${researchScore.toFixed(1)}</td></tr></table>`
  }
  <h3>4b) Internal Research Projects (Max 15)</h3>
  <table><tr><th>SN</th><th>Title</th><th>Agency</th><th>Date</th><th>Amount</th><th>Role</th><th>Status</th><th>API Score</th></tr>
  ${projects2.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || "&nbsp;"}</td><td>${p.agency || "&nbsp;"}</td><td class="c">${p.date || "&nbsp;"}</td><td class="c">${p.amount || "&nbsp;"}</td><td>${p.role || "&nbsp;"}</td><td>${p.status || "&nbsp;"}</td><td class="c">${p.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="7" class="c b">Total (Max 15)</td><td class="c">${projectBScore.toFixed(1)}</td></tr></table>
  <h3>4c) External Research Projects (Max 30)</h3>
  <table><tr><th>SN</th><th>Title</th><th>Agency</th><th>Date</th><th>Amount</th><th>Role</th><th>Status</th><th>API Score</th></tr>
  ${externalProjects.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || "&nbsp;"}</td><td>${p.agency || "&nbsp;"}</td><td class="c">${p.date || "&nbsp;"}</td><td class="c">${p.amount || "&nbsp;"}</td><td>${p.role || "&nbsp;"}</td><td>${p.status || "&nbsp;"}</td><td class="c">${p.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="7" class="c b">Total (Max 30)</td><td class="c">${externalProjectScore.toFixed(1)}</td></tr></table>
  <h3>5a) Patents (IPR) (Max 40)</h3>
  <table><tr><th>SN</th><th>Title</th><th>Nat/Intl</th><th>Date of Filing</th><th>Status</th><th>File No.</th><th>API Score</th></tr>
  ${patents.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || "&nbsp;"}</td><td class="c">${p.type || "&nbsp;"}</td><td class="c">${p.date || "&nbsp;"}</td><td>${p.status || "&nbsp;"}</td><td class="c">${p.fileNo || "&nbsp;"}</td><td class="c">${p.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="6" class="c b">Total (Max 40)</td><td class="c">${patentScore.toFixed(1)}</td></tr></table>
  <h3>5b) Research Awards / Fellowships (Max 10)</h3>
  <table><tr><th>SN</th><th>Title of Award</th><th>Date</th><th>Awarding Agency</th><th>Level</th><th>API Score</th></tr>
  ${awards.map((a, i) => `<tr><td class="c">${i + 1}</td><td>${a.title || "&nbsp;"}</td><td class="c">${a.date || "&nbsp;"}</td><td>${a.agency || "&nbsp;"}</td><td>${a.level || "&nbsp;"}</td><td class="c">${a.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${awardScore.toFixed(1)}</td></tr></table>
  <h3>6) Conferences / Seminars / Workshops (Max 30)</h3>
  <table><tr><th>SN</th><th>Title / Session</th><th>Type</th><th>Organization</th><th>Level</th><th>API Score</th></tr>
  ${confs.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.title || "&nbsp;"}</td><td>${c.type || "&nbsp;"}</td><td>${c.org || "&nbsp;"}</td><td>${c.level || "&nbsp;"}</td><td class="c">${c.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Total (Max 30)</td><td class="c">${confScore.toFixed(1)}</td></tr></table>
  <h3>7a) Submitted Research Proposals (Max 10)</h3>
  <table><tr><th>SN</th><th>Title of Proposal</th><th>Duration</th><th>Funding Agency</th><th>Grant Amount</th><th>API Score</th></tr>
  ${proposals.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.title || "&nbsp;"}</td><td class="c">${p.duration || "&nbsp;"}</td><td>${p.agency || "&nbsp;"}</td><td class="c">${p.amount || "&nbsp;"}</td><td class="c">${p.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="5" class="c b">Total (Max 10)</td><td class="c">${proposalScore.toFixed(1)}</td></tr></table>
  <h3>7b) Product Developed and Used by Students / Commercialized (Max 10)</h3>
  <table><tr><th>SN</th><th>Details of Product</th><th>Used / Commercialized</th><th>API Score</th></tr>
  ${products.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${p.details || "&nbsp;"}</td><td>${p.usage || "&nbsp;"}</td><td class="c">${p.score || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="3" class="c b">Total (Max 10)</td><td class="c">${productScore.toFixed(1)}</td></tr></table>
  <h3>8a) Attended FDP / Workshops (Max 10)</h3>
  <table><tr><th>SN</th><th>Program</th><th>Duration</th><th>Organized By</th><th>API Score</th></tr>
  ${fdps.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${f.program || "&nbsp;"}</td><td class="c">${f.duration || "&nbsp;"}</td><td>${f.org || "&nbsp;"}</td><td class="c">${clampScore(f.score, SCORE_LIMITS.fdpRow) || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="4" class="c b">Total (Max 10)</td><td class="c">${fdpScore.toFixed(1)}</td></tr></table>
  <h3>8b) Industrial Training (Max 10)</h3>
  <table><tr><th>SN</th><th>Company / Industry</th><th>Duration</th><th>Nature of Training</th><th>API Score</th></tr>
  ${training.map((t, i) => `<tr><td class="c">${i + 1}</td><td>${t.company || "&nbsp;"}</td><td class="c">${t.duration || "&nbsp;"}</td><td>${t.nature || "&nbsp;"}</td><td class="c">${clampScore(t.score, SCORE_LIMITS.fdpRow) || "&nbsp;"}</td></tr>`).join("")}
  <tr class="tr"><td colspan="4" class="c b">Total (Max 10)</td><td class="c">${trainScore.toFixed(1)}</td></tr></table>
  <div class="pb"></div>
  <h3 style="text-align:center;font-size:13px">SUMMARY OF API SCORES - AY ${info.ay || ""}</h3>
  <table class="st">
    <tr><th>Sr.No.</th><th>Criteria</th><th>Max Score</th><th>Faculty Score</th></tr>
    <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part A - Teaching Process</td></tr>
    <tr><td class="c">A</td><td>Teaching Process (i+ii+iii+iv+v)</td><td class="c">${teachingMax}</td><td class="c">${teachingRaw.toFixed(1)}</td></tr>
    <tr><td class="c">B</td><td>Students' Feedback</td><td class="c">10</td><td class="c">${stuFeedbackScore.toFixed(1)}</td></tr>
    <tr><td class="c">C</td><td>Departmental Activities</td><td class="c">20</td><td class="c">${deptScore.toFixed(1)}</td></tr>
    <tr><td class="c">D</td><td>University Activity</td><td class="c">30</td><td class="c">${uniScore.toFixed(1)}</td></tr>
    <tr><td class="c">E</td><td>Contribution to Society</td><td class="c">${applicability.society === "notApplicable" ? "N/A" : "10"}</td><td class="c">${societyScore.toFixed(1)}</td></tr>
    <tr><td class="c">F</td><td>Industry Connect</td><td class="c">5</td><td class="c">${industryScore.toFixed(1)}</td></tr>
    <tr><td class="c">G</td><td>Annual Confidential Report</td><td class="c">${acrSummaryMax}</td><td class="c">${acrSummaryScore.toFixed(1)}</td></tr>
    <tr class="tr"><td colspan="2" class="c b">Part A Total</td><td class="c b">${effectivePartAMax}</td><td class="c b">${partATotal.toFixed(1)}</td></tr>
    <tr class="tr"><td colspan="2" class="c b">Part A Marks Obtained (%)</td><td colspan="2" class="c b">${partAPercentage}%</td></tr>
    <tr><td colspan="4" class="b" style="background:#d9d9d9;text-align:center">Part B - Research and Academic Contribution</td></tr>
    <tr><td class="c">1</td><td>Research papers / journal publication</td><td class="c">120</td><td class="c">${journalScore.toFixed(1)}</td></tr>
    <tr><td class="c">2</td><td>Books authored / edited / book chapter</td><td class="c">50</td><td class="c">${bookScore.toFixed(1)}</td></tr>
    <tr><td class="c">3</td><td>ICT Teaching Learning Pedagogy</td><td class="c">20</td><td class="c">${ictScore.toFixed(1)}</td></tr>
    <tr><td class="c">4</td><td>Research guidance / projects / consultancy</td><td class="c">${researchGuidanceProjectMax}</td><td class="c">${(researchScore + projectBScore + externalProjectScore).toFixed(1)}</td></tr>
    <tr><td class="c">5</td><td>Patents, Awards, Fellowship</td><td class="c">50</td><td class="c">${(patentScore + awardScore).toFixed(1)}</td></tr>
    <tr><td class="c">6</td><td>Conferences / paper presentations</td><td class="c">30</td><td class="c">${confScore.toFixed(1)}</td></tr>
    <tr><td class="c">7</td><td>Research proposals / product development</td><td class="c">20</td><td class="c">${(proposalScore + productScore).toFixed(1)}</td></tr>
    <tr><td class="c">8</td><td>Self Development (FDP / Industrial Training)</td><td class="c">10</td><td class="c">${(fdpScore + trainScore).toFixed(1)}</td></tr>
    <tr class="tr"><td colspan="2" class="c b">Part B Total</td><td class="c b">${effectivePartBMax}</td><td class="c b">${partBTotal.toFixed(1)}</td></tr>
    <tr class="tr"><td colspan="2" class="c b">Part B Marks Obtained (%)</td><td colspan="2" class="c b">${partBPercentage}%</td></tr>
    <tr style="background:#bfbfbf;font-weight:bold;font-size:13px"><td colspan="2" class="c">Grand Total (Part A + Part B)</td><td class="c">${effectiveGrandMax}</td><td class="c">${grandTotal.toFixed(1)}</td></tr>
    <tr style="background:#bfbfbf;font-weight:bold;font-size:13px"><td colspan="2" class="c">Marks Obtained (%)</td><td colspan="2" class="c">${totalPercentage}%</td></tr>
  </table>
  ${renderSummaryOtherInfo(summaryOtherInfo)}
  ${buildSignaturePage({
    facultyName: info.name || "",
    submittedAt: declaration?.submitted_at || "",
    reviewChain,
  })}
  <script>window.addEventListener('load', function(){ window.focus(); window.print(); });</script>
  </body></html>`;
  win.document.write(html);
  win.document.close();
};
