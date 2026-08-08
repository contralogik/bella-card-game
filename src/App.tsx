import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  CircleUserRound,
  Crown,
  Eye,
  Flame,
  Hand,
  Heart,
  LockKeyhole,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Card, cards, rankOf, rarityClass, rarityMeta, rarityOrder, Rarity } from "./data/cards";
import { gameAudio } from "./audio";
import "./styles.css";

type Contestant = "A" | "B";
type Phase = "lobby" | "private" | "battle" | "result";
type BattleStep = "reveal" | "fight" | "done";
type PrivateStage = "draw" | "select";
type Winner = Contestant | "draw";

const PACK_SIZE = 8;
const LINEUP_SIZE = 5;
const ROUND_COUNT = 5;

type RoundResult = {
  winner: Winner;
  aHealth: number;
  bHealth: number;
  aCard: Card;
  bCard: Card;
  log: string[];
};

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const shuffled = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const pickFromPool = (pool: Card[], predicate: (card: Card) => boolean) => {
  const candidates = pool.filter(predicate);
  const picked = candidates.length > 0 ? randomItem(candidates) : randomItem(pool);
  const pickedIndex = pool.findIndex((card) => card.id === picked.id);
  return pool.splice(pickedIndex, 1)[0];
};

const buildMatchPool = () => {
  const cspCards = shuffled(cards.filter((card) => card.rarity === "CSP"));
  const regularCards = cards.filter((card) => card.rarity !== "CSP");
  // CSP 是冠冕级特殊卡，本局最多放入一张，避免一包卡同时出现三张数值怪。
  return shuffled([...regularCards, ...(cspCards.length > 0 ? [cspCards[0]] : [])]);
};

const buildPack = (pool: Card[]) => {
  const isHigh = (card: Card) => rankOf(card.rarity) >= rankOf("SSR");
  const pack = [
    pickFromPool(pool, (card) => card.rarity === "R"),
    pickFromPool(pool, (card) => card.rarity === "R"),
    pickFromPool(pool, (card) => card.rarity === "R" || card.rarity === "SR"),
    pickFromPool(pool, (card) => card.rarity === "SR"),
    pickFromPool(pool, (card) => card.rarity === "SR" || card.rarity === "SSR"),
    pickFromPool(pool, isHigh),
    pickFromPool(pool, isHigh),
    pickFromPool(pool, () => true),
  ];
  return pack;
};

const dealMatchPacks = () => {
  let best: [Card[], Card[]] | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pool = buildMatchPool();
    const packA = buildPack(pool);
    const packB = buildPack(pool);
    const highestA = Math.max(...packA.map((card) => rankOf(card.rarity)));
    const highestB = Math.max(...packB.map((card) => rankOf(card.rarity)));
    best = [packA, packB];
    if (Math.abs(highestA - highestB) <= 2) return [packA, packB] as [Card[], Card[]];
  }
  const fallbackPool = buildMatchPool();
  return best ?? [buildPack(fallbackPool), buildPack(fallbackPool)];
};

const damageFor = (attacker: Card, defender: Card) => Math.max(5, attacker.atk - defender.def);
const contestantName = (contestant: Contestant) => contestant === "A" ? "贝拉阵营" : "芊辰阵营";
const contestantShortName = (contestant: Contestant) => contestant === "A" ? "贝拉" : "芊辰";

const simulateBattle = (a: Card, b: Card): Omit<RoundResult, "aCard" | "bCard"> => {
  let aHealth = a.hp;
  let bHealth = b.hp;
  const log: string[] = [];

  for (let turn = 1; turn <= 12; turn += 1) {
    const aDamage = damageFor(a, b);
    const bDamage = damageFor(b, a);
    aHealth -= bDamage;
    bHealth -= aDamage;
    if (turn <= 3 || aHealth <= 0 || bHealth <= 0) {
      log.push(`第${turn}回合：${a.name} -${aDamage}，${b.name} -${bDamage}`);
    }

    if (aHealth <= 0 || bHealth <= 0) {
      if (aHealth <= 0 && bHealth <= 0) {
        return { winner: aDamage === bDamage ? "draw" : aDamage > bDamage ? "A" : "B", aHealth, bHealth, log };
      }
      return { winner: aHealth > 0 ? "A" : "B", aHealth, bHealth, log };
    }
  }

  return { winner: aHealth === bHealth ? "draw" : aHealth > bHealth ? "A" : "B", aHealth, bHealth, log };
};

const winnerLabel = (winner: Winner) => (winner === "draw" ? "平局" : `${contestantName(winner)}获胜`);

function CardBack({ className = "" }: { className?: string }) {
  return (
    <div className={`card-back ${className}`} aria-label="卡牌背面">
      <div className="card-back-orbit" />
      <div className="card-back-sigil">✦</div>
      <span>贝拉</span>
      <small>卡斗场</small>
    </div>
  );
}

function CardTile({
  card,
  faceUp,
  selected,
  order,
  onClick,
  large = false,
}: {
  card?: Card;
  faceUp: boolean;
  selected?: boolean;
  order?: number;
  onClick?: () => void;
  large?: boolean;
}) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(faceUp ? "loading" : "loaded");

  useEffect(() => {
    if (card) setImageState(faceUp ? "loading" : "loaded");
  }, [card?.id, faceUp]);

  if (!card) return <CardBack className={large ? "card-tile-large" : ""} />;

  return (
    <button
      type="button"
      className={`card-tile ${large ? "card-tile-large" : ""} ${selected ? "is-selected" : ""} ${faceUp ? "is-face-up" : ""}`}
      onClick={onClick}
      disabled={!onClick}
      aria-busy={faceUp && imageState !== "loaded"}
      aria-label={faceUp ? `${card.name}，${card.rarity}` : "未公开卡牌"}
    >
      {faceUp ? (
        <>
          <img
            src={card.image}
            alt={card.name}
            loading={large ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setImageState("loaded")}
            onError={() => setImageState("error")}
          />
          {imageState !== "loaded" && (
            <span className={`card-image-state ${imageState === "error" ? "is-error" : ""}`} role="status">
              <strong>{imageState === "error" ? "卡面加载失败" : "正在加载卡面"}</strong>
              <small>{card.name} · {card.rarity}</small>
              {imageState === "error" && <em>仍可使用这张卡</em>}
            </span>
          )}
        </>
      ) : <CardBack />}
      {selected && <span className="order-badge">{order}</span>}
    </button>
  );
}

function StatLine({ type, value }: { type: "hp" | "atk" | "def"; value: number | string }) {
  const Icon = type === "hp" ? Heart : type === "atk" ? Swords : Shield;
  const label = type === "hp" ? "生命" : type === "atk" ? "攻击" : "防御";
  return (
    <div className={`stat-line stat-${type}`}>
      <Icon size={14} strokeWidth={2.2} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RarityLegend() {
  const counts = useMemo(() => cards.reduce<Record<string, number>>((map, card) => {
    map[card.rarity] = (map[card.rarity] ?? 0) + 1;
    return map;
  }, {}), []);

  return (
    <div className="rarity-legend" aria-label="卡池稀有度">
      {rarityOrder.map((rarity) => (
        <span className={`legend-item ${rarityClass(rarity)}`} key={rarity}>
          <i />
          <b>{rarity}</b>
          <small>{counts[rarity] ?? 0}</small>
        </span>
      ))}
    </div>
  );
}

function PlayerRail({
  player,
  color,
  card,
  faceUp,
  health,
  score,
  status,
}: {
  player: Contestant;
  color: "blue" | "violet";
  card?: Card;
  faceUp: boolean;
  health?: number;
  score: number;
  status: string;
}) {
  const maxHealth = card?.hp ?? 1;
  const ratio = Math.max(0, Math.min(100, ((health ?? maxHealth) / maxHealth) * 100));
  return (
    <aside className={`player-rail rail-${color}`}>
      <div className="player-rail-head">
        <CircleUserRound size={18} />
        <span>{contestantName(player)}</span>
        <strong>{score}<small> 星</small></strong>
      </div>
      <div className="rail-card-slot">
        {card ? <CardTile card={card} faceUp={faceUp} large /> : <CardBack className="card-tile-large" />}
      </div>
      <p className="rail-status">{status}</p>
      <div className="rail-stats">
        <StatLine type="hp" value={health ?? "—"} />
        <StatLine type="atk" value={card?.atk ?? "—"} />
        <StatLine type="def" value={card?.def ?? "—"} />
      </div>
      {card && (
        <div className="health-track" aria-label={`${contestantName(player)}生命值`}>
          <span style={{ width: `${ratio}%` }} />
        </div>
      )}
    </aside>
  );
}

function App() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [packs, setPacks] = useState<{ A: Card[]; B: Card[] }>({ A: [], B: [] });
  const [privatePlayer, setPrivatePlayer] = useState<Contestant>("A");
  const [privateStage, setPrivateStage] = useState<PrivateStage>("draw");
  const [drawIndex, setDrawIndex] = useState(0);
  const [drawFaceUp, setDrawFaceUp] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [lineups, setLineups] = useState<{ A: Card[]; B: Card[] }>({ A: [], B: [] });
  const [round, setRound] = useState(0);
  const [battleStep, setBattleStep] = useState<BattleStep>("reveal");
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [battleResult, setBattleResult] = useState<RoundResult | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const currentPack = packs[privatePlayer];
  const currentSelection = selection.map((id) => currentPack.find((card) => card.id === id)).filter(Boolean) as Card[];
  const currentDrawCard = currentPack[drawIndex];
  const currentA = lineups.A[round];
  const currentB = lineups.B[round];
  const scoreA = roundResults.filter((result) => result.winner === "A").length;
  const scoreB = roundResults.filter((result) => result.winner === "B").length;
  const remainingA = roundResults.reduce((sum, result) => sum + Math.max(0, result.aHealth), 0);
  const remainingB = roundResults.reduce((sum, result) => sum + Math.max(0, result.bHealth), 0);
  const finalWinner: Winner = scoreA === scoreB
    ? remainingA === remainingB ? "draw" : remainingA > remainingB ? "A" : "B"
    : scoreA > scoreB ? "A" : "B";

  useEffect(() => () => gameAudio.stop(), []);

  const reset = () => {
    setPhase("lobby");
    setPacks({ A: [], B: [] });
    setLineups({ A: [], B: [] });
    setSelection([]);
    setRoundResults([]);
    setBattleResult(null);
    setPrivateStage("draw");
    setDrawIndex(0);
    setDrawFaceUp(false);
    setRound(0);
    setBattleStep("reveal");
    setPrivatePlayer("A");
    void gameAudio.setMode("none");
  };

  const startMatch = () => {
    const [packA, packB] = dealMatchPacks();
    setPacks({ A: packA, B: packB });
    setLineups({ A: [], B: [] });
    setSelection([]);
    setPrivatePlayer("A");
    setPrivateStage("draw");
    setDrawIndex(0);
    setDrawFaceUp(false);
    setRoundResults([]);
    setBattleResult(null);
    setPhase("private");
    void gameAudio.setMode("draw");
  };

  const toggleSelection = (id: string) => {
    if (selection.includes(id)) {
      setSelection((current) => current.filter((selectedId) => selectedId !== id));
      void gameAudio.playSelect();
      return;
    }
    if (selection.length < LINEUP_SIZE) {
      setSelection((current) => [...current, id]);
      void gameAudio.playSelect();
    }
  };

  const revealDrawCard = () => {
    if (!currentDrawCard || drawFaceUp) return;
    setDrawFaceUp(true);
    void gameAudio.playReveal(rankOf(currentDrawCard.rarity));
  };

  const advanceDraw = () => {
    if (!drawFaceUp) return;
    if (drawIndex === PACK_SIZE - 1) {
      setPrivateStage("select");
      setDrawFaceUp(false);
      void gameAudio.playAdvance();
      return;
    }
    setDrawIndex((current) => current + 1);
    setDrawFaceUp(false);
    void gameAudio.playAdvance();
  };

  const lockLineup = () => {
    if (selection.length !== LINEUP_SIZE) return;
    const lineup = currentSelection;
    setLineups((current) => ({ ...current, [privatePlayer]: lineup }));
    setSelection([]);
    setPrivateStage("draw");
    setDrawIndex(0);
    setDrawFaceUp(false);
    if (privatePlayer === "A") {
      setPrivatePlayer("B");
      void gameAudio.playAdvance();
    } else {
      setPhase("battle");
      setRound(0);
      setBattleStep("reveal");
      void gameAudio.setMode("battle");
    }
  };

  const revealRound = () => {
    setBattleStep("fight");
    void gameAudio.playReveal(Math.max(rankOf(currentA?.rarity ?? "R"), rankOf(currentB?.rarity ?? "R")));
  };

  const startFight = () => {
    if (!currentA || !currentB) return;
    const result = simulateBattle(currentA, currentB);
    void gameAudio.playClash();
    void gameAudio.playOutcome(result.winner);
    setBattleResult({ ...result, aCard: currentA, bCard: currentB });
    setRoundResults((current) => [...current.slice(0, round), { ...result, aCard: currentA, bCard: currentB }]);
    setBattleStep("done");
  };

  const nextRound = () => {
    if (round === ROUND_COUNT - 1) {
      setPhase("result");
      void gameAudio.setMode("result");
      return;
    }
    setRound((current) => current + 1);
    setBattleResult(null);
    setBattleStep("reveal");
    void gameAudio.playAdvance();
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    void gameAudio.setEnabled(next);
  };

  const renderHeader = () => (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-seal"><Sparkles size={18} /></div>
        <div>
          <h1>贝拉卡斗场</h1>
          <p>抽8选5 · 1V1裁判模式</p>
        </div>
      </div>
      <div className="header-tools">
        <button className="sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "关闭声音" : "开启声音"}>
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          <span>{soundOn ? "声音" : "静音"}</span>
        </button>
        <div className="header-state">
          <span className="live-dot" />
          <span>{phase === "lobby" ? "准备开局" : phase === "private" ? "私密抽卡" : phase === "battle" ? "裁判进行中" : "对局完成"}</span>
        </div>
      </div>
    </header>
  );

  const renderLobby = () => (
    <main className="lobby-layout">
      <section className="lobby-intro">
        <div className="lobby-orbit"><Crown size={30} /></div>
        <h2>把命运交给一包卡</h2>
        <p>两位玩家逐张揭晓八张卡、排出五张王牌，第三个人拿手机见证每一局翻牌。</p>
        <button className="primary-action action-large" type="button" onClick={startMatch}>
          <Sparkles size={18} /> 开始一局 <ChevronRight size={18} />
        </button>
      </section>
      <section className="lobby-roles" aria-label="对局角色">
        <div className="role-card role-blue">
          <CircleUserRound size={24} />
          <div><strong>贝拉阵营</strong><span>逐张揭晓8张 · 选5张</span></div>
        </div>
        <div className="role-card role-violet">
          <CircleUserRound size={24} />
          <div><strong>芊辰阵营</strong><span>逐张揭晓8张 · 选5张</span></div>
        </div>
        <div className="role-card role-gold">
          <Eye size={24} />
          <div><strong>裁判</strong><span>拿手机 · 公开五局</span></div>
        </div>
      </section>
      <section className="pool-strip">
        <div><span className="section-kicker">本局卡池</span><strong>43张动漫卡</strong><small className="pool-rule">CSP 每局最多出现 1 张</small></div>
        <RarityLegend />
      </section>
    </main>
  );

  const renderPrivate = () => (
    <main className="private-layout">
      <section className="private-header">
        <div className="private-icon"><LockKeyhole size={22} /></div>
        <div>
          <span className="section-kicker">私密阶段</span>
          <h2>{contestantName(privatePlayer)}的秘密卡包</h2>
          <p>{privateStage === "draw" ? "一次只揭晓一张，享受每次翻牌。" : "八张都已揭晓，现在按出战顺序选择五张。"}</p>
        </div>
        <div className="private-step"><span>1</span><i /><span className={privatePlayer === "B" ? "is-active" : ""}>2</span></div>
      </section>
      {privateStage === "draw" ? (
        <section className="single-reveal-panel">
          <div className="draw-progress-head">
            <strong>第 {drawIndex + 1} / {PACK_SIZE} 张</strong>
            <div className="draw-markers" aria-label={`已揭晓${drawIndex + (drawFaceUp ? 1 : 0)}张`}>
              {Array.from({ length: PACK_SIZE }, (_, index) => (
                <i className={index < drawIndex ? "is-past" : index === drawIndex ? "is-current" : ""} key={index}>{index < drawIndex ? "✓" : index + 1}</i>
              ))}
            </div>
          </div>
          <p className="reveal-instruction">{drawFaceUp ? `${currentDrawCard?.rarity} · ${currentDrawCard?.name}` : "轻触卡背，揭晓角色"}</p>
          <div className={`single-card-stage ${drawFaceUp ? "is-revealed" : ""}`}>
            <div className="reveal-rays" aria-hidden="true" />
            {currentDrawCard && (
              <CardTile
                key={`${privatePlayer}-${drawIndex}-${drawFaceUp ? "front" : "back"}`}
                card={currentDrawCard}
                faceUp={drawFaceUp}
                large
                onClick={drawFaceUp ? undefined : revealDrawCard}
              />
            )}
          </div>
          <button type="button" className="primary-action reveal-next-action" disabled={!drawFaceUp} onClick={advanceDraw}>
            {drawIndex === PACK_SIZE - 1 ? <Swords size={18} /> : <Hand size={18} />}
            {drawIndex === PACK_SIZE - 1 ? "查看8张卡，安排阵容" : "收入手牌，揭晓下一张"}
          </button>
          <div className="privacy-reminder"><LockKeyhole size={15} /> 其他玩家请转身</div>
        </section>
      ) : (
        <section className="private-panel selection-panel">
          <div className="private-panel-top">
            <div><strong>安排5张出战牌</strong><span>点击顺序就是第1～5局的出场顺序</span></div>
            <span className="selection-count">已选 {selection.length}<small>/{LINEUP_SIZE}</small></span>
          </div>
          <div className="lineup-preview" aria-label="五张出战牌顺序">
            {Array.from({ length: LINEUP_SIZE }, (_, index) => {
              const card = currentSelection[index];
              return (
                <div className={`lineup-slot ${card ? "is-filled" : ""}`} key={index}>
                  <span>{index + 1}</span>
                  {card ? <img src={card.image} alt={card.name} /> : <Swords size={20} />}
                  <small>{card?.name ?? `第${index + 1}局`}</small>
                </div>
              );
            })}
          </div>
          <div className="private-pack selection-pack">
            {currentPack.map((card) => (
              <CardTile key={card.id} card={card} faceUp selected={selection.includes(card.id)} order={selection.indexOf(card.id) + 1} onClick={() => toggleSelection(card.id)} />
            ))}
          </div>
          <div className="private-actions">
            <div className="reveal-note"><Eye size={16} /> 再点已选卡牌可取消</div>
            <button type="button" className="primary-action" disabled={selection.length !== LINEUP_SIZE} onClick={lockLineup}>
              <LockKeyhole size={17} /> 锁定5张阵容并交给裁判
            </button>
          </div>
        </section>
      )}
    </main>
  );

  const renderBattle = () => {
    const currentResult = battleResult;
    const aHealth = currentResult?.aHealth ?? currentA?.hp;
    const bHealth = currentResult?.bHealth ?? currentB?.hp;
    const aFaceUp = battleStep !== "reveal";
    const bFaceUp = battleStep !== "reveal";
    const buttonLabel = battleStep === "reveal" ? `公开第${round + 1}张` : battleStep === "fight" ? "开始战斗" : round === ROUND_COUNT - 1 ? "查看最终结果" : "进入下一局";
    const buttonAction = battleStep === "reveal" ? revealRound : battleStep === "fight" ? startFight : nextRound;
    return (
      <main className="battle-layout">
        <PlayerRail player="A" color="blue" card={currentA} faceUp={aFaceUp} health={aHealth} score={scoreA} status={battleStep === "done" ? (currentResult?.winner === "A" ? "本局胜利" : "继续观察") : "等待裁判公开"} />
        <section className="battle-stage">
          <div className="stage-header">
            <div><span className="section-kicker">裁判进行中</span><h2>第{round + 1}局 <small>/ 共{ROUND_COUNT}局</small></h2></div>
            <div className="round-markers">{Array.from({ length: ROUND_COUNT }, (_, index) => <i className={index < round ? "is-past" : index === round ? "is-current" : ""} key={index}>{index < round ? "✓" : index + 1}</i>)}</div>
          </div>
          <div className="duel-table">
            <div className={`duel-card-wrap ${aFaceUp ? "revealed" : ""}`}><CardTile card={currentA} faceUp={aFaceUp} large /></div>
            <div className="versus-mark"><span>VS</span><i /></div>
            <div className={`duel-card-wrap ${bFaceUp ? "revealed" : ""}`}><CardTile card={currentB} faceUp={bFaceUp} large /></div>
          </div>
          <div className="health-duel">
            <div className="duel-health duel-blue"><span>{Math.max(0, aHealth ?? 0)}</span><div><i style={{ width: `${Math.max(0, Math.min(100, ((aHealth ?? 0) / (currentA?.hp || 1)) * 100))}%` }} /></div></div>
            <div className="duel-health duel-violet"><div><i style={{ width: `${Math.max(0, Math.min(100, ((bHealth ?? 0) / (currentB?.hp || 1)) * 100))}%` }} /></div><span>{Math.max(0, bHealth ?? 0)}</span></div>
          </div>
          {currentResult && <div className="battle-result-note"><Flame size={16} /> {winnerLabel(currentResult.winner)} <span>{currentResult.log[currentResult.log.length - 1]}</span></div>}
          <div className="referee-console">
            <div className="referee-label"><Eye size={18} /><div><strong>裁判</strong><span>只公开当前局，系统自动扣血</span></div></div>
            <button type="button" className={`primary-action referee-action ${battleStep === "done" ? "is-next" : ""}`} onClick={buttonAction}>
              {battleStep === "reveal" ? <Eye size={18} /> : battleStep === "fight" ? <Swords size={18} /> : <ChevronRight size={18} />}
              {buttonLabel}
            </button>
          </div>
        </section>
        <PlayerRail player="B" color="violet" card={currentB} faceUp={bFaceUp} health={bHealth} score={scoreB} status={battleStep === "done" ? (currentResult?.winner === "B" ? "本局胜利" : "继续观察") : "等待裁判公开"} />
      </main>
    );
  };

  const renderResult = () => (
    <main className="result-layout">
      <section className="result-hero">
        <div className="result-crown"><Trophy size={32} /></div>
        <span className="section-kicker">五局结束</span>
        <h2>{finalWinner === "draw" ? "势均力敌，平局" : `${contestantName(finalWinner)}赢下本场`}</h2>
        <p>{scoreA === scoreB ? "胜局相同时按五张卡的剩余生命判定。" : "卡牌的顺序、稀有度和每一次扣血，都在这一刻留下了结果。"}</p>
        <button type="button" className="primary-action action-large" onClick={reset}><RotateCcw size={18} /> 再来一局</button>
      </section>
      <section className="result-table">
        <div className="result-table-head"><strong>对局回放</strong><span>贝拉阵营 {scoreA} : {scoreB} 芊辰阵营</span></div>
        {roundResults.map((result, index) => (
          <div className="result-row" key={`${result.aCard.id}-${result.bCard.id}`}>
            <span className="result-round">第{index + 1}局</span>
            <div className="result-card-name"><img src={result.aCard.image} alt="" /><span>{result.aCard.name}</span></div>
            <strong className={`result-winner ${result.winner === "A" ? "winner-a" : result.winner === "B" ? "winner-b" : "winner-draw"}`}>{result.winner === "draw" ? "平局" : `${contestantShortName(result.winner)}胜`}</strong>
            <div className="result-card-name is-right"><span>{result.bCard.name}</span><img src={result.bCard.image} alt="" /></div>
          </div>
        ))}
      </section>
    </main>
  );

  return (
    <div className="app-shell">
      {renderHeader()}
      {phase === "lobby" && renderLobby()}
      {phase === "private" && renderPrivate()}
      {phase === "battle" && renderBattle()}
      {phase === "result" && renderResult()}
      <footer className="app-footer"><span>贝拉卡斗场 · 43张卡池</span><span>第三人裁判模式</span></footer>
    </div>
  );
}

export default App;
