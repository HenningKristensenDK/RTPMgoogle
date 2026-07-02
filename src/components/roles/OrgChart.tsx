import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Organization } from "../../types";
import { watchOrganizations } from "../../firebase/firestore";

interface Props {
  projectId: string;
}

interface Line {
  orgId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const FONT = "Inter, system-ui, sans-serif";

export default function OrgChart({ projectId }: Props) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!projectId) return;
    return watchOrganizations(projectId, setOrgs);
  }, [projectId]);

  // Derive the tier rows from whatever tier values actually exist in the
  // data (sorted ascending) — no hardcoded tier count, so a new tier just works.
  const tierNumbers = [...new Set(orgs.map((o) => o.tier))].sort((a, b) => a - b);
  const tiers = tierNumbers.map((t) => orgs.filter((o) => o.tier === t));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || orgs.length === 0) return;

    function recompute() {
      const containerRect = container!.getBoundingClientRect();
      const next: Line[] = [];
      for (const org of orgs) {
        if (!org.parentOrgId) continue;
        const childEl = nodeRefs.current.get(org.orgId);
        const parentEl = nodeRefs.current.get(org.parentOrgId);
        if (!childEl || !parentEl) continue;
        const childRect = childEl.getBoundingClientRect();
        const parentRect = parentEl.getBoundingClientRect();
        next.push({
          orgId: org.orgId,
          x1: parentRect.left + parentRect.width / 2 - containerRect.left,
          y1: parentRect.bottom - containerRect.top,
          x2: childRect.left + childRect.width / 2 - containerRect.left,
          y2: childRect.top - containerRect.top,
        });
      }
      setLines(next);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [orgs]);

  if (orgs.length === 0) {
    return <p className="p-6 text-sm text-gray-400">No organizations defined yet.</p>;
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-20 px-10 py-10">
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker
            id="orgchart-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#c9c9d6" />
          </marker>
        </defs>
        {lines.map((l) => (
          <line
            key={l.orgId}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#c9c9d6"
            strokeWidth={1.5}
            markerEnd="url(#orgchart-arrow)"
          />
        ))}
      </svg>

      {tiers.map((tier, i) => (
        <div key={tierNumbers[i]} className="relative z-10 flex items-center gap-4">
          <div
            className="w-16 shrink-0 text-right"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: "11px", color: "#8a8ca6" }}
          >
            Tier {tierNumbers[i]}
          </div>
          <div className="flex flex-1 flex-wrap justify-center gap-16">
            {tier.map((org) => (
              <div
                key={org.orgId}
                ref={(el) => {
                  if (el) nodeRefs.current.set(org.orgId, el);
                  else nodeRefs.current.delete(org.orgId);
                }}
                className="flex w-[180px] flex-col items-center bg-white px-4 py-3 text-center"
                style={{ border: "1px solid #e6e6f0", borderRadius: "12px" }}
              >
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#070474",
                  }}
                >
                  {org.name}
                </span>
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 400,
                    fontSize: "12px",
                    color: "#8a8ca6",
                    marginTop: "2px",
                  }}
                >
                  {org.roleType}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
