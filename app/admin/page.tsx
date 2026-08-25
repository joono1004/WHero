"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../game/supabaseClient.ts";
import type { CoreGrade, SpecialtyGrade } from "../../lib/game/grade.ts";
import type { DomesticSpecialtyKind, HeroDefinition } from "../../lib/game/hero-definition.ts";
import type { HeroSkillId } from "../../lib/game/hero-skill.ts";
import { HERO_SKILL_CATALOG } from "../../lib/game/hero-skill.ts";
import type { HeroTraitId } from "../../lib/game/hero-trait.ts";
import { HERO_TRAIT_CATALOG } from "../../lib/game/hero-trait.ts";
import { UNIT_TYPE_CATALOG } from "../../lib/game/unit-production.ts";
import "./admin.css";

type Availability = "starter" | "recruitable" | "hidden";
type AdminHeroRow = { id: string; name: string; availability: Availability; portrait_path: string | null; definition: HeroDefinition; updated_at?: string };
type Draft = AdminHeroRow;

const GRADES: CoreGrade[] = ["D", "C", "B", "A", "S", "SS"];
const SPECIALTY_GRADES: SpecialtyGrade[] = ["없음", ...GRADES];
const DOMESTIC_FIELDS: { key: DomesticSpecialtyKind; label: string }[] = [
  { key: "troops", label: "병사" }, { key: "gold", label: "금" }, { key: "food", label: "식량" },
  { key: "iron", label: "철" }, { key: "recovery", label: "회복" }, { key: "defense", label: "방어" },
];
const CSV_HEADERS = ["id", "name", "availability", "portrait_path", "description", "unit_type", "leadership", "force", "intelligence", "vitality", "charisma", "traits", "skills", "troops", "gold", "food", "iron", "recovery", "defense"] as const;

function csvEscape(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function splitValues(value: string) { return value.split("|").map((entry) => entry.trim()).filter(Boolean); }
function parseCsv(text: string): string[][] {
  const output: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === ",") { row.push(value); value = ""; }
    else if (!quoted && (character === "\n" || character === "\r")) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(value); if (row.some(Boolean)) output.push(row); row = []; value = ""; }
    else value += character;
  }
  row.push(value); if (row.some(Boolean)) output.push(row);
  return output;
}

function rowToCsv(row: AdminHeroRow) {
  const definition = row.definition;
  const values = [row.id, row.name, row.availability, row.portrait_path ?? "", definition.description, definition.unitType, definition.attributes.leadership, definition.attributes.force, definition.attributes.intelligence, definition.attributes.vitality, definition.attributes.charisma, definition.traits.join("|"), definition.skills.join("|"), definition.domesticSpecialties.troops, definition.domesticSpecialties.gold, definition.domesticSpecialties.food, definition.domesticSpecialties.iron, definition.domesticSpecialties.recovery, definition.domesticSpecialties.defense];
  return values.map((value) => csvEscape(String(value))).join(",");
}

function csvToHero(values: Record<string, string>): Draft {
  const grade = (value: string) => GRADES.includes(value as CoreGrade) ? value as CoreGrade : "D";
  const specialty = (value: string) => SPECIALTY_GRADES.includes(value as SpecialtyGrade) ? value as SpecialtyGrade : "없음";
  const id = values.id.trim(); const name = values.name.trim();
  return { id, name, availability: values.availability as Availability, portrait_path: values.portrait_path.trim() || null, definition: { id, name, description: values.description.trim(), unitType: values.unit_type, attributes: { leadership: grade(values.leadership), force: grade(values.force), intelligence: grade(values.intelligence), vitality: grade(values.vitality), charisma: grade(values.charisma) }, domesticSpecialties: { troops: specialty(values.troops), gold: specialty(values.gold), food: specialty(values.food), iron: specialty(values.iron), recovery: specialty(values.recovery), defense: specialty(values.defense) }, traits: splitValues(values.traits) as HeroTraitId[], skills: splitValues(values.skills) as HeroSkillId[], evolution: null } };
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

function parseRow(value: unknown): AdminHeroRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<AdminHeroRow>;
  if (!row.id || !row.name || !row.definition || !["starter", "recruitable", "hidden"].includes(String(row.availability))) return null;
  return { id: row.id, name: row.name, availability: row.availability as Availability, portrait_path: row.portrait_path ?? null, definition: row.definition, updated_at: row.updated_at };
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

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<AdminHeroRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("관리자 권한을 확인하고 있습니다.");
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

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
      const loaded = (data ?? []).map(parseRow).filter((row): row is AdminHeroRow => row !== null);
      setRows(loaded); setSelectedId((current) => current && loaded.some((row) => row.id === current) ? current : (loaded[0]?.id ?? null));
      setMessage(`${loaded.length}명의 영웅 데이터를 불러왔습니다.`);
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
    setEditorOpen(false);
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

  function exportCsv() {
    const csv = `\uFEFF${CSV_HEADERS.join(",")}\n${rows.map(rowToCsv).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "hero-story-heroes.csv"; anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`${rows.length}명의 영웅 데이터를 CSV 파일로 내려받았습니다.`);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setMessage("CSV 파일만 업로드할 수 있습니다."); return; }
    try {
      const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      const headers = parsed[0] ?? [];
      if (CSV_HEADERS.some((header, index) => headers[index] !== header)) { setMessage("CSV 열 구성이 맞지 않습니다. 먼저 CSV 내보내기로 만든 파일을 사용해 주세요."); return; }
      const imported = parsed.slice(1).map((cells) => csvToHero(Object.fromEntries(CSV_HEADERS.map((header, index) => [header, cells[index] ?? ""]))));
      if (!imported.length) { setMessage("업로드할 영웅 데이터가 없습니다."); return; }
      if (new Set(imported.map((hero) => hero.id)).size !== imported.length) { setMessage("CSV 안에 같은 영웅 ID가 중복되어 있습니다."); return; }
      const invalid = imported.map(validate).find((message): message is string => Boolean(message));
      if (invalid) { setMessage(`CSV 검증 실패: ${invalid}`); return; }
      setMessage(`${imported.length}명의 영웅 데이터를 반영 중입니다.`);
      const payload = imported.map((hero) => ({ ...hero, definition: { ...hero.definition, id: hero.id, name: hero.name }, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from("hero_catalog").upsert(payload, { onConflict: "id" });
      if (error) { setMessage(`CSV를 반영하지 못했습니다: ${error.message}`); return; }
      await checkAdmin();
      setMessage(`${payload.length}명의 영웅 데이터를 CSV에서 반영했습니다. 같은 ID는 수정되고, 새 ID는 추가되었습니다.`);
    } catch {
      setMessage("CSV 파일을 읽지 못했습니다. 내보낸 파일 형식을 유지해 다시 업로드해 주세요.");
    }
  }

  function updateSelected(change: (current: Draft) => Draft) {
    if (!selected) return;
    setRows((current) => current.map((row) => row.id === selected.id ? change(row) : row));
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

  if (checking) return <main className="admin-gate"><p>{message}</p></main>;
  if (!authorized) return <main className="admin-gate"><section><p className="admin-kicker">HERO STORY · ADMIN</p><h1>관리자 로그인</h1><p>{message}</p><form onSubmit={signIn}><label>이메일<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label><label>비밀번호<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label><button>관리자 로그인</button></form><small>관리자 권한은 `ljhs1004@gmail.com` 계정에만 부여됩니다.</small></section></main>;

  return <main className="admin-shell">
    <header className="admin-header"><div><p className="admin-kicker">HERO STORY · ADMIN</p><h1>관리자 화면</h1><span>관리 항목을 선택해 데이터를 확인·수정합니다.</span></div><button type="button" className="admin-logout" onClick={signOut}>로그아웃</button></header>
    <div className="admin-layout">
      <aside className="admin-nav" aria-label="관리자 메뉴"><p>관리 메뉴</p><button type="button" className="is-active">영웅정보</button></aside>
      <section className="admin-content">
        <div className="admin-content__heading"><div><p className="admin-kicker">영웅정보</p><h2>영웅 목록 <b>{rows.length}</b></h2><span>영웅을 클릭하면 수정 창이 열립니다.</span></div><div className="admin-content__actions"><input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importCsv} hidden /><button type="button" className="admin-secondary" onClick={exportCsv}>CSV 내보내기</button><button type="button" className="admin-secondary" onClick={() => fileInputRef.current?.click()}>CSV 업로드</button><button type="button" onClick={createHero}>+ 영웅 추가</button></div></div>
        <p className="admin-message">{message}</p>
        <div className="admin-hero-list">{rows.map((row) => <button key={row.id} type="button" onClick={() => openHero(row.id)}><span className="admin-hero-list__portrait">{row.portrait_path ? <img src={row.portrait_path} alt="" /> : "?"}</span><span><strong>{row.name}</strong><small>{row.availability === "starter" ? "첫 영웅" : row.availability === "recruitable" ? "영입 가능" : "비공개"} · {UNIT_TYPE_CATALOG[row.definition.unitType]?.label ?? row.definition.unitType}</small></span><i>수정</i></button>)}</div>
      </section>
    </div>
    {isEditorOpen && selected ? <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`${selected.name} 수정`}><div className="admin-modal__backdrop" onClick={() => setEditorOpen(false)} /><div className="admin-modal__panel"><button type="button" className="admin-modal__close" aria-label="수정 창 닫기" onClick={() => setEditorOpen(false)}>×</button><HeroEditor draft={selected} onChange={updateSelected} onSave={saveSelected} /></div></div> : null}
  </main>;
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
