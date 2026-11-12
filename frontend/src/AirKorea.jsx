// 전국 미세먼지 — 에어코리아 실측값(백엔드 /air/korea). 3D 지도는 시도 평균, 표는 측정소별 수치.
import { useEffect, useMemo, useState } from "react";
import Korea3D from "./Korea3D";
import { GRADE_COLOR } from "./geo";

const API = import.meta.env.VITE_API_URL ?? "";

function Badge({ grade }) {
  if (!grade) return <span>-</span>;
  return (
    <span style={{ background: GRADE_COLOR[grade], color: "#fff", borderRadius: 999, padding: "1px 9px", fontSize: 12, fontWeight: 700 }}>
      {grade}
    </span>
  );
}

const PAGE = 40;

export default function AirKorea() {
  const [data, setData] = useState(null); // { updated, summary, stations }
  const [error, setError] = useState("");
  const [sido, setSido] = useState("전체");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);

  // 10분마다 새로 받기
  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      try {
        const res = await fetch(`${API}/air/korea`, { signal: ctrl.signal });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `HTTP ${res.status}`);
        setData(await res.json());
        setError("");
      } catch (e) {
        if (e.name !== "AbortError") setError(`전국 미세먼지를 불러오지 못했습니다: ${e.message}`);
      }
    }
    load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, []);

  const sidoList = useMemo(() => data?.summary.sido ?? [], [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim();
    return data.stations
      .filter((r) => (sido === "전체" || r.sido === sido) && (!q || r.station.includes(q)))
      .sort((a, b) => (b.pm10 ?? -1) - (a.pm10 ?? -1));
  }, [data, sido, search]);

  // 3D 지도에서 시도를 누르면 표가 그 지역으로 (같은 곳을 다시 누르면 전체로)
  const pickSido = (name) => {
    setSido((prev) => (prev === name ? "전체" : name));
    setShown(PAGE);
  };

  const sum = data?.summary;
  const when = data && new Date(data.updated).toLocaleTimeString("ko-KR");

  return (
    <div>
      {error && <p className="err-text">{error}</p>}

      {sum && (
        <div className="card">
          전국 측정소 <b>{sum.stations}</b>곳 평균 PM10 <b>{sum.avg_pm10}</b> <Badge grade={sum.pm10_grade} />
          {" · "}PM2.5 <b>{sum.avg_pm25}</b> <Badge grade={sum.pm25_grade} />
          {sum.worst && (
            <div className="hint" style={{ marginTop: 6 }}>
              가장 높은 곳: {sum.worst.sido} {sum.worst.station} (PM10 {sum.worst.pm10})
            </div>
          )}
        </div>
      )}

      <div className="card">
        <Korea3D sidoList={sidoList} selected={sido} onSelect={pickSido} />
        <p className="hint">
          드래그로 돌리고, 휠로 확대·축소합니다. 시도를 누르면 아래 표가 그 지역 측정소로 바뀌고, 다시 누르면 전체로 돌아갑니다.
          (측정소 좌표 API 미신청으로 시도 단위 표시)
        </p>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <select value={sido} onChange={(e) => { setSido(e.target.value); setShown(PAGE); }} style={{ flex: "0 0 160px" }}>
            <option>전체</option>
            {sidoList.map((s) => (
              <option key={s.sido}>{s.sido}</option>
            ))}
          </select>
          <input
            value={search}
            placeholder="측정소 이름 검색 (예: 중구, 해운대)"
            onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }}
            style={{ flex: 1, minWidth: 180 }}
          />
        </div>
        <table>
          <thead>
            <tr><th>시도</th><th>측정소</th><th>시각</th><th>PM10</th><th>PM2.5</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((r) => (
              <tr key={`${r.sido}-${r.station}`}>
                <td>{r.sido}</td>
                <td>{r.station}</td>
                <td>{r.time.slice(11)}</td>
                <td>{r.pm10 ?? "-"} <Badge grade={r.pm10_grade} /></td>
                <td>{r.pm25 ?? "-"} <Badge grade={r.pm25_grade} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data && !error && <p className="hint">불러오는 중…</p>}
        {data && rows.length === 0 && <p className="hint">조건에 맞는 측정소가 없습니다.</p>}
        {rows.length > shown && (
          <p style={{ textAlign: "center", marginBottom: 0 }}>
            <button onClick={() => setShown((n) => n + PAGE)}>더 보기 ({rows.length - shown}곳 남음)</button>
          </p>
        )}
        {when && <p className="updated">{rows.length}곳 · 업데이트 {when} · 데이터: 에어코리아(공공데이터포털)</p>}
      </div>
    </div>
  );
}
