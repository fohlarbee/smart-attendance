/**
 * Decorative QR-like glyph (not a real scannable code) — used as the landing
 * beacon's visual. Deterministic so it renders identically on server and client.
 */
export function QrGlyph({ className }: { className?: string }) {
  const N = 13;
  const cells: { x: number; y: number }[] = [];

  const inFinder = (x: number, y: number) => {
    const corners = [
      [0, 0],
      [N - 3, 0],
      [0, N - 3],
    ];
    return corners.some(([cx, cy]) => x >= cx && x < cx + 3 && y >= cy && y < cy + 3);
  };

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      // deterministic pseudo-pattern
      if ((x * 3 + y * 7 + x * y) % 5 < 2) cells.push({ x, y });
    }
  }

  const finders = [
    [0, 0],
    [N - 3, 0],
    [0, N - 3],
  ];

  return (
    <svg
      viewBox={`-0.5 -0.5 ${N} ${N}`}
      className={className}
      aria-hidden
      role="presentation"
    >
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={0.85}
          height={0.85}
          rx={0.18}
          fill="currentColor"
        />
      ))}
      {finders.map(([cx, cy]) => (
        <rect
          key={`f-${cx}-${cy}`}
          x={cx}
          y={cy}
          width={3}
          height={3}
          rx={0.7}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
        />
      ))}
    </svg>
  );
}
