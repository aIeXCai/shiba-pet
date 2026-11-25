import type { Personality } from "./types";

const STORAGE_KEY = "smug-shiba-personality-v1";

const defaults: Personality = {
  mood: "得意",
  affection: 35,
  stamina: 72,
  grudge: 0,
  mockery: 88,
  lastInteractionAt: Date.now(),
  revengeAt: 0,
};

export function loadPersonality(): Personality {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function savePersonality(personality: Personality): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personality));
}

export function clampPersonality(personality: Personality): void {
  personality.affection = clamp(personality.affection);
  personality.stamina = clamp(personality.stamina);
  personality.grudge = clamp(personality.grudge);
  personality.mockery = clamp(personality.mockery);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
