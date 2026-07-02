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
  labelX: number;
  labelY: number;
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

  const tiers = [1, 2, 3]
    .map((t) => orgs.filter((o) => o.tier === t))
    .filter((group) => group.length > 0);

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
        const x1 = parentRect.left + parentRect.width / 2 - containerRect.left;
        const y1 = parentRect.bottom - containerRect.top;
        const x2 = childRect.left + childRect.width / 2 - containerRect.left;
        const y2 = childRect.top - containerRect.top;

        // Offset the contract-type label perpendicular to the line so it
        // never sits on top of the stroke, whatever angle the line is at.
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        next.push({
          orgId: org.orgId,
          x1,
          y1,
          x2,
          y2,
          labelX: (x1 + x2) / 2 + nx * 14,
          labelY: (y1 + y2) / 2 + ny * 14,
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
    <div ref={containerRef} className="relative flex flex-col items-center gap-20 px-10 py-10">
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

      {lines.map((l) => {
        const org = orgs.find((o) => o.orgId === l.orgId);
        if (!org?.contractType) return null;
        return (
          <span
            key={`label-${l.orgId}`}
            className="pointer-events-none absolute whitespace-nowrap"
            style={{
              left: l.labelX,
              top: l.labelY,
              transform: "translate(-50%, -50%)",
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: "11px",
              color: "#8a8ca6",
              background: "#fff",
              padding: "0 4px",
            }}
          >
            {org.contractType}
          </span>
        );
      })}

      {tiers.map((tier, i) => (
        <div key={i} className="relative z-10 flex flex-wrap justify-center gap-16">
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
      ))}
    </div>
  );
}
