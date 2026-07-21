import { useState } from "react";
import { initials } from "../../lib/format";

interface Props {
  name: string;
  ringColor?: string;
  size?: number;
  className?: string;
}

/** Deterministic illustrated avatar (DiceBear, seeded by name) for the fictional
 * R&R/Risk Register personas — falls back to an initials circle if the image
 * fails to load (offline, CDN down, etc). Not used for real signed-in accounts. */
export default function PersonAvatar({ name, ringColor, size = 28, className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const ringStyle = ringColor ? { boxShadow: `inset 0 0 0 2px ${ringColor}` } : undefined;

  if (broken) {
    return (
      <span
        title={name}
        className={`flex shrink-0 items-center justify-center rounded-full bg-indigo/15 font-semibold text-indigo ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36), ...ringStyle }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      src={`https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(name)}`}
      alt={name}
      title={name}
      onError={() => setBroken(true)}
      className={`shrink-0 rounded-full bg-fog object-cover ${className}`}
      style={{ width: size, height: size, ...ringStyle }}
    />
  );
}
