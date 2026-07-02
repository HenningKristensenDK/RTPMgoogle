import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Organization, Party, RoleResponsibility } from "../../types";
import { watchOrganizations } from "../../firebase/firestore";

interface Props {
  projectId: string;
  roles: RoleResponsibility[];
}

interface Line {
  orgId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

interface DisciplineCard {
  role: string;
  names: string[];
}

const FONT = "Inter, system-ui, sans-serif";
const BAND_WHITE = "#ffffff";
const BAND_TINT = "#e7e6fa";
const DIVIDER = "#e6e6f0";
const NESTED_BG = "#f7f7fb";

/** For an org, find every distinct person (by name) at that org across all
 * workstream RACI slots, then group those people by their role label. */
function disciplineCards(orgName: string, roles: RoleResponsibility[]): DisciplineCard[] {
  const byName = new Map<string, Party>();
  for (const r of roles) {
    const candidates: (Party | null)[] = [
      r.accountable,
      r.consulted,
      r.responsibleCustomer,
      r.responsibleContractor,
      ...r.informedCustomer,
      ...r.informedContractor,
    ];
    for (const p of candidates) {
      if (p && p.name && p.organization === orgName && !byName.has(p.name)) {
        byName.set(p.name, p);
      }
    }
  }
  const byRole = new Map<string, string[]>();
  for (const p of byName.values()) {
    if (!byRole.has(p.role)) byRole.set(p.role, []);
    byRole.get(p.role)!.push(p.name);
  }
  return [...byRole.entries()].map(([role, names]) => ({ role, names }));
}

export default function OrgChart({ projectId, roles }: Props) {
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
        const x1 = parentRect.left + parentRect.width / 2 - containerRect.left;
        const y1 = parentRect.bottom - containerRect.top;
        const x2 = childRect.left + childRect.width / 2 - containerRect.left;
        const y2 = childRect.top - containerRect.top;
        next.push({ orgId: org.orgId, x1, y1, x2, y2, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 });
      }
      setLines(next);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [orgs, roles]);

  if (orgs.length === 0) {
    return <p className="p-6 text-sm text-gray-400">No organizations defined yet.</p>;
  }

  return (
    <div ref={containerRef} className="relative flex flex-col">
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {lines.map((l) => (
          <line
            key={l.orgId}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#c9c9d6"
            strokeWidth={1.5}
          />
        ))}
      </svg>

      {lines.map((l) => (
        <div
          key={`label-${l.orgId}`}
          className="pointer-events-none absolute whitespace-nowrap rounded-full bg-white px-2.5 py-0.5"
          style={{
            left: l.midX,
            top: l.midY,
            transform: "translate(-50%, -50%)",
            border: `1px solid ${DIVIDER}`,
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: "11px",
            color: "#595b78",
          }}
        >
          Contract
        </div>
      ))}

      {tiers.map((tierOrgs, i) => (
        <div
          key={tierNumbers[i]}
          className="relative z-10 flex items-center gap-4 px-10"
          style={{
            background: i % 2 === 0 ? BAND_WHITE : BAND_TINT,
            paddingTop: "24px",
            paddingBottom: "24px",
            borderBottom: i < tiers.length - 1 ? `1px solid ${DIVIDER}` : undefined,
          }}
        >
          <div className="flex w-16 shrink-0 justify-start self-center">
            <span
              className="whitespace-nowrap rounded-full bg-white px-2.5 py-1"
              style={{
                border: `1px solid ${DIVIDER}`,
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: "11px",
                color: "#070474",
              }}
            >
              Tier {tierNumbers[i]}
            </span>
          </div>
          <div className="flex flex-1 flex-wrap gap-8">
            {tierOrgs.map((org) => {
              const cards = disciplineCards(org.name, roles);
              return (
                <div
                  key={org.orgId}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(org.orgId, el);
                    else nodeRefs.current.delete(org.orgId);
                  }}
                  className="flex min-w-[220px] flex-col bg-white p-3"
                  style={{ border: `1px solid ${DIVIDER}`, borderRadius: "12px" }}
                >
                  <div className="mb-2.5">
                    <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: "14px", color: "#070474" }}>
                      {org.name}
                    </div>
                    <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: "11px", color: "#8a8ca6" }}>
                      {org.roleType}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cards.length === 0 ? (
                      <div
                        className="px-2.5 py-1.5"
                        style={{ background: NESTED_BG, border: `1px solid ${DIVIDER}`, borderRadius: "8px" }}
                      >
                        <span style={{ fontFamily: FONT, fontWeight: 400, fontSize: "12px", color: "#8a8ca6" }}>
                          No roles assigned
                        </span>
                      </div>
                    ) : (
                      cards.map((c) => (
                        <div
                          key={c.role}
                          className="min-w-[110px] px-2.5 py-1.5"
                          style={{ background: NESTED_BG, border: `1px solid ${DIVIDER}`, borderRadius: "8px" }}
                        >
                          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: "12px", color: "#15162b" }}>
                            {c.role}
                          </div>
                          <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: "12px", color: "#595b78" }}>
                            {c.names.join(", ")}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
