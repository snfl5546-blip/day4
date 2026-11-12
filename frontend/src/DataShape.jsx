// dummyjson.com/products 응답의 구조를 실제 데이터에서 뽑아 애니메이션으로 펼쳐 보여 준다.
import { useEffect, useMemo, useState } from "react";

const URL = "https://dummyjson.com/products?limit=1";

// 값 → 트리 행 목록. 배열은 첫 원소만 펼치고 나머지는 개수로 알려 준다.
function flatten(value, key, depth, parent, rows, state) {
  const id = rows.length;
  const row = { id, depth, key, parent, kind: "", preview: "", count: 0 };
  rows.push(row);
  if (Array.isArray(value)) {
    row.kind = "array";
    row.count = value.length;
    row.preview = `${value.length}개`;
    if (value.length) flatten(value[0], "[0]", depth + 1, id, rows, state);
    if (value.length > 1) {
      rows.push({ id: rows.length, depth: depth + 1, key: `… 같은 모양 ${value.length - 1}개 더`, parent: id, kind: "more", preview: "", count: 0 });
    }
  } else if (value && typeof value === "object") {
    row.kind = "object";
    const keys = Object.keys(value);
    row.count = keys.length;
    row.preview = `${keys.length}개 필드`;
    for (const k of keys) flatten(value[k], k, depth + 1, id, rows, state);
  } else {
    row.kind = value === null ? "null" : typeof value;
    const text = typeof value === "string" ? value : String(value);
    row.preview = typeof value === "string" ? `"${text.length > 44 ? text.slice(0, 44) + "…" : text}"` : text;
  }
  return row;
}

const TYPE_LABEL = { object: "object", array: "array", string: "string", number: "number", boolean: "boolean", null: "null", more: "" };

export default function DataShape() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(0);      // 지금까지 나타난 행 수
  const [run, setRun] = useState(0);          // 다시 재생할 때 올린다
  const [closed, setClosed] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    fetch(URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => alive && setData(j))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const out = [];
    flatten(data, "response", 0, -1, out, {});
    return out;
  }, [data]);

  // 한 줄씩 차례로 나타나게 한다
  useEffect(() => {
    if (!rows.length) return undefined;
    const t = setInterval(() => {
      setShown((n) => {
        if (n >= rows.length) {
          clearInterval(t);
          return n;
        }
        return n + 1;
      });
    }, 90);
    return () => clearInterval(t);
  }, [rows, run]);

  const replay = () => {
    setClosed(new Set());
    setShown(0);
    setRun((n) => n + 1);
  };
  const toggle = (id) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // 접힌 조상이 있으면 숨긴다
  const visible = useMemo(() => {
    const hidden = new Set();
    return rows.filter((r) => {
      const gone = r.parent >= 0 && (closed.has(r.parent) || hidden.has(r.parent));
      if (gone) hidden.add(r.id);
      return !gone;
    });
  }, [rows, closed]);

  if (error) return <div className="card"><p className="err">데이터를 불러오지 못했습니다: {error}</p></div>;
  if (!data) return <div className="card"><p className="hint">구조를 가져오는 중…</p></div>;

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <p className="hint" style={{ margin: 0, flex: 1 }}>
          <code>dummyjson.com/products</code> 의 실제 응답입니다. 줄을 누르면 접고 펼 수 있어요.
        </p>
        <button onClick={replay} style={{ flexShrink: 0 }}>↻ 다시 재생</button>
      </div>

      <div className="tree" role="tree">
        {visible.map((r) => {
          const on = r.id < shown;
          const container = r.kind === "object" || r.kind === "array";
          return (
            <div
              key={r.id}
              role="treeitem"
              className={`node ${r.kind}${on ? " on" : ""}${container ? " fold" : ""}`}
              style={{ paddingLeft: 8 + r.depth * 20 }}
              onClick={container ? () => toggle(r.id) : undefined}
            >
              {container && <span className="caret">{closed.has(r.id) ? "▸" : "▾"}</span>}
              <span className="k">{r.key}</span>
              {TYPE_LABEL[r.kind] && <span className={`badge t-${r.kind}`}>{TYPE_LABEL[r.kind]}</span>}
              <span className="v">{r.preview}</span>
            </div>
          );
        })}
      </div>
      <p className="hint">
        최상위는 <b>products</b> 배열과 페이지 정보(total·skip·limit)입니다. 상품 하나가 필드 {rows.find((r) => r.key === "[0]")?.count}개를
        가지며 dimensions·meta 는 중첩 객체, reviews 는 객체 배열, tags·images 는 문자열 배열입니다.
      </p>
    </div>
  );
}
