// Vercel 프론트(React)에 넣는 화면 — 결과만 백엔드(FastAPI)에 물어본다
import { useEffect, useState } from "react";
import TrendChart from "./TrendChart";
import MapView from "./MapView";

const API = import.meta.env.VITE_API_URL;

const COLOR = { 좋음: "#2f80ed", 보통: "#27ae60", 나쁨: "#f2994a", 매우나쁨: "#eb5757" };

function Badge({ grade }) {
  if (!grade) return <span>-</span>;
  return (
    <span style={{ background: COLOR[grade], color: "#fff", borderRadius: 6, padding: "1px 8px" }}>
      {grade}
    </span>
  );
}

export default function AirDemo() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [pred, setPred] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState("");

  async function predict(station) {
    try {
      const q = encodeURIComponent(station);
      const [p, h] = await Promise.all([
        fetch(`${API}/air/predict?station=${q}`).then((r) => r.json()),
        // 아직 /air/history 가 없는 옛 백엔드면 실패해도 예측은 보여 준다
        fetch(`${API}/air/history?station=${q}&hours=48`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      let points = h?.points ?? [];
      if (points.length < 2 && p.recent) {
        points = p.recent.map((v, i) => ({ time: `${p.recent.length - 1 - i}시간 전`, pm10: v }));
      }
      setPred(p);
      setTrend(points);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [s, l] = await Promise.all([
          fetch(`${API}/air/summary`).then((r) => r.json()),
          fetch(`${API}/air/latest`).then((r) => r.json()),
        ]);
        setSummary(s);
        setRows(l);
      } catch (e) {
        setError(String(e));
      }
    }
    load();
  }, []);

  return (
    <div>
      {error && <p className="err-text">{error}</p>}

      {summary && (
        <p className="card" style={{ marginBottom: 16 }}>
          측정소 {summary.stations}곳 평균 PM10 <b>{summary.avg_pm10}</b>{" "}
          <Badge grade={summary.avg_pm10_grade} />
          {summary.mode === "demo" && <small> (연습 데이터)</small>}
        </p>
      )}

      <div className="card"><MapView rows={rows} /></div>

      <div className="card" style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr><th>측정소</th><th>시각</th><th>PM10</th><th>PM2.5</th><th>예측</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.station}>
              <td>{r.station}</td>
              <td>{r.time.slice(11)}</td>
              <td>{r.pm10 ?? "-"} <Badge grade={r.pm10_grade} /></td>
              <td>{r.pm25 ?? "-"} <Badge grade={r.pm25_grade} /></td>
              <td><button onClick={() => predict(r.station)}>1시간 뒤?</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {pred && (
        <p className="card">
          <b>{pred.station}</b>{" "}
          {pred.ready
            ? <>1시간 뒤 PM10 약 <b>{pred.next_pm10}</b> <Badge grade={pred.next_grade} /> (평균 오차 ±{pred.avg_error})</>
            : pred.message}
        </p>
      )}
      {pred && (
        <TrendChart points={trend} next={pred.ready ? pred.next_pm10 : null} />
      )}
    </div>
  );
}
