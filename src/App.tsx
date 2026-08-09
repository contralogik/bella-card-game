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
type GameMode = "duel" | "team" | "fate";
type Phase = "lobby" | "private" | "battle" | "result";
type BattleStep = "reveal" | "fight" | "done";
type PrivateStage = "draw" | "select";
type Winner = Contestant | "draw";

const PACK_SIZE = 8;
const LINEUP_SIZE = 5;
const ROUND_COUNT = 5;
const TEAM_PACK_SIZE = 10;
const TEAM_LINEUP_SIZE = 7;
const TEAM_FATIGUE_RATE = 0.2;
const FATE_PACK_SIZE = 5;
const FATE_LINEUP_SIZE = 3;
const FATE_ROUND_COUNT = 3;

type FateEvent = {
  id: string;
  name: string;
  description: string;
  atkModifier?: number;
  defModifier?: number;
  damageModifier?: number;
  lowHealthAttack?: number;
  swapStats?: boolean;
  lowRarityMultiplier?: number;
  firstStrikeBonus?: number;
};

type PublicTactic = {
  id: string;
  name: string;
  description: string;
  symbol: string;
  atkModifier?: number;
  defModifier?: number;
  ignoreDefense?: number;
  firstStrikeBonus?: number;
  lowHealthSideAttack?: number;
};

const FATE_EVENTS: FateEvent[] = [
  { id: "rage", name: "狂暴", description: "双方攻击 +20。", atkModifier: 20 },
  { id: "iron-wall", name: "铁壁", description: "双方防御 +15。", defModifier: 15 },
  { id: "blood-moon", name: "血月", description: "每次命中额外造成 10 点伤害。", damageModifier: 10 },
  { id: "backwater", name: "背水一战", description: "生命低于一半后，攻击 +25。", lowHealthAttack: 25 },
  { id: "attribute-reversal", name: "属性反转", description: "本局攻击与防御互换。", swapStats: true },
  { id: "commoner-light", name: "平民之光", description: "R、SR 卡造成的伤害提高 50%。", lowRarityMultiplier: 1.5 },
  { id: "first-strike", name: "先手之势", description: "攻击较高者先手，首次命中额外 +8。", firstStrikeBonus: 8 },
];

const PUBLIC_TACTICS: PublicTactic[] = [
  { id: "assault-order", name: "猛攻令", description: "双方攻击 +15。", symbol: "⚔", atkModifier: 15 },
  { id: "shield-order", name: "护盾令", description: "双方防御 +20。", symbol: "◆", defModifier: 20 },
  { id: "break-order", name: "破甲令", description: "双方攻击结算时无视 15 点防御。", symbol: "✦", ignoreDefense: 15 },
  { id: "combo-order", name: "连击令", description: "攻击较高者首回合额外 +18 伤害。", symbol: "☄", firstStrikeBonus: 18 },
  { id: "desperate-order", name: "决胜令", description: "当前生命较低的一方攻击 +25。", symbol: "☼", lowHealthSideAttack: 25 },
  { id: "swap-order", name: "换势令", description: "本局攻击与防御互换。", symbol: "↔", },
];

type CardImageState = "loading" | "loaded" | "error";

type RoundResult = {
  winner: Winner;
  aHealth: number;
  bHealth: number;
  aCard: Card;
  bCard: Card;
  log: string[];
  event?: FateEvent;
  tactic?: PublicTactic;
};

type TeamClashResult = {
  winner: Winner;
  aHealth: number;
  bHealth: number;
  aCard: Card;
  bCard: Card;
  aIndex: number;
  bIndex: number;
  log: string[];
};

type TeamBattleState = {
  aIndex: number;
  bIndex: number;
  aHealth: number;
  bHealth: number;
  clashes: TeamClashResult[];
  lastClash: TeamClashResult | null;
  winner: Winner | null;
};

const shuffled = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const dealMatchPacks = (packSize = PACK_SIZE) => {
  // 整副卡池先整体洗牌，再按 A、B、A、B 交替发牌；每张牌的概率完全相同。
  const deck = shuffled(cards);
  const packA: Card[] = [];
  const packB: Card[] = [];
  for (let index = 0; index < packSize * 2; index += 1) {
    (index % 2 === 0 ? packA : packB).push(deck[index]);
  }
  return [packA, packB] as [Card[], Card[]];
};

const damageFor = (attacker: Card, defender: Card) => Math.max(5, attacker.atk - defender.def);
const fatigueFor = (card: Card) => Math.ceil(card.hp * TEAM_FATIGUE_RATE);
const contestantName = (contestant: Contestant) => contestant === "A" ? "贝拉阵营" : "芊辰阵营";
const contestantShortName = (contestant: Contestant) => contestant === "A" ? "贝拉" : "芊辰";

const simulateBattle = (a: Card, b: Card, event?: FateEvent, tactic?: PublicTactic): Omit<RoundResult, "aCard" | "bCard"> => {
  let aHealth = a.hp;
  let bHealth = b.hp;
  const log: string[] = [];

  for (let turn = 1; turn <= 12; turn += 1) {
    const getStats = (card: Card, health: number) => {
      let atk = card.atk + (event?.atkModifier ?? 0) + (tactic?.atkModifier ?? 0);
      let def = card.def + (event?.defModifier ?? 0) + (tactic?.defModifier ?? 0);
      if (event?.swapStats) [atk, def] = [def, atk];
      if (tactic?.id === "swap-order") [atk, def] = [def, atk];
      if (event?.lowHealthAttack && health <= card.hp / 2) atk += event.lowHealthAttack;
      return { atk, def };
    };
    const aStats = getStats(a, aHealth);
    const bStats = getStats(b, bHealth);
    if (tactic?.lowHealthSideAttack) {
      if (aHealth < bHealth) aStats.atk += tactic.lowHealthSideAttack;
      if (bHealth < aHealth) bStats.atk += tactic.lowHealthSideAttack;
    }
    const getDamage = (attacker: Card, attackerStats: { atk: number; def: number }, defenderStats: { atk: number; def: number }) => {
      const defenseIgnore = event?.swapStats || tactic?.id === "swap-order" ? 0 : (tactic?.ignoreDefense ?? 0);
      let damage = Math.max(5, attackerStats.atk - Math.max(0, defenderStats.def - defenseIgnore) + (event?.damageModifier ?? 0));
      if (event?.lowRarityMultiplier && rankOf(attacker.rarity) <= rankOf("SR")) damage = Math.round(damage * event.lowRarityMultiplier);
      return damage;
    };
    let aDamage = getDamage(a, aStats, bStats);
    let bDamage = getDamage(b, bStats, aStats);
    if (turn === 1 && event?.firstStrikeBonus && aStats.atk !== bStats.atk) {
      if (aStats.atk > bStats.atk) aDamage += event.firstStrikeBonus;
      else bDamage += event.firstStrikeBonus;
    }
    aHealth -= bDamage;
    bHealth -= aDamage;
    if (turn <= 3 || aHealth <= 0 || bHealth <= 0) {
      log.push(`第${turn}回合：${a.name} -${aDamage}，${b.name} -${bDamage}`);
    }

    if (aHealth <= 0 || bHealth <= 0) {
      if (aHealth <= 0 && bHealth <= 0) {
        return { winner: aDamage === bDamage ? "draw" : aDamage > bDamage ? "A" : "B", aHealth, bHealth, log, event, tactic };
      }
      return { winner: aHealth > 0 ? "A" : "B", aHealth, bHealth, log, event, tactic };
    }
  }

  return { winner: aHealth === bHealth ? "draw" : aHealth > bHealth ? "A" : "B", aHealth, bHealth, log, event, tactic };
};

const simulateTeamClash = (
  a: Card,
  b: Card,
  aStartingHealth = a.hp,
  bStartingHealth = b.hp,
): Omit<TeamClashResult, "aCard" | "bCard" | "aIndex" | "bIndex"> => {
  let aHealth = aStartingHealth;
  let bHealth = bStartingHealth;
  const log: string[] = [];

  for (let turn = 1; turn <= 100; turn += 1) {
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

const cardBackImage = `${import.meta.env.BASE_URL}cards/card-back-contralogik.png`;
const heroBackground = `${import.meta.env.BASE_URL}hero/bella-hero-bg.png`;
const tacticImage = `${import.meta.env.BASE_URL}cards/tactic-common.png`;

function CardBack({ className = "" }: { className?: string }) {
  return (
    <div className={`card-back ${className}`} aria-label="卡牌背面">
      <img src={cardBackImage} alt="卡牌背面" />
    </div>
  );
}

function PublicTacticCard({ tactic, revealed }: { tactic?: PublicTactic; revealed: boolean }) {
  if (!tactic) return null;
  return (
    <div className={`public-tactic-card ${revealed ? "is-revealed" : "is-hidden"}`} aria-label={revealed ? `公共战术牌：${tactic.name}` : "未公开公共战术牌"}>
      <img src={revealed ? tacticImage : cardBackImage} alt="" />
      {revealed ? (
        <div className="public-tactic-copy">
          <span>PUBLIC TACTIC</span>
          <strong>{tactic.symbol} {tactic.name}</strong>
          <small>{tactic.description}</small>
        </div>
      ) : <span>公共战术牌</span>}
    </div>
  );
}

function CardTile({
  card,
  faceUp,
  selected,
  order,
  onClick,
  onImageStateChange,
  large = false,
}: {
  card?: Card;
  faceUp: boolean;
  selected?: boolean;
  order?: number;
  onClick?: () => void;
  onImageStateChange?: (state: CardImageState) => void;
  large?: boolean;
}) {
  const [imageState, setImageState] = useState<CardImageState>(faceUp ? "loading" : "loaded");

  useEffect(() => {
    if (card) {
      const nextState: CardImageState = faceUp ? "loading" : "loaded";
      setImageState(nextState);
      onImageStateChange?.(nextState);
    }
  }, [card?.id, faceUp, onImageStateChange]);

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
            onLoad={() => {
              setImageState("loaded");
              onImageStateChange?.("loaded");
            }}
            onError={() => {
              setImageState("error");
              onImageStateChange?.("error");
            }}
          />
          {imageState !== "loaded" && (
            <span className={`card-image-state ${imageState === "error" ? "is-error" : ""}`} role="status">
              <strong>{imageState === "error" ? "卡面加载失败" : "正在加载卡面"}</strong>
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
  scoreLabel = "星",
  status,
  roster,
  activeIndex = 0,
}: {
  player: Contestant;
  color: "blue" | "violet";
  card?: Card;
  faceUp: boolean;
  health?: number;
  score: number;
  scoreLabel?: string;
  status: string;
  roster?: Card[];
  activeIndex?: number;
}) {
  const maxHealth = card?.hp ?? 1;
  const ratio = Math.max(0, Math.min(100, ((health ?? maxHealth) / maxHealth) * 100));
  return (
    <aside className={`player-rail rail-${color}`}>
      <div className="player-rail-head">
        <CircleUserRound size={18} />
        <span>{contestantName(player)}</span>
        <strong>{score}<small> {scoreLabel}</small></strong>
      </div>
      <div className="rail-card-slot">
        {card ? <CardTile card={card} faceUp={faceUp} large /> : <CardBack className="card-tile-large" />}
      </div>
      <p className="rail-status">{status}</p>
      {roster && (
        <div className="team-roster" aria-label={`${contestantName(player)}团战卡牌进度`}>
          {roster.map((rosterCard, index) => (
            <span className={`team-roster-chip ${index < activeIndex ? "is-defeated" : index === activeIndex ? "is-active" : ""}`} key={rosterCard.id}>
              <img src={rosterCard.image} alt={rosterCard.name} />
              <small>{index + 1}</small>
            </span>
          ))}
        </div>
      )}
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
  const [gameMode, setGameMode] = useState<GameMode>("duel");
  const [packs, setPacks] = useState<{ A: Card[]; B: Card[] }>({ A: [], B: [] });
  const [privatePlayer, setPrivatePlayer] = useState<Contestant>("A");
  const [privateStage, setPrivateStage] = useState<PrivateStage>("draw");
  const [drawIndex, setDrawIndex] = useState(0);
  const [drawFaceUp, setDrawFaceUp] = useState(false);
  const [drawImageState, setDrawImageState] = useState<CardImageState>("loaded");
  const [selection, setSelection] = useState<string[]>([]);
  const [lineups, setLineups] = useState<{ A: Card[]; B: Card[] }>({ A: [], B: [] });
  const [round, setRound] = useState(0);
  const [battleStep, setBattleStep] = useState<BattleStep>("reveal");
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [battleResult, setBattleResult] = useState<RoundResult | null>(null);
  const [teamBattle, setTeamBattle] = useState<TeamBattleState | null>(null);
  const [fateEvents, setFateEvents] = useState<FateEvent[]>([]);
  const [fateTactics, setFateTactics] = useState<PublicTactic[]>([]);
  const [soundOn, setSoundOn] = useState(true);

  const activePackSize = gameMode === "team" ? TEAM_PACK_SIZE : gameMode === "fate" ? FATE_PACK_SIZE : PACK_SIZE;
  const activeLineupSize = gameMode === "team" ? TEAM_LINEUP_SIZE : gameMode === "fate" ? FATE_LINEUP_SIZE : LINEUP_SIZE;
  const activeRoundCount = gameMode === "fate" ? FATE_ROUND_COUNT : ROUND_COUNT;
  const isFateMode = gameMode === "fate";
  const currentPack = packs[privatePlayer];
  const currentSelection = selection.map((id) => currentPack.find((card) => card.id === id)).filter(Boolean) as Card[];
  const currentDrawCard = currentPack[drawIndex];
  const currentA = lineups.A[round];
  const currentB = lineups.B[round];
  const teamCurrentA = teamBattle ? lineups.A[Math.min(teamBattle.aIndex, Math.max(0, lineups.A.length - 1))] : lineups.A[0];
  const teamCurrentB = teamBattle ? lineups.B[Math.min(teamBattle.bIndex, Math.max(0, lineups.B.length - 1))] : lineups.B[0];
  const scoreA = roundResults.filter((result) => result.winner === "A").length;
  const scoreB = roundResults.filter((result) => result.winner === "B").length;
  const remainingA = roundResults.reduce((sum, result) => sum + Math.max(0, result.aHealth), 0);
  const remainingB = roundResults.reduce((sum, result) => sum + Math.max(0, result.bHealth), 0);
  const finalWinner: Winner = scoreA === scoreB
    ? remainingA === remainingB ? "draw" : remainingA > remainingB ? "A" : "B"
    : scoreA > scoreB ? "A" : "B";

  useEffect(() => () => gameAudio.stop(), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [phase, privatePlayer, privateStage]);

  const reset = () => {
    setPhase("lobby");
    setPacks({ A: [], B: [] });
    setLineups({ A: [], B: [] });
    setSelection([]);
    setRoundResults([]);
    setBattleResult(null);
    setTeamBattle(null);
    setFateEvents([]);
    setFateTactics([]);
    setPrivateStage("draw");
    setDrawIndex(0);
    setDrawFaceUp(false);
    setDrawImageState("loaded");
    setRound(0);
    setBattleStep("reveal");
    setPrivatePlayer("A");
    void gameAudio.setMode("none");
  };

  const startMatch = () => {
    const [packA, packB] = dealMatchPacks(activePackSize);
    setPacks({ A: packA, B: packB });
    setLineups({ A: [], B: [] });
    setSelection([]);
    setPrivatePlayer("A");
    setPrivateStage("draw");
    setDrawIndex(0);
    setDrawFaceUp(false);
    setDrawImageState("loaded");
    setRoundResults([]);
    setBattleResult(null);
    setTeamBattle(null);
    setFateEvents(gameMode === "fate" ? shuffled(FATE_EVENTS).slice(0, FATE_ROUND_COUNT) : []);
    setFateTactics(gameMode === "fate" ? shuffled(PUBLIC_TACTICS).slice(0, FATE_ROUND_COUNT) : []);
    setPhase("private");
    void gameAudio.setMode("draw");
  };

  const toggleSelection = (id: string) => {
    if (selection.includes(id)) {
      setSelection((current) => current.filter((selectedId) => selectedId !== id));
      void gameAudio.playSelect();
      return;
    }
    if (selection.length < activeLineupSize) {
      setSelection((current) => [...current, id]);
      void gameAudio.playSelect();
    }
  };

  const revealDrawCard = () => {
    if (!currentDrawCard || drawFaceUp) return;
    setDrawImageState("loading");
    setDrawFaceUp(true);
    void gameAudio.playReveal(rankOf(currentDrawCard.rarity));
  };

  const advanceDraw = () => {
    if (!drawFaceUp) return;
    if (privatePlayer === "A") {
      setPrivatePlayer("B");
      setDrawFaceUp(false);
      setDrawImageState("loaded");
      void gameAudio.playAdvance();
      return;
    }
    if (drawIndex === activePackSize - 1) {
      setPrivateStage("select");
      setPrivatePlayer("A");
      setDrawFaceUp(false);
      setDrawImageState("loaded");
      void gameAudio.playAdvance();
      return;
    }
    setDrawIndex((current) => current + 1);
    setPrivatePlayer("A");
    setDrawFaceUp(false);
    setDrawImageState("loaded");
    void gameAudio.playAdvance();
  };

  const lockLineup = () => {
    if (selection.length !== activeLineupSize) return;
    const lineup = gameMode === "team" ? shuffled(currentSelection) : currentSelection;
    const nextLineups = { ...lineups, [privatePlayer]: lineup };
    setLineups(nextLineups);
    setSelection([]);
    setDrawFaceUp(false);
    if (privatePlayer === "A") {
      setPrivatePlayer("B");
      setPrivateStage("select");
      void gameAudio.playAdvance();
    } else {
      setPhase("battle");
      setRound(0);
      setBattleStep("reveal");
      if (gameMode === "team") {
        setTeamBattle({
          aIndex: 0,
          bIndex: 0,
          aHealth: nextLineups.A[0].hp,
          bHealth: nextLineups.B[0].hp,
          clashes: [],
          lastClash: null,
          winner: null,
        });
      }
      void gameAudio.setMode("battle");
    }
  };

  const revealRound = () => {
    if (gameMode === "team") {
      if (!teamCurrentA || !teamCurrentB) return;
      setBattleStep("fight");
      void gameAudio.playReveal(Math.max(rankOf(teamCurrentA.rarity), rankOf(teamCurrentB.rarity)));
      return;
    }
    setBattleStep("fight");
    void gameAudio.playReveal(Math.max(rankOf(currentA?.rarity ?? "R"), rankOf(currentB?.rarity ?? "R")));
  };

  const startFight = () => {
    if (!currentA || !currentB) return;
    const event = isFateMode ? fateEvents[round] : undefined;
    const tactic = isFateMode ? fateTactics[round] : undefined;
    const result = simulateBattle(currentA, currentB, event, tactic);
    void gameAudio.playClash();
    void gameAudio.playOutcome(result.winner);
    const completedResult = { ...result, aCard: currentA, bCard: currentB, event, tactic };
    setBattleResult(completedResult);
    setRoundResults((current) => [...current.slice(0, round), completedResult]);
    setBattleStep("done");
  };

  const startTeamFight = () => {
    if (!teamBattle || !teamCurrentA || !teamCurrentB || teamBattle.winner) return;
    const result = simulateTeamClash(teamCurrentA, teamCurrentB, teamBattle.aHealth, teamBattle.bHealth);
    let aHealth = Math.max(0, result.aHealth);
    let bHealth = Math.max(0, result.bHealth);
    const log = [...result.log];
    const aWasDefeated = result.aHealth <= 0;
    const bWasDefeated = result.bHealth <= 0;

    if (!aWasDefeated && bWasDefeated) {
      const fatigue = fatigueFor(teamCurrentA);
      aHealth = Math.max(0, aHealth - fatigue);
      log.push(`${teamCurrentA.name}连续作战疲劳 -${fatigue}`);
    }
    if (!bWasDefeated && aWasDefeated) {
      const fatigue = fatigueFor(teamCurrentB);
      bHealth = Math.max(0, bHealth - fatigue);
      log.push(`${teamCurrentB.name}连续作战疲劳 -${fatigue}`);
    }

    const aDefeated = aHealth <= 0;
    const bDefeated = bHealth <= 0;
    const nextAIndex = teamBattle.aIndex + (aDefeated ? 1 : 0);
    const nextBIndex = teamBattle.bIndex + (bDefeated ? 1 : 0);
    const aFinished = nextAIndex >= lineups.A.length;
    const bFinished = nextBIndex >= lineups.B.length;
    const winner: Winner | null = aFinished && bFinished ? "draw" : aFinished ? "B" : bFinished ? "A" : null;
    const clashWinner: Winner = aDefeated && bDefeated ? "draw" : aDefeated ? "B" : bDefeated ? "A" : result.winner;
    const clash: TeamClashResult = {
      ...result,
      winner: clashWinner,
      aHealth,
      bHealth,
      log,
      aCard: teamCurrentA,
      bCard: teamCurrentB,
      aIndex: teamBattle.aIndex,
      bIndex: teamBattle.bIndex,
    };

    setTeamBattle((current) => current ? ({
      ...current,
      aIndex: nextAIndex,
      bIndex: nextBIndex,
      aHealth: aFinished ? 0 : aDefeated ? lineups.A[nextAIndex].hp : aHealth,
      bHealth: bFinished ? 0 : bDefeated ? lineups.B[nextBIndex].hp : bHealth,
      clashes: [...current.clashes, clash],
      lastClash: clash,
      winner,
    }) : current);
    void gameAudio.playClash();
    void gameAudio.playOutcome(winner ?? clashWinner);

    if (winner) {
      setBattleStep("done");
      void gameAudio.setMode("result");
    } else {
      setBattleStep("reveal");
      void gameAudio.playAdvance();
    }
  };

  const finishTeamBattle = () => {
    if (!teamBattle?.winner) return;
    setPhase("result");
    void gameAudio.setMode("result");
  };

  const nextRound = () => {
    if (round === activeRoundCount - 1) {
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
          <p>{gameMode === "team" ? "抽10选7 · 团战模式" : gameMode === "fate" ? "抽5选3 · 命运事件赛" : "抽8选5 · 1V1裁判模式"}</p>
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
      <img className="lobby-hero-art" src={heroBackground} alt="" aria-hidden="true" />
      <section className="lobby-intro">
        <div className="lobby-orbit"><Crown size={30} /></div>
        <h2>{gameMode === "team" ? "让整支队伍上场" : gameMode === "fate" ? "抽五张，选三张，命运翻牌！" : "这张卡是欧皇是非酋？开了再说！决战一把！"}</h2>
        <p>{gameMode === "team" ? "两位玩家各揭晓十张、选择七张，系统随机安排顺序；当前卡牌生命归零后才会换下一张，击败一张后会承受最大生命20%的疲劳伤害。" : gameMode === "fate" ? "双方各自交替揭晓五张卡，按顺序选择三张出战；每局公开一张命运事件和一张公共战术牌，只有生命、攻击、防御三项数值也能打出变化。" : "两位玩家交替揭晓八张卡，全部抽完后再排出五张王牌，第三个人拿手机见证每一局翻牌。"}</p>
        <div className="mode-picker" aria-label="选择对战模式">
          <button type="button" className={`mode-option ${gameMode === "duel" ? "is-active" : ""}`} onClick={() => setGameMode("duel")}>
            <Swords size={21} />
            <span><strong>1V1裁判</strong><small>抽8选5 · 五局对决</small></span>
            {gameMode === "duel" && <i>当前</i>}
          </button>
          <button type="button" className={`mode-option mode-option-team ${gameMode === "team" ? "is-active" : ""}`} onClick={() => setGameMode("team")}>
            <Flame size={21} />
            <span><strong>团战模式</strong><small>抽10选7 · 卡死才换人</small></span>
            {gameMode === "team" && <i>当前</i>}
          </button>
          <button type="button" className={`mode-option mode-option-fate ${gameMode === "fate" ? "is-active" : ""}`} onClick={() => setGameMode("fate")}>
            <Sparkles size={21} />
            <span><strong>命运事件赛</strong><small>抽5选3 · 事件+公共战术</small></span>
            {gameMode === "fate" && <i>当前</i>}
          </button>
        </div>
        <button className="primary-action action-large" type="button" onClick={startMatch}>
          <Sparkles size={18} /> {gameMode === "team" ? "开始团战" : gameMode === "fate" ? "开始事件赛" : "开始一局"} <ChevronRight size={18} />
        </button>
      </section>
      <section className="lobby-roles" aria-label="对局角色">
        <div className="role-card role-blue">
          <CircleUserRound size={24} />
          <div><strong>贝拉阵营</strong><span>{gameMode === "team" ? "交替揭晓10张 · 选7张" : gameMode === "fate" ? "交替揭晓5张 · 选3张" : "交替揭晓8张 · 选5张"}</span></div>
        </div>
        <div className="role-card role-violet">
          <CircleUserRound size={24} />
          <div><strong>芊辰阵营</strong><span>{gameMode === "team" ? "交替揭晓10张 · 选7张" : gameMode === "fate" ? "交替揭晓5张 · 选3张" : "交替揭晓8张 · 选5张"}</span></div>
        </div>
        <div className="role-card role-gold">
          <Eye size={24} />
          <div><strong>裁判</strong><span>{gameMode === "team" ? "拿手机 · 公开团战" : gameMode === "fate" ? "拿手机 · 公开事件与战术" : "拿手机 · 公开五局"}</span></div>
        </div>
      </section>
      <section className="pool-strip">
        <div><span className="section-kicker">本局卡池</span><strong>{cards.length}张动漫卡</strong><small className="pool-rule">每张牌等概率 · 不设稀有度保底</small></div>
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
          <p>{privateStage === "draw" ? `双方交替揭牌：${contestantShortName(privatePlayer)}阵营正在揭晓第 ${drawIndex + 1} 张。` : gameMode === "team" ? "十张都已揭晓，现在选择七张；系统会随机安排出战顺序。" : gameMode === "fate" ? "五张都已揭晓，现在按顺序选择三张；每局会公开事件和公共战术牌。" : "八张都已揭晓，现在按出战顺序选择五张。"}</p>
        </div>
        <div className="private-step" aria-label={`当前私密阶段：${contestantName(privatePlayer)}`}><span className={privatePlayer === "A" ? "is-active" : ""}>A</span><i /><span className={privatePlayer === "B" ? "is-active" : ""}>B</span></div>
      </section>
      {privateStage === "draw" ? (
        <section className="single-reveal-panel">
          <div className="draw-progress-head">
            <strong>第 {drawIndex + 1} / {activePackSize} 张</strong>
            <div className="draw-markers" aria-label={`已揭晓${drawIndex + (drawFaceUp ? 1 : 0)}张`}>
              {Array.from({ length: activePackSize }, (_, index) => (
                <i className={index < drawIndex ? "is-past" : index === drawIndex ? "is-current" : ""} key={index}>{index < drawIndex ? "✓" : index + 1}</i>
              ))}
            </div>
          </div>
          <p className="reveal-instruction">{drawFaceUp ? drawImageState === "loaded" ? currentDrawCard?.name : "卡面揭晓中" : "轻触卡背，揭晓角色"}</p>
          <div className={`single-card-stage ${drawFaceUp ? "is-revealed" : ""}`}>
            <div className="reveal-rays" aria-hidden="true" />
            {currentDrawCard && (
              <CardTile
                key={`${privatePlayer}-${drawIndex}-${drawFaceUp ? "front" : "back"}`}
                card={currentDrawCard}
                faceUp={drawFaceUp}
                large
                onImageStateChange={setDrawImageState}
                onClick={drawFaceUp ? undefined : revealDrawCard}
              />
            )}
          </div>
          <button type="button" className="primary-action reveal-next-action" disabled={!drawFaceUp} onClick={advanceDraw}>
            {privatePlayer === "B" && drawIndex === activePackSize - 1 ? <Swords size={18} /> : <Hand size={18} />}
            {privatePlayer === "B" && drawIndex === activePackSize - 1 ? `查看${activePackSize}张卡，安排阵容` : `交给${contestantShortName(privatePlayer === "A" ? "B" : "A")}，揭晓下一张`}
          </button>
          <div className="privacy-reminder"><LockKeyhole size={15} /> 其他玩家请转身</div>
        </section>
      ) : (
        <section className="private-panel selection-panel">
          <div className="private-panel-top">
            <div><strong>{gameMode === "team" ? "选择7张团战卡" : gameMode === "fate" ? "选择3张事件赛卡牌" : "安排5张出战牌"}</strong><span>{gameMode === "team" ? "选中的卡会在团战中随机出场" : gameMode === "fate" ? "点击顺序就是第1～3局的出场顺序" : "点击顺序就是第1～5局的出场顺序"}</span></div>
            <span className="selection-count">已选 {selection.length}<small>/{activeLineupSize}</small></span>
          </div>
          <div className={`lineup-preview ${gameMode === "team" ? "lineup-preview-team" : gameMode === "fate" ? "lineup-preview-fate" : ""}`} aria-label={gameMode === "team" ? "七张团战卡" : gameMode === "fate" ? "三张事件赛出战牌顺序" : "五张出战牌顺序"}>
            {Array.from({ length: activeLineupSize }, (_, index) => {
              const card = currentSelection[index];
              return (
                <div className={`lineup-slot ${card ? "is-filled" : ""}`} key={index}>
                  <span>{gameMode === "team" ? "★" : index + 1}</span>
                  {card ? <img src={card.image} alt={card.name} /> : <Swords size={20} />}
                  <small>{card?.name ?? `第${index + 1}局`}</small>
                </div>
              );
            })}
          </div>
          <div className="private-pack selection-pack">
            {currentPack.map((card) => (
                <CardTile key={card.id} card={card} faceUp selected={selection.includes(card.id)} order={gameMode !== "team" ? selection.indexOf(card.id) + 1 : undefined} onClick={() => toggleSelection(card.id)} />
            ))}
          </div>
          <div className="private-actions">
            <div className="reveal-note"><Eye size={16} /> {gameMode === "team" ? "选中的7张会随机出战" : gameMode === "fate" ? "每局会公开一张命运事件和一张公共战术牌" : "再点已选卡牌可取消"}</div>
            <button type="button" className="primary-action" disabled={selection.length !== activeLineupSize} onClick={lockLineup}>
              <LockKeyhole size={17} /> 锁定{activeLineupSize}张阵容并交给裁判
            </button>
          </div>
        </section>
      )}
    </main>
  );

  const renderTeamBattle = () => {
    if (!teamBattle) return null;
    const aCard = teamCurrentA;
    const bCard = teamCurrentB;
    const markerIndex = Math.min(TEAM_LINEUP_SIZE - 1, Math.max(teamBattle.aIndex, teamBattle.bIndex));
    const aHealth = teamBattle.aHealth;
    const bHealth = teamBattle.bHealth;
    const aFaceUp = battleStep !== "reveal";
    const bFaceUp = battleStep !== "reveal";
    const aRemaining = Math.max(0, lineups.A.length - teamBattle.aIndex);
    const bRemaining = Math.max(0, lineups.B.length - teamBattle.bIndex);
    const buttonLabel = battleStep === "reveal"
      ? `公开当前卡牌（${markerIndex + 1}/${TEAM_LINEUP_SIZE}）`
      : battleStep === "fight"
        ? "战斗至一方卡牌退场"
        : "查看团战结果";
    const buttonAction = battleStep === "reveal" ? revealRound : battleStep === "fight" ? startTeamFight : finishTeamBattle;
    const currentLog = teamBattle.lastClash?.log[teamBattle.lastClash.log.length - 1];

    return (
      <main className="battle-layout team-battle-layout">
        <PlayerRail
          player="A"
          color="blue"
          card={aCard}
          faceUp={aFaceUp}
          health={aHealth}
          score={aRemaining}
          scoreLabel="张"
          roster={lineups.A}
          activeIndex={teamBattle.aIndex}
          status={teamBattle.winner ? (teamBattle.winner === "A" ? "团战胜利" : "全队出局") : `第${Math.min(teamBattle.aIndex + 1, TEAM_LINEUP_SIZE)}张出战`}
        />
        <section className="battle-stage">
          <div className="stage-header">
            <div><span className="section-kicker">团战裁判中</span><h2>第{markerIndex + 1}组卡牌 <small>/ 共{TEAM_LINEUP_SIZE}张轮换</small></h2></div>
            <div className="round-markers team-round-markers">{Array.from({ length: TEAM_LINEUP_SIZE }, (_, index) => <i className={index < markerIndex ? "is-past" : index === markerIndex ? "is-current" : ""} key={index}>{index < markerIndex ? "✓" : index + 1}</i>)}</div>
          </div>
          <div className="team-battle-rule"><Flame size={15} /> 每张卡生命归零后才换下一张 · 击败一张后额外承受最大生命20%的疲劳伤害 · 出战顺序已随机</div>
          <div className="duel-table">
            <div className={`duel-card-wrap ${aFaceUp ? "revealed" : ""}`}><CardTile card={aCard} faceUp={aFaceUp} large /></div>
            <div className="versus-mark"><span>VS</span><i /></div>
            <div className={`duel-card-wrap ${bFaceUp ? "revealed" : ""}`}><CardTile card={bCard} faceUp={bFaceUp} large /></div>
          </div>
          <div className="health-duel">
            <div className="duel-health duel-blue"><span>{Math.max(0, aHealth)}</span><div><i style={{ width: `${Math.max(0, Math.min(100, ((aHealth ?? 0) / (aCard?.hp || 1)) * 100))}%` }} /></div></div>
            <div className="duel-health duel-violet"><div><i style={{ width: `${Math.max(0, Math.min(100, ((bHealth ?? 0) / (bCard?.hp || 1)) * 100))}%` }} /></div><span>{Math.max(0, bHealth)}</span></div>
          </div>
          {teamBattle.lastClash && <div className="battle-result-note"><Flame size={16} /> {winnerLabel(teamBattle.lastClash.winner)} <span>{currentLog}</span></div>}
          <div className="referee-console">
            <div className="referee-label"><Eye size={18} /><div><strong>裁判</strong><span>当前卡牌打到生命归零，系统再换下一张</span></div></div>
            <button type="button" className={`primary-action referee-action ${battleStep === "done" ? "is-next" : ""}`} onClick={buttonAction}>
              {battleStep === "reveal" ? <Eye size={18} /> : battleStep === "fight" ? <Swords size={18} /> : <ChevronRight size={18} />}
              {buttonLabel}
            </button>
          </div>
        </section>
        <PlayerRail
          player="B"
          color="violet"
          card={bCard}
          faceUp={bFaceUp}
          health={bHealth}
          score={bRemaining}
          scoreLabel="张"
          roster={lineups.B}
          activeIndex={teamBattle.bIndex}
          status={teamBattle.winner ? (teamBattle.winner === "B" ? "团战胜利" : "全队出局") : `第${Math.min(teamBattle.bIndex + 1, TEAM_LINEUP_SIZE)}张出战`}
        />
      </main>
    );
  };

  const renderBattle = () => {
    if (gameMode === "team") return renderTeamBattle();
    const currentResult = battleResult;
    const currentEvent = isFateMode ? fateEvents[round] : undefined;
    const currentTactic = isFateMode ? fateTactics[round] : undefined;
    const aHealth = currentResult?.aHealth ?? currentA?.hp;
    const bHealth = currentResult?.bHealth ?? currentB?.hp;
    const aFaceUp = battleStep !== "reveal";
    const bFaceUp = battleStep !== "reveal";
    const buttonLabel = battleStep === "reveal"
      ? isFateMode ? `公开第${round + 1}局事件与战术` : `公开第${round + 1}张`
      : battleStep === "fight" ? "开始战斗"
        : round === activeRoundCount - 1 ? "查看最终结果" : "进入下一局";
    const buttonAction = battleStep === "reveal" ? revealRound : battleStep === "fight" ? startFight : nextRound;
    return (
      <main className="battle-layout">
        <PlayerRail player="A" color="blue" card={currentA} faceUp={aFaceUp} health={aHealth} score={scoreA} status={battleStep === "done" ? (currentResult?.winner === "A" ? "本局胜利" : "继续观察") : "等待裁判公开"} />
        <section className="battle-stage">
          <div className="stage-header">
            <div><span className="section-kicker">{isFateMode ? "命运事件裁判中" : "裁判进行中"}</span><h2>第{round + 1}局 <small>/ 共{activeRoundCount}局</small></h2></div>
            <div className="round-markers">{Array.from({ length: activeRoundCount }, (_, index) => <i className={index < round ? "is-past" : index === round ? "is-current" : ""} key={index}>{index < round ? "✓" : index + 1}</i>)}</div>
          </div>
          {isFateMode && (
            <div className="fate-public-panel">
              <div className="fate-event-card"><span>命运事件</span><strong>{battleStep === "reveal" ? "待揭晓" : currentEvent?.name}</strong><small>{battleStep === "reveal" ? "点击公开按钮，查看本局规则" : currentEvent?.description}</small></div>
              <PublicTacticCard tactic={currentTactic} revealed={battleStep !== "reveal"} />
            </div>
          )}
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
            <div className="referee-label"><Eye size={18} /><div><strong>裁判</strong><span>{isFateMode ? "先公开事件与战术，再按数值结算本局" : "只公开当前局，系统自动扣血"}</span></div></div>
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

  const renderTeamResult = () => {
    const winner = teamBattle?.winner ?? "draw";
    return (
      <main className="result-layout team-result-layout">
        <section className="result-hero">
          <div className="result-crown"><Trophy size={32} /></div>
          <span className="section-kicker">团战结束</span>
          <h2>{winner === "draw" ? "两队同归于尽，平局" : `${contestantName(winner)}赢下团战`}</h2>
          <p>每张卡都坚持到生命归零才退场，出战顺序由系统随机安排。</p>
          <button type="button" className="primary-action action-large" onClick={reset}><RotateCcw size={18} /> 再来一局</button>
        </section>
        <section className="result-table">
          <div className="result-table-head"><strong>团战逐组战报</strong><span>共{teamBattle?.clashes.length ?? 0}组卡牌退场</span></div>
          {teamBattle?.clashes.map((result, index) => (
            <div className="result-row team-result-row" key={`${result.aCard.id}-${result.bCard.id}-${index}`}>
              <span className="result-round">第{index + 1}组</span>
              <div className="result-card-name"><img src={result.aCard.image} alt="" /><span>{result.aCard.name}<small>剩余 {Math.max(0, result.aHealth)} HP</small></span></div>
              <strong className={`result-winner ${result.winner === "A" ? "winner-a" : result.winner === "B" ? "winner-b" : "winner-draw"}`}>{result.winner === "draw" ? "同归" : `${contestantShortName(result.winner)}胜`}</strong>
              <div className="result-card-name is-right"><span>{result.bCard.name}<small>剩余 {Math.max(0, result.bHealth)} HP</small></span><img src={result.bCard.image} alt="" /></div>
            </div>
          ))}
        </section>
      </main>
    );
  };

  const renderResult = () => {
    if (gameMode === "team") return renderTeamResult();
    return (
      <main className="result-layout">
        <section className="result-hero">
          <div className="result-crown"><Trophy size={32} /></div>
          <span className="section-kicker">{isFateMode ? "命运事件赛结束" : "五局结束"}</span>
          <h2>{finalWinner === "draw" ? "势均力敌，平局" : `${contestantName(finalWinner)}赢下本场`}</h2>
          <p>{isFateMode ? "三局事件与公共战术全部结算完毕；胜局相同时按剩余生命判定。" : scoreA === scoreB ? "胜局相同时按五张卡的剩余生命判定。" : "卡牌的顺序、稀有度和每一次扣血，都在这一刻留下了结果。"}</p>
          <button type="button" className="primary-action action-large" onClick={reset}><RotateCcw size={18} /> 再来一局</button>
        </section>
        <section className="result-table">
          <div className="result-table-head"><strong>{isFateMode ? "事件赛战报" : "对局回放"}</strong><span>贝拉阵营 {scoreA} : {scoreB} 芊辰阵营</span></div>
          {roundResults.map((result, index) => (
            <div className="result-row" key={`${result.aCard.id}-${result.bCard.id}`}>
              <span className="result-round">第{index + 1}局</span>
              <div className="result-card-name"><img src={result.aCard.image} alt="" /><span>{result.aCard.name}</span></div>
              <strong className={`result-winner ${result.winner === "A" ? "winner-a" : result.winner === "B" ? "winner-b" : "winner-draw"}`}>{result.winner === "draw" ? "平局" : `${contestantShortName(result.winner)}胜`}</strong>
              <div className="result-card-name is-right"><span>{result.bCard.name}</span><img src={result.bCard.image} alt="" /></div>
              {isFateMode && <small className="result-fate-rule">{result.event?.name} · {result.tactic?.name}</small>}
            </div>
          ))}
        </section>
      </main>
    );
  };

  return (
    <div className="app-shell">
      {renderHeader()}
      {phase === "lobby" && renderLobby()}
      {phase === "private" && renderPrivate()}
      {phase === "battle" && renderBattle()}
      {phase === "result" && renderResult()}
      <footer className="app-footer"><span>贝拉卡斗场 · {cards.length}张卡池</span><span>第三人裁判模式</span></footer>
    </div>
  );
}

export default App;
