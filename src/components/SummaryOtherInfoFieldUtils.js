export const SUMMARY_OTHER_INFO_LABEL = "Any other information not covered above";

export const summaryOtherInfoValueFrom = (source = {}) => {
  const candidates = [
    source.summaryOtherInfo,
    source.form?.summaryOtherInfo,
    source.payload?.form?.summaryOtherInfo,
    source.payload?.summaryOtherInfo,
    source.declaration?.summaryOtherInfo,
  ];

  for (const value of candidates) {
    if (String(value ?? "").trim()) return value;
  }

  return candidates.find((value) => value != null) ?? "";
};
