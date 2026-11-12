// 지역 검색(자동완성) + 한글→로마자 변환 + Open-Meteo 현재 날씨 조회 도우미

// 주요 도시 (1글자 입력 시 즉시 추천 / 지도 기본 마커)
export const KOREA_CITIES = [
  { name: "서울", lat: 37.5665, lon: 126.978 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "인천", lat: 37.4563, lon: 126.7052 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "대전", lat: 36.3504, lon: 127.3845 },
  { name: "광주", lat: 35.1595, lon: 126.8526 },
  { name: "울산", lat: 35.5384, lon: 129.3114 },
  { name: "세종", lat: 36.48, lon: 127.289 },
  { name: "수원", lat: 37.2636, lon: 127.0286 },
  { name: "성남", lat: 37.4201, lon: 127.1262 },
  { name: "고양", lat: 37.6584, lon: 126.832 },
  { name: "용인", lat: 37.2411, lon: 127.1776 },
  { name: "평택", lat: 36.9921, lon: 127.1129 },
  { name: "안산", lat: 37.3219, lon: 126.8309 },
  { name: "파주", lat: 37.76, lon: 126.7802 },
  { name: "춘천", lat: 37.8813, lon: 127.7298 },
  { name: "원주", lat: 37.3422, lon: 127.9202 },
  { name: "강릉", lat: 37.7519, lon: 128.8761 },
  { name: "속초", lat: 38.207, lon: 128.5918 },
  { name: "동해", lat: 37.5247, lon: 129.1143 },
  { name: "청주", lat: 36.6424, lon: 127.489 },
  { name: "충주", lat: 36.991, lon: 127.9259 },
  { name: "천안", lat: 36.8151, lon: 127.1139 },
  { name: "전주", lat: 35.8242, lon: 127.148 },
  { name: "군산", lat: 35.9676, lon: 126.7369 },
  { name: "목포", lat: 34.8118, lon: 126.3922 },
  { name: "여수", lat: 34.7604, lon: 127.6622 },
  { name: "순천", lat: 34.9506, lon: 127.4872 },
  { name: "포항", lat: 36.019, lon: 129.3435 },
  { name: "경주", lat: 35.8562, lon: 129.2247 },
  { name: "안동", lat: 36.5684, lon: 128.7294 },
  { name: "창원", lat: 35.2279, lon: 128.6811 },
  { name: "진주", lat: 35.18, lon: 128.1076 },
  { name: "김해", lat: 35.2285, lon: 128.8894 },
  { name: "통영", lat: 34.8544, lon: 128.4331 },
  { name: "울릉도", lat: 37.4845, lon: 130.9057 },
  { name: "제주", lat: 33.4996, lon: 126.5312 },
  { name: "서귀포", lat: 33.2541, lon: 126.56 },
];

// ---- 한글 → 로마자 (국어의 로마자 표기법, 음운 변동 없이 글자 단위로 변환) ----
const INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

export const hasHangul = (s) => /[가-힣]/.test(s);

export function romanize(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    const f = code % 28;
    const v = Math.floor(code / 28) % 21;
    const i = Math.floor(code / 588);
    out += INITIAL[i] + VOWEL[v] + FINAL[f];
  }
  return out;
}

// "수원시" 처럼 행정구역 접미사가 붙은 입력은 접미사를 뗀 변형도 함께 시도
function romanVariants(q) {
  const base = q.trim();
  const list = [romanize(base)];
  if (base.length > 2 && /[시군구읍면동]$/.test(base)) list.push(romanize(base.slice(0, -1)));
  return [...new Set(list)];
}

// ---- 지역 검색 ----
async function geocode(name, signal) {
  const params = new URLSearchParams({
    name,
    count: "8",
    language: "ko",
    countryCode: "KR",
    format: "json",
  });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((r) => ({
    name: r.name,
    detail: [r.admin2, r.admin1].filter((x) => x && x !== r.name).join(" "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// 1글자는 내장 목록, 2글자 이상은 API. 한글로 결과가 없으면 로마자로 바꿔 재검색.
export async function searchPlaces(q, signal) {
  let items = await geocode(q, signal);
  let converted = null;
  if (items.length === 0 && hasHangul(q)) {
    for (const eng of romanVariants(q)) {
      items = await geocode(eng, signal);
      if (items.length) {
        converted = eng;
        break;
      }
    }
  }
  return { items, converted };
}

export function matchLocal(q) {
  const s = q.trim();
  if (!s) return [];
  return KOREA_CITIES.filter((c) => c.name.startsWith(s)).slice(0, 8);
}

// ---- 현재 날씨 (여러 좌표를 한 번에) ----
export async function fetchCurrent(points, signal) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    timezone: "Asia/Seoul",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : [json]).map((j) => j.current);
}

// ---- 미세먼지 (Open-Meteo Air Quality: CAMS 모델 추정값, 키 불필요) ----
export async function fetchAir(points, signal) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    current: "pm10,pm2_5",
    timezone: "Asia/Seoul",
  });
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : [json]).map((j) => j.current);
}

// 한국 환경부 기준 (㎍/㎥): [좋음 상한, 보통 상한, 나쁨 상한]
const CUT = { pm10: [30, 80, 150], pm2_5: [15, 35, 75] };
export const GRADE_COLOR = { 좋음: "#4a9bff", 보통: "#3ccf7a", 나쁨: "#ffa24d", 매우나쁨: "#ff6b6b" };

export function gradeOf(kind, v) {
  if (v == null) return null;
  const [a, b, c] = CUT[kind];
  return v <= a ? "좋음" : v <= b ? "보통" : v <= c ? "나쁨" : "매우나쁨";
}
