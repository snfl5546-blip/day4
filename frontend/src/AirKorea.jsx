// 전국 미세먼지 — 에어코리아 실측값(백엔드 /air/korea). 지도는 시도 평균, 표는 측정소별 수치.
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GRADE_COLOR } from "./geo";

const API = import.meta.env.VITE_API_URL ?? "";

// 에어코리아 시도 이름 → 지도 마커 위치(대표 도시). 측정소 좌표 API는 별도 신청이 필요해 시도 단위로 표시한다.
const SIDO_POS = {
  서울: [37.68, 127.0], 부산: [35.2, 129.1], 대구: [35.85, 128.6],
  인천: [37.4, 126.3], 대전: [36.2, 127.45], 울산: [35.6, 129.35],
  세종: [36.62, 127.1], 경기: [37.3, 127.55], 강원: [37.85, 128.3],
  충북: [36.85, 127.85], 충남: [36.5, 126.6], 전북: [35.7, 127.1],
  전남광주: [35.05, 126.75], 경북: [36.4919, 128.8889], 경남: [35.4606, 128.2132],
  제주: [33.4996, 126.5312],
};

function Badge({ grade }) {
  if (!grade) return <span>-</span>;
  return (
    <span style={{ background: GRADE_COLOR[grade], color: "#fff", borderRadius: 999, padding: "1px 9px", fontSize: 12, fontWeight: 700 }}>
      {grade}
    </span>
  );
}

function sidoIcon(s, selected) {
  const c = GRADE_COLOR[s.pm10_grade] ?? "#9aa0a6";
  return L.divIcon({
    className: "",
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    html: `<div style="width:50px;height:50px;border-radius:50%;background:${c};color:#fff;display:flex;
      flex-direction:column;align-items:center;justify-content:center;line-height:1.15;
      border:${selected ? "3px solid #222" : "2px solid #fff"};box-shadow:0 1px 6px rgba(0,0,0,.5);
      font-family:sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.35)">
      <span style="font-size:10px">${s.sido}</span><b style="font-size:15px">${s.avg_pm10 ?? "-"}</b></div>`,
  });
}

const PAGE = 40;

export default function AirKorea() {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

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

  // 지도는 한 번만 만든다
  useEffect(() => {
    const m = L.map(box.current).setView([36.3, 127.8], 7);
    map.current = m;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    return () => m.remove();
  }, []);

  // 시도 마커
  useEffect(() => {
    layer.current.clearLayers();
    for (const s of sidoList) {
      const pos = SIDO_POS[s.sido];
      if (!pos) continue;
      L.marker(pos, { icon: sidoIcon(s, s.sido === sido) })
        .on("click", () => {
          setSido(s.sido);
          setShown(PAGE);
        })
        .bindTooltip(`${s.sido} · 측정소 ${s.stations}곳 · PM10 ${s.avg_pm10} / PM2.5 ${s.avg_pm25}`)
        .addTo(layer.current);
    }
  }, [sidoList, sido]);

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
        <div ref={box} style={{ height: 460 }} />
        <p className="hint">원은 시도 평균 PM10입니다. 누르면 아래 표가 그 지역 측정소로 바뀝니다. (측정소 좌표 API 미신청으로 시도 단위 표시)</p>
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
