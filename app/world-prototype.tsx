"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MAP_WIDTH = 28;
const MAP_DEPTH = 22;
const HEX_SIZE = 0.92;
const HEX_COLS = 14;
const HEX_ROWS = 12;

function hash(seed: number, x: number, y: number) {
  let value = seed ^ Math.imul(x + 31, 374761393) ^ Math.imul(y + 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function terrainNoise(seed: number, x: number, z: number) {
  return (
    Math.sin(x * 0.43 + seed * 0.00013) * 0.16 +
    Math.cos(z * 0.37 - seed * 0.00017) * 0.13 +
    Math.sin((x + z) * 0.71 + seed * 0.00007) * 0.07
  );
}

function distanceToRiver(x: number, z: number, samples: THREE.Vector3[]) {
  let nearest = Infinity;
  for (const point of samples) nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
  return nearest;
}

function buildRiver(seed: number) {
  const bend = (index: number) => (hash(seed + 2000, index, 7) - 0.5) * 2.2;
  const controlPoints = [
    new THREE.Vector3(-8.6, 0, -12.2),
    new THREE.Vector3(-7.3 + bend(1), 0, -7.8),
    new THREE.Vector3(-4.6 + bend(2), 0, -4.2),
    new THREE.Vector3(-0.8 + bend(3), 0, -1.3),
    new THREE.Vector3(3.7 + bend(4), 0, 1.4),
    new THREE.Vector3(4.5 + bend(5), 0, 5.7),
    new THREE.Vector3(7.3 + bend(6), 0, 8.7),
    new THREE.Vector3(8.5, 0, 12.2),
  ];
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, "centripetal", 0.42);
  return { curve, samples: curve.getPoints(150) };
}

function createRiverRibbon(curve: THREE.CatmullRomCurve3) {
  const segments = 150;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const width = 0.62 + t * 0.25 + Math.sin(t * Math.PI * 7) * 0.035;
    for (const side of [-1, 1]) {
      const edge = point.clone().addScaledVector(normal, width * side);
      positions.push(edge.x, -0.17, edge.z);
      uvs.push(side < 0 ? 0 : 1, t * 9);
    }
    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function heightAt(seed: number, x: number, z: number, riverSamples: THREE.Vector3[]) {
  const base = terrainNoise(seed, x, z);
  const ridge = Math.max(0, Math.sin(x * 0.22 - z * 0.12 + seed * 0.0001)) * 0.18;
  const distance = distanceToRiver(x, z, riverSamples);
  if (distance < 1.55) {
    const bank = THREE.MathUtils.smoothstep(distance, 0.62, 1.55);
    return THREE.MathUtils.lerp(-0.24, base + ridge, bank);
  }
  return base + ridge;
}

function terrainColor(height: number, wetness: number) {
  const dry = new THREE.Color("#b7b76d");
  const grass = new THREE.Color("#879d57");
  const deep = new THREE.Color("#617c4d");
  const color = dry.clone().lerp(grass, THREE.MathUtils.clamp(wetness, 0, 1));
  if (height > 0.2) color.lerp(deep, Math.min(0.35, height));
  return color;
}

function WorldScene({ seed, showGrid }: { seed: number; showGrid: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b9c8b0");
    scene.fog = new THREE.Fog("#cbd2bc", 34, 58);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const aspect = host.clientWidth / host.clientHeight;
    const viewHeight = 20;
    const camera = new THREE.OrthographicCamera(
      (-viewHeight * aspect) / 2,
      (viewHeight * aspect) / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      100,
    );
    camera.position.set(17, 18, 19);
    camera.lookAt(0, 0, 0);
    camera.zoom = 0.88;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minZoom = 0.62;
    controls.maxZoom = 2.8;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;

    scene.add(new THREE.HemisphereLight("#fff6d7", "#465649", 2.3));
    const sun = new THREE.DirectionalLight("#fff0c1", 3.4);
    sun.position.set(-12, 19, -9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -19;
    sun.shadow.camera.right = 19;
    sun.shadow.camera.top = 17;
    sun.shadow.camera.bottom = -17;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const { curve, samples } = buildRiver(seed);
    const terrainGeometry = new THREE.PlaneGeometry(MAP_WIDTH, MAP_DEPTH, 84, 66);
    terrainGeometry.rotateX(-Math.PI / 2);
    const position = terrainGeometry.attributes.position;
    const colorValues: number[] = [];
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const height = heightAt(seed, x, z, samples);
      position.setY(i, height);
      const wetness = 0.45 + terrainNoise(seed + 91, x * 1.7, z * 1.7) * 1.8;
      const color = terrainColor(height, wetness);
      colorValues.push(color.r, color.g, color.b);
    }
    terrainGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colorValues, 3));
    terrainGeometry.computeVertexNormals();
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }),
    );
    terrain.receiveShadow = true;
    scene.add(terrain);

    const textureLoader = new THREE.TextureLoader();
    const waterTexture = textureLoader.load("/assets/terrain/river-water-v1.png");
    waterTexture.colorSpace = THREE.SRGBColorSpace;
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(1.2, 8);
    const river = new THREE.Mesh(
      createRiverRibbon(curve),
      new THREE.MeshPhysicalMaterial({
        color: "#4f8ba5",
        map: waterTexture,
        roughness: 0.28,
        metalness: 0.02,
        transparent: true,
        opacity: 0.92,
        clearcoat: 0.35,
        clearcoatRoughness: 0.22,
      }),
    );
    river.receiveShadow = true;
    scene.add(river);

    const treeTexture = textureLoader.load("/assets/terrain/conifer-cluster-v1.png");
    treeTexture.colorSpace = THREE.SRGBColorSpace;
    const treeMaterial = new THREE.SpriteMaterial({ map: treeTexture, transparent: true, alphaTest: 0.14 });
    for (let i = 0; i < 64; i += 1) {
      const x = (hash(seed + 301, i, 1) - 0.5) * (MAP_WIDTH - 2);
      const z = (hash(seed + 302, i, 2) - 0.5) * (MAP_DEPTH - 2);
      if (distanceToRiver(x, z, samples) < 1.65 || hash(seed + 303, i, 3) < 0.31) continue;
      const y = heightAt(seed, x, z, samples);
      const tree = new THREE.Sprite(treeMaterial.clone());
      const scale = 1.2 + hash(seed + 304, i, 4) * 0.8;
      tree.position.set(x, y + scale * 0.54, z);
      tree.scale.set(scale, scale, 1);
      scene.add(tree);
    }

    const mountainMaterial = new THREE.MeshStandardMaterial({ color: "#77766d", roughness: 0.96 });
    for (let i = 0; i < 14; i += 1) {
      const x = -10 + hash(seed + 401, i, 1) * 8;
      const z = 1 + hash(seed + 402, i, 2) * 8;
      if (distanceToRiver(x, z, samples) < 1.8) continue;
      const y = heightAt(seed, x, z, samples);
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(0.7 + hash(seed, i, 8) * 0.45, 1.8 + hash(seed, i, 9), 7), mountainMaterial);
      mountain.position.set(x, y + 0.82, z);
      mountain.rotation.y = hash(seed, i, 10) * Math.PI;
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      scene.add(mountain);
    }

    const gridPositions: number[] = [];
    const gridOffsetX = -((HEX_COLS - 1) * Math.sqrt(3) * HEX_SIZE) / 2;
    const gridOffsetZ = -((HEX_ROWS - 1) * 1.5 * HEX_SIZE) / 2;
    for (let r = 0; r < HEX_ROWS; r += 1) {
      for (let q = 0; q < HEX_COLS; q += 1) {
        const cx = gridOffsetX + Math.sqrt(3) * HEX_SIZE * (q + r / 2);
        const cz = gridOffsetZ + 1.5 * HEX_SIZE * r;
        for (let edge = 0; edge < 6; edge += 1) {
          const a = (Math.PI / 180) * (60 * edge - 30);
          const b = (Math.PI / 180) * (60 * (edge + 1) - 30);
          const ax = cx + Math.cos(a) * HEX_SIZE;
          const az = cz + Math.sin(a) * HEX_SIZE;
          const bx = cx + Math.cos(b) * HEX_SIZE;
          const bz = cz + Math.sin(b) * HEX_SIZE;
          gridPositions.push(
            ax, heightAt(seed, ax, az, samples) + 0.045, az,
            bx, heightAt(seed, bx, bz, samples) + 0.045, bz,
          );
        }
      }
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
    const grid = new THREE.LineSegments(
      gridGeometry,
      new THREE.LineBasicMaterial({ color: "#efe7be", transparent: true, opacity: 0.3 }),
    );
    grid.visible = showGrid;
    scene.add(grid);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    const resize = () => {
      const nextAspect = host.clientWidth / host.clientHeight;
      camera.left = (-viewHeight * nextAspect) / 2;
      camera.right = (viewHeight * nextAspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      waterTexture.dispose();
      treeTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [seed, showGrid]);

  return <div className="world-3d" ref={hostRef} aria-label="WebGL로 렌더링한 2.5D 육각형 세계 지도" />;
}

export function WorldPrototype() {
  const [seedText, setSeedText] = useState("20260723");
  const [seed, setSeed] = useState(20260723);
  const [showGrid, setShowGrid] = useState(true);

  const regenerate = () => {
    const parsed = Number(seedText);
    setSeed(Number.isFinite(parsed) ? Math.trunc(parsed) : Date.now());
  };

  const randomize = () => {
    const next = Math.floor(Math.random() * 99999999);
    setSeedText(String(next));
    setSeed(next);
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WORLD GENERATION LAB · WEBGL 2.5D</p>
          <h1>World in Hero</h1>
        </div>
        <div className="controls">
          <label>월드 시드<input value={seedText} onChange={(event) => setSeedText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && regenerate()} /></label>
          <button onClick={regenerate}>이 시드로 생성</button>
          <button className="secondary" onClick={randomize}>새로운 세계</button>
          <label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />Hex 경계</label>
        </div>
      </header>
      <section className="stage">
        <WorldScene seed={seed} showGrid={showGrid} />
        <aside className="legend">
          <strong>2.5D 지도</strong>
          <span><i style={{ background: "#91a55d" }} />연속 지형</span>
          <span><i style={{ background: "#4f8ba5" }} />파인 강</span>
          <span><i style={{ background: "#405f3f" }} />입체 숲</span>
          <span><i style={{ background: "#77766d" }} />산악</span>
        </aside>
        <div className="selection-card">
          <span>조작 방법</span>
          <strong>휠 확대 · 드래그 이동</strong>
          <em>지형과 강이 실제 높이를 가진 WebGL 장면입니다.</em>
        </div>
      </section>
      <footer><span>현재 검증</span><b>2.5D 연속 지면</b><b>지형을 파낸 강</b><b>입체 그림자</b><small>이 버전에서 시점과 그래픽 방향을 먼저 확인합니다.</small></footer>
    </main>
  );
}
