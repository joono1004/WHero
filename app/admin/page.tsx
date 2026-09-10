"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "../game/supabaseClient.ts";
import type { CoreGrade, SpecialtyGrade } from "../../lib/game/grade.ts";
import type { DomesticSpecialtyKind, HeroDefinition } from "../../lib/game/hero-definition.ts";
import type { HeroSkillId } from "../../lib/game/hero-skill.ts";
import { HERO_SKILL_CATALOG } from "../../lib/game/hero-skill.ts";
import type { HeroTraitId } from "../../lib/game/hero-trait.ts";
import { HERO_TRAIT_CATALOG } from "../../lib/game/hero-trait.ts";
import { UNIT_TYPE_CATALOG } from "../../lib/game/unit-production.ts";
import { HERO_PORTRAIT } from "../game/heroPortraits.ts";
import { BUNDLED_HERO_DEFINITIONS } from "../game/heroCatalog.ts";
import {
  BUNDLED_TREASURE_DEFINITIONS,
  TREASURE_CATEGORY_LABEL,
  TREASURE_EFFECT_LABEL,
  TREASURE_TERRAIN_LABEL,
  TREASURE_UNIT_TYPE_LABEL,
  treasureEffectText,
  type TreasureCategory,
  type TreasureDefinition,
  type TreasureEffectKind,
  type TreasureUnitType,
} from "../../lib/game/treasure-definition.ts";
import "./admin.css";

type Availability = "starter" | "recruitable" | "hidden";
type AdminHeroRow = { id: string; name: string; availability: Availability; portrait_path: string | null; definition: HeroDefinition; updated_at?: string };
type Draft = AdminHeroRow;
type AdminTreasureRow = { id: string; name: string; category: TreasureCategory; grade: CoreGrade; definition: TreasureDefinition; published: boolean; updated_at?: string };
type TreasureDraft = AdminTreasureRow;
type TroopDirection = "left-up" | "right-up" | "left" | "right" | "left-down" | "right-down";
type TroopAction = "ready" | "move" | "attack" | "hurt" | "death";
type TroopFrameOffset = { x: number; y: number };
type TroopFrameOffsets = Record<string, TroopFrameOffset>;
const TROOP_FRAME_OFFSETS_KEY = "world-in-hero:troop-frame-offsets:v1";

const GRADES: CoreGrade[] = ["D", "C", "B", "A", "S", "SS"];
const SPECIALTY_GRADES: SpecialtyGrade[] = ["없음", ...GRADES];
const DOMESTIC_FIELDS: { key: DomesticSpecialtyKind; label: string }[] = [
  { key: "troops", label: "병사" }, { key: "gold", label: "금" }, { key: "food", label: "식량" },
  { key: "iron", label: "철" }, { key: "recovery", label: "회복" }, { key: "defense", label: "방어" },
];
const STARTER_HERO_IDS = new Set(["zhang-bao", "wei-yan", "xu-shu"]);
const TREASURE_CATEGORIES: TreasureCategory[] = ["weapon", "armor", "mount", "other"];
const TREASURE_EFFECTS: TreasureEffectKind[] = ["attack", "defense", "movement", "health"];
const TREASURE_UNIT_TYPES: TreasureUnitType[] = ["infantry", "cavalry", "archer", "strategist"];
const TREASURE_TERRAINS = Object.keys(TREASURE_TERRAIN_LABEL);
const TREASURE_CATEGORY_ART: Record<TreasureCategory, string> = {
  weapon: "/art/ui/equipment-weapon-empty-v2.png",
  armor: "/art/ui/equipment-armor-empty-v2.png",
  mount: "/art/ui/equipment-mount-empty-v2.png",
  other: "/art/ui/equipment-other-empty-v2.png",
};
const TREASURE_ART: Partial<Record<string, string>> = {
  "han-ring-pommel-sword": "/art/treasures/han-ring-pommel-sword-v1.png", "seven-star-sword": "/art/treasures/seven-star-sword-v1.png", "male-female-swords": "/art/treasures/male-female-swords-v1.png", "goding-sword": "/art/treasures/goding-sword-v1.png", "green-dragon-blade": "/art/treasures/green-dragon-blade-v1.png", "serpent-spear": "/art/treasures/serpent-spear-v1.png", "dragon-spear": "/art/treasures/dragon-spear-v1.png", "zhuge-crossbow": "/art/treasures/zhuge-crossbow-v1.png", "fuchai-halberd": "/art/treasures/fuchai-halberd-v1.png", "blue-steel-sword": "/art/treasures/blue-steel-sword-v1.png", "fangtian-halberd": "/art/treasures/fangtian-halberd-v1.png", "goujian-sword": "/art/treasures/goujian-sword-v1.png",
  "fish-scale-armor": "/art/treasures/fish-scale-armor-v1.png", "dujeong-gap": "/art/treasures/dujeong-armor-v1.png", "chain-mail": "/art/treasures/chain-mail-v1.png", "mingguang-armor": "/art/treasures/mingguang-armor-v1.png", "gold-thread-jade-suit": "/art/treasures/gold-thread-jade-suit-v1.png", "maximilian-armor": "/art/treasures/maximilian-armor-v1.png",
  "jeju-horse": "/art/treasures/jeju-horse-v1.png", "wusun-horse": "/art/treasures/wusun-horse-v1.png", "ferghana-horse": "/art/treasures/ferghana-horse-v1.png", "mongolian-horse": "/art/treasures/mongolian-horse-v1.png", "arabian-horse": "/art/treasures/arabian-horse-v1.png", "akhal-teke": "/art/treasures/akhal-teke-v1.png",
  "tiger-tally": "/art/treasures/tiger-tally-v1.png", "jade-belt-hook": "/art/treasures/jade-belt-hook-v1.png", "jade-bi": "/art/treasures/jade-bi-v1.png", "taiping-jing": "/art/treasures/taiping-jing-v1.png", "shanghan-lun": "/art/treasures/shanghan-lun-v1.png", "huangdi-neijing": "/art/treasures/huangdi-neijing-v1.png",
};
const TREASURE_GRADE_BADGE: Record<CoreGrade, string> = { SS: "/art/heroes/grades-v2/grade-ss.png", S: "/art/heroes/grades-v2/grade-s.png", A: "/art/heroes/grades-v2/grade-a.png", B: "/art/heroes/grades-v2/grade-b.png", C: "/art/heroes/grades-v2/grade-c.png", D: "/art/heroes/grades-v2/grade-d.png" };
const TROOP_DIRECTIONS: { id: TroopDirection; label: string; x: number; y: number; flip: boolean }[] = [
  { id: "left-up", label: "왼쪽 위", x: -1, y: -1, flip: true }, { id: "right-up", label: "오른쪽 위", x: 1, y: -1, flip: false },
  { id: "left", label: "왼쪽", x: -1, y: 0, flip: true }, { id: "right", label: "오른쪽", x: 1, y: 0, flip: false },
  { id: "left-down", label: "왼쪽 아래", x: -1, y: 1, flip: true }, { id: "right-down", label: "오른쪽 아래", x: 1, y: 1, flip: false },
];
const TROOP_ACTION_LABEL: Record<TroopAction, string> = { ready: "준비", move: "이동", attack: "공격", hurt: "피해", death: "사망" };

function treasureArt(treasure: TreasureDefinition): string {
  return TREASURE_ART[treasure.id] ?? TREASURE_CATEGORY_ART[treasure.category];
}

function bundledRow(definition: HeroDefinition): AdminHeroRow {
  return { id: definition.id, name: definition.name, availability: STARTER_HERO_IDS.has(definition.id) ? "starter" : "recruitable", portrait_path: HERO_PORTRAIT[definition.id] ?? null, definition };
}
function blankHero(): Draft {
  const id = `hero-${Date.now()}`;
  return {
    id,
    name: "새 영웅",
    availability: "hidden",
    portrait_path: null,
    definition: {
      id,
      name: "새 영웅",
      description: "영웅 설명을 입력하세요.",
      unitType: "infantry",
      attributes: { leadership: "D", force: "D", intelligence: "D", charisma: "D", vitality: "D" },
      domesticSpecialties: { troops: "없음", gold: "없음", food: "없음", iron: "없음", recovery: "없음", defense: "없음" },
      traits: [], skills: [], evolution: null,
    },
  };
}

function bundledTreasureRow(definition: TreasureDefinition): AdminTreasureRow {
  return { id: definition.id, name: definition.name, category: definition.category, grade: definition.grade, definition, published: true };
}

function blankTreasure(): TreasureDraft {
  const id = `treasure-${Date.now()}`;
  return {
    id,
    name: "새 보물",
    category: "other",
    grade: "D",
    published: false,
    definition: {
      id,
      name: "새 보물",
      category: "other",
      grade: "D",
      allowedUnitTypes: [],
      effectKind: "health",
      effectValue: 3,
      terrainBonuses: [],
      description: "보물 설명을 입력하세요.",
    },
  };
}

function parseRow(value: unknown): AdminHeroRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<AdminHeroRow>;
  if (!row.id || !row.name || !row.definition || !["starter", "recruitable", "hidden"].includes(String(row.availability))) return null;
  return { id: row.id, name: row.name, availability: row.availability as Availability, portrait_path: row.portrait_path ?? null, definition: row.definition, updated_at: row.updated_at };
}

function parseTreasureRow(value: unknown): AdminTreasureRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<AdminTreasureRow>;
  if (!row.id || !row.name || !row.definition || !TREASURE_CATEGORIES.includes(row.category as TreasureCategory) || !GRADES.includes(row.grade as CoreGrade)) return null;
  return { id: row.id, name: row.name, category: row.category as TreasureCategory, grade: row.grade as CoreGrade, definition: row.definition, published: row.published ?? true, updated_at: row.updated_at };
}

function validate(draft: Draft): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) return "영웅 ID는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.";
  if (!draft.name.trim()) return "영웅 이름을 입력해 주세요.";
  if (!draft.definition.description.trim()) return "영웅 설명을 입력해 주세요.";
  if (!UNIT_TYPE_CATALOG[draft.definition.unitType]) return "병과를 선택해 주세요.";
  if (draft.definition.traits.length > 5 || draft.definition.traits.some((id) => !HERO_TRAIT_CATALOG[id])) return "특기는 최대 5개이며, 목록에 있는 특기만 선택할 수 있습니다.";
  if (draft.definition.skills.length > 2 || draft.definition.skills.some((id) => !HERO_SKILL_CATALOG[id])) return "스킬은 최대 2개이며, 목록에 있는 스킬만 선택할 수 있습니다.";
  return null;
}

function validateTreasure(draft: TreasureDraft): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) return "보물 ID는 영문 소문자·숫자·하이픈만 사용할 수 있습니다.";
  if (!draft.name.trim()) return "보물 이름을 입력해 주세요.";
  if (!draft.definition.description.trim()) return "보물 설명을 입력해 주세요.";
  if (draft.category === "weapon" && draft.definition.allowedUnitTypes.length === 0) return "무기는 최소 한 가지 장착 가능 병과를 선택해 주세요.";
  if (draft.category !== "weapon" && draft.definition.allowedUnitTypes.length > 0) return "방어구·탈것·기타 보물은 모든 영웅이 장착할 수 있습니다.";
  if (draft.definition.effectValue < 0) return "효과 수치는 0 이상으로 입력해 주세요.";
  return null;
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeSection, setActiveSection] = useState<"heroes" | "treasures" | "troops">("heroes");
  const [rows, setRows] = useState<AdminHeroRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [treasures, setTreasures] = useState<AdminTreasureRow[]>([]);
  const [selectedTreasureId, setSelectedTreasureId] = useState<string | null>(null);
  const [isTreasureEditorOpen, setTreasureEditorOpen] = useState(false);
  const [message, setMessage] = useState("관리자 권한을 확인하고 있습니다.");
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const selectedTreasure = useMemo(() => treasures.find((row) => row.id === selectedTreasureId) ?? null, [treasures, selectedTreasureId]);

  async function checkAdmin() {
    if (!supabase) { setMessage("Supabase 연결 정보가 없어 관리자 기능을 사용할 수 없습니다."); setChecking(false); return; }
    setChecking(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.is_anonymous) { setAuthorized(false); setChecking(false); setMessage("관리자 이메일로 로그인해 주세요."); return; }
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (error || profile?.role !== "admin") { setAuthorized(false); setChecking(false); setMessage("이 계정에는 관리자 권한이 없습니다."); return; }
    setAuthorized(true);
    const { data, error: heroesError } = await supabase.from("hero_catalog").select("id, name, availability, portrait_path, definition, updated_at").order("name");
    if (heroesError) setMessage(`영웅 데이터를 불러오지 못했습니다: ${heroesError.message}`);
    else {
      const published = (data ?? []).map(parseRow).filter((row): row is AdminHeroRow => row !== null);
      const publishedById = new Map(published.map((row) => [row.id, row]));
      const loaded = [
        ...BUNDLED_HERO_DEFINITIONS.map((definition) => publishedById.get(definition.id) ?? bundledRow(definition)),
        ...published.filter((row) => !BUNDLED_HERO_DEFINITIONS.some((definition) => definition.id === row.id)),
      ];
      setRows(loaded); setSelectedId((current) => current && loaded.some((row) => row.id === current) ? current : (loaded[0]?.id ?? null));
      const { data: treasureData, error: treasuresError } = await supabase.from("treasure_catalog").select("id, name, category, grade, definition, published, updated_at").order("name");
      const publishedTreasures = (treasureData ?? []).map(parseTreasureRow).filter((row): row is AdminTreasureRow => row !== null);
      const publishedTreasuresById = new Map(publishedTreasures.map((row) => [row.id, row]));
      const loadedTreasures = [
        ...BUNDLED_TREASURE_DEFINITIONS.map((definition) => publishedTreasuresById.get(definition.id) ?? bundledTreasureRow(definition)),
        ...publishedTreasures.filter((row) => !BUNDLED_TREASURE_DEFINITIONS.some((definition) => definition.id === row.id)),
      ];
      setTreasures(loadedTreasures);
      setSelectedTreasureId((current) => current && loadedTreasures.some((row) => row.id === current) ? current : (loadedTreasures[0]?.id ?? null));
      setMessage(treasuresError
        ? `${loaded.length}명의 영웅 데이터를 불러왔습니다. 보물 DB를 사용하려면 최신 schema.sql을 Supabase SQL Editor에서 실행해 주세요.`
        : `${loaded.length}명의 영웅과 ${loadedTreasures.length}개의 보물 데이터를 불러왔습니다.`);
    }
    setChecking(false);
  }

  useEffect(() => { void checkAdmin(); }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("로그인 중입니다.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage("이메일 또는 비밀번호가 올바르지 않습니다."); return; }
    setPassword("");
    await checkAdmin();
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthorized(false);
    setRows([]);
    setSelectedId(null);
    setTreasures([]);
    setSelectedTreasureId(null);
    setEditorOpen(false);
    setTreasureEditorOpen(false);
    setMessage("로그아웃했습니다. 관리자 계정으로 다시 로그인해 주세요.");
  }

  function openHero(id: string) {
    setSelectedId(id);
    setEditorOpen(true);
  }

  function createHero() {
    const hero = blankHero();
    setRows((current) => [...current, hero]);
    setSelectedId(hero.id);
    setEditorOpen(true);
    setMessage("새 영웅 초안을 만들었습니다. 저장 전까지 게임에는 반영되지 않습니다.");
  }

  function updateSelected(change: (current: Draft) => Draft) {
    if (!selected) return;
    setRows((current) => current.map((row) => row.id === selected.id ? change(row) : row));
  }

  function openTreasure(id: string) {
    setSelectedTreasureId(id);
    setTreasureEditorOpen(true);
  }

  function createTreasure() {
    const treasure = blankTreasure();
    setTreasures((current) => [...current, treasure]);
    setSelectedTreasureId(treasure.id);
    setTreasureEditorOpen(true);
    setMessage("새 보물 초안을 만들었습니다. 저장 전까지 게임에는 반영되지 않습니다.");
  }

  function updateSelectedTreasure(change: (current: TreasureDraft) => TreasureDraft) {
    if (!selectedTreasure) return;
    setTreasures((current) => current.map((row) => row.id === selectedTreasure.id ? change(row) : row));
  }

  async function saveSelected() {
    if (!supabase || !selected) return;
    const errorMessage = validate(selected);
    if (errorMessage) { setMessage(errorMessage); return; }
    setMessage("변경사항을 검증·반영 중입니다.");
    const payload = { ...selected, name: selected.name.trim(), definition: { ...selected.definition, id: selected.id, name: selected.name.trim() }, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("hero_catalog").upsert(payload, { onConflict: "id" });
    if (error) { setMessage(`반영하지 못했습니다: ${error.message}`); return; }
    setRows((current) => current.map((row) => row.id === selected.id ? payload : row));
    setMessage(`“${payload.name}” 변경사항을 게임용 영웅 데이터에 반영했습니다.`);
  }

  async function saveSelectedTreasure() {
    if (!supabase || !selectedTreasure) return;
    const errorMessage = validateTreasure(selectedTreasure);
    if (errorMessage) { setMessage(errorMessage); return; }
    setMessage("변경사항을 검증·반영 중입니다.");
    const payload = {
      ...selectedTreasure,
      name: selectedTreasure.name.trim(),
      definition: {
        ...selectedTreasure.definition,
        id: selectedTreasure.id,
        name: selectedTreasure.name.trim(),
        category: selectedTreasure.category,
        grade: selectedTreasure.grade,
      },
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("treasure_catalog").upsert(payload, { onConflict: "id" });
    if (error) { setMessage(`반영하지 못했습니다: ${error.message}`); return; }
    setTreasures((current) => current.map((row) => row.id === selectedTreasure.id ? payload : row));
    setMessage(`“${payload.name}” 변경사항을 게임용 보물 데이터에 반영했습니다.`);
  }

  if (checking) return <main className="admin-gate"><p>{message}</p></main>;
  if (!authorized) return <main className="admin-gate"><section><p className="admin-kicker">HERO STORY · ADMIN</p><h1>관리자 로그인</h1><p>{message}</p><form onSubmit={signIn}><label>이메일<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label><label>비밀번호<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label><button>관리자 로그인</button></form><small>관리자 권한은 `ljhs1004@gmail.com` 계정에만 부여됩니다.</small></section></main>;

  return <main className="admin-shell">
    <header className="admin-header"><div><p className="admin-kicker">HERO STORY · ADMIN</p><h1>관리자 화면</h1><span>관리 항목을 선택해 데이터를 확인·수정합니다.</span></div><button type="button" className="admin-logout" onClick={signOut}>로그아웃</button></header>
    <div className="admin-layout">
      <aside className="admin-nav" aria-label="관리자 메뉴"><p>관리 메뉴</p><button type="button" className={activeSection === "heroes" ? "is-active" : ""} onClick={() => setActiveSection("heroes")}>영웅정보</button><button type="button" className={activeSection === "troops" ? "is-active" : ""} onClick={() => setActiveSection("troops")}>병과정보</button><button type="button" className={activeSection === "treasures" ? "is-active" : ""} onClick={() => setActiveSection("treasures")}>보물정보</button></aside>
      {activeSection === "heroes" ? <section className="admin-content">
        <div className="admin-content__heading"><div><p className="admin-kicker">영웅정보</p><h2>영웅 목록 <b>{rows.length}</b></h2><span>영웅을 클릭하면 수정 창이 열립니다.</span></div><button type="button" onClick={createHero}>+ 영웅 추가</button></div>
        <p className="admin-message">{message}</p>
        <div className="admin-hero-list">{rows.map((row) => { const portraitUrl = row.portrait_path ?? HERO_PORTRAIT[row.id]; return <button key={row.id} type="button" onClick={() => openHero(row.id)}><span className="admin-hero-list__portrait">{portraitUrl ? <img src={portraitUrl} alt="" /> : "?"}</span><span><strong>{row.name}</strong><small>{row.availability === "starter" ? "첫 영웅" : row.availability === "recruitable" ? "영입 가능" : "비공개"} · {UNIT_TYPE_CATALOG[row.definition.unitType]?.label ?? row.definition.unitType}</small></span><i>수정</i></button>; })}</div>
      </section> : activeSection === "troops" ? <TroopPreview /> : <section className="admin-content">
        <div className="admin-content__heading"><div><p className="admin-kicker">보물정보</p><h2>보물 목록 <b>{treasures.length}</b></h2><span>보물을 클릭하면 역사 설명과 효과를 수정할 수 있습니다.</span></div><button type="button" onClick={createTreasure}>+ 보물 추가</button></div>
        <p className="admin-message">{message}</p>
        <div className="admin-treasure-list">{treasures.map((row) => <button key={row.id} type="button" onClick={() => openTreasure(row.id)}><span className="admin-treasure-list__art"><img src={treasureArt(row.definition)} alt="" /><img src={TREASURE_GRADE_BADGE[row.grade]} alt={`${row.grade}등급`} /></span><span><strong>{row.name}</strong><small>{TREASURE_CATEGORY_LABEL[row.category]} · {treasureEffectText(row.definition)}</small><em>{row.published ? "공개" : "비공개"}</em></span><i>수정</i></button>)}</div>
      </section>}
    </div>
    {isEditorOpen && selected ? <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`${selected.name} 수정`}><div className="admin-modal__backdrop" onClick={() => setEditorOpen(false)} /><div className="admin-modal__panel"><button type="button" className="admin-modal__close" aria-label="수정 창 닫기" onClick={() => setEditorOpen(false)}>×</button><HeroEditor draft={selected} onChange={updateSelected} onSave={saveSelected} /></div></div> : null}
    {isTreasureEditorOpen && selectedTreasure ? <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`${selectedTreasure.name} 수정`}><div className="admin-modal__backdrop" onClick={() => setTreasureEditorOpen(false)} /><div className="admin-modal__panel"><button type="button" className="admin-modal__close" aria-label="수정 창 닫기" onClick={() => setTreasureEditorOpen(false)}>×</button><TreasureEditor draft={selectedTreasure} onChange={updateSelectedTreasure} onSave={saveSelectedTreasure} /></div></div> : null}
  </main>;
}

const TROOP_SPRITES: Record<TroopAction, { rows: number; ratio: number; fps: number }> = {
  ready: { rows: 6, ratio: 0.889, fps: 5 },
  move: { rows: 8, ratio: 0.889, fps: 12 },
  attack: { rows: 10, ratio: 0.889, fps: 12 },
  hurt: { rows: 6, ratio: 0.889, fps: 6 },
  death: { rows: 6, ratio: 0.889, fps: 6 },
};

function TroopPreview() {
  const [direction, setDirection] = useState<TroopDirection>("right-down");
  const [action, setAction] = useState<TroopAction>("ready");
  const [frame, setFrame] = useState(0);
  const [isPlaying, setPlaying] = useState(true);
  const [offsets, setOffsets] = useState<TroopFrameOffsets>({});
  const [saved, setSaved] = useState(false);
  const currentDirection = TROOP_DIRECTIONS.find((entry) => entry.id === direction) ?? TROOP_DIRECTIONS[5];
  const sprite = TROOP_SPRITES[action];
  const frameKey = `${direction}:${action}:${frame}`;
  const offset = offsets[frameKey] ?? { x: 0, y: 0 };
  useEffect(() => {
    try { setOffsets(JSON.parse(window.localStorage.getItem(TROOP_FRAME_OFFSETS_KEY) ?? "{}") as TroopFrameOffsets); } catch { setOffsets({}); }
  }, []);
  useEffect(() => {
    setFrame(0);
    setSaved(false);
  }, [action, direction]);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setFrame((current) => action === "death" ? Math.min(current + 1, sprite.rows - 1) : (current + 1) % sprite.rows), Math.round(1000 / sprite.fps));
    return () => window.clearInterval(timer);
  }, [action, isPlaying, sprite.fps, sprite.rows]);
  const nudge = (x: number, y: number) => { setPlaying(false); setSaved(false); setOffsets((current) => ({ ...current, [frameKey]: { x: (current[frameKey]?.x ?? 0) + x, y: (current[frameKey]?.y ?? 0) + y } })); };
  const resetFrame = () => { setPlaying(false); setSaved(false); setOffsets((current) => ({ ...current, [frameKey]: { x: 0, y: 0 } })); };
  const saveOffsets = () => { window.localStorage.setItem(TROOP_FRAME_OFFSETS_KEY, JSON.stringify(offsets)); setSaved(true); };
  const previewStyle = {
    "--troop-x": String(currentDirection.x),
    "--troop-y": String(currentDirection.y),
    "--sprite-y": `${(frame / Math.max(sprite.rows - 1, 1)) * 100}%`,
    "--sprite-image": direction === "right" ? `url(/art/units/infantry-right-safe/${action}.png)` : `url(/art/units/infantry-high/${action}-${direction}.png)`,
    "--sprite-rows": String(sprite.rows),
    "--sprite-size-y": `${sprite.rows * 100}%`,
    "--sprite-ratio": String(sprite.ratio),
  } as CSSProperties;
  return <section className="admin-content admin-troop-preview"><style>{`.admin-troop-preview{min-height:620px}.troop-preview__layout{display:grid;grid-template-columns:minmax(460px,1fr) 270px;gap:22px;padding-top:22px}.troop-preview__stage{position:relative;min-height:500px;overflow:hidden;border:1px solid #8f6c36;border-radius:8px;background:radial-gradient(ellipse at 50% 55%,#50613b 0 15%,#30422f 16% 30%,#17251f 55%,#0b120f 100%);box-shadow:inset 0 0 50px #000a}.troop-preview__map-hex{position:absolute;width:176px;aspect-ratio:1/.866;border:2px solid #b7994b99;background:linear-gradient(135deg,#78945d9b,#3d583c9b);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);filter:drop-shadow(0 1px 0 #111)}.troop-preview__map-hex--lu{left:calc(50% - 176px);top:34px}.troop-preview__map-hex--ru{left:50%;top:34px}.troop-preview__map-hex--l{left:calc(50% - 264px);top:155px}.troop-preview__map-hex--c{left:calc(50% - 88px);top:155px;background:linear-gradient(135deg,#9a9b51bb,#52693cbf);border-color:#f2d474}.troop-preview__map-hex--r{left:calc(50% + 88px);top:155px}.troop-preview__map-hex--ld{left:calc(50% - 176px);top:276px}.troop-preview__map-hex--rd{left:50%;top:276px}.troop-preview__anchor{position:absolute;z-index:2;left:50%;top:273px}.troop-preview__unit{position:absolute;left:0;bottom:0;width:min(230px,48vw);aspect-ratio:var(--sprite-ratio);translate:-50% 0;background-image:var(--sprite-image);background-repeat:no-repeat;background-size:100% var(--sprite-size-y);background-position:center var(--sprite-y);filter:drop-shadow(0 10px 8px #000b);transform-origin:50% 100%}.troop-preview__unit.is-move{animation:troop-move .7s ease-in-out infinite}.troop-preview__unit.is-attack{animation:troop-attack .85s ease-in-out infinite}.troop-preview__unit.is-hurt{animation:troop-hurt 1s ease-in-out infinite}.troop-preview__unit.is-death{animation:troop-death 1.6s ease-in forwards}.troop-preview__unit.is-rigged.is-ready{animation:troop-rig-ready .85s ease-in-out infinite}.troop-preview__unit.is-rigged.is-move{animation:troop-rig-move .46s ease-in-out infinite}.troop-preview__unit.is-rigged.is-attack{animation:troop-rig-attack .72s ease-in-out infinite}.troop-preview__unit.is-rigged.is-hurt{animation:troop-rig-hurt .9s ease-in-out infinite}.troop-preview__unit.is-rigged.is-death{animation:troop-rig-death 1.35s ease-in forwards}.troop-preview__caption{position:absolute;z-index:3;bottom:20px;left:50%;translate:-50% 0;border:1px solid #bd9650;border-radius:4px;background:#140d08d9;color:#ffe5a2;padding:7px 13px;font-size:13px;font-weight:900}.troop-preview__controls{display:grid;align-content:start;gap:18px;padding:18px;border:1px solid #846331;border-radius:7px;background:#160d08c9}.troop-preview__controls section{border-bottom:1px solid #875e2b;padding-bottom:16px}.troop-preview__controls h3{margin:0 0 10px;color:#f2cb75;font-size:14px}.troop-preview__buttons{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.troop-preview__buttons button{border:1px solid #76522a;border-radius:4px;background:#28150a;color:#d9b97a;padding:8px 5px;font-size:12px}.troop-preview__buttons button.is-active{border-color:#f0c65e;background:linear-gradient(#8b5b25,#42210e);color:#fff0bc}.troop-preview__controls p{margin:0;color:#b99d70;font-size:12px;line-height:1.6}@keyframes troop-move{0%,100%{translate:-50% 0}50%{translate:calc(-50% + var(--troop-x)*10px) calc(var(--troop-y)*-8px)}}@keyframes troop-attack{0%,100%{translate:-50% 0}55%{translate:calc(-50% + var(--troop-x)*18px) calc(var(--troop-y)*-12px)}}@keyframes troop-hurt{0%,100%{translate:-50% 0;filter:drop-shadow(0 10px 8px #000b)}50%{translate:calc(-50% - var(--troop-x)*4px) 5px;filter:brightness(.76) drop-shadow(0 10px 8px #000b)}}@keyframes troop-death{0%{translate:-50% 0;opacity:1}78%{translate:calc(-50% + var(--troop-x)*10px) 18px;opacity:1}100%{translate:calc(-50% + var(--troop-x)*10px) 18px;opacity:0}}@keyframes troop-rig-ready{0%,100%{translate:-50% 0;rotate:0deg}50%{translate:-50% -4px;rotate:-.45deg}}@keyframes troop-rig-move{0%,100%{translate:-50% 0;rotate:0deg}25%{translate:calc(-50% + 7px) -5px;rotate:-1deg}50%{translate:calc(-50% + 15px) 0;rotate:0deg}75%{translate:calc(-50% + 8px) -5px;rotate:1deg}}@keyframes troop-rig-attack{0%,100%{translate:-50% 0;rotate:0deg}28%{translate:calc(-50% - 5px) 2px;rotate:-5deg}60%{translate:calc(-50% + 25px) -3px;rotate:8deg}76%{translate:calc(-50% + 11px) 0;rotate:2deg}}@keyframes troop-rig-hurt{0%,100%{translate:-50% 0;rotate:0deg;filter:drop-shadow(0 10px 8px #000b)}45%{translate:calc(-50% - 5px) 9px;rotate:-7deg;filter:brightness(.7) drop-shadow(0 10px 8px #000b)}70%{translate:calc(-50% - 2px) 5px;rotate:-3deg}}@keyframes troop-rig-death{0%{translate:-50% 0;rotate:0deg;opacity:1}55%{translate:calc(-50% + 8px) 18px;rotate:54deg;opacity:1}82%{translate:calc(-50% + 18px) 33px;rotate:75deg;opacity:1}100%{translate:calc(-50% + 18px) 33px;rotate:75deg;opacity:0}}@media(max-width:800px){.troop-preview__layout{grid-template-columns:1fr}.troop-preview__controls{grid-row:1}.troop-preview__stage{min-height:440px}.troop-preview__map-hex{width:136px}.troop-preview__map-hex--lu{left:calc(50% - 136px);top:30px}.troop-preview__map-hex--ru{left:50%;top:30px}.troop-preview__map-hex--l{left:calc(50% - 204px);top:124px}.troop-preview__map-hex--c{left:calc(50% - 68px);top:124px}.troop-preview__map-hex--r{left:calc(50% + 68px);top:124px}.troop-preview__map-hex--ld{left:calc(50% - 136px);top:218px}.troop-preview__anchor{top:215px}.troop-preview__unit{width:min(210px,56vw)}}`}</style>
    <div className="admin-content__heading"><div><p className="admin-kicker">병과정보 · 프레임 애니메이션</p><h2>보병 <b>동작 테스트</b></h2><span>실제 맵과 같은 꼭짓점 위쪽 HEX 배치 위에서, 생성된 스프라이트 프레임을 순서대로 재생합니다.</span></div></div>
    <div className="troop-preview__layout">
      <div className="troop-preview__stage" aria-label={`${currentDirection.label} 방향 ${TROOP_ACTION_LABEL[action]} 보병 프레임 시연`}>
        <i className="troop-preview__map-hex troop-preview__map-hex--lu" /><i className="troop-preview__map-hex troop-preview__map-hex--ru" /><i className="troop-preview__map-hex troop-preview__map-hex--l" /><i className="troop-preview__map-hex troop-preview__map-hex--c" /><i className="troop-preview__map-hex troop-preview__map-hex--r" /><i className="troop-preview__map-hex troop-preview__map-hex--ld" /><i className="troop-preview__map-hex troop-preview__map-hex--rd" />
        <div className="troop-preview__anchor"><div className="troop-preview__frame-anchor" style={{ position: "relative", translate: `${offset.x}px ${offset.y}px` }}><div className={`troop-preview__unit is-${action}`} style={previewStyle} aria-label={`${frame + 1}번째 프레임`} /></div></div>
        <span className="troop-preview__caption">{currentDirection.label} · {TROOP_ACTION_LABEL[action]} · {frame + 1}/{sprite.rows} 프레임</span>
      </div>
      <div className="troop-preview__controls">
        <section><h3>방향</h3><div className="troop-preview__buttons">{TROOP_DIRECTIONS.map((entry) => <button key={entry.id} type="button" className={direction === entry.id ? "is-active" : ""} onClick={() => setDirection(entry.id)}>{entry.label}</button>)}</div></section>
        <section><h3>상태</h3><div className="troop-preview__buttons troop-preview__buttons--actions">{(Object.keys(TROOP_ACTION_LABEL) as TroopAction[]).map((id) => <button key={id} type="button" className={action === id ? "is-active" : ""} onClick={() => setAction(id)}>{TROOP_ACTION_LABEL[id]}</button>)}</div></section>
        <section className="troop-preview__editor"><h3>프레임 정렬</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{Array.from({ length: sprite.rows }, (_, index) => <button key={index} type="button" className={frame === index ? "is-active" : ""} onClick={() => { setPlaying(false); setFrame(index); }}>{index + 1}</button>)}</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><button type="button" onClick={() => nudge(0, -1)}>▲</button><button type="button" onClick={() => nudge(-1, 0)}>◀</button><button type="button" onClick={() => nudge(1, 0)}>▶</button><button type="button" onClick={() => nudge(0, 1)}>▼</button></div><p>x {offset.x}px · y {offset.y}px</p><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><button type="button" onClick={() => setPlaying((current) => !current)}>{isPlaying ? "정지" : "재생"}</button><button type="button" onClick={resetFrame}>이 프레임 초기화</button><button type="button" onClick={saveOffsets}>저장</button></div>{saved ? <small>이 브라우저에 정렬값을 저장했습니다.</small> : null}</section>
        <p>준비·피해·사망은 6프레임, 이동은 8프레임, 공격은 10프레임입니다. 모든 프레임은 투명 배경과 같은 발 위치를 가진 별도 이미지 자산입니다.</p>
      </div>
    </div>
  </section>;
}

function HeroEditor({ draft, onChange, onSave }: { draft: Draft; onChange: (change: (current: Draft) => Draft) => void; onSave: () => void }) {
  const definition = draft.definition;
  const setDefinition = (change: (value: HeroDefinition) => HeroDefinition) => onChange((current) => ({ ...current, definition: change(current.definition) }));
  const toggle = <T extends string>(value: T, values: T[], limit: number) => values.includes(value) ? values.filter((entry) => entry !== value) : values.length < limit ? [...values, value] : values;
  return <section className="admin-editor">
    <div className="admin-editor__heading"><div><p>선택 영웅</p><h2>{draft.name}</h2></div><button type="button" onClick={onSave}>검증 후 반영</button></div>
    <div className="admin-grid">
      <label>영웅 ID<input value={draft.id} onChange={(event) => onChange((current) => ({ ...current, id: event.target.value, definition: { ...current.definition, id: event.target.value } }))} /></label>
      <label>이름<input value={draft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value, definition: { ...current.definition, name: event.target.value } }))} /></label>
      <label>공개 상태<select value={draft.availability} onChange={(event) => onChange((current) => ({ ...current, availability: event.target.value as Availability }))}><option value="starter">첫 영웅</option><option value="recruitable">영입 가능</option><option value="hidden">비공개</option></select></label>
      <label>병과<select value={definition.unitType} onChange={(event) => setDefinition((current) => ({ ...current, unitType: event.target.value }))}>{Object.values(UNIT_TYPE_CATALOG).map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>
      <label className="admin-span-2">초상 이미지 주소<input value={draft.portrait_path ?? ""} placeholder="/art/heroes/example.png 또는 https://..." onChange={(event) => onChange((current) => ({ ...current, portrait_path: event.target.value || null }))} /></label>
      <label className="admin-span-2">영웅 설명<textarea value={definition.description} onChange={(event) => setDefinition((current) => ({ ...current, description: event.target.value }))} /></label>
    </div>
    <fieldset><legend>능력치 등급</legend><div className="admin-stat-grid">{(["leadership", "force", "intelligence", "vitality", "charisma"] as const).map((key) => <label key={key}>{({ leadership: "통솔", force: "무력", intelligence: "지력", vitality: "체력", charisma: "매력" } as const)[key]}<select value={definition.attributes[key]} onChange={(event) => setDefinition((current) => ({ ...current, attributes: { ...current.attributes, [key]: event.target.value as CoreGrade } }))}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label>)}</div></fieldset>
    <fieldset><legend>특기 · 최대 5개</legend><div className="admin-check-grid">{Object.entries(HERO_TRAIT_CATALOG).map(([id, trait]) => <label key={id}><input type="checkbox" checked={definition.traits.includes(id as HeroTraitId)} onChange={() => setDefinition((current) => ({ ...current, traits: toggle(id as HeroTraitId, current.traits, 5) }))} />{trait.name}<small>{trait.effect}</small></label>)}</div></fieldset>
    <fieldset><legend>스킬 · 최대 2개</legend><div className="admin-check-grid">{Object.entries(HERO_SKILL_CATALOG).map(([id, skill]) => <label key={id}><input type="checkbox" checked={definition.skills.includes(id as HeroSkillId)} onChange={() => setDefinition((current) => ({ ...current, skills: toggle(id as HeroSkillId, current.skills, 2) }))} />{skill.name}<small>{skill.summary}</small></label>)}</div></fieldset>
    <fieldset><legend>도시 배속 특기</legend><div className="admin-stat-grid">{DOMESTIC_FIELDS.map(({ key, label }) => <label key={key}>{label}<select value={definition.domesticSpecialties[key]} onChange={(event) => setDefinition((current) => ({ ...current, domesticSpecialties: { ...current.domesticSpecialties, [key]: event.target.value as SpecialtyGrade } }))}>{SPECIALTY_GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label>)}</div></fieldset>
  </section>;
}

function TreasureEditor({ draft, onChange, onSave }: { draft: TreasureDraft; onChange: (change: (current: TreasureDraft) => TreasureDraft) => void; onSave: () => void }) {
  const definition = draft.definition;
  const setDefinition = (change: (value: TreasureDefinition) => TreasureDefinition) => onChange((current) => ({ ...current, definition: change(current.definition) }));
  const toggle = <T extends string>(value: T, values: T[]) => values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
  const updateCategory = (category: TreasureCategory) => onChange((current) => {
    const effectKind: TreasureEffectKind = category === "weapon" ? "attack" : category === "armor" ? "defense" : category === "mount" ? "movement" : "health";
    return { ...current, category, definition: { ...current.definition, category, effectKind, allowedUnitTypes: category === "weapon" ? current.definition.allowedUnitTypes : [], terrainBonuses: category === "mount" ? current.definition.terrainBonuses : [] } };
  });
  return <section className="admin-editor">
    <div className="admin-editor__heading"><div className="admin-treasure-editor__title"><span className="admin-treasure-list__art"><img src={treasureArt(definition)} alt="" /><img src={TREASURE_GRADE_BADGE[draft.grade]} alt={`${draft.grade}등급`} /></span><div><p>선택 보물</p><h2>{draft.name}</h2></div></div><button type="button" onClick={onSave}>검증 후 반영</button></div>
    <div className="admin-grid">
      <label>보물 ID<input value={draft.id} onChange={(event) => onChange((current) => ({ ...current, id: event.target.value, definition: { ...current.definition, id: event.target.value } }))} /></label>
      <label>이름<input value={draft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value, definition: { ...current.definition, name: event.target.value } }))} /></label>
      <label>종류<select value={draft.category} onChange={(event) => updateCategory(event.target.value as TreasureCategory)}>{TREASURE_CATEGORIES.map((category) => <option key={category} value={category}>{TREASURE_CATEGORY_LABEL[category]}</option>)}</select></label>
      <label>등급<select value={draft.grade} onChange={(event) => onChange((current) => ({ ...current, grade: event.target.value as CoreGrade, definition: { ...current.definition, grade: event.target.value as CoreGrade } }))}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
      <label>효과<select value={definition.effectKind} disabled>{TREASURE_EFFECTS.map((effect) => <option key={effect} value={effect}>{TREASURE_EFFECT_LABEL[effect]}</option>)}</select></label>
      <label>효과 수치<input type="number" min="0" value={definition.effectValue} onChange={(event) => setDefinition((current) => ({ ...current, effectValue: Number(event.target.value) || 0 }))} /></label>
      <label className="admin-span-2 admin-toggle-row"><input type="checkbox" checked={draft.published} onChange={(event) => onChange((current) => ({ ...current, published: event.target.checked }))} />게임에 공개</label>
      <label className="admin-span-2">보물 설명<textarea value={definition.description} onChange={(event) => setDefinition((current) => ({ ...current, description: event.target.value }))} /></label>
    </div>
    {draft.category === "weapon" ? <fieldset><legend>장착 가능 병과</legend><div className="admin-check-grid">{TREASURE_UNIT_TYPES.map((unitType) => <label key={unitType}><input type="checkbox" checked={definition.allowedUnitTypes.includes(unitType)} onChange={() => setDefinition((current) => ({ ...current, allowedUnitTypes: toggle(unitType, current.allowedUnitTypes) }))} />{TREASURE_UNIT_TYPE_LABEL[unitType]}</label>)}</div></fieldset> : <fieldset><legend>장착 가능 병과</legend><p className="admin-field-note">방어구·탈것·기타 보물은 병과 구분 없이 모든 영웅이 장착할 수 있습니다.</p></fieldset>}
    {draft.category === "mount" ? <fieldset><legend>지형 이동 향상</legend><div className="admin-check-grid">{TREASURE_TERRAINS.map((terrain) => <label key={terrain}><input type="checkbox" checked={definition.terrainBonuses.includes(terrain)} onChange={() => setDefinition((current) => ({ ...current, terrainBonuses: toggle(terrain, current.terrainBonuses) }))} />{TREASURE_TERRAIN_LABEL[terrain]}</label>)}</div></fieldset> : null}
  </section>;
}
