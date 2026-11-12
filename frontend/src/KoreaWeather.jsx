// 대한민국 전체 날씨 지도 — 주요 도시 날씨 + 지역 검색(자동완성, 한글 → 로마자 자동 변환)
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  GRADE_COLOR, KOREA_CITIES, fetchAir, fetchCurrent, gradeOf, matchLocal, searchPlaces,
} from "./geo";
import { describe } from "./weatherCodes";

const keyOf = (p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;

// 마커: 날씨 아이콘 + 기온 + PM10 등급 색 점
function cityIcon(w, air, selected) {
  const [, emoji] = describe(w?.weather_code);
  const t = w ? `${Math.round(w.temperature_2m)}°` : "-";
  const dot = GRADE_COLOR[gradeOf("pm10", air?.pm10)] ?? "#9aa0a6";
  return L.divIcon({
    className: "",
    iconSize: [64, 28],
    iconAnchor: [32, 14],
    html: `<div style="width:64px;height:28px;border-radius:14px;background:${selected ? "#222" : "#fff"};
      color:${selected ? "#fff" : "#222"};display:flex;align-items:center;justify-content:center;gap:3px;
      font:bold 13px sans-serif;border:2px solid ${selected ? "#fff" : "#4facfe"};
      box-shadow:0 1px 4px rgba(0,0,0,.45)">${w ? emoji : ""}${t}
      <span style="width:11px;height:11px;border-radius:50%;background:${dot};border:1.5px solid #fff;
      box-shadow:0 0 0 1px rgba(0,0,0,.35)"></span></div>`,
  });
}

export default function KoreaWeather() {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState(null); // { q, items, converted, error }
  const [selected, setSelected] = useState(null); // { name, detail, lat, lon }
  const [cityWx, setCityWx] = useState({}); // 주요 도시 날씨
  const [cityAir, setCityAir] = useState({}); // 주요 도시 미세먼지
  const [selWx, setSelWx] = useState(null); // { key, current, air, error }

  const q = query.trim();
  const local = matchLocal(q);
  const remoteReady = remote?.q === q;
  const searching = q.length >= 2 && !remoteReady;

  // 추천 목록: 내장 도시 먼저, 그 뒤에 API 결과(중복 좌표 제거)
  const suggestions = [...local];
  if (remoteReady) {
    for (const it of remote.items) {
      if (!suggestions.some((s) => Math.hypot(s.lat - it.lat, s.lon - it.lon) < 0.05)) {
        suggestions.push(it);
      }
    }
  }

  // 입력 후 0.3초 뒤 지역 검색 (2글자 이상)
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, ctrl.signal);
        setRemote({ q, ...r });
      } catch (e) {
        if (e.name !== "AbortError") setRemote({ q, items: [], converted: null, error: true });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // 주요 도시 날씨 (10분마다 갱신)
  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      try {
        const list = await fetchCurrent(KOREA_CITIES, ctrl.signal);
        setCityWx(Object.fromEntries(KOREA_CITIES.map((c, i) => [c.name, list[i]])));
      } catch {
        /* 실패해도 지도는 그대로 */
      }
      try {
        const air = await fetchAir(KOREA_CITIES, ctrl.signal);
        setCityAir(Object.fromEntries(KOREA_CITIES.map((c, i) => [c.name, air[i]])));
      } catch {
        /* 미세먼지는 부가 정보 */
      }
    }
    load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, []);

  // 선택한 지역 날씨
  useEffect(() => {
    if (!selected) return;
    const key = keyOf(selected);
    const ctrl = new AbortController();
    async function load() {
      try {
        const [[current], air] = await Promise.all([
          fetchCurrent([selected], ctrl.signal),
          fetchAir([selected], ctrl.signal).catch(() => []), // 미세먼지가 실패해도 날씨는 보여 준다
        ]);
        setSelWx({ key, current, air: air[0] ?? null, error: "" });
      } catch (e) {
        if (e.name !== "AbortError") {
          setSelWx({ key, current: null, air: null, error: "날씨를 불러오지 못했습니다." });
        }
      }
    }
    load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [selected]);

  // 지도는 한 번만 만든다
  useEffect(() => {
    const m = L.map(box.current).setView([36.2, 127.8], 7);
    map.current = m;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    // 지도 아무 곳이나 누르면 그 지점의 날씨
    m.on("click", (e) =>
      setSelected({ name: "선택한 위치", detail: "", lat: e.latlng.lat, lon: e.latlng.lng })
    );
    return () => m.remove();
  }, []);

  // 선택하면 그 위치로 이동
  useEffect(() => {
    if (selected) map.current.flyTo([selected.lat, selected.lon], Math.max(map.current.getZoom(), 9));
  }, [selected]);

  // 마커 다시 그리기
  const selWxNow = selected && selWx?.key === keyOf(selected) ? selWx : null;
  useEffect(() => {
    layer.current.clearLayers();
    for (const c of KOREA_CITIES) {
      L.marker([c.lat, c.lon], { icon: cityIcon(cityWx[c.name], cityAir[c.name], false) })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSelected(c);
        })
        .bindTooltip(c.name)
        .addTo(layer.current);
    }
    if (selected) {
      L.marker([selected.lat, selected.lon], { icon: cityIcon(selWxNow?.current, selWxNow?.air, true), zIndexOffset: 1000 })
        .bindTooltip(selected.name)
        .addTo(layer.current);
    }
  }, [cityWx, cityAir, selected, selWxNow]);

  function choose(p) {
    setSelected(p);
    setQuery(p.name);
    setOpen(false);
  }

  const w = selWxNow?.current;
  const [label, icon] = w ? describe(w.weather_code) : ["", ""];

  return (
    <div>
      <div className="card">
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            value={query}
            placeholder="지역 이름의 첫 글자를 입력하세요 (예: 수, 제주, 해운대)"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]) choose(suggestions[0]);
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {open && q && (
            <ul className="suggest">
              {suggestions.map((s) => (
                <li key={`${s.name}${keyOf(s)}`} className="item" onMouseDown={() => choose(s)}>
                  <b>{s.name}</b> <small>{s.detail}</small>
                </li>
              ))}
              {searching && <li className="note">검색 중…</li>}
              {remoteReady && remote.converted && (
                <li className="note">한글 결과가 없어 영어(“{remote.converted}”)로 변환해 검색했습니다.</li>
              )}
              {remoteReady && remote.error && <li className="err">검색에 실패했습니다.</li>}
              {!searching && suggestions.length === 0 && !remote?.error && (
                <li className="note">
                  {q.length < 2 ? "두 글자 이상 입력하면 더 많은 지역을 찾습니다." : "검색 결과가 없습니다."}
                </li>
              )}
            </ul>
          )}
        </div>

        <div ref={box} style={{ height: 460 }} />
      </div>

      {selected ? (
        <div className="wx">
          <div className="place">
            {selected.name}
            <small>{selected.detail || `${selected.lat.toFixed(3)}, ${selected.lon.toFixed(3)}`}</small>
          </div>
          {selWxNow?.error && <p>{selWxNow.error}</p>}
          {!selWxNow && <p>불러오는 중…</p>}
          {w && (
            <>
              <div className="main">
                <span className="emoji">{icon}</span>
                <span className="temp">{Math.round(w.temperature_2m)}°C</span>
                <span className="desc">{label}</span>
              </div>
              <div className="stats">
                <div className="stat">체감온도<b>{Math.round(w.apparent_temperature)}°C</b></div>
                <div className="stat">습도<b>{w.relative_humidity_2m}%</b></div>
                <div className="stat">풍속<b>{w.wind_speed_10m} km/h</b></div>
                <div className="stat">강수량<b>{w.precipitation} mm</b></div>
                {[["미세먼지 PM10", "pm10"], ["초미세먼지 PM2.5", "pm2_5"]].map(([name, k]) => {
                  const v = selWxNow.air?.[k];
                  const g = gradeOf(k, v);
                  return (
                    <div className="stat" key={k}>
                      {name}
                      <b>
                        {v != null ? `${Math.round(v)} ㎍/㎥` : "-"}{" "}
                        {g && <span className="grade" style={{ background: GRADE_COLOR[g] }}>{g}</span>}
                      </b>
                    </div>
                  );
                })}
              </div>
              <p className="src">미세먼지는 위성·기상 모델(CAMS) 추정값이며 실측과 다를 수 있습니다.</p>
            </>
          )}
        </div>
      ) : (
        <p className="hint">지역을 검색하거나 지도(도시 마커 또는 아무 곳)를 눌러 날씨를 확인하세요.</p>
      )}
    </div>
  );
}
