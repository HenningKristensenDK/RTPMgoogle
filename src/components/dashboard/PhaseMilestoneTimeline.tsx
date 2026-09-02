/**
 * Phase & Milestone Timeline — Executive Dashboard, Step 1 of the 2026-08-17
 * Viking Project demo spec (RTPM_Dashboard_Spec_v1.md, Section 6).
 *
 * Merges the macro-milestone mechanic (old flat dashboard row) with a
 * phase-progress bar. Five sequential phase segments (done = filled green,
 * current = partial indigo fill by % through the phase, future = grey outline),
 * with the 8 macro milestones rendered as hover-tooltip dots positioned by date
 * inside their phase segment.
 *
 * Per the spec, this one phase set is hardcoded rather than driven by the
 * phase_templates / projects/{id}/phases Firestore abstraction — that
 * generalization is deferred until after the demo.
 *
 * BRAND v4: every colour/font/radius here is a semantic token from
 * rtpm-design-system/tokens/tokens.css (--color-*, --type-*, --radius-*,
 * --font-*). No hardcoded hex. The one exception is the Level-4 commissioning
 * "Blue Tag" border, which uses --rtpm-series-4 (#00ACFF) because v4 has no
 * dedicated commissioning-tag semantic token yet — flagged for Henning.
 *
 * The track keeps a fixed min-width and lives in a horizontally scrollable
 * container: on a full-width monitor it fills the card, on a narrower laptop it
 * scrolls rather than compressing the labels. Labels alternate above/below the
 * track line (by global milestone index) so close-together milestones never
 * share a horizontal band.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Fixed track width — sized so all eight milestone labels sit without touching. */
const TRACK_MIN_WIDTH = 1500;
const LABEL_BAND = 46;

type MilestoneStatus = "done" | "current" | "future";
type CommissioningTag = "green" | "blue";

interface Milestone {
  label: string;
  iso: string;
  status: MilestoneStatus;
  /** Data-center commissioning level tag — colours the dot border. */
  tag?: CommissioningTag;
}

interface Phase {
  name: string;
  startIso: string;
  endIso: string;
  milestones: Milestone[];
}

// --- Hardcoded phase set (spec Section 6). Each phase carries its own local
//     date range; milestone dots are positioned by their date's fraction
//     through that range, so phases that overlap in real time still read
//     cleanly as side-by-side segments. -----------------------------------
const PHASES: Phase[] = [
  {
    name: "Site Development & Enabling Works",
    startIso: "2026-03-01",
    endIso: "2026-06-15",
    milestones: [{ label: "NTP", iso: "2026-03-01", status: "done" }],
  },
  {
    name: "Civil, Structural & Envelope",
    startIso: "2026-06-15",
    endIso: "2026-12-01",
    milestones: [
      { label: "Design Freeze", iso: "2026-06-15", status: "done" },
      { label: "Civil Complete", iso: "2026-12-01", status: "future" },
    ],
  },
  {
    name: "MEP Heavy Procurement & Fit-Out",
    startIso: "2026-09-01",
    endIso: "2027-01-20",
    milestones: [
      { label: "MEP Procurement Award", iso: "2026-09-01", status: "current" },
      { label: "Switchgear FAT Complete", iso: "2026-11-15", status: "future" },
    ],
  },
  {
    name: "Testing & Commissioning",
    startIso: "2027-01-20",
    endIso: "2027-06-01",
    milestones: [
      { label: "Level 3 Green Tag", iso: "2027-01-20", status: "future", tag: "green" },
      { label: "Commissioning Start · Level 4 Blue Tag", iso: "2027-03-01", status: "future", tag: "blue" },
    ],
  },
  {
    name: "Ready for Service",
    startIso: "2027-06-01",
    endIso: "2027-09-30",
    milestones: [{ label: "COD", iso: "2027-09-30", status: "future" }],
  },
];

type PhaseState = "done" | "current" | "future";

function ms(iso: string): number {
  return new Date(iso + "T00:00:00").getTime();
}

function phaseState(phase: Phase, now: number): PhaseState {
  if (now >= ms(phase.endIso)) return "done";
  if (now >= ms(phase.startIso)) return "current";
  return "future";
}

/** 0..1 progress of `now` through a phase's local date range. */
function phaseFill(phase: Phase, now: number): number {
  const start = ms(phase.startIso);
  const end = ms(phase.endIso);
  if (now <= start) return 0;
  if (now >= end) return 1;
  return (now - start) / (end - start);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  done: "Complete",
  current: "Current gate",
  future: "Upcoming",
};

export default function PhaseMilestoneTimeline() {
  const now = Date.now();

  const states = PHASES.map((p) => phaseState(p, now));
  const currentIdx = states.indexOf("current");
  // Fallback if today is before/after every phase range.
  const activeIdx =
    currentIdx !== -1
      ? currentIdx
      : states.lastIndexOf("done") !== -1
      ? Math.min(states.lastIndexOf("done") + 1, PHASES.length - 1)
      : 0;
  const currentPhase = PHASES[activeIdx];

  // Caption facts.
  const allMilestones = PHASES.flatMap((p) => p.milestones);
  const lastComplete = allMilestones
    .filter((m) => ms(m.iso) <= now)
    .sort((a, b) => ms(b.iso) - ms(a.iso))[0];
  const nextGate = allMilestones
    .filter((m) => ms(m.iso) > now)
    .sort((a, b) => ms(a.iso) - ms(b.iso))[0];
  const daysToGate = nextGate
    ? Math.ceil((ms(nextGate.iso) - now) / 86_400_000)
    : null;

  // Global (left-to-right) index at which each phase's milestones start — drives
  // the alternating above/below label stagger.
  let counter = 0;
  const phaseStart = PHASES.map((p) => {
    const s = counter;
    counter += p.milestones.length;
    return s;
  });

  // Right-edge fade cue: shown only while the track can still scroll right.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--rtpm-shadow-hairline)",
        padding: "var(--rtpm-space-6)",
      }}
    >
      {/* Heading */}
      <h2
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-eyebrow-size)",
          fontWeight: "var(--type-eyebrow-weight)",
          letterSpacing: "var(--type-eyebrow-tracking)",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          margin: 0,
        }}
      >
        Phase &amp; Milestone Timeline
      </h2>

      {/* Caption above the bar (spec Section 6) */}
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-body-size)",
          color: "var(--color-text-secondary)",
          margin: "var(--rtpm-space-2) 0 var(--rtpm-space-6)",
        }}
      >
        <span style={{ color: "var(--color-text-muted)" }}>Now:&nbsp;</span>
        <span style={{ fontWeight: "var(--rtpm-weight-semibold)", color: "var(--color-text-primary)" }}>
          {currentPhase.name}
        </span>
        {lastComplete && (
          <>
            {" — "}
            <span style={{ fontWeight: "var(--rtpm-weight-semibold)" }}>{lastComplete.label}</span> complete
          </>
        )}
        {nextGate && daysToGate !== null && (
          <>
            , next gate{" "}
            <span style={{ fontWeight: "var(--rtpm-weight-semibold)", color: "var(--color-signal)" }}>
              {nextGate.label}
            </span>{" "}
            in{" "}
            <span style={{ fontWeight: "var(--rtpm-weight-semibold)" }}>
              {daysToGate} day{daysToGate === 1 ? "" : "s"}
            </span>
          </>
        )}
      </p>

      {/* Scrollable track — fixed min-width so labels never compress; scrolls
          horizontally on narrow viewports, fills the card on wide monitors. */}
      <div style={{ position: "relative" }}>
        <div ref={scrollRef} className="scroll-thin" style={{ overflowX: "auto", overflowY: "visible" }}>
          <div style={{ minWidth: TRACK_MIN_WIDTH, display: "flex", gap: "var(--rtpm-space-2)" }}>
            {PHASES.map((phase, i) => {
              const state = states[i];
              const fill = phaseFill(phase, now);
              const pos = (mi: number) => ((mi + 0.5) / phase.milestones.length) * 100;
              return (
                <div key={phase.name} style={{ flex: 1, minWidth: 0 }}>
                  {/* Top label band — odd-index milestones */}
                  <div style={{ position: "relative", height: LABEL_BAND }}>
                    {phase.milestones.map((m, mi) =>
                      (phaseStart[i] + mi) % 2 === 1 ? (
                        <MilestoneLabel key={m.label} milestone={m} left={pos(mi)} place="above" />
                      ) : null
                    )}
                  </div>

                  {/* Bar + dots */}
                  <div style={{ position: "relative", height: 14, display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 10,
                        borderRadius: "var(--radius-pill)",
                        overflow: "hidden",
                        background: state === "future" ? "transparent" : "var(--rtpm-line-soft)",
                        border: state === "future" ? "1.5px solid var(--color-step-pending)" : "none",
                      }}
                    >
                      {state === "done" && (
                        <div style={{ position: "absolute", inset: 0, background: "var(--color-status-low)" }} />
                      )}
                      {state === "current" && (
                        <div
                          style={{
                            position: "absolute",
                            insetBlock: 0,
                            left: 0,
                            width: `${fill * 100}%`,
                            background: "var(--color-step-current)",
                          }}
                        />
                      )}
                    </div>
                    {phase.milestones.map((m, mi) => (
                      <MilestoneDot
                        key={m.label}
                        milestone={m}
                        phaseName={phase.name}
                        left={pos(mi)}
                        place={(phaseStart[i] + mi) % 2 === 1 ? "above" : "below"}
                      />
                    ))}
                  </div>

                  {/* Bottom label band — even-index milestones */}
                  <div style={{ position: "relative", height: LABEL_BAND }}>
                    {phase.milestones.map((m, mi) =>
                      (phaseStart[i] + mi) % 2 === 0 ? (
                        <MilestoneLabel key={m.label} milestone={m} left={pos(mi)} place="below" />
                      ) : null
                    )}
                  </div>

                  {/* Phase name */}
                  <div
                    style={{
                      marginTop: "var(--rtpm-space-1)",
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--type-caption-size)",
                      lineHeight: 1.25,
                      fontWeight:
                        state === "current" ? "var(--rtpm-weight-semibold)" : "var(--rtpm-weight-medium)",
                      color:
                        state === "done"
                          ? "var(--color-status-low-text)"
                          : state === "current"
                          ? "var(--color-signal)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {phase.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right-edge fade cue — appears only while more track lies to the right */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 56,
            pointerEvents: "none",
            background: "linear-gradient(to right, transparent, var(--color-surface-card))",
            opacity: canScrollRight ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
        />
      </div>

      {/* Commissioning-tag legend — the "credibility payoff" per spec Section 6 */}
      <div
        style={{
          display: "flex",
          gap: "var(--rtpm-space-6)",
          marginTop: "var(--rtpm-space-4)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-caption-size)",
          color: "var(--color-text-muted)",
        }}
      >
        <LegendDot swatch="var(--color-status-low)" label="Complete" />
        <LegendDot swatch="var(--color-signal)" label="Current gate" />
        <LegendDot swatch="var(--color-step-pending)" label="Upcoming" filled={false} />
        <span style={{ marginInlineStart: "auto", display: "flex", gap: "var(--rtpm-space-4)" }}>
          <LegendRing ring="var(--color-status-low)" label="L3 Green Tag" />
          <LegendRing ring="var(--rtpm-series-4)" label="L4 Blue Tag" />
        </span>
      </div>
    </div>
  );
}

/** Status → the colour used for the dot fill, connector, and label accent. */
function statusColor(status: MilestoneStatus): string {
  return status === "done"
    ? "var(--color-status-low)"
    : status === "current"
    ? "var(--color-step-current)"
    : "var(--color-step-pending)";
}

function MilestoneDot({
  milestone,
  phaseName,
  left,
  place,
}: {
  milestone: Milestone;
  phaseName: string;
  left: number;
  place: "above" | "below";
}) {
  const { status, tag } = milestone;

  const base: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "var(--radius-pill)",
    boxSizing: "border-box",
  };

  const statusStyle: CSSProperties =
    status === "done"
      ? { background: "var(--color-status-low)", border: "2px solid var(--color-surface-card)" }
      : status === "current"
      ? {
          background: "var(--color-step-current)",
          border: "2px solid var(--color-surface-card)",
          boxShadow: "0 0 0 4px var(--color-step-current-ring)",
        }
      : { background: "var(--color-surface-card)", border: "2px solid var(--color-step-pending)" };

  // Commissioning tag overrides the border colour (green / commissioning-blue).
  const tagStyle: CSSProperties = tag
    ? { border: `2.5px solid ${tag === "green" ? "var(--color-status-low)" : "var(--rtpm-series-4)"}` }
    : {};

  return (
    <div
      className="group"
      style={{
        position: "absolute",
        left: `${left}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        cursor: "default",
        zIndex: 2,
      }}
    >
      {/* connector from the dot into its label band */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          [place === "above" ? "bottom" : "top"]: "100%",
          transform: "translateX(-50%)",
          width: 1,
          height: LABEL_BAND - 8,
          background: statusColor(status),
          opacity: 0.4,
        }}
      />
      <div style={{ ...base, ...statusStyle, ...tagStyle }} />

      {/* Hover tooltip — SECONDARY detail only (status + phase) */}
      <div
        className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          zIndex: 20,
          background: "var(--color-surface-dark)",
          color: "var(--color-text-on-dark)",
          borderRadius: "var(--radius-control)",
          boxShadow: "var(--rtpm-shadow-overlay)",
          padding: "var(--rtpm-space-2) var(--rtpm-space-3)",
          fontFamily: "var(--font-ui)",
        }}
      >
        <div style={{ fontSize: "var(--type-label-size)", fontWeight: "var(--rtpm-weight-semibold)" }}>
          {STATUS_LABEL[status]}
        </div>
        <div style={{ fontSize: "var(--type-caption-size)", color: "var(--color-text-on-dark-muted)" }}>
          {phaseName}
        </div>
      </div>
    </div>
  );
}

/** Always-visible core label (name + date), anchored just above or below the track. */
function MilestoneLabel({
  milestone,
  left,
  place,
}: {
  milestone: Milestone;
  left: number;
  place: "above" | "below";
}) {
  const labelColor =
    milestone.status === "done"
      ? "var(--color-status-low-text)"
      : milestone.status === "current"
      ? "var(--color-signal)"
      : "var(--color-text-secondary)";

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        transform: "translateX(-50%)",
        [place === "above" ? "bottom" : "top"]: 2,
        width: 132,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "11px",
          lineHeight: 1.2,
          fontWeight: "var(--rtpm-weight-semibold)",
          color: labelColor,
        }}
      >
        {milestone.label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "10px",
          lineHeight: 1.2,
          color: "var(--color-text-muted)",
        }}
      >
        {formatDate(milestone.iso)}
      </div>
    </div>
  );
}

function LegendDot({ swatch, label, filled = true }: { swatch: string; label: string; filled?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--rtpm-space-2)" }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "var(--radius-pill)",
          background: filled ? swatch : "transparent",
          border: filled ? "none" : `1.5px solid ${swatch}`,
        }}
      />
      {label}
    </span>
  );
}

function LegendRing({ ring, label }: { ring: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--rtpm-space-2)" }}>
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: "var(--radius-pill)",
          background: "var(--color-surface-card)",
          border: `2.5px solid ${ring}`,
        }}
      />
      {label}
    </span>
  );
}
