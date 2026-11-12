import { useEffect, useState } from "react";
import KoreaWeather from "./KoreaWeather";
import Weather from "./Weather";
import AirKorea from "./AirKorea";
import Agent from "./Agent";
import DataShape from "./DataShape";

const PAGES = [
  {
    id: "map",
    label: "🗺️ 날씨 지도",
    title: "대한민국 날씨 지도",
    desc: "지역 이름의 첫 글자만 입력해도 찾아 드려요. 지도를 눌러 원하는 곳의 날씨를 확인해 보세요.",
    Component: KoreaWeather,
  },
  {
    id: "city",
    label: "🌤️ 도시 날씨",
    title: "주요 도시 실시간 날씨",
    desc: "도시를 고르면 지금의 기온·습도·풍속을 바로 보여 드려요.",
    Component: Weather,
  },
  {
    id: "air",
    label: "😷 전국 미세먼지",
    title: "전국 미세먼지 현황",
    desc: "에어코리아 실측값을 FastAPI로 가공해 시도별 평균과 측정소별 PM10·PM2.5를 보여 드려요.",
    Component: AirKorea,
  },
  {
    id: "agent",
    label: "🤖 추천 에이전트",
    title: "날씨 기반 장소 추천 에이전트",
    desc: "Gemini가 질문을 보고 날씨 조회와 장소 검색 도구 중 필요한 것을 골라 호출해 추천해 드려요.",
    Component: Agent,
  },
  {
    id: "data",
    label: "🧬 데이터 구조",
    title: "dummyjson 상품 데이터 구조",
    desc: "dummyjson.com/products 응답이 어떤 층과 타입으로 이루어졌는지 한 줄씩 펼쳐 보여 드려요.",
    Component: DataShape,
  },
];

const fromHash = () => PAGES.find((p) => `#${p.id}` === window.location.hash) ?? PAGES[0];

export default function App() {
  const [page, setPage] = useState(fromHash);

  // 주소의 #해시와 페이지를 맞춰 새로고침·뒤로가기에서도 같은 페이지가 열린다
  useEffect(() => {
    const onHash = () => setPage(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id) => {
    window.location.hash = id;
    window.scrollTo({ top: 0 });
  };
  const { Component } = page;
  const index = PAGES.indexOf(page);

  return (
    <div className="shell">
      <div className="topbar">
        <button className="back" aria-label="이전 페이지" disabled={index === 0} onClick={() => go(PAGES[index - 1].id)}>
          ‹
        </button>
        <h1>{page.title}</h1>
      </div>

      <nav className="tabs">
        {PAGES.map((p) => (
          <button key={p.id} className={`tab${p.id === page.id ? " active" : ""}`} onClick={() => go(p.id)}>
            {p.label}
          </button>
        ))}
      </nav>
      <p className="lead">{page.desc}</p>

      <Component />

      <p className="footnote">ⓘ 날씨 데이터: Open-Meteo · 지도: OpenStreetMap</p>
    </div>
  );
}
