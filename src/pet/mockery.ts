import type { PetState } from "./types";

export type MockeryTier =
  | "gentle"
  | "pretending"
  | "smug"
  | "brazen"
  | "menace";

export interface MockeryProfile {
  tier: MockeryTier;
  label: string;
  normalized: number;
  idleDelayFactor: number;
  rareChance: number;
  glanceChance: number;
  tongueChance: number;
}

const PROFILES: readonly Omit<MockeryProfile, "normalized">[] = [
  {
    tier: "gentle",
    label: "乖巧",
    idleDelayFactor: 1.28,
    rareChance: 0.03,
    glanceChance: 0,
    tongueChance: 0.01,
  },
  {
    tier: "pretending",
    label: "装乖",
    idleDelayFactor: 1.12,
    rareChance: 0.055,
    glanceChance: 0.08,
    tongueChance: 0.025,
  },
  {
    tier: "smug",
    label: "微妙",
    idleDelayFactor: 1,
    rareChance: 0.08,
    glanceChance: 0.18,
    tongueChance: 0.05,
  },
  {
    tier: "brazen",
    label: "嚣张",
    idleDelayFactor: 0.86,
    rareChance: 0.12,
    glanceChance: 0.32,
    tongueChance: 0.08,
  },
  {
    tier: "menace",
    label: "欠收拾",
    idleDelayFactor: 0.72,
    rareChance: 0.17,
    glanceChance: 0.48,
    tongueChance: 0.12,
  },
] as const;

export function getMockeryProfile(value: number): MockeryProfile {
  const normalized = Math.max(0, Math.min(1, value / 100));
  const index =
    value < 20 ? 0 : value < 40 ? 1 : value < 60 ? 2 : value < 80 ? 3 : 4;
  return { ...PROFILES[index], normalized };
}

export function getMockeryIdleChoices(
  value: number,
  lowStamina: boolean,
): readonly [PetState, number][] {
  const intensity = Math.max(0, Math.min(1, value / 100));

  if (lowStamina) {
    return [
      ["chin-rest", 8],
      ["tail-sleep", 7],
      ["play-dead", 4 + intensity * 3],
      ["belly-up", 4 + intensity * 4],
      ["back-side-eye", intensity * 4],
      ["tongue", intensity * 2],
    ];
  }

  return [
    ["sitting", 10 - intensity * 2],
    ["chin-rest", 7],
    ["back-side-eye", 2 + intensity * 12],
    ["lick-paw", 5],
    ["scratch-ear", 9],
    ["chase-tail", 3],
    ["tail-sleep", 4],
    ["play-dead", 2 + intensity * 4],
    ["belly-up", 2 + intensity * 5],
    ["tongue", 1 + intensity * 10],
    ["toy", 3],
  ];
}

export function chooseWeightedState(
  choices: readonly [PetState, number][],
  roll = Math.random(),
): PetState {
  const available = choices.filter(([, weight]) => weight > 0);
  const total = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return "sitting";

  let cursor = roll * total;
  for (const [state, weight] of available) {
    cursor -= weight;
    if (cursor <= 0) return state;
  }
  return available[available.length - 1]?.[0] ?? "sitting";
}

export function getMockeryRemark(value: number): string {
  if (value >= 80) return "就这？我都懒得笑。";
  if (value >= 60) return "嗯，你继续表演。";
  if (value >= 40) return "我没有在嘲笑你。";
  if (value >= 20) return "今天先装乖。";
  return "好吧，今天是乖狗。";
}
