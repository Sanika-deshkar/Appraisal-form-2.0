import DirectorJournalTable from "./DirectorJournalTable";
import DirectorBooksTable from "./DirectorBooksTable";
import DirectorICTTable from "./DirectorICTTable";
import DirectorResearchGuidance from "./DirectorResearchGuidance";
import DirectorInternalProjects from "./DirectorInternalProjects";
import DirectorExternalProjects from "./DirectorExternalProjects";
import DirectorPatents from "./DirectorPatents";
import DirectorAwards from "./DirectorAwards";
import DirectorConferences from "./DirectorConferences";
import DirectorResearchProposals from "./DirectorResearchProposals";
import DirectorProductDevelopment from "./DirectorProductDevelopment";
import DirectorFDP from "./DirectorFDP";
import DirectorIndustrialTraining from "./DirectorIndustrialTraining";

export default function DirectorPartB({ ctx }) {
 return (
<>
 {/* - PART B - */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#ede9fe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART B - Research & Academic Contributions</div>
<DirectorJournalTable ctx={ctx} />
<DirectorBooksTable ctx={ctx} />
<DirectorICTTable ctx={ctx} />
<DirectorResearchGuidance ctx={ctx} />
<DirectorInternalProjects ctx={ctx} />
<DirectorExternalProjects ctx={ctx} />
<DirectorPatents ctx={ctx} />
<DirectorAwards ctx={ctx} />
<DirectorConferences ctx={ctx} />
<DirectorResearchProposals ctx={ctx} />
<DirectorProductDevelopment ctx={ctx} />
<DirectorFDP ctx={ctx} />
<DirectorIndustrialTraining ctx={ctx} />
</>
 );
}

