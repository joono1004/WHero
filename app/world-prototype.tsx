"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MAP_WIDTH = 48;
const MAP_DEPTH = 38;
const HEX_SIZE = 0.92;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_COLS = Math.ceil(MAP_WIDTH / HEX_WIDTH) + 1;
const HEX_ROWS = Math.ceil(MAP_DEPTH / (1.5 * HEX_SIZE)) + 1;

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

function landValue(seed: number, x: number, z: number) {
  const xRadius = MAP_WIDTH * (0.37 + hash(seed + 71, 1, 1) * 0.07);
  const zRadius = MAP_DEPTH * (0.34 + hash(seed + 72, 1, 2) * 0.08);
  const offsetX = (hash(seed + 73, 1, 3) - 0.5) * 2.4;
  const offsetZ = (hash(seed + 74, 1, 4) - 0.5) * 1.8;
  const radial = Math.hypot((x - offsetX) / xRadius, (z - offsetZ) / zRadius);
  const phaseA = hash(seed + 75, 1, 5) * Math.PI * 2;
  const phaseB = hash(seed + 76, 1, 6) * Math.PI * 2;
  const coastline =
    Math.sin(x * 0.58 + phaseA) * 0.12 +
    Math.cos(z * 0.66 + phaseB) * 0.11 +
    Math.sin((x - z) * 0.38 + phaseA * 0.7) * 0.08;
  return 1 - radial + coastline;
}

function distanceToRiver(x: number, z: number, samples: THREE.Vector3[]) {
  let nearest = Infinity;
  for (const point of samples) nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
  return nearest;
}

function buildRiver(seed: number) {
  const scaleX = MAP_WIDTH / 28;
  const scaleZ = MAP_DEPTH / 22;
  const bend = (index: number, strength = 1) => (hash(seed + 2000, index, 7) - 0.5) * strength;
  const drift = (hash(seed + 2010, 1, 1) - 0.5) * 5;
  const controlPoints = [
    new THREE.Vector3(-6.8 + drift * 0.25, 0, 8.7),
    new THREE.Vector3(-5.8 + drift * 0.45 + bend(1, 2.6), 0, 6.2),
    new THREE.Vector3(-3.3 + drift * 0.55 + bend(2, 3), 0, 3.7),
    new THREE.Vector3(-0.4 + drift * 0.7 + bend(3, 3.4), 0, 1.1),
    new THREE.Vector3(2.7 + drift * 0.55 + bend(4, 3.2), 0, -1.7),
    new THREE.Vector3(4.4 + drift * 0.35 + bend(5, 2.7), 0, -4.6),
    new THREE.Vector3(5.7 + drift * 0.2 + bend(6, 2), 0, -7.6),
    new THREE.Vector3(6.3 + drift * 0.12, 0, -10.6),
  ].map((point) => new THREE.Vector3(point.x * scaleX, point.y, point.z * scaleZ));
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
  const land = landValue(seed, x, z);
  if (land < -0.08) return -0.72 + terrainNoise(seed + 811, x, z) * 0.12;
  if (land < 0.08) return THREE.MathUtils.lerp(-0.42, base * 0.35, THREE.MathUtils.smoothstep(land, -0.08, 0.08));
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
    const viewHeight = 34;
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
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minZoom = 0.62;
    controls.maxZoom = 2.8;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.47;

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

    const textureLoader = new THREE.TextureLoader();
    const { curve, samples } = buildRiver(seed);
    const terrainGeometry = new THREE.PlaneGeometry(MAP_WIDTH, MAP_DEPTH, 144, 114);
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
      const coast = landValue(seed, x, z);
      if (coast < 0.14) color.lerp(new THREE.Color("#c8b47d"), THREE.MathUtils.smoothstep(0.14 - coast, 0, 0.2));
      colorValues.push(color.r, color.g, color.b);
    }
    terrainGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colorValues, 3));
    terrainGeometry.computeVertexNormals();
    const groundTexture = textureLoader.load("/assets/terrain/ground-texture-v1.png");
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(8, 6);
    groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({
        map: groundTexture,
        vertexColors: true,
        roughness: 0.96,
        metalness: 0,
      }),
    );
    terrain.receiveShadow = true;
    scene.add(terrain);

    const waterTexture = textureLoader.load("/assets/terrain/river-water-v1.png");
    waterTexture.colorSpace = THREE.SRGBColorSpace;
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(1.2, 8);
    const seaTexture = waterTexture.clone();
    seaTexture.needsUpdate = true;
    seaTexture.repeat.set(5, 4);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_WIDTH + 14, MAP_DEPTH + 14),
      new THREE.MeshPhysicalMaterial({
        color: "#4f91a6",
        map: seaTexture,
        roughness: 0.22,
        metalness: 0.03,
        transparent: true,
        opacity: 0.94,
        clearcoat: 0.48,
        clearcoatRoughness: 0.18,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.32;
    sea.receiveShadow = true;
    scene.add(sea);

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

    const forestTexture = textureLoader.load("/assets/terrain/forest-grove-real-v2.png");
    forestTexture.colorSpace = THREE.SRGBColorSpace;
    const forestMaterial = new THREE.SpriteMaterial({
      map: forestTexture,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: true,
      toneMapped: true,
    });
    for (let i = 0; i < 14; i += 1) {
      const x = (hash(seed + 301, i, 1) - 0.5) * (MAP_WIDTH - 5);
      const z = (hash(seed + 302, i, 2) - 0.5) * (MAP_DEPTH - 4);
      if (landValue(seed, x, z) < 0.18 || distanceToRiver(x, z, samples) < 1.75) continue;
      const grove = new THREE.Sprite(forestMaterial.clone());
      const scale = 1.7 + hash(seed + 303, i, 3) * 1.25;
      const y = heightAt(seed, x, z, samples);
      grove.scale.set(scale * 1.75, scale * 1.18, 1);
      grove.position.set(x, y, z);
      grove.center.set(0.5, 0);
      grove.renderOrder = Math.round((z + MAP_DEPTH / 2) * 10);
      if (hash(seed + 304, i, 4) > 0.5) grove.material.rotation = 0.025;
      scene.add(grove);
    }

    const mountainTexture = textureLoader.load("/assets/terrain/mountain-massif-real-v1.png");
    mountainTexture.colorSpace = THREE.SRGBColorSpace;
    const mountainMaterial = new THREE.SpriteMaterial({
      map: mountainTexture,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
      toneMapped: true,
    });
    const mountainCenters = Array.from({ length: 5 }, (_, index) => [
      -8.8 + (hash(seed + 411, index, 1) - 0.5) * 7.5,
      3.4 + (hash(seed + 412, index, 2) - 0.5) * 7,
      3.25 + hash(seed + 413, index, 3) * 1.65,
    ] as const);
    mountainCenters.forEach(([x, z, scale], index) => {
      if (landValue(seed, x, z) < 0.22 || distanceToRiver(x, z, samples) < 1.55) return;
      const mountain = new THREE.Sprite(mountainMaterial.clone());
      const variation = 0.88 + hash(seed + 401, index, 2) * 0.24;
      const y = heightAt(seed, x, z, samples);
      mountain.scale.set(scale * 1.38 * variation, scale * variation, 1);
      mountain.position.set(x, y, z);
      mountain.center.set(0.5, 0);
      mountain.renderOrder = Math.round((z + MAP_DEPTH / 2) * 10);
      scene.add(mountain);
    });

    const rockMaterial = new THREE.MeshStandardMaterial({ color: "#716e61", roughness: 1, flatShading: true });
    for (let i = 0; i < 26; i += 1) {
      const x = (hash(seed + 501, i, 1) - 0.5) * (MAP_WIDTH - 2);
      const z = (hash(seed + 502, i, 2) - 0.5) * (MAP_DEPTH - 2);
      if (landValue(seed, x, z) < 0.12 || distanceToRiver(x, z, samples) < 1.05) continue;
      const y = heightAt(seed, x, z, samples);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + hash(seed, i, 4) * 0.18, 0), rockMaterial);
      rock.position.set(x, y + 0.12, z);
      rock.scale.y = 0.55 + hash(seed, i, 5) * 0.45;
      rock.rotation.set(hash(seed, i, 6), hash(seed, i, 7) * Math.PI, hash(seed, i, 8));
      rock.castShadow = true;
      scene.add(rock);
    }

    const hexCenter = (row: number, column: number) => {
      const x = -MAP_WIDTH / 2 + HEX_WIDTH / 2 + column * HEX_WIDTH + (row % 2) * (HEX_WIDTH / 2);
      const z = -MAP_DEPTH / 2 + HEX_SIZE + row * 1.5 * HEX_SIZE;
      return { x, z };
    };
    const gridPositions: number[] = [];
    for (let r = 0; r < HEX_ROWS; r += 1) {
      for (let q = 0; q < HEX_COLS; q += 1) {
        const { x: cx, z: cz } = hexCenter(r, q);
        if (cx < -MAP_WIDTH / 2 - HEX_WIDTH || cx > MAP_WIDTH / 2 + HEX_WIDTH) continue;
        if (cz < -MAP_DEPTH / 2 - HEX_SIZE || cz > MAP_DEPTH / 2 + HEX_SIZE) continue;
        for (let edge = 0; edge < 6; edge += 1) {
          const a = (Math.PI / 180) * (60 * edge - 30);
          const b = (Math.PI / 180) * (60 * (edge + 1) - 30);
          const ax = cx + Math.cos(a) * HEX_SIZE;
          const az = cz + Math.sin(a) * HEX_SIZE;
          const bx = cx + Math.cos(b) * HEX_SIZE;
          const bz = cz + Math.sin(b) * HEX_SIZE;
          gridPositions.push(
            ax, Math.max(heightAt(seed, ax, az, samples) + 0.045, -0.285), az,
            bx, Math.max(heightAt(seed, bx, bz, samples) + 0.045, -0.285), bz,
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

    const selectionGeometry = new THREE.BufferGeometry();
    const selection = new THREE.LineLoop(
      selectionGeometry,
      new THREE.LineBasicMaterial({ color: "#fff27a", transparent: true, opacity: 0.98 }),
    );
    selection.visible = false;
    selection.renderOrder = 10000;
    scene.add(selection);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = new THREE.Vector2();
    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = new THREE.Vector2(event.clientX, event.clientY);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0 || pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(terrain, false)[0];
      if (!hit) return;
      const row = THREE.MathUtils.clamp(
        Math.round((hit.point.z + MAP_DEPTH / 2 - HEX_SIZE) / (1.5 * HEX_SIZE)),
        0,
        HEX_ROWS - 1,
      );
      const rowOffset = (row % 2) * (HEX_WIDTH / 2);
      const column = THREE.MathUtils.clamp(
        Math.round((hit.point.x + MAP_WIDTH / 2 - HEX_WIDTH / 2 - rowOffset) / HEX_WIDTH),
        0,
        HEX_COLS - 1,
      );
      const center = hexCenter(row, column);
      const selectedPoints: THREE.Vector3[] = [];
      for (let edge = 0; edge < 6; edge += 1) {
        const angle = (Math.PI / 180) * (60 * edge - 30);
        const x = center.x + Math.cos(angle) * HEX_SIZE * 0.96;
        const z = center.z + Math.sin(angle) * HEX_SIZE * 0.96;
        selectedPoints.push(new THREE.Vector3(x, Math.max(heightAt(seed, x, z, samples) + 0.095, -0.25), z));
      }
      selectionGeometry.setFromPoints(selectedPoints);
      selection.visible = true;
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const animate = () => {
      waterTexture.offset.y -= 0.00022;
      seaTexture.offset.x += 0.000025;
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
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.LineLoop) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      groundTexture.dispose();
      waterTexture.dispose();
      seaTexture.dispose();
      forestTexture.dispose();
      mountainTexture.dispose();
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
