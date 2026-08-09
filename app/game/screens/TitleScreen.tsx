import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

const LEGEND_HEROES = [
  { name: "제갈량", epithet: "지략", accent: "jade" },
  { name: "관우", epithet: "의", accent: "crimson" },
  { name: "장비", epithet: "맹장", accent: "bronze" },
  { name: "유비", epithet: "군주", accent: "gold" },
  { name: "조조", epithet: "패왕", accent: "steel" },
  { name: "이순신", epithet: "해전", accent: "navy" },
  { name: "세종대왕", epithet: "성군", accent: "jade" },
  { name: "징기스칸", epithet: "정복", accent: "bronze" },
  { name: "나폴레옹", epithet: "전략", accent: "gold" },
  { name: "잔다르크", epithet: "성녀", accent: "ivory" },
  { name: "알렉산더 대왕", epithet: "원정", accent: "steel" },
] as const;

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const leftHeroes = LEGEND_HEROES.slice(0, 6);
  const rightHeroes = LEGEND_HEROES.slice(6);

  return (
    <ScreenShell>
      <section className="title-screen">
        <div className="title-screen__backdrop" aria-hidden="true" />
        <div className="title-screen__constellation" aria-hidden="true" />

        <aside className="title-screen__hero-column title-screen__hero-column--left" aria-label="전설 영웅 좌측 장식">
          {leftHeroes.map((hero, index) => (
            <HeroMedallion key={hero.name} hero={hero} index={index} />
          ))}
        </aside>

        <div className="title-screen__center">
          <div className="title-screen__logo-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="title-screen__logo-frame">
            <p className="title-screen__eyebrow">LEGENDS OF CONQUEST</p>
            <div className="title-screen__logo-stack">
              <p className="title-screen__logo-korean">영웅스토리</p>
              <p className="title-screen__logo-english">HERO STORY</p>
            </div>
            <p className="title-screen__tagline">
              시대를 대표한 영웅을 이끌고, 절차적으로 생성되는 세계를 정복하세요.
            </p>
          </div>
          <Button className="title-screen__start-button" onClick={onStart}>
            시작하기
          </Button>
        </div>

        <aside className="title-screen__hero-column title-screen__hero-column--right" aria-label="전설 영웅 우측 장식">
          {rightHeroes.map((hero, index) => (
            <HeroMedallion key={hero.name} hero={hero} index={index + leftHeroes.length} />
          ))}
        </aside>
      </section>
    </ScreenShell>
  );
}

function HeroMedallion({
  hero,
  index,
}: {
  hero: (typeof LEGEND_HEROES)[number];
  index: number;
}) {
  const glyph = hero.name.slice(0, hero.name.includes(" ") ? 1 : Math.min(2, hero.name.length));

  return (
    <div
      className={`title-hero title-hero--${hero.accent}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="title-hero__portrait" aria-hidden="true">
        <span>{glyph}</span>
      </div>
      <div className="title-hero__body">
        <p className="title-hero__name">{hero.name}</p>
        <p className="title-hero__epithet">{hero.epithet}</p>
      </div>
    </div>
  );
}
