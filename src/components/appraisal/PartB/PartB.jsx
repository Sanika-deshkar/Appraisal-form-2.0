import JournalTable from "./JournalTable";
import BooksTable from "./BooksTable";
import ICTTable from "./ICTTable";
import ResearchGuidance from "./ResearchGuidance";
import InternalProjects from "./InternalProjects";
import ExternalProjects from "./ExternalProjects";
import Patents from "./Patents";
import Awards from "./Awards";
import Conferences from "./Conferences";
import ResearchProposals from "./ResearchProposals";
import ProductDevelopment from "./ProductDevelopment";
import FDP from "./FDP";
import IndustrialTraining from "./IndustrialTraining";

export default function PartB({ ctx }) {
 return (
<>
 {/* - PART B - */}
<div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", background: "#ede9fe", padding: "8px 14px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.3 }}>PART B - Research & Academic Contributions</div>
<JournalTable ctx={ctx} />
<BooksTable ctx={ctx} />
<ICTTable ctx={ctx} />
<ResearchGuidance ctx={ctx} />
<InternalProjects ctx={ctx} />
<ExternalProjects ctx={ctx} />
<Patents ctx={ctx} />
<Awards ctx={ctx} />
<Conferences ctx={ctx} />
<ResearchProposals ctx={ctx} />
<ProductDevelopment ctx={ctx} />
<FDP ctx={ctx} />
<IndustrialTraining ctx={ctx} />
</>
 );
}

