export const getHueForPct = (pct: number) => {
  const clamp = (v: number, a = 0, b = 150) => Math.max(a, Math.min(b, v));
  const maxOverPct = 150;
  pct = clamp(pct, 0, maxOverPct);
  if (pct <= 100) {
    return (pct / 100) * 120; // 0..120 (red -> green)
  }
  const over = (pct - 100) / (maxOverPct - 100); // 0..1
  return (1 - over) * 120;
};

export const getColorFromPct = (pct: number) => {
  const hue = getHueForPct(pct);
  return `hsl(${hue.toFixed(0)} 60% 50%)`;
};

export const MET_GOAL_COLOR = getColorFromPct(100);
