// 제주 지도 — 측정소 마커를 누르면(또는 지도를 누르면 가장 가까운 측정소) 미세먼지를 보여 준다
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATION_COORDS } from "./stations";
import { describe } from "./weatherCodes";

const COLOR = { 좋음: "#2f80ed", 보통: "#27ae60", 나쁨: "#f2994a", 매우나쁨: "#eb5757" };
const GRAY = "#9aa0a6";

function icon(r, selected) {
  const c = COLOR[r.pm10_grade] ?? GRAY;
  const size = selected ? 44 : 36;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};color:#fff;
      display:flex;align-items:center;justify-content:center;font:bold 13px sans-serif;
      border:${selected ? "3px solid #222" : "2px solid #fff"};box-shadow:0 1px 4px rgba(0,0,0,.45)">
      ${r.pm10 ?? "-"}</div>`,
  });
}

function dist(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

export default function MapView({ rows, onSelect }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const [selected, setSelected] = useState(null);
  const [weather, setWeather] = useState({}); // { 측정소명: current } — Open-Meteo 실시간

  const placed = rows.filter((r) => STATION_COORDS[r.station]);
  const unplaced = rows.filter((r) => !STATION_COORDS[r.station]);
  const current = rows.find((r) => r.station === selected);
  const w = current ? weather[current.station] : null;

  // 측정소 좌표 전체를 한 번의 요청으로 조회 (Open-Meteo는 쉼표로 여러 좌표 지원), 10분마다 갱신
  const stationKey = placed.map((r) => r.station).join(",");
  useEffect(() => {
    if (!stationKey) return;
    const names = stationKey.split(",");
    const ctrl = new AbortController();
    async function loadWeather() {
      try {
        const params = new URLSearchParams({
          latitude: names.map((n) => STATION_COORDS[n][0]).join(","),
          longitude: names.map((n) => STATION_COORDS[n][1]).join(","),
          current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
          timezone: "Asia/Seoul",
        });
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : [json]; // 좌표가 1개면 객체로 온다
        setWeather(Object.fromEntries(names.map((n, i) => [n, list[i]?.current])));
      } catch {
        /* 날씨는 부가 정보 — 실패해도 지도는 그대로 */
      }
    }
    loadWeather();
    const timer = setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [stationKey]);

  function pick(station) {
    setSelected(station);
    onSelect?.(station);
  }

  // 지도는 한 번만 만든다
  useEffect(() => {
    map.current = L.map(box.current).setView([33.38, 126.55], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);

  // 지도 빈 곳을 누르면 가장 가까운 측정소 선택
  useEffect(() => {
    const m = map.current;
    const onClick = (e) => {
      const p = [e.latlng.lat, e.latlng.lng];
      let best = null;
      for (const r of placed) {
        const d = dist(p, STATION_COORDS[r.station]);
        if (!best || d < best.d) best = { d, r };
      }
      if (best) pick(best.r.station);
    };
    m.on("click", onClick);
    return () => m.off("click", onClick);
  });

  // 데이터·선택이 바뀌면 마커 다시 그리기
  useEffect(() => {
    layer.current.clearLayers();
    for (const r of placed) {
      L.marker(STATION_COORDS[r.station], { icon: icon(r, r.station === selected) })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          pick(r.station);
        })
        .bindTooltip(
          weather[r.station]
            ? `${r.station} ${describe(weather[r.station].weather_code)[1]} ${Math.round(weather[r.station].temperature_2m)}°C`
            : r.station
        )
        .addTo(layer.current);
    }
  });

  return (
    <div>
      <div ref={box} style={{ height: 380 }} />
      {current ? (
        <div style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, padding: 12, marginTop: 10, background: "rgba(255,255,255,.06)" }}>
          <b style={{ fontSize: 16 }}>{current.station}</b>{" "}
          <small>{current.time} 기준</small>
          <div style={{ marginTop: 6 }}>
            PM10 <b>{current.pm10 ?? "-"}</b> ㎍/㎥{" "}
            <span style={{ color: COLOR[current.pm10_grade] }}>{current.pm10_grade ?? ""}</span>
            {" · "}
            PM2.5 <b>{current.pm25 ?? "-"}</b> ㎍/㎥{" "}
            <span style={{ color: COLOR[current.pm25_grade] }}>{current.pm25_grade ?? ""}</span>
          </div>
          {w && (
            <div style={{ marginTop: 6 }}>
              {describe(w.weather_code)[1]} {describe(w.weather_code)[0]}{" "}
              <b>{Math.round(w.temperature_2m)}°C</b>
              {" · "}습도 {w.relative_humidity_2m}%
              {" · "}풍속 {w.wind_speed_10m} km/h
              {" · "}강수 {w.precipitation} mm
            </div>
          )}
        </div>
      ) : (
        <p className="hint">지도에서 지역(마커)을 눌러 보세요.</p>
      )}
      {unplaced.length > 0 && (
        <p className="hint">
          지도에 표시되지 않은 측정소(좌표 없음):{" "}
          {unplaced.map((r) => (
            <button key={r.station} onClick={() => pick(r.station)} style={{ marginRight: 4 }}>
              {r.station}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}
