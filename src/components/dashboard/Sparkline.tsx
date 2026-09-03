/**
 * Mini trend charts for the Tier-2 category cards. Two shapes:
 *  - <LineSparkline> : one or two series (e.g. SPI/CPI, contingency burn-down)
 *  - <StackedBarSparkline> : per-contractor stacked bars (HSE hours/week)
 *
 * BRAND v4: colours come from the chart-category tokens (--color-chart-*) or the
 * status tokens, per tokens.css ("a chart uses the category sequence OR the
 * status scale, never both"). No hardcoded hex.
 */

interface LineSeries {
  points: number[];
  color: string; // a CSS var, e.g. "var(--color-chart-1)"
}

export function LineSparkline({
  series,
  width = 168,
  height = 40,
}: {
  series: LineSeries[];
  width?: number;
  height?: number;
}) {
  const all = series.flatMap((s) => s.points);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 3;

  function path(points: number[]): string {
    const n = points.length;
    return points
      .map((v, i) => {
        const x = pad + (i / (n - 1)) * (width - pad * 2);
        const y = pad + (1 - (v - min) / span) * (height - pad * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {series.map((s, i) => (
        <path
          key={i}
          d={path(s.points)}
          fill="none"
          stroke={s.color}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

interface StackedColumn {
  segments: { value: number; color: string }[];
}

export function StackedBarSparkline({
  columns,
  width = 168,
  height = 40,
}: {
  columns: StackedColumn[];
  width?: number;
  height?: number;
}) {
  const totals = columns.map((c) => c.segments.reduce((s, seg) => s + seg.value, 0));
  const max = Math.max(...totals) || 1;
  const n = columns.length;
  const gap = 4;
  const barW = (width - gap * (n - 1)) / n;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {columns.map((col, ci) => {
        const x = ci * (barW + gap);
        let yCursor = height;
        return col.segments.map((seg, si) => {
          const h = (seg.value / max) * height;
          yCursor -= h;
          return (
            <rect
              key={`${ci}-${si}`}
              x={x}
              y={yCursor}
              width={barW}
              height={Math.max(0, h - 0.5)}
              rx={1}
              fill={seg.color}
            />
          );
        });
      })}
    </svg>
  );
}
