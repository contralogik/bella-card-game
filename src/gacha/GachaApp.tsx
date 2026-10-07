import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, CircleHelp, LockKeyhole, Search, Sparkles, X } from "lucide-react";
import {
  CARDS,
  CARD_ART_BASE,
  CARDS_PER_PACK,
  ALTERNATE_PORTRAIT_SHEET,
  GARDEN_ART,
  MAX_DAILY_PACKS,
  PACK_ART,
  PITY_THRESHOLDS,
  PORTRAIT_SHEET,
  RARITIES,
  RARITY_ORDER,
  type FairyCard,
  type PityRarity,
  type Rarity,
} from "./data";
import {
  loadGameState,
  openPackages,
  ownedCopyCount,
  ownedUniqueCount,
  refreshDay,
  saveGameState,
  type DrawBatch,
  type DrawnCard,
  type GameState,
} from "./storage";
import "./styles.css";

type Page = "pack" | "album";
type Filter = Rarity | "ALL";

const rarityLabel = (rarity: Rarity) => RARITIES.find((item) => item.code === rarity)?.label ?? "";
const rarityName = (rarity: Rarity) => (rarity === "HIDDEN" ? "隐藏" : rarity);

function readPageFromHash(): Page {
  return window.location.hash === "#album" ? "album" : "pack";
}

function CardArtwork({ card, locked = false }: { card: FairyCard; locked?: boolean }) {
  const spritePosition = card.portraitIndex === undefined
    ? undefined
    : `${((card.portraitIndex % 4) / 3) * 100}% ${(Math.floor(card.portraitIndex / 4) / 5) * 100}%`;
  const style = card.imageFile
    ? { backgroundImage: `url("${CARD_ART_BASE}${card.imageFile}")`, backgroundSize: "cover", backgroundPosition: "center 32%" }
    : {
        backgroundImage: `url("${card.portraitSet === "alternate" ? ALTERNATE_PORTRAIT_SHEET : PORTRAIT_SHEET}")`,
        backgroundSize: "400% 600%",
        backgroundPosition: spritePosition,
      };

  return (
    <div className={`card-art ${locked ? "card-art-locked" : ""} ${locked && card.rarity === "HIDDEN" ? "card-art-secret" : ""}`} style={style} aria-hidden="true">
      {locked && card.rarity === "HIDDEN" && (
        <div className="secret-silhouette">
          <CircleHelp size={40} strokeWidth={1.5} />
          <span>?</span>
        </div>
      )}
      {locked && card.rarity !== "HIDDEN" && <div className="silhouette-veil" />}
    </div>
  );
}

function CardFace({
  card,
  copies,
  locked = false,
  isNew = false,
  pityTriggered = false,
  onClick,
  delay = 0,
}: {
  card: FairyCard;
  copies?: number;
  locked?: boolean;
  isNew?: boolean;
  pityTriggered?: boolean;
  onClick?: () => void;
  delay?: number;
}) {
  const Tag = onClick ? "button" : "article";
  const name = locked ? (card.rarity === "HIDDEN" ? "隐藏仙子 · ???" : "尚未遇见") : card.name;
  const detail = locked ? (card.rarity === "HIDDEN" ? "神秘卡片" : "遇见后收入卡册") : card.element;
  const style = { "--card-delay": `${delay}ms` } as React.CSSProperties;

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`collectible-card rarity-${card.rarity.toLowerCase()} ${locked ? "is-locked" : ""} ${isNew ? "is-new" : ""}`}
      style={style}
      aria-label={locked ? name : `${card.name}，${rarityName(card.rarity)}，${copies ?? 1}张`}
    >
      <div className="card-art-frame">
        <CardArtwork card={card} locked={locked} />
        <span className="rarity-stamp">{rarityName(card.rarity)}</span>
        {locked && <span className="locked-mark"><LockKeyhole size={14} /> 未遇见</span>}
        {isNew && <span className="new-mark">新收录</span>}
        {pityTriggered && <span className="pity-mark">保底</span>}
        {!locked && copies !== undefined && copies > 1 && <span className="copies-mark">×{copies}</span>}
      </div>
      <div className="card-caption">
        <strong>{name}</strong>
        <span>{locked ? detail : `${rarityLabel(card.rarity)} · ${detail}`}</span>
      </div>
    </Tag>
  );
}

function PityPanel({ state }: { state: GameState }) {
  const pityRarities: PityRarity[] = ["N", "R", "SR", "SSR", "UR"];
  return (
    <section className="rules-panel" aria-labelledby="pity-heading">
      <div className="section-title-row">
        <div>
          <h2 id="pity-heading">保底进度</h2>
          <p>抽到对应稀有度后，该档进度归零；保底会跨天保留。</p>
        </div>
        <Sparkles className="section-sparkle" size={20} aria-hidden="true" />
      </div>
      <div className="pity-grid">
        {pityRarities.map((rarity) => {
          const threshold = PITY_THRESHOLDS[rarity];
          const progress = Math.min(state.pity[rarity], threshold);
          return (
            <div className={`pity-meter rarity-${rarity.toLowerCase()}`} key={rarity}>
              <div className="pity-meter-label">
                <strong>{rarity}</strong>
                <span>{progress} / {threshold}</span>
              </div>
              <div className="pity-track" role="progressbar" aria-label={`${rarity}保底进度`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={threshold}>
                <span style={{ width: `${(progress / threshold) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RatePanel() {
  return (
    <section className="rate-panel" aria-labelledby="rates-heading">
      <div className="section-title-row rate-title-row">
        <div>
          <h2 id="rates-heading">稀有度概率</h2>
          <p>先抽稀有度，再从该档所有卡片形态中等概率抽取。</p>
        </div>
      </div>
      <div className="rate-grid">
        {RARITIES.map((rarity) => (
          <div className={`rate-item rarity-${rarity.code.toLowerCase()}`} key={rarity.code}>
            <span className="rate-code">{rarity.code === "HIDDEN" ? "隐藏" : rarity.code}</span>
            <strong>{rarity.rateText}</strong>
          </div>
        ))}
      </div>
      <div className="rate-notes">
        <span>每包 5 张卡 · 每天最多拆 15 包</span>
        <span>隐藏卡 0.05%，没有保底</span>
      </div>
      <p className="pity-explainer">基础概率合计 100%。N、R、SR、SSR、UR 分别在 5、8、16、35、100 抽保底；每档单独累计。</p>
    </section>
  );
}

function AppHeader({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <header className="app-header">
      <button className="brand-mark" type="button" onClick={() => onNavigate("pack")} aria-label="回到开卡包">
        <Sparkles size={21} strokeWidth={1.8} aria-hidden="true" />
        <span>叶罗丽星愿卡册</span>
      </button>
      <nav className="main-nav" aria-label="游戏页面">
        <button type="button" className={page === "pack" ? "is-active" : ""} aria-current={page === "pack" ? "page" : undefined} onClick={() => onNavigate("pack")}>
          <Sparkles size={16} aria-hidden="true" />
          <span>开卡包</span>
        </button>
        <button type="button" className={page === "album" ? "is-active" : ""} aria-current={page === "album" ? "page" : undefined} onClick={() => onNavigate("album")}>
          <BookOpen size={17} aria-hidden="true" />
          <span>我的卡册</span>
        </button>
      </nav>
    </header>
  );
}

function OpenPackView({
  state,
  opening,
  onOpen,
}: {
  state: GameState;
  opening: boolean;
  onOpen: () => void;
}) {
  const remaining = Math.max(0, MAX_DAILY_PACKS - state.packagesToday);
  return (
    <section className="pack-stage" aria-labelledby="pack-heading">
      <div className="pack-copy">
        <h1 id="pack-heading">今天想遇见哪位仙子？</h1>
        <p>每包 5 张 · 每天最多拆 15 包</p>
      </div>
      <div className={`pack-display ${opening ? "is-opening" : ""}`}>
        <span className="pack-halo" aria-hidden="true" />
        <img src={PACK_ART} alt="叶罗丽星愿卡包" fetchPriority="high" />
      </div>
      <div className="pack-actions">
        <button type="button" className="primary-action" onClick={onOpen} disabled={remaining === 0 || opening}>
          <span>{opening ? "星愿正在开启…" : remaining === 0 ? "今天的卡包拆完啦" : "拆开一包"}</span>
          {!opening && remaining > 0 && <ChevronRight size={20} strokeWidth={2.1} aria-hidden="true" />}
        </button>
        <p className="daily-counter">今日已拆 <strong>{state.packagesToday}</strong> / {MAX_DAILY_PACKS} 包</p>
        {remaining === 0 && <p className="limit-note" role="status">今天的星愿已经用完，明天还可以继续拆卡包。</p>}
      </div>
    </section>
  );
}

function RevealView({
  batch,
  state,
  onOpen,
  onAlbum,
  opening,
}: {
  batch: DrawBatch;
  state: GameState;
  onOpen: () => void;
  onAlbum: () => void;
  opening: boolean;
}) {
  const newCount = batch.cards.filter((item) => item.isNew).length;
  const remaining = Math.max(0, MAX_DAILY_PACKS - state.packagesToday);
  return (
    <section className="reveal-stage" id="draw-result" aria-labelledby="reveal-heading" aria-live="polite">
      <div className="pack-copy reveal-copy">
        <h1 id="reveal-heading">仙子们来啦！</h1>
        <p>本次拆开 {batch.cards.length} 张卡 · {newCount} 张新收录</p>
      </div>
      <div className="result-grid">
        {batch.cards.map((item: DrawnCard, index) => (
          <CardFace
            key={`${item.card.id}-${item.packageNumber}-${index}`}
            card={item.card}
            copies={item.copiesOwned}
            isNew={item.isNew}
            pityTriggered={item.pityTriggered}
            delay={(index % CARDS_PER_PACK) * 70}
          />
        ))}
      </div>
      <p className="saved-note"><BookOpen size={17} strokeWidth={1.8} aria-hidden="true" />新卡已自动收入卡册</p>
      <div className="reveal-actions">
        <button type="button" className="primary-action" onClick={onOpen} disabled={remaining === 0 || opening}>
          <span>{opening ? "星愿正在开启…" : remaining === 0 ? "今天的卡包拆完啦" : "再拆一包"}</span>
          {!opening && remaining > 0 && <ChevronRight size={20} aria-hidden="true" />}
        </button>
        <button type="button" className="text-action" onClick={onAlbum}>查看卡册 <ChevronRight size={17} aria-hidden="true" /></button>
      </div>
      <p className="daily-counter">今日已拆 <strong>{state.packagesToday}</strong> / {MAX_DAILY_PACKS} 包</p>
    </section>
  );
}

function CollectionPage({
  state,
  filter,
  onFilter,
  query,
  onQuery,
  onSelect,
  onLocked,
  onOpenPack,
}: {
  state: GameState;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (card: FairyCard) => void;
  onLocked: () => void;
  onOpenPack: () => void;
}) {
  const uniqueCount = ownedUniqueCount(state);
  const copyCount = ownedCopyCount(state);
  const orderedCards = useMemo(() => {
    const sorted = [...CARDS].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return sorted.filter((card) => {
      const matchesRarity = filter === "ALL" || card.rarity === filter;
      const haystack = `${card.character ?? card.name} ${card.form ?? ""} ${card.name} ${card.element}`.toLocaleLowerCase();
      return matchesRarity && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [filter, query]);

  return (
    <main className="album-page">
      <section className="album-intro" aria-labelledby="album-heading">
        <h1 id="album-heading">我的卡册</h1>
        <p className="collection-count">已收录 <strong>{uniqueCount}</strong> / {CARDS.length} 张</p>
        <p className="album-subtitle">拆开卡包，遇见仙境伙伴</p>
        <p className="copy-count">目前共有 {copyCount} 张卡 · 收录进度按不同卡片统计</p>
      </section>

      <div className="filter-row" role="group" aria-label="按稀有度筛选">
        <button type="button" className={filter === "ALL" ? "is-selected" : ""} aria-pressed={filter === "ALL"} onClick={() => onFilter("ALL")}>全部</button>
        {RARITY_ORDER.map((rarity) => (
          <button
            type="button"
            key={rarity}
            className={`rarity-${rarity.toLowerCase()} ${filter === rarity ? "is-selected" : ""}`}
            aria-pressed={filter === rarity}
            onClick={() => onFilter(rarity)}
          >
            {rarityName(rarity)}
          </button>
        ))}
      </div>

      <div className="collection-tools">
        <label className="collection-search">
          <Search size={17} aria-hidden="true" />
          <span className="visually-hidden">搜索人物或卡片形态</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="搜索人物或形态"
            aria-label="搜索人物或形态"
          />
        </label>
        <span className="visible-card-count">显示 {orderedCards.length} / {CARDS.length} 张卡</span>
      </div>

      <section className="album-grid" aria-label="卡片收藏列表">
        {orderedCards.map((card) => {
          const copies = state.collection[card.id] ?? 0;
          return (
            <CardFace
              key={card.id}
              card={card}
              copies={copies}
              locked={copies === 0}
              onClick={() => copies > 0 ? onSelect(card) : onLocked()}
            />
          );
        })}
      </section>

      {orderedCards.length === 0 && (
        <p className="no-card-results" role="status">没有找到符合条件的卡片，试试其他人物或形态名称。</p>
      )}

      {uniqueCount === 0 && (
        <div className="empty-collection">
          <p>第一张卡片，正在卡包里等你。</p>
          <button type="button" className="text-action" onClick={onOpenPack}>去拆第一包 <ChevronRight size={17} aria-hidden="true" /></button>
        </div>
      )}
      <p className="album-footer-note">重复卡会累积张数；隐藏卡只会在收录后揭晓。</p>
    </main>
  );
}

function CardDetail({ card, copies, onClose }: { card: FairyCard; copies: number; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <section className={`card-dialog rarity-${card.rarity.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="card-dialog-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="关闭"><X size={20} /></button>
        <div className="dialog-art"><CardArtwork card={card} /></div>
        <div className="dialog-copy">
          <span className="dialog-rarity">{rarityName(card.rarity)} · {rarityLabel(card.rarity)}</span>
          <h2 id="card-dialog-title">{card.name}</h2>
          <p className="dialog-form">{card.character ?? card.name} · {card.form ?? "星愿初遇"}</p>
          <p className="dialog-element">{card.element}</p>
          <p>{card.note}</p>
          <span className="dialog-copies">卡册里有 {copies} 张</span>
        </div>
      </section>
    </div>
  );
}

function GachaApp() {
  const [page, setPage] = useState<Page>(readPageFromHash);
  const [game, setGame] = useState<GameState>(loadGameState);
  const [lastBatch, setLastBatch] = useState<DrawBatch | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<FairyCard | null>(null);
  const [notice, setNotice] = useState("");
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const gameRef = useRef(game);
  const noticeTimer = useRef<number | undefined>(undefined);
  const openingTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    gameRef.current = game;
    saveGameState(game);
  }, [game]);

  useEffect(() => {
    const syncPage = () => setPage(readPageFromHash());
    const refreshDailyLimit = () => setGame((current) => refreshDay(current));
    const timer = window.setInterval(refreshDailyLimit, 30_000);
    window.addEventListener("hashchange", syncPage);
    window.addEventListener("popstate", syncPage);
    window.addEventListener("focus", refreshDailyLimit);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("hashchange", syncPage);
      window.removeEventListener("popstate", syncPage);
      window.removeEventListener("focus", refreshDailyLimit);
      if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
      if (openingTimer.current !== undefined) window.clearTimeout(openingTimer.current);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    if (lastBatch && page === "pack") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [lastBatch, page]);

  const navigate = (next: Page) => {
    setPage(next);
    const hash = next === "album" ? "#album" : "#pack";
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const handleOpen = () => {
    if (openingRef.current) return;
    const remaining = MAX_DAILY_PACKS - refreshDay(gameRef.current).packagesToday;
    if (remaining <= 0) return;
    openingRef.current = true;
    setOpening(true);
    openingTimer.current = window.setTimeout(() => {
      const batch = openPackages(gameRef.current, 1);
      if (batch.packagesOpened > 0) {
        setGame(batch.state);
        gameRef.current = batch.state;
        setLastBatch(batch);
      }
      openingRef.current = false;
      setOpening(false);
    }, 360);
  };

  return (
    <div className="gacha-shell" style={{ "--garden-image": `url("${GARDEN_ART}")` } as React.CSSProperties}>
      <AppHeader page={page} onNavigate={navigate} />
      {page === "pack" ? (
        <main className="pack-page">
          {lastBatch ? (
            <RevealView batch={lastBatch} state={game} onOpen={handleOpen} onAlbum={() => navigate("album")} opening={opening} />
          ) : (
            <OpenPackView state={game} opening={opening} onOpen={handleOpen} />
          )}
          <div className="game-rules">
            <PityPanel state={game} />
            <RatePanel />
          </div>
        </main>
      ) : (
        <CollectionPage
          state={game}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          onSelect={setSelectedCard}
          onLocked={() => showNotice("拆开卡包后，就能在这里遇见这位仙子。")}
          onOpenPack={() => navigate("pack")}
        />
      )}
      <footer className="app-footer">卡册、抽卡次数和保底进度保存在这台设备的浏览器中。</footer>
      {notice && <div className="notice-toast" role="status">{notice}</div>}
      {selectedCard && <CardDetail card={selectedCard} copies={game.collection[selectedCard.id] ?? 1} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}

export default GachaApp;
