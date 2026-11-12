// three.js 3D 지도 — 시도 경계를 입체로 세우고, 막대 높이를 PM10 평균값으로 표현한다.
// 경계 데이터: 통계청 통계지리정보서비스(SGIS), 공공누리 제1유형 (src/data/koreaSido.json 은 단순화한 사본)
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import geo from "./data/koreaSido.json";
import { GRADE_COLOR } from "./geo";

const S = 10; // 위도 1도 = 10 단위
const LON0 = 127.8;
const LAT0 = 36.2;
const K = Math.cos((LAT0 * Math.PI) / 180);
const project = ([lon, lat]) => new THREE.Vector2((lon - LON0) * K * S, (lat - LAT0) * S);
const heightOf = (pm10) => 0.6 + (pm10 ?? 0) * 0.15; // PM10 44 → 약 7.2

// 라벨이 겹치는 지역은 위치를 직접 지정한다: [경도, 위도]
const LABEL_AT = {
  서울: [127.03, 37.57], 인천: [126.38, 37.45], 경기: [127.5, 37.25], 세종: [127.2, 36.68],
  대전: [127.42, 36.22], 경북: [128.95, 36.75], 대구: [128.5, 35.8], 충북: [127.85, 36.85],
  충남: [126.7, 36.5], 부산: [129.02, 35.12], 울산: [129.3, 35.58],
};

function ringCentroid(ring) {
  let x = 0, y = 0;
  for (const p of ring) { x += p.x; y += p.y; }
  return new THREE.Vector2(x / ring.length, y / ring.length);
}

export default function Korea3D({ sidoList, selected, onSelect }) {
  const box = useRef(null);
  const tip = useRef(null);
  const scene3d = useRef(null); // { regions: Map }
  // 이벤트·애니메이션 루프에서 항상 최신 값을 쓰도록 ref 에 보관
  const live = useRef({ sidoList, onSelect });
  useEffect(() => {
    live.current = { sidoList, onSelect };
  });

  // ── 장면은 한 번만 만든다 ──
  useEffect(() => {
    const el = box.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      el.textContent = "이 브라우저에서는 3D(WebGL)를 사용할 수 없습니다.";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const labelRenderer = new CSS2DRenderer();
    Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    el.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    camera.position.set(0, 52, 56);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 20;
    controls.maxDistance = 130;
    controls.target.set(0, 0, 7);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a3f8f, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-25, 50, 30);
    scene.add(sun);

    // 바닥 격자 (은은하게)
    const grid = new THREE.GridHelper(120, 24, 0x8f89c9, 0x8f89c9);
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    grid.position.y = -0.01;
    scene.add(grid);

    // ── 시도별 입체 지형 ──
    const regions = new Map();
    const meshes = [];
    for (const [name, polys] of Object.entries(geo)) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.55, metalness: 0.05 });
      const region = { mat, meshes: [], cur: 0.5, target: 0.5, label: null, cx: 0, cy: 0 };
      let biggest = 0;
      for (const rings of polys) {
        const outer = rings[0].map(project);
        const shape = new THREE.Shape(outer);
        for (const hole of rings.slice(1)) shape.holes.push(new THREE.Path(hole.map(project)));
        const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
        const mesh = new THREE.Mesh(g, mat);
        mesh.rotation.x = -Math.PI / 2; // 평면(x,y) → 바닥, 돌출(z) → 위쪽
        mesh.userData.sido = name;
        // 윗면(z=1) 윤곽선만 그린다 — mesh 와 함께 scale.z 가 적용되어 항상 꼭대기에 붙는다
        const top = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(outer.map((p) => new THREE.Vector3(p.x, p.y, 1.002))),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
        );
        mesh.add(top);
        scene.add(mesh);
        meshes.push(mesh);
        region.meshes.push(mesh);
        if (outer.length > biggest) {
          biggest = outer.length;
          const c = ringCentroid(outer);
          region.cx = c.x;
          region.cy = c.y;
        }
      }
      if (LABEL_AT[name]) {
        const p = project(LABEL_AT[name]);
        region.cx = p.x;
        region.cy = p.y;
      }
      const div = document.createElement("div");
      div.className = "lbl3d";
      const label = new CSS2DObject(div);
      label.position.set(region.cx, 1, -region.cy);
      scene.add(label);
      region.label = label;
      region.div = div;
      regions.set(name, region);
    }
    let selectedName = null;

    // 데이터/선택이 바뀔 때 색·높이·라벨을 갱신한다 (장면 내부에서만 값을 바꾼다)
    const apply = (list, selected) => {
      selectedName = selected;
      for (const [name, r] of regions) {
        const s = list.find((x) => x.sido === name);
        r.mat.color.set(GRADE_COLOR[s?.pm10_grade] ?? "#8a86b8");
        r.target = heightOf(s?.avg_pm10);
        r.div.replaceChildren();
        const b = document.createElement("b");
        b.textContent = name;
        const v = document.createElement("span");
        v.textContent = s?.avg_pm10 ?? "-";
        r.div.append(b, v);
        r.div.classList.toggle("on", name === selected);
      }
    };
    scene3d.current = { apply };

    // ── 크기 ──
    function resize() {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ── 마우스: 올리면 강조, 클릭(드래그 아님)하면 선택 ──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered = null;
    let down = null;
    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      return hit ? hit.object.userData.sido : null;
    };
    const onMove = (e) => {
      hovered = pick(e);
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
      const t = tip.current;
      if (hovered) {
        const s = live.current.sidoList.find((x) => x.sido === hovered);
        const r = el.getBoundingClientRect();
        t.textContent = s
          ? `${hovered} · 측정소 ${s.stations}곳 · PM10 ${s.avg_pm10 ?? "-"} (${s.pm10_grade ?? "-"}) · PM2.5 ${s.avg_pm25 ?? "-"}`
          : hovered;
        t.style.display = "block";
        t.style.left = `${Math.min(e.clientX - r.left + 14, r.width - t.offsetWidth - 8)}px`;
        t.style.top = `${e.clientY - r.top + 14}px`;
      } else {
        t.style.display = "none";
      }
    };
    const onLeave = () => { hovered = null; tip.current.style.display = "none"; };
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
        const name = pick(e);
        if (name) live.current.onSelect(name);
      }
      down = null;
    };
    const dom = renderer.domElement;
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerleave", onLeave);
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);

    // ── 렌더 루프: 높이는 부드럽게 따라간다 ──
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      for (const [name, r] of regions) {
        r.cur += (r.target - r.cur) * 0.12;
        for (const m of r.meshes) m.scale.z = r.cur;
        r.label.position.y = r.cur + 0.8;
        r.mat.emissive.setHex(name === selectedName ? 0x555555 : name === hovered ? 0x333333 : 0x000000);
      }
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerleave", onLeave);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      controls.dispose();
      for (const r of regions.values()) {
        r.mat.dispose();
        for (const m of r.meshes) {
          m.geometry.dispose();
          m.children[0].geometry.dispose();
          m.children[0].material.dispose();
        }
      }
      grid.geometry.dispose();
      grid.material.dispose();
      renderer.dispose();
      el.replaceChildren();
      scene3d.current = null;
    };
  }, []);

  // ── 데이터/선택이 바뀌면 장면에 반영 ──
  useEffect(() => {
    scene3d.current?.apply(sidoList, selected);
  }, [sidoList, selected]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={box} className="map3d" style={{ position: "relative", height: 520, cursor: "grab" }} />
      <div ref={tip} className="tip3d" style={{ display: "none" }} />
      <div className="legend3d">
        {Object.entries(GRADE_COLOR).map(([g, c]) => (
          <span key={g}><i style={{ background: c }} />{g}</span>
        ))}
        <span className="hint" style={{ margin: 0 }}>· 높이 = 시도 평균 PM10</span>
      </div>
    </div>
  );
}
