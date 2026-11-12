import { useEffect, useState } from "react";
import { describe } from "./weatherCodes";

const CITIES = [
  { name: "서울", lat: 37.5665, lon: 126.978 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "인천", lat: 37.4563, lon: 126.7052 },
  { name: "광주", lat: 35.1595, lon: 126.8526 },
  { name: "대전", lat: 36.3504, lon: 127.3845 },
  { name: "제주", lat: 33.4996, lon: 126.5312 },
];


export default function Weather() {
  const [city, setCity] = useState(CITIES[0]);
  const [tick, setTick] = useState(0); // 새로고침 버튼용
  // 마지막 응답: { key, city, current, error, at } — setState는 await 이후에만 호출한다
  const [result, setResult] = useState(null);

  const key = `${city.name}:${tick}`;
  const loading = result?.key !== key;
  const data = result?.city === city.name ? result.current : null;
  const error = result?.key === key ? result.error : "";
  const updatedAt = result?.at;

  // 도시 변경/새로고침 시 로드 + 10분마다 자동 갱신
  useEffect(() => {
    const ctrl = new AbortController();
    async function fetchWeather() {
      let next;
      try {
        const params = new URLSearchParams({
          latitude: city.lat,
          longitude: city.lon,
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
          timezone: "Asia/Seoul",
        });
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        next = { current: json.current, error: "" };
      } catch (e) {
        if (e.name === "AbortError") return;
        next = { current: null, error: `날씨를 불러오지 못했습니다: ${e.message}` };
      }
      setResult((prev) => ({
        key,
        city: city.name,
        // 실패 시 같은 도시의 이전 값은 유지
        current: next.current ?? (prev?.city === city.name ? prev.current : null),
        error: next.error,
        at: next.current ? new Date() : prev?.at ?? null,
      }));
    }
    fetchWeather();
    const timer = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [city, key]);

  const [label, icon] = data ? describe(data.weather_code) : ["", ""];

  return (
    <div className="card">
      <div className="row">
        <select
          value={city.name}
          onChange={(e) => setCity(CITIES.find((c) => c.name === e.target.value))}
        >
          {CITIES.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setTick((t) => t + 1)} disabled={loading}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {error && <p className="err-text">{error}</p>}

      {data && (
        <div className="wx">
          <div className="place">{city.name}</div>
          <div className="main">
            <span className="emoji">{icon}</span>
            <span className="temp">{Math.round(data.temperature_2m)}°C</span>
            <span className="desc">{label}</span>
          </div>
          <div className="stats">
            <div className="stat">체감온도<b>{Math.round(data.apparent_temperature)}°C</b></div>
            <div className="stat">습도<b>{data.relative_humidity_2m}%</b></div>
            <div className="stat">풍속<b>{data.wind_speed_10m} km/h</b></div>
            <div className="stat">강수량<b>{data.precipitation} mm</b></div>
          </div>
        </div>
      )}

      {updatedAt && <p className="updated">업데이트 {updatedAt.toLocaleTimeString("ko-KR")}</p>}
    </div>
  );
}
