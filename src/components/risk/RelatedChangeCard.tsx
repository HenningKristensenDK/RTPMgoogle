/**
 * Related Change orders on a risk's detail view. Surfaces any Correspondence
 * "Variation Request" whose `relatedRiskId` matches this risk, so RK-004 (HV
 * transformer) and RK-010 (piling shortage) each show — and open — the change
 * order raised to mitigate them. Renders nothing when a risk has no linked
 * change, so it only appears where a genuine connection exists.
 *
 * Styling follows the surrounding risk-detail cards (Tailwind design tokens):
 * these components predate the Brand v4 token migration, so this matches them
 * for visual consistency rather than introducing a lone v4-styled card here.
 */
import { GitPullRequest, ArrowUpRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCorrespondenceStore } from "../../store/correspondenceStore";
import { PRIORITY_META } from "../../lib/format";

export default function RelatedChangeCard({ riskId }: { riskId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = useCorrespondenceStore((s) => s.items);

  const related = items.filter((c) => c.relatedRiskId === riskId && c.status !== "obsolete");
  if (related.length === 0) return null;

  return (
    <div className="rounded-card border border-bordergray bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <GitPullRequest size={15} className="text-indigo" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Related Change Order{related.length > 1 ? "s" : ""}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {related.map((c) => {
          const prio = PRIORITY_META[c.priority];
          return (
            <button
              key={c.id}
              onClick={() =>
                navigate(`/correspondence/${c.id}`, { state: { background: location } })
              }
              className="group flex items-center gap-3 rounded-lg border border-bordergray px-3 py-2 text-left hover:bg-fog"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: prio.dot }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{c.title}</div>
                <div className="mt-0.5 text-[11px] text-text-muted">
                  {c.itemId} · Variation Request
                </div>
              </div>
              <ArrowUpRight size={15} className="shrink-0 text-text-muted group-hover:text-indigo" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
