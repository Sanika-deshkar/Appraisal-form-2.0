export const tableStyles = {
  T: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  TH: { border: "1px solid #334155", padding: "7px 8px", background: "#1e293b", color: "#e2e8f0", fontWeight: 700, textAlign: "center", fontSize: 10, letterSpacing: "0.3px" },
  TH_HOD: { border: "1px solid #334155", padding: "7px 8px", background: "#312e81", color: "#c7d2fe", fontWeight: 700, textAlign: "center", fontSize: 10, letterSpacing: "0.3px" },
  TD: { border: "1px solid #e2e8f0", padding: "4px 6px", verticalAlign: "middle" },
};

tableStyles.TDC = { ...tableStyles.TD, textAlign: "center" };
tableStyles.TDS = { ...tableStyles.TD, textAlign: "center", background: "#f8fafc", minWidth: 52 };
tableStyles.TDS_HOD = { ...tableStyles.TDS, background: "#f0f4ff" };
tableStyles.TH_DIR = { ...tableStyles.TH, background: "#065f46", color: "#6ee7b7" };
tableStyles.TDS_DIR = { ...tableStyles.TDS, background: "#f0fdf4", minWidth: 62 };
tableStyles.TH_DEAN = { ...tableStyles.TH, background: "#4c1d95", color: "#ddd6fe" };
tableStyles.TDS_DEAN = { ...tableStyles.TDS, background: "#faf5ff", minWidth: 62 };
tableStyles.TDV = { ...tableStyles.TD, background: "#fafbff", minWidth: 110 };

export const { T, TH, TH_HOD, TH_DIR, TH_DEAN, TD, TDC, TDS, TDS_HOD, TDS_DIR, TDS_DEAN, TDV } = tableStyles;
