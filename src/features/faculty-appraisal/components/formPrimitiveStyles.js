export const tableStyles = {
  T: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 13,
    color: "#111827",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  TH: {
    border: "none",
    borderBottom: "1px solid #e0e7ff",
    padding: "10px 14px",
    background: "linear-gradient(180deg, #f5f3ff 0%, #eef2ff 100%)",
    color: "#312e81",
    fontWeight: 800,
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 0,
    height: 44,
  },
  TH_HOD: {
    border: "none",
    borderBottom: "1px solid #e0e7ff",
    padding: "10px 14px",
    background: "linear-gradient(180deg, #ede9fe 0%, #eef2ff 100%)",
    color: "#3730a3",
    fontWeight: 800,
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 0,
    height: 44,
  },
  TD: {
    border: "none",
    borderBottom: "1px solid #e8ecf7",
    padding: "7px 10px",
    verticalAlign: "middle",
    minHeight: 50,
    background: "#fff",
    color: "#111827",
  },
};

tableStyles.TDC = { ...tableStyles.TD, textAlign: "center" };
tableStyles.TDS = { ...tableStyles.TD, textAlign: "center", background: "#f8fafc", minWidth: 68, fontWeight: 800, color: "#4338ca" };
tableStyles.TDS_HOD = { ...tableStyles.TDS, background: "#eef2ff" };
tableStyles.TH_DIR = { ...tableStyles.TH, background: "#ecfdf5", color: "#047857" };
tableStyles.TDS_DIR = { ...tableStyles.TDS, background: "#f0fdf4", minWidth: 76, color: "#047857" };
tableStyles.TH_DEAN = { ...tableStyles.TH, background: "#f5f3ff", color: "#6d28d9" };
tableStyles.TDS_DEAN = { ...tableStyles.TDS, background: "#faf5ff", minWidth: 76, color: "#6d28d9" };
tableStyles.TDV = { ...tableStyles.TD, background: "#fafbff", minWidth: 128 };

export const { T, TH, TH_HOD, TH_DIR, TH_DEAN, TD, TDC, TDS, TDS_HOD, TDS_DIR, TDS_DEAN, TDV } = tableStyles;
