// 시간대별 PM10 추이 + 다음 1시간 예측점을 그리는 SVG 차트 (외부 라이브러리 없음)
const W = 520;
const H = 200;
const PAD = { l: 36, r: 14, t: 14, b: 28 };

export default function TrendChart({ points, next }) {
  // 값이 있는 점만 사용 (결측은 건너뜀)
  const data = points.filter((p) => p.pm10 != null);
  if (data.length < 2) return null;

  // 예측점은 마지막 시각 다음 칸(+1)에 놓는다
  const total = data.length + (next != null ? 1 : 0);
  const maxY = Math.max(10, ...data.map((p) => p.pm10), next ?? 0) * 1.15;
  const x = (i) => PAD.l + (i / (total - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / maxY) * (H - PAD.t - PAD.b);

  const line = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.pm10)}`).join(" ");
  const last = data.length - 1;
  const ticks = [0, 0.5, 1].map((t) => Math.round(maxY * t));
  // "2026-11-11 10:00" → "11-11 10:00" (그 밖의 문자열은 그대로)
  const label = (i) => (/^\d{4}-/.test(data[i].time) ? data[i].time.slice(5, 16) : data[i].time);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, background: "rgba(255,255,255,0.06)", borderRadius: 8 }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.18)" />
          <text x={PAD.l - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="#b9b2f0">{t}</text>
        </g>
      ))}
      <path d={line} fill="none" stroke="#7fb2ff" strokeWidth="2" />
      {data.map((p, i) => (
        <circle key={p.time} cx={x(i)} cy={y(p.pm10)} r="2.5" fill="#7fb2ff" />
      ))}
      {next != null && (
        <>
          <line x1={x(last)} y1={y(data[last].pm10)} x2={x(last + 1)} y2={y(next)}
                stroke="#eb5757" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx={x(last + 1)} cy={y(next)} r="5" fill="#eb5757" />
          <text x={x(last + 1)} y={y(next) - 9} fontSize="11" textAnchor="end" fill="#eb5757">
            예측 {next}
          </text>
        </>
      )}
      <text x={PAD.l} y={H - 8} fontSize="10" fill="#b9b2f0">{label(0)}</text>
      <text x={x(last)} y={H - 8} fontSize="10" textAnchor="end" fill="#b9b2f0">{label(last)}</text>
    </svg>
  );
}
