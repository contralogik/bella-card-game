import {
  CARDS,
  CARDS_PER_PACK,
  CARD_BY_ID,
  GUARANTEE_ORDER,
  MAX_DAILY_PACKS,
  PITY_THRESHOLDS,
  RARITIES,
  type FairyCard,
  type PityRarity,
  type Rarity,
} from "./data";

const STORAGE_KEY = "bella-ye-luoli-starwish-v1";

export type PityProgress = Record<PityRarity, number>;
export type GameState = {
  day: string;
  packagesToday: number;
  totalPackages: number;
  totalPulls: number;
  collection: Record<string, number>;
  pity: PityProgress;
};

export type DrawnCard = {
  card: FairyCard;
  isNew: boolean;
  copiesOwned: number;
  pityTriggered: boolean;
  packageNumber: number;
};

export type DrawBatch = {
  state: GameState;
  cards: DrawnCard[];
  packagesOpened: number;
};

const emptyPity = (): PityProgress => ({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });

export const localDayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const createGameState = (): GameState => ({
  day: localDayKey(),
  packagesToday: 0,
  totalPackages: 0,
  totalPulls: 0,
  collection: {},
  pity: emptyPity(),
});

export const refreshDay = (state: GameState, today = localDayKey()): GameState => {
  if (state.day === today) return state;
  return { ...state, day: today, packagesToday: 0 };
};

export const loadGameState = (): GameState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createGameState();

    const parsed = JSON.parse(raw) as Partial<GameState>;
    const collection = Object.fromEntries(
      Object.entries(parsed.collection ?? {})
        .filter(([id, count]) => CARD_BY_ID.has(id) && Number.isFinite(count) && (count ?? 0) > 0)
        .map(([id, count]) => [id, Math.floor(count ?? 0)]),
    );
    const pity = emptyPity();
    for (const rarity of Object.keys(pity) as PityRarity[]) {
      const value = parsed.pity?.[rarity];
      pity[rarity] = Number.isFinite(value) ? Math.max(0, Math.min(PITY_THRESHOLDS[rarity], Number(value))) : 0;
    }

    const loaded: GameState = {
      day: typeof parsed.day === "string" ? parsed.day : localDayKey(),
      packagesToday: Number.isFinite(parsed.packagesToday) ? Math.max(0, Math.min(MAX_DAILY_PACKS, Number(parsed.packagesToday))) : 0,
      totalPackages: Number.isFinite(parsed.totalPackages) ? Math.max(0, Number(parsed.totalPackages)) : 0,
      totalPulls: Number.isFinite(parsed.totalPulls) ? Math.max(0, Number(parsed.totalPulls)) : 0,
      collection,
      pity,
    };
    return refreshDay(loaded);
  } catch {
    return createGameState();
  }
};

export const saveGameState = (state: GameState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep the game playable if browser storage is disabled or full.
  }
};

const rollRarity = (pity: PityProgress): { rarity: Rarity; pityTriggered: boolean } => {
  const guaranteed = GUARANTEE_ORDER.find((rarity) => pity[rarity] >= PITY_THRESHOLDS[rarity] - 1);
  if (guaranteed) return { rarity: guaranteed, pityTriggered: true };

  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const item of RARITIES) {
    cumulative += item.rate;
    if (roll < cumulative) return { rarity: item.code, pityTriggered: false };
  }
  return { rarity: "HIDDEN", pityTriggered: false };
};

const nextPity = (current: PityProgress, received: Rarity): PityProgress => {
  const updated = { ...current };
  for (const rarity of Object.keys(updated) as PityRarity[]) {
    updated[rarity] = rarity === received ? 0 : Math.min(PITY_THRESHOLDS[rarity], updated[rarity] + 1);
  }
  return updated;
};

export const openPackages = (current: GameState, requestedPackages = 1): DrawBatch => {
  const refreshed = refreshDay(current);
  const remaining = Math.max(0, MAX_DAILY_PACKS - refreshed.packagesToday);
  const packagesOpened = Math.max(0, Math.min(Math.floor(requestedPackages), remaining));
  if (packagesOpened === 0) return { state: refreshed, cards: [], packagesOpened: 0 };

  const next: GameState = {
    ...refreshed,
    packagesToday: refreshed.packagesToday,
    totalPackages: refreshed.totalPackages,
    totalPulls: refreshed.totalPulls,
    collection: { ...refreshed.collection },
    pity: { ...refreshed.pity },
  };
  const drawn: DrawnCard[] = [];

  for (let packageIndex = 0; packageIndex < packagesOpened; packageIndex += 1) {
    for (let slot = 0; slot < CARDS_PER_PACK; slot += 1) {
      const result = rollRarity(next.pity);
      const pool = CARDS.filter((card) => card.rarity === result.rarity);
      const card = pool[Math.floor(Math.random() * pool.length)];
      const copiesBefore = next.collection[card.id] ?? 0;
      next.collection[card.id] = copiesBefore + 1;
      next.pity = nextPity(next.pity, result.rarity);
      next.totalPulls += 1;
      drawn.push({
        card,
        isNew: copiesBefore === 0,
        copiesOwned: copiesBefore + 1,
        pityTriggered: result.pityTriggered,
        packageNumber: refreshed.packagesToday + packageIndex + 1,
      });
    }
  }

  next.packagesToday += packagesOpened;
  next.totalPackages += packagesOpened;
  return { state: next, cards: drawn, packagesOpened };
};

export const ownedUniqueCount = (state: GameState) =>
  Object.values(state.collection).filter((count) => count > 0).length;

export const ownedCopyCount = (state: GameState) =>
  Object.values(state.collection).reduce((sum, count) => sum + count, 0);
