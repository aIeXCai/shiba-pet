export type PetState =
  | "idle"
  | "walk"
  | "run"
  | "brake"
  | "lifted"
  | "falling"
  | "squash"
  | "resist"
  | "dizzy"
  | "sitting"
  | "head-pet"
  | "poke-wary"
  | "poke-annoyed"
  | "poke-block"
  | "poke-push"
  | "tongue"
  | "chin-rest"
  | "back-side-eye"
  | "lick-paw"
  | "scratch-ear"
  | "chase-tail"
  | "tail-sleep"
  | "pancake"
  | "sunglasses"
  | "long-dog"
  | "phone"
  | "coffee"
  | "blanket"
  | "sign"
  | "check-alive"
  | "toy"
  | "top-hang"
  | "butt-block"
  | "hide-behind"
  | "play-dead"
  | "belly-up";

export type InteractionZone = "head" | "chin" | "body" | "butt" | "tail";

export interface Point {
  x: number;
  y: number;
}

export interface PointerSample extends Point {
  time: number;
}

export interface WorkArea extends Point {
  width: number;
  height: number;
}

export interface Personality {
  mood: "开心" | "无聊" | "困倦" | "生气" | "得意";
  affection: number;
  stamina: number;
  grudge: number;
  mockery: number;
  lastInteractionAt: number;
  revengeAt: number;
}
