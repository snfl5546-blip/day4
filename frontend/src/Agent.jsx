// 추천 에이전트 — 질문하면 Gemini 가 도구(get_weather / find_spots)를 골라 호출하고 추천해 준다.
import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

const EXAMPLES = [
  "이번 주말에 제주 가는데 뭐 하면 좋을까?",
  "지금 서울 날씨 어때? 비 오면 갈 만한 곳도 알려 줘",
  "부산에서 바다 보러 가고 싶은데 오늘 괜찮아?",
  "강릉에서 먹거리랑 구경할 곳 추천해 줘",
];

// **굵게**, 줄바꿈, "* " 목록만 지원하는 아주 작은 렌더러 (HTML 을 직접 넣지 않아 안전)
function Rich({ text }) {
  return text.split("\n").map((line, i) => {
    const heading = /^\s*#{1,6}\s+/.test(line);
    const bullet = !heading && /^\s*[*-]\s+/.test(line);
    const body = line.replace(/^\s*(#{1,6}|[*-])\s+/, "");
    const parts = body.split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <b key={j}>{p}</b> : p));
    return (
      <div
        key={i}
        className={heading ? "h" : bullet ? "bul" : undefined}
        style={{ minHeight: line.trim() ? undefined : 8 }}
      >
        {bullet && "• "}
        {parts}
      </div>
    );
  });
}

function Steps({ steps }) {
  if (!steps?.length) return null;
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div key={i} className="step">
          <span className="tool">🔧 {s.tool}</span>
          <code>{JSON.stringify(s.args)}</code>
          <span className="sum">→ {s.summary}</span>
        </div>
      ))}
    </div>
  );
}

export default function Agent() {
  const [msgs, setMsgs] = useState([]); // { role: "user"|"assistant", text, steps?, error? }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text) {
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`${API}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : `HTTP ${res.status}`);
      setMsgs((m) => [...m, { role: "assistant", text: data.answer, steps: data.steps }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: `답변을 가져오지 못했습니다: ${e.message}`, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card chat">
      <div className="chat-log">
        {msgs.length === 0 && (
          <div className="chat-empty">
            <p className="hint" style={{ margin: "0 0 10px" }}>
              궁금한 걸 물어보세요. 에이전트가 날씨(get_weather)와 장소 검색(find_spots) 중 필요한 도구를 직접 골라 호출한 뒤 추천해 줍니다.
            </p>
            <div className="chips">
              {EXAMPLES.map((e) => (
                <button key={e} className="tab" onClick={() => send(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}${m.error ? " error" : ""}`}>
            {m.role === "assistant" && <Steps steps={m.steps} />}
            <Rich text={m.text} />
          </div>
        ))}
        {busy && <div className="bubble assistant typing">도구를 고르고 있어요… 🤔</div>}
        <div ref={end} />
      </div>

      <form
        className="row"
        style={{ marginBottom: 0, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          maxLength={500}
          placeholder="예) 이번 주말 속초 날씨 보고 갈 만한 곳 추천해 줘"
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={busy || !input.trim()} style={{ flexShrink: 0 }}>
          {busy ? "…" : "보내기"}
        </button>
      </form>
    </div>
  );
}
