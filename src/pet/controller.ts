import {
  ANIMATION_FRAMES,
  BEHAVIOR,
  FRAME_INTERVALS,
  getLiftedFrames,
  getLiftTransition,
  getMotionTransition,
  getPoseTransition,
  LIFT_ENTRY_FRAMES,
  LIFT_TRANSITION_INTERVAL,
  LIFTED_FRAMES,
  MOTION,
  MOTION_TRANSITION_INTERVAL,
  MOTION_TRANSITIONS,
  POSE_TRANSITION_INTERVAL,
  POSE_TRANSITIONS,
  SPRITES,
  STATE_LABELS,
  WINDOW_SIZE,
} from "./config";
import { desktop } from "./desktop";
import {
  clampPersonality,
  loadPersonality,
  savePersonality,
} from "./personality";
import {
  chooseWeightedState,
  getMockeryIdleChoices,
  getMockeryProfile,
  getMockeryRemark,
} from "./mockery";
import type {
  InteractionZone,
  Personality,
  PetState,
  PointerSample,
  WorkArea,
} from "./types";

function required<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const HEAD_POKE_STATES: readonly PetState[] = [
  "poke-wary",
  "poke-annoyed",
  "poke-block",
  "poke-push",
];

export class PetController {
  private readonly pet = required<HTMLButtonElement>("#pet");
  private readonly facing = required<HTMLElement>("#pet-facing");
  private readonly motion = required<HTMLElement>("#pet-motion");
  private readonly sprite = required<HTMLImageElement>("#pet-sprite");
  private readonly previousSprite =
    required<HTMLImageElement>("#pet-previous-sprite");
  private readonly speech = required<HTMLElement>("#speech");
  private readonly panel = required<HTMLElement>("#control-panel");
  private readonly status = required<HTMLElement>("#status-text");
  private readonly moodValue = required<HTMLElement>("#mood-value");
  private readonly grudgeValue = required<HTMLElement>("#grudge-value");
  private readonly mockeryValue =
    required<HTMLOutputElement>("#mockery-value");

  private state: PetState = "idle";
  private personality: Personality = loadPersonality();
  private workArea: WorkArea = {
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  };

  private x = 0;
  private y = 0;
  private targetX = 0;
  private targetY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private dragging = false;
  private falling = false;
  private pointerId: number | null = null;
  private dragStartedAt = 0;
  private grabOffsetX = WINDOW_SIZE / 2;
  private grabOffsetY = WINDOW_SIZE / 2;
  private samples: PointerSample[] = [];
  private lastDirection = 0;
  private pendingFacingDirection = 0;
  private brakeUntil = 0;
  private dizzyUntil = 0;
  private dizzyCooldownUntil = 0;
  private manualState: PetState | null = null;
  private manualStateUntil = 0;
  private pendingPlayDead = false;
  private grabbedZone: InteractionZone = "body";
  private grabStartedState: PetState = "idle";
  private liftTransitionStarted = false;
  private interactionRecoveryUntil = 0;
  private animationStartedAt = performance.now();
  private patrolUntil = 0;
  private patrolDirection = -1;
  private chaseUntil = 0;
  private chaseIsRevenge = false;
  private cursorStealPending = false;
  private avoidUntil = 0;
  private returnXAfterPeek: number | null = null;
  private returnYAfterTop: number | null = null;
  private readonly sessionStartedAt = Date.now();
  private blanketShown = false;
  private coffeeShown = false;
  private lastAliveCheckAt = 0;
  private lastFrameAt = performance.now();
  private nextIdleBehaviorAt = performance.now() + 8_000;
  private speechTimer = 0;
  private mockeryReactionCooldownUntil = 0;
  private headPetTrackingStartedAt = 0;
  private headPetActiveStartedAt = 0;
  private headPetLastMoveAt = 0;
  private headPetLastX: number | null = null;
  private headPetTravel = 0;
  private headPetDirection = 0;
  private headPetDirectionChanges = 0;
  private headPetStage = -1;
  private headPetCooldownUntil = 0;
  private poseTransitionTimer = 0;
  private poseBridge: {
    target: PetState;
    frames: readonly string[];
    startedAt: number;
    interval: number;
    holdFinalFrame: boolean;
  } | null = null;
  private pokeTimes: number[] = [];
  private headPokeCount = 0;
  private headPokeLastAt = 0;
  private headPokeDecayAt = 0;

  async start(): Promise<void> {
    await desktop.initialize();
    this.workArea = await desktop.getWorkArea();

    const existingPosition = await desktop.getPosition();
    const floor = this.floorY;
    const desiredX =
      this.workArea.x + this.workArea.width - WINDOW_SIZE - 36;

    this.x = desktop.isTauri ? desiredX : existingPosition.x;
    this.y = desktop.isTauri ? floor : existingPosition.y;
    this.targetX = this.x;
    this.targetY = this.y;

    desktop.queuePosition({ x: this.x, y: this.y });
    this.preloadSprites();
    this.bindInteractions();
    this.renderPersonality();
    this.setState("idle");
    requestAnimationFrame(this.tick);
  }

  private get floorY(): number {
    return this.workArea.y + this.workArea.height - WINDOW_SIZE;
  }

  private bindInteractions(): void {
    this.pet.addEventListener("pointerdown", this.onPointerDown);
    this.pet.addEventListener("pointermove", this.onPointerMove);
    this.pet.addEventListener("pointerup", this.onPointerUp);
    this.pet.addEventListener("pointercancel", this.onPointerUp);
    this.pet.addEventListener("pointerenter", (event) => {
      if (this.getInteractionZone(event) === "head") return;

      if (!this.dragging && this.state === "back-side-eye") {
        this.setManualState("sitting", 900);
        this.say("谁偷看你了？", 850);
        return;
      }

      const now = performance.now();
      const profile = getMockeryProfile(this.personality.mockery);
      if (
        !this.dragging &&
        this.panel.hidden &&
        now >= this.mockeryReactionCooldownUntil &&
        (this.state === "idle" || this.state === "sitting") &&
        Math.random() < profile.glanceChance
      ) {
        this.mockeryReactionCooldownUntil =
          now + this.randomBetween(7_000, 12_000);
        const showTongue = Math.random() < profile.tongueChance;
        this.setManualState(showTongue ? "tongue" : "back-side-eye", 1_500);
        this.say(
          showTongue
            ? "略。"
            : profile.tier === "menace"
              ? "看什么？没见过帅狗？"
              : "我只是刚好看向这边。",
          1_200,
        );
      }
    });

    this.pet.addEventListener("pointerleave", () => {
      if (this.dragging) return;
      if (this.headPetActiveStartedAt > 0) {
        this.finishHeadPet(performance.now());
      } else {
        this.resetHeadPetTracking();
      }
    });

    this.pet.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.togglePanel(true);
    });

    required<HTMLButtonElement>("#menu-toggle").addEventListener(
      "click",
      () => this.togglePanel(),
    );

    required<HTMLButtonElement>("#panel-close").addEventListener(
      "click",
      () => this.togglePanel(false),
    );

    this.panel.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const action = target.closest<HTMLButtonElement>("[data-action]")
        ?.dataset.action;

      if (!action) return;

      if (action === "head-poke") {
        this.handleHeadPoke(performance.now());
        return;
      }
      const states: Record<string, PetState> = {
        idle: "idle",
        sit: "sitting",
        "head-pet": "head-pet",
        "lick-paw": "lick-paw",
        "scratch-ear": "scratch-ear",
        "chase-tail": "chase-tail",
        dead: "play-dead",
        belly: "belly-up",
      };

      const nextState = states[action];
      if (nextState === "idle") {
        this.clearManualState();
      } else if (nextState === "head-pet") {
        this.startHeadPet(performance.now(), 4_000);
      } else if (nextState) {
        const duration =
          nextState === "lick-paw" ||
          nextState === "scratch-ear" ||
          nextState === "chase-tail"
            ? 4_000
            : 8_000;
        this.setManualState(nextState, duration);
      }
    });

    required<HTMLInputElement>("#size-control").addEventListener(
      "input",
      (event) => {
        const value = Number((event.target as HTMLInputElement).value) / 100;
        document.documentElement.style.setProperty(
          "--pet-scale",
          String(value),
        );
      },
    );

    required<HTMLInputElement>("#mockery-control").addEventListener(
      "input",
      (event) => {
        this.personality.mockery = Number(
          (event.target as HTMLInputElement).value,
        );
        clampPersonality(this.personality);
        savePersonality(this.personality);
        this.renderPersonality();
      },
    );

    required<HTMLInputElement>("#mockery-control").addEventListener(
      "change",
      () => {
        this.say(getMockeryRemark(this.personality.mockery), 1_150);
      },
    );

    required<HTMLInputElement>("#always-on-top").addEventListener(
      "change",
      (event) => {
        const enabled = (event.target as HTMLInputElement).checked;
        void desktop.setAlwaysOnTop(enabled);
      },
    );

    required<HTMLButtonElement>("#quit-button").addEventListener(
      "click",
      () => void desktop.close(),
    );

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.togglePanel(false);
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.panel.hidden) return;

    event.preventDefault();
    this.resetHeadPetTracking();
    const downZone = this.getInteractionZone(event);
    this.grabStartedState = this.poseBridge?.target ?? this.state;
    if (!(downZone === "head" && HEAD_POKE_STATES.includes(this.state))) {
      this.clearManualState();
    }
    this.pet.setPointerCapture(event.pointerId);
    this.pointerId = event.pointerId;
    this.dragging = true;
    this.falling = false;
    this.dragStartedAt = performance.now();
    this.grabbedZone = downZone;
    this.liftTransitionStarted = false;
    this.grabOffsetX = event.clientX;
    this.grabOffsetY = event.clientY;
    this.samples = [];
    this.lastDirection = 0;
    this.pendingFacingDirection = 0;
    this.addSample(event);
    this.pet.classList.add("dragging");
    this.pet.classList.add(`grab-${this.grabbedZone}`);
    if (this.poseBridge?.target === "idle") {
      const now = performance.now();
      const frames = this.poseBridge.frames.slice(
        0,
        Math.min(3, this.poseBridge.frames.length),
      );
      this.poseBridge = {
        ...this.poseBridge,
        frames,
        startedAt: now,
        interval: 50,
      };
      this.interactionRecoveryUntil = now + frames.length * 50;
    } else {
      this.interactionRecoveryUntil = 0;
    }
    this.personality.lastInteractionAt = Date.now();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.pointerId) {
      if (!this.dragging && this.panel.hidden) {
        const zone = this.getInteractionZone(event);
        if (zone === "head") {
          this.trackHeadPet(event);
          return;
        }
        if (this.headPetActiveStartedAt > 0) {
          this.finishHeadPet(performance.now());
          return;
        }
        this.resetHeadPetTracking();
      }

      if (
        !this.dragging &&
        this.getInteractionZone(event) === "chin" &&
        (this.state === "idle" || this.state === "sitting")
      ) {
        this.setManualState("sitting", 420);
        this.status.textContent = "摸下巴可以，别停";
      }
      return;
    }

    event.preventDefault();
    this.targetX = event.screenX - this.grabOffsetX;
    this.targetY = event.screenY - this.grabOffsetY;
    this.addSample(event);
    this.detectReversal();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.pointerId) return;

    event.preventDefault();
    this.dragging = false;
    this.interactionRecoveryUntil = 0;
    this.pet.classList.remove(
      "dragging",
      "grab-head",
      "grab-chin",
      "grab-body",
      "grab-butt",
      "grab-tail",
    );

    if (this.pet.hasPointerCapture(event.pointerId)) {
      this.pet.releasePointerCapture(event.pointerId);
    }

    const now = performance.now();
    const dragDuration = now - this.dragStartedAt;
    const movedDistance = this.pointerDistance();
    const wasPoke = movedDistance < 10 && dragDuration < 420;

    if (dragDuration > MOTION.playDeadAfterMs) {
      this.pendingPlayDead = true;
      this.personality.grudge += 12;
      this.personality.mood = "生气";
    } else if (wasPoke) {
      this.handlePoke(now, this.grabbedZone);
    } else if (dragDuration < 1_800) {
      this.personality.affection += 1;
    }

    clampPersonality(this.personality);
    savePersonality(this.personality);
    this.renderPersonality();

    if (this.y < this.floorY - 12) {
      this.falling = true;
      this.velocityY = Math.max(this.velocityY, 20);
      this.setState(this.dizzyUntil > now ? "dizzy" : "falling");
    } else if (this.pendingPlayDead) {
      this.pendingPlayDead = false;
      this.setManualState("play-dead", 3_200);
    } else if (!wasPoke) {
      this.clearManualState();
    }

    this.pointerId = null;
    this.nextIdleBehaviorAt = now + this.randomBetween(8_000, 14_000);
  };

  private addSample(event: PointerEvent): void {
    const now = performance.now();
    this.samples.push({ x: event.screenX, y: event.screenY, time: now });
    this.samples = this.samples.filter((sample) => sample.time >= now - 1_200);
  }

  private detectReversal(): void {
    if (this.samples.length < 2) return;

    const last = this.samples[this.samples.length - 1];
    const previous = this.samples[this.samples.length - 2];
    const deltaX = last.x - previous.x;

    if (Math.abs(deltaX) < 5) return;

    const direction = Math.sign(deltaX);
    if (
      this.lastDirection !== 0 &&
      direction !== this.lastDirection &&
      Math.abs(this.getVelocity().x) > 420
    ) {
      this.brakeUntil = performance.now() + MOTION.brakeDurationMs;
      this.pendingFacingDirection = direction;
    }

    this.lastDirection = direction;
  }

  private getVelocity(): { x: number; y: number; speed: number } {
    if (this.samples.length < 2) return { x: 0, y: 0, speed: 0 };

    const now = performance.now();
    const newest = this.samples[this.samples.length - 1];
    if (now - newest.time > 150) return { x: 0, y: 0, speed: 0 };

    const recent = this.samples.filter((sample) => sample.time >= now - 150);
    const first = recent[0] ?? this.samples[0];
    const last =
      recent[recent.length - 1] ?? this.samples[this.samples.length - 1];
    const seconds = Math.max((last.time - first.time) / 1_000, 0.001);
    const x = (last.x - first.x) / seconds;
    const y = (last.y - first.y) / seconds;

    return { x, y, speed: Math.hypot(x, y) };
  }

  private directionChanges(): number {
    let changes = 0;
    let direction = 0;

    for (let index = 1; index < this.samples.length; index += 1) {
      const deltaX = this.samples[index].x - this.samples[index - 1].x;
      if (Math.abs(deltaX) < 7) continue;

      const nextDirection = Math.sign(deltaX);
      if (direction !== 0 && nextDirection !== direction) changes += 1;
      direction = nextDirection;
    }

    return changes;
  }

  private pointerDistance(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    return Math.hypot(last.x - first.x, last.y - first.y);
  }

  private handlePoke(now: number, zone: InteractionZone): void {
    if (zone === "head") {
      this.handleHeadPoke(now);
      return;
    }

    this.pokeTimes.push(now);
    this.pokeTimes = this.pokeTimes.filter((time) => time >= now - 2_000);

    if (this.pokeTimes.length >= 5) {
      this.personality.grudge += 8;
      this.personality.mood = "生气";
      this.setManualState("sign", 2_600);
      this.say("最后一次警告。", 1_700);
      this.pokeTimes = [];
    } else if (zone === "butt") {
      this.personality.grudge += 4;
      this.setManualState("back-side-eye", 1_400);
      this.say("你有病吧？", 1_300);
    } else if (zone === "tail") {
      this.setManualState("chase-tail", 1_300);
      this.say("尾巴还我！", 1_100);
    } else if (zone === "chin") {
      this.personality.affection += 2;
      this.setManualState("sitting", 1_100);
      this.say("……再来一下。", 900);
    } else {
      this.setManualState("sitting", 520);
      this.say(this.pokeTimes.length > 2 ? "有完没完。" : "嗯？", 720);
    }
  }

  private handleHeadPoke(now: number): void {
    if (this.headPetActiveStartedAt > 0) this.finishHeadPet(now);
    if (this.poseBridge) this.cancelPoseBridge();

    if (this.headPokeLastAt === 0 || now - this.headPokeLastAt > 5_000) {
      this.headPokeCount = 0;
    }

    this.headPokeCount += 1;
    this.headPokeLastAt = now;
    this.headPokeDecayAt = now + 1_800;
    this.personality.lastInteractionAt = Date.now();

    if (this.headPokeCount <= 2) {
      this.personality.affection += 1;
      this.personality.mood = "得意";
      this.setManualState("poke-wary", 2_400);
      this.say(this.headPokeCount === 1 ? "嗯？" : "也就一般。", 760);
    } else if (this.headPokeCount <= 4) {
      this.personality.mood = "无聊";
      this.setManualState("poke-annoyed", 2_700);
      this.say(
        this.headPokeCount === 3 ? "飞机耳警告。" : "差不多得了。",
        900,
      );
    } else if (this.headPokeCount <= 6) {
      this.personality.grudge += 2;
      this.personality.mood = "无聊";
      this.setManualState("poke-block", 3_000);
      this.say(
        this.headPokeCount === 5 ? "爪子已经抬起来了。" : "手，拿开。",
        1_000,
      );
    } else if (this.headPokeCount <= 8) {
      this.personality.grudge += 3;
      this.personality.mood = "得意";
      this.setManualState("poke-push", 3_200);
      this.pet.classList.add("poke-show-sign");
      this.say(this.headPokeCount === 7 ? "别摸了。" : "看不懂牌子？", 1_100);
    } else {
      this.personality.grudge += 6;
      this.personality.mood = "得意";
      this.setManualState("poke-push", 1_300);
      this.pet.classList.add("poke-biting");
      this.headPokeCount = 0;
      this.headPokeDecayAt = 0;
      void this.biteCursorForPokes();
    }

    clampPersonality(this.personality);
    savePersonality(this.personality);
    this.renderPersonality();
    this.nextIdleBehaviorAt = Math.max(this.nextIdleBehaviorAt, now + 5_500);
  }

  private async biteCursorForPokes(): Promise<void> {
    try {
      await desktop.setCursorVisible(false);
      this.say("咔。逮到你了。", 800);
      window.setTimeout(() => {
        void desktop.setCursorVisible(true);
        this.setManualState("tongue", 900);
        this.say("呸。还你。", 850);
      }, 680);
    } catch {
      await desktop.setCursorVisible(true);
      this.setManualState("tongue", 900);
      this.say("算你跑得快。", 850);
    }
  }

  private trackHeadPet(event: PointerEvent): void {
    const now = performance.now();
    if (
      now < this.headPetCooldownUntil ||
      !(
        this.state === "idle" ||
        this.state === "sitting" ||
        this.state === "head-pet" ||
        this.state === "tongue" ||
        this.state === "back-side-eye" ||
        this.state === "check-alive" ||
        this.poseBridge?.target === "head-pet"
      )
    ) {
      this.resetHeadPetTracking();
      return;
    }

    if (
      this.headPetTrackingStartedAt === 0 ||
      now - this.headPetLastMoveAt > 650
    ) {
      this.headPetTrackingStartedAt = now;
      this.headPetLastMoveAt = now;
      this.headPetLastX = event.clientX;
      this.headPetTravel = 0;
      this.headPetDirection = 0;
      this.headPetDirectionChanges = 0;
      return;
    }

    const lastX = this.headPetLastX ?? event.clientX;
    const deltaX = event.clientX - lastX;
    const distance = Math.abs(deltaX);
    if (distance < 0.8) return;

    this.headPetLastX = event.clientX;
    this.headPetLastMoveAt = now;
    this.headPetTravel += Math.min(distance, 18);

    if (Math.abs(deltaX) >= 2) {
      const direction = Math.sign(deltaX);
      if (this.headPetDirection !== 0 && direction !== this.headPetDirection) {
        this.headPetDirectionChanges += 1;
      }
      this.headPetDirection = direction;
    }

    if (this.headPetActiveStartedAt > 0) {
      this.manualStateUntil = now + 520;
      return;
    }

    const deliberateStroke =
      now - this.headPetTrackingStartedAt >= 260 &&
      this.headPetTravel >= 28 &&
      (this.headPetDirectionChanges >= 1 || this.headPetTravel >= 70);
    if (deliberateStroke) this.startHeadPet(now, 520);
  }

  private startHeadPet(now: number, durationMs: number): void {
    if (this.headPetActiveStartedAt > 0) {
      this.manualStateUntil = now + durationMs;
      return;
    }

    if (
      this.state === "tongue" ||
      this.state === "back-side-eye" ||
      this.state === "check-alive"
    ) {
      if (this.poseBridge) this.cancelPoseBridge();
      this.manualState = null;
      this.manualStateUntil = 0;
      this.applyState(this.state === "tongue" ? "idle" : "sitting", false);
    }

    this.headPetActiveStartedAt = now;
    this.headPetLastMoveAt = now;
    this.headPetStage = 0;
    this.manualState = "head-pet";
    this.manualStateUntil = now + durationMs;
    this.personality.affection += 2;
    this.personality.mood = "开心";
    clampPersonality(this.personality);
    savePersonality(this.personality);
    this.renderPersonality();
    this.setState("head-pet");
    this.status.textContent = "耳朵说不喜欢";
    this.say("只是刚好有点痒。", 1_100);
    this.nextIdleBehaviorAt = Math.max(this.nextIdleBehaviorAt, now + 6_000);
  }

  private updateHeadPetStage(now: number): void {
    if (this.headPetActiveStartedAt <= 0) return;
    const elapsed = now - this.headPetActiveStartedAt;

    if (elapsed >= 3_000 && this.headPetStage < 2) {
      this.headPetStage = 2;
      this.pet.classList.add("head-nuzzling");
      this.personality.affection += 1;
      clampPersonality(this.personality);
      savePersonality(this.personality);
      this.renderPersonality();
      this.status.textContent = "已经主动蹭上来了";
      this.say("……手别停。", 1_100);
    } else if (elapsed >= 1_000 && this.headPetStage < 1) {
      this.headPetStage = 1;
      this.status.textContent = "嘴上嫌弃，身体很诚实";
    }
  }

  private finishHeadPet(now: number): void {
    if (this.headPetActiveStartedAt <= 0) {
      this.resetHeadPetTracking();
      return;
    }

    const enjoyedFor = now - this.headPetActiveStartedAt;
    this.resetHeadPetTracking();
    this.headPetCooldownUntil = now + 850;
    this.manualState = "sitting";
    this.manualStateUntil = now + 900;
    this.personality.mood = "得意";
    savePersonality(this.personality);
    this.renderPersonality();
    this.setState("sitting");
    this.status.textContent = "停止后立刻恢复冷漠";
    this.say(enjoyedFor >= 3_000 ? "谁让你停了？" : "就摸这一下？", 1_100);
    this.nextIdleBehaviorAt = Math.max(this.nextIdleBehaviorAt, now + 5_000);
  }

  private resetHeadPetTracking(): void {
    this.headPetTrackingStartedAt = 0;
    this.headPetActiveStartedAt = 0;
    this.headPetLastMoveAt = 0;
    this.headPetLastX = null;
    this.headPetTravel = 0;
    this.headPetDirection = 0;
    this.headPetDirectionChanges = 0;
    this.headPetStage = -1;
    this.pet.classList.remove("head-nuzzling");
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.lastFrameAt) / 1_000, MOTION.maxDelta);
    this.lastFrameAt = now;

    this.updatePhysics(dt, now);
    this.updateState(now);
    if (!this.renderPoseBridge(now)) this.renderAnimationFrame(now);
    this.updateVisualDynamics();
    desktop.queuePosition({ x: this.x, y: this.y });

    requestAnimationFrame(this.tick);
  };

  private updatePhysics(dt: number, now: number): void {
    if (this.dragging) {
      const minX = this.workArea.x - WINDOW_SIZE * 0.28;
      const maxX =
        this.workArea.x + this.workArea.width - WINDOW_SIZE * 0.72;
      const minY = this.workArea.y - WINDOW_SIZE * 0.35;
      const maxY = this.floorY;

      this.targetX = clamp(this.targetX, minX, maxX);
      this.targetY = clamp(this.targetY, minY, maxY);

      this.velocityX += (this.targetX - this.x) * MOTION.spring * dt;
      this.velocityY += (this.targetY - this.y) * MOTION.spring * dt;

      const drag = Math.exp(-MOTION.damping * dt);
      this.velocityX *= drag;
      this.velocityY *= drag;
      this.x += this.velocityX * dt;
      this.y += this.velocityY * dt;
      return;
    }

    if (this.falling) {
      this.velocityY += MOTION.gravity * dt;
      this.x += this.velocityX * dt;
      this.y += this.velocityY * dt;
      this.velocityX *= Math.exp(-3.8 * dt);

      if (this.y >= this.floorY) {
        this.y = this.floorY;
        this.targetY = this.floorY;
        this.velocityY = 0;
        this.velocityX *= 0.25;
        this.falling = false;
        this.setManualState("squash", MOTION.impactRecoverMs);

        window.setTimeout(() => {
          if (this.pendingPlayDead) {
            this.pendingPlayDead = false;
            this.setManualState("play-dead", 3_200);
          }
        }, 390);
      }
      return;
    }

    if (BEHAVIOR.autonomousMovement && this.chaseUntil > now) {
      const cursor = desktop.getCursorPosition();
      if (cursor) {
        const desiredX = clamp(
          cursor.x - WINDOW_SIZE / 2,
          this.workArea.x,
          this.workArea.x + this.workArea.width - WINDOW_SIZE,
        );
        const delta = desiredX - this.x;
        const stopDistance = this.chaseIsRevenge ? 18 : 72;

        if (Math.abs(delta) > stopDistance) {
          this.x +=
            Math.sign(delta) *
            Math.min(Math.abs(delta), this.chaseIsRevenge ? 310 : 190) *
            dt;
          this.setFacingForDirection(delta);
        } else if (this.chaseIsRevenge && this.cursorStealPending) {
          this.cursorStealPending = false;
          void this.stealCursorBriefly();
        }
      }
      return;
    }

    if (BEHAVIOR.autonomousMovement && this.avoidUntil > now) {
      const cursor = desktop.getCursorPosition();
      if (cursor) {
        const centerX = this.x + WINDOW_SIZE / 2;
        const direction = centerX < cursor.x ? -1 : 1;
        this.x = clamp(
          this.x + direction * 220 * dt,
          this.workArea.x,
          this.workArea.x + this.workArea.width - WINDOW_SIZE,
        );
        this.setFacingForDirection(direction);
      }
      return;
    }

    if (BEHAVIOR.autonomousMovement && this.patrolUntil > now) {
      const minX = this.workArea.x + 8;
      const maxX = this.workArea.x + this.workArea.width - WINDOW_SIZE - 8;
      this.x += this.patrolDirection * 52 * dt;
      if (this.x <= minX || this.x >= maxX) {
        this.x = clamp(this.x, minX, maxX);
        this.patrolDirection *= -1;
      }
      return;
    }

    if (this.manualState === "head-pet" && now >= this.manualStateUntil) {
      this.finishHeadPet(now);
      return;
    }

    if (
      this.headPokeCount > 0 &&
      this.headPokeDecayAt > 0 &&
      now >= this.headPokeDecayAt
    ) {
      this.headPokeCount -= 1;
      this.headPokeDecayAt =
        this.headPokeCount > 0 ? now + 1_800 : 0;
    }

    if (
      this.manualState &&
      HEAD_POKE_STATES.includes(this.manualState) &&
      now >= this.manualStateUntil
    ) {
      this.manualState = "sitting";
      this.manualStateUntil = now + 650;
      this.setState("sitting");
      this.status.textContent = "又恢复了欠揍坐姿";
      return;
    }

    if (this.manualState && now >= this.manualStateUntil) {
      this.clearManualState();
      this.nextIdleBehaviorAt = Math.max(
        this.nextIdleBehaviorAt,
        now + 5_000,
      );
    }
  }

  private updateState(now: number): void {
    if (this.manualState && now < this.manualStateUntil) {
      this.setState(this.manualState);
      if (this.manualState === "head-pet") this.updateHeadPetStage(now);
      return;
    }

    if (this.falling) {
      this.setState(this.dizzyUntil > now ? "dizzy" : "falling");
      return;
    }

    if (!this.dragging) {
      if (BEHAVIOR.autonomousMovement && this.avoidUntil > now) {
        this.setState("run");
        return;
      }
      if (BEHAVIOR.autonomousMovement && this.chaseUntil > now) {
        const cursor = desktop.getCursorPosition();
        const distance = cursor
          ? Math.abs(cursor.x - (this.x + WINDOW_SIZE / 2))
          : Infinity;
        this.setState(
          distance < (this.chaseIsRevenge ? 30 : 82)
            ? this.chaseIsRevenge
              ? "resist"
              : "sitting"
            : "run",
        );
        return;
      }
      if (BEHAVIOR.autonomousMovement && this.patrolUntil > now) {
        this.setState("walk");
        this.setFacingForDirection(this.patrolDirection);
        return;
      }
      this.runIdleBehavior(now);
      return;
    }

    const velocity = this.getVelocity();
    const duration = now - this.dragStartedAt;
    const offGround = this.y < this.floorY - MOTION.liftDistance;
    const shakeCount = this.directionChanges();
    const movedDistance = this.pointerDistance();

    if (
      shakeCount >= MOTION.shakeChanges &&
      now >= this.dizzyCooldownUntil
    ) {
      this.dizzyUntil = now + 1_700;
      this.dizzyCooldownUntil = now + 3_800;
      this.personality.grudge += 14;
      this.personality.revengeAt =
        Date.now() + this.randomBetween(90_000, 210_000);
      this.personality.mood = "生气";
      clampPersonality(this.personality);
      savePersonality(this.personality);
      this.renderPersonality();
      this.say("呕……你完了。", 1_500);
    }

    if (
      now < this.interactionRecoveryUntil &&
      !offGround &&
      velocity.y >= -450 &&
      this.dizzyUntil <= now
    ) {
      if (Math.abs(velocity.x) > 45) {
        this.setFacingForDirection(velocity.x);
      }
      return;
    }

    if (duration >= 850 && movedDistance < 12) {
      this.setState("pancake");
    } else if (this.dizzyUntil > now) {
      this.setState("dizzy");
    } else if (duration >= MOTION.resistAfterMs) {
      this.setState("resist");
    } else if (offGround || velocity.y < -450) {
      if (!this.liftTransitionStarted) {
        const liftedFrames = getLiftedFrames(this.grabbedZone);
        this.cancelPoseBridge();
        this.startPoseBridge(
          "lifted",
          [
            ...getLiftTransition(this.grabStartedState),
            liftedFrames[0],
            liftedFrames[1],
          ],
          LIFT_TRANSITION_INTERVAL,
        );
        this.liftTransitionStarted = true;
      } else {
        this.setState("lifted");
      }
    } else if (this.grabbedZone === "tail" && movedDistance > 18) {
      this.setState("chase-tail");
    } else if (this.brakeUntil > now) {
      this.setState("brake");
    } else {
      this.setState(this.getLocomotionState(velocity));
    }

    const bridgeIsBraking = this.poseBridge?.target === "brake";
    if (
      this.brakeUntil <= now &&
      !bridgeIsBraking &&
      Math.abs(velocity.x) > 45
    ) {
      this.setFacingForDirection(
        this.pendingFacingDirection || velocity.x,
      );
      this.pendingFacingDirection = 0;
    }
  }

  private getLocomotionState(velocity: {
    x: number;
    speed: number;
  }): PetState {
    const activeState = this.poseBridge?.target ?? this.state;
    const horizontalSpeed = Math.abs(velocity.x);

    if (activeState === "run") {
      if (velocity.speed >= MOTION.runExitSpeed) return "run";
      if (horizontalSpeed >= MOTION.walkExitSpeed) return "walk";
      return "idle";
    }

    if (activeState === "walk") {
      if (velocity.speed >= MOTION.runSpeed) return "run";
      return horizontalSpeed >= MOTION.walkExitSpeed ? "walk" : "idle";
    }

    if (velocity.speed >= MOTION.runSpeed) return "run";
    return horizontalSpeed >= MOTION.walkSpeed ? "walk" : "idle";
  }

  private setFacingForDirection(directionX: number): void {
    if (directionX === 0) return;

    // 当前连续动作素材的原始造型朝左：向左保持原图，向右时水平翻转。
    this.facing.style.setProperty("--facing", directionX < 0 ? "1" : "-1");
  }

  private runIdleBehavior(now: number): void {
    if (
      BEHAVIOR.autonomousMovement &&
      this.personality.revengeAt > 0 &&
      Date.now() >= this.personality.revengeAt
    ) {
      this.personality.revengeAt = 0;
      this.personality.grudge = Math.max(0, this.personality.grudge - 18);
      this.personality.mood = "得意";
      savePersonality(this.personality);
      this.chaseIsRevenge = true;
      this.cursorStealPending = true;
      this.chaseUntil = now + 3_800;
      this.say("这口是刚才晃我的。", 2_200);
      this.setState("run");
      return;
    }

    const wallClock = new Date();
    if (
      !this.blanketShown &&
      wallClock.getHours() >= 0 &&
      wallClock.getHours() < 5
    ) {
      this.blanketShown = true;
      this.personality.mood = "困倦";
      this.setManualState("blanket", 8_000);
      this.say("熬夜的人类，安静点。", 2_200);
      return;
    }

    const cursor = desktop.getCursorPosition();
    if (
      BEHAVIOR.autonomousMovement &&
      this.personality.affection < 20 &&
      cursor &&
      Math.abs(cursor.x - (this.x + WINDOW_SIZE / 2)) < 320
    ) {
      this.avoidUntil = now + 2_200;
      this.personality.stamina = Math.max(0, this.personality.stamina - 4);
      savePersonality(this.personality);
      this.renderPersonality();
      this.say("不熟，别靠近。", 1_200);
      this.nextIdleBehaviorAt = this.avoidUntil + this.randomBetween(8_000, 14_000);
      return;
    }

    if (!this.coffeeShown && Date.now() - this.sessionStartedAt > 45 * 60_000) {
      this.coffeeShown = true;
      this.setManualState("coffee", 5_000);
      this.say("给你的。算了，我喝了。", 3_200);
      return;
    }

    if (
      Date.now() - this.personality.lastInteractionAt > 10 * 60_000 &&
      Date.now() - this.lastAliveCheckAt > 10 * 60_000
    ) {
      this.lastAliveCheckAt = Date.now();
      this.setManualState("check-alive", 4_000);
      this.say("还活着吗？动一下。", 3_200);
      return;
    }

    if (now < this.nextIdleBehaviorAt || !this.panel.hidden) {
      if (!this.manualState) this.setState("idle");
      return;
    }

    const roll = Math.random();
    if (
      BEHAVIOR.autonomousMovement &&
      roll < 0.14 &&
      this.personality.stamina > 24
    ) {
      this.patrolDirection = Math.random() < 0.5 ? -1 : 1;
      this.patrolUntil = now + this.randomBetween(3_000, 6_000);
      this.nextIdleBehaviorAt = this.patrolUntil + this.randomBetween(7_000, 12_000);
      this.setState("walk");
      return;
    }

    if (BEHAVIOR.autonomousMovement && roll < 0.22) {
      this.returnXAfterPeek = this.x;
      const peekFromLeft = Math.random() < 0.5;
      this.x = peekFromLeft
        ? this.workArea.x - WINDOW_SIZE * 0.58
        : this.workArea.x + this.workArea.width - WINDOW_SIZE * 0.42;
      this.targetX = this.x;
      this.setManualState("back-side-eye", 3_200);
      this.say("我就探个头。", 1_400);
      this.nextIdleBehaviorAt = now + this.randomBetween(9_000, 15_000);
      return;
    }

    if (
      BEHAVIOR.autonomousMovement &&
      roll < 0.3 &&
      this.personality.affection >= 20
    ) {
      this.chaseIsRevenge = false;
      this.cursorStealPending = false;
      this.chaseUntil = now + this.randomBetween(2_600, 4_200);
      this.personality.stamina = Math.max(0, this.personality.stamina - 4);
      savePersonality(this.personality);
      this.renderPersonality();
      this.say("差一点抓到你。故意的。", 1_500);
      this.nextIdleBehaviorAt = this.chaseUntil + this.randomBetween(8_000, 14_000);
      return;
    }

    if (BEHAVIOR.autonomousMovement && roll < 0.34) {
      this.returnYAfterTop = this.y;
      this.y = this.workArea.y;
      this.targetY = this.y;
      this.setManualState("top-hang", 3_600);
      this.say("上面风大，腿先晾着。", 1_700);
      this.nextIdleBehaviorAt = now + this.randomBetween(10_000, 16_000);
      return;
    }

    if (BEHAVIOR.autonomousMovement && roll < 0.38) {
      const cursor = desktop.getCursorPosition();
      if (cursor) {
        this.returnXAfterPeek = this.x;
        this.x = clamp(
          cursor.x - WINDOW_SIZE * 0.55,
          this.workArea.x,
          this.workArea.x + this.workArea.width - WINDOW_SIZE,
        );
        this.targetX = this.x;
        this.setManualState("butt-block", 1_200);
        this.say("就挡一秒。", 900);
        this.nextIdleBehaviorAt = now + this.randomBetween(12_000, 18_000);
        return;
      }
    }

    const mockeryProfile = getMockeryProfile(this.personality.mockery);
    const ordinaryIdleChoices = getMockeryIdleChoices(
      this.personality.mockery,
      this.personality.stamina < 30,
    );
    const rareStates: PetState[] = [
      "sunglasses",
      "long-dog",
      "phone",
      "hide-behind",
    ];
    const useRareState = Math.random() < mockeryProfile.rareChance;
    const state = useRareState
      ? rareStates[Math.floor(Math.random() * rareStates.length)] ?? "sitting"
      : Math.random() < mockeryProfile.tongueChance
        ? "tongue"
        : chooseWeightedState(ordinaryIdleChoices);
    const duration =
      state === "lick-paw" ||
      state === "scratch-ear" ||
      state === "chase-tail"
        ? this.randomBetween(3_000, 5_000)
        : this.randomBetween(2_400, 4_600);

    this.personality.mood =
      state === "sitting" || state === "back-side-eye" || state === "tongue"
        ? "得意"
        : state === "play-dead" || state === "chin-rest"
          ? "无聊"
          : "困倦";
    this.personality.stamina +=
      state === "play-dead" || state === "belly-up" || state === "tail-sleep"
        ? 2
        : -1;
    clampPersonality(this.personality);
    savePersonality(this.personality);
    this.renderPersonality();
    this.setManualState(state, duration);
    this.nextIdleBehaviorAt =
      now +
      duration +
      this.getMockeryDelay(8_000, 16_000);
  }

  private updateVisualDynamics(): void {
    const lean = clamp(this.velocityX / 115, -11, 11);
    this.motion.style.setProperty("--lean", `${lean}deg`);
  }

  private setState(state: PetState): void {
    if (this.poseBridge) {
      if (state === this.poseBridge.target) return;
      this.cancelPoseBridge();
      if (state === this.state) {
        this.swapPoseSprite(SPRITES[state], false);
        return;
      }
    }

    if (state === this.state) return;

    const motionFrames = !this.falling
      ? getMotionTransition(this.state, state)
      : undefined;
    if (motionFrames?.length) {
      this.startPoseBridge(
        state,
        motionFrames,
        MOTION_TRANSITION_INTERVAL,
        false,
      );
      return;
    }

    const shouldAnimate = !this.dragging && !this.falling;
    const bridgeFrames = shouldAnimate
      ? getPoseTransition(this.state, state)
      : undefined;
    if (bridgeFrames?.length) {
      this.startPoseBridge(
        state,
        bridgeFrames,
        POSE_TRANSITION_INTERVAL,
        true,
      );
      return;
    }

    this.applyState(state, shouldAnimate);
  }

  private applyState(
    state: PetState,
    animate: boolean,
    preserveCurrentSprite = false,
  ): void {
    this.state = state;
    this.animationStartedAt = performance.now();
    this.pet.className = `pet state-${state}`;
    if (this.dragging) {
      this.pet.classList.add("dragging");
      this.pet.classList.add(`grab-${this.grabbedZone}`);
    }
    if (!preserveCurrentSprite) {
      this.swapPoseSprite(SPRITES[state], animate);
    }
    this.status.textContent = STATE_LABELS[state];

    const remarks: Partial<Record<PetState, string>> = {
      run: "慢点！肉要甩掉了！",
      brake: "刹不住了！",
      lifted: "你最好有事。",
      resist: "放手。现在。",
      squash: "……",
    };

    const remark = remarks[state];
    if (remark) this.say(remark, 900);
  }

  private startPoseBridge(
    target: PetState,
    frames: readonly string[],
    interval: number,
    holdFinalFrame = false,
  ): void {
    window.clearTimeout(this.poseTransitionTimer);
    const outgoingSource = this.sprite.currentSrc || this.sprite.src;
    this.previousSprite.classList.remove("pose-exit");
    this.previousSprite.removeAttribute("src");
    this.sprite.classList.remove("pose-enter");
    this.pet.className = "pet state-bridging";
    if (this.dragging) {
      this.pet.classList.add("dragging");
      this.pet.classList.add(`grab-${this.grabbedZone}`);
    }
    this.poseBridge = {
      target,
      frames,
      startedAt: performance.now(),
      interval,
      holdFinalFrame,
    };
    if (outgoingSource && !outgoingSource.endsWith(frames[0])) {
      this.previousSprite.src = outgoingSource;
      void this.previousSprite.offsetWidth;
      this.previousSprite.classList.add("pose-exit");
      this.poseTransitionTimer = window.setTimeout(() => {
        this.previousSprite.classList.remove("pose-exit");
        this.previousSprite.removeAttribute("src");
      }, 180);
    }
    this.sprite.src = frames[0];
    this.status.textContent = `姿势切换：${STATE_LABELS[target]}`;
  }

  private renderPoseBridge(now: number): boolean {
    const bridge = this.poseBridge;
    if (!bridge) return false;

    const elapsed = now - bridge.startedAt;
    const index = Math.floor(elapsed / bridge.interval);
    if (index >= bridge.frames.length) {
      const target = bridge.target;
      this.poseBridge = null;
      const hasLoopingFrames = Boolean(ANIMATION_FRAMES[target]?.length);
      const shouldHoldFinalFrame =
        !hasLoopingFrames &&
        (bridge.holdFinalFrame || target === "brake");
      this.applyState(
        target,
        target === "idle" && !shouldHoldFinalFrame,
        shouldHoldFinalFrame,
      );
      return false;
    }

    const frame = bridge.frames[index];
    if (frame && !this.sprite.src.endsWith(frame)) this.sprite.src = frame;
    return true;
  }

  private cancelPoseBridge(): void {
    this.poseBridge = null;
    this.previousSprite.classList.remove("pose-exit");
    this.previousSprite.removeAttribute("src");
    this.sprite.classList.remove("pose-enter");
    this.pet.className = `pet state-${this.state}`;
    if (this.dragging) {
      this.pet.classList.add("dragging");
      this.pet.classList.add(`grab-${this.grabbedZone}`);
    }
  }

  private renderAnimationFrame(now: number): void {
    const frames =
      this.state === "lifted"
        ? getLiftedFrames(this.grabbedZone)
        : ANIMATION_FRAMES[this.state];
    if (!frames?.length) return;
    const interval = FRAME_INTERVALS[this.state] ?? 120;
    const rawIndex = Math.floor(
      (now - this.animationStartedAt) / interval,
    );
    const index =
      this.state === "falling"
        ? Math.min(rawIndex, frames.length - 1)
        : rawIndex % frames.length;
    const frame = frames[index];
    if (frame && !this.sprite.src.endsWith(frame)) this.sprite.src = frame;
  }

  private swapPoseSprite(source: string, animate: boolean): void {
    if (this.sprite.src.endsWith(source)) return;
    window.clearTimeout(this.poseTransitionTimer);

    if (animate && this.sprite.src) {
      this.previousSprite.src = this.sprite.currentSrc || this.sprite.src;
      this.previousSprite.classList.remove("pose-exit");
      this.sprite.classList.remove("pose-enter");
      void this.previousSprite.offsetWidth;
      this.previousSprite.classList.add("pose-exit");
      this.sprite.src = source;
      this.sprite.classList.add("pose-enter");
      this.poseTransitionTimer = window.setTimeout(() => {
        this.previousSprite.classList.remove("pose-exit");
        this.previousSprite.removeAttribute("src");
        this.sprite.classList.remove("pose-enter");
      }, 230);
      return;
    }

    this.previousSprite.classList.remove("pose-exit");
    this.previousSprite.removeAttribute("src");
    this.sprite.classList.remove("pose-enter");
    this.sprite.src = source;
  }

  private preloadSprites(): void {
    const sources = new Set<string>([
      ...Object.values(SPRITES),
      ...Object.values(ANIMATION_FRAMES).flatMap((frames) => frames ?? []),
      ...Object.values(POSE_TRANSITIONS).flatMap((frames) => frames),
      ...Object.values(MOTION_TRANSITIONS).flatMap((frames) => frames),
      ...Object.values(LIFTED_FRAMES).flatMap((frames) => frames),
      ...LIFT_ENTRY_FRAMES,
    ]);
    for (const source of sources) {
      const image = new Image();
      image.src = source;
    }
  }

  private async stealCursorBriefly(): Promise<void> {
    try {
      await desktop.setCursorVisible(false);
      this.say("光标归我了。", 1_000);
      window.setTimeout(() => {
        void desktop.setCursorVisible(true);
        this.setManualState("tongue", 850);
        this.say("还你。呸。", 850);
      }, 900);
    } catch {
      await desktop.setCursorVisible(true);
    }
  }

  private getInteractionZone(event: PointerEvent): InteractionZone {
    const rect = this.pet.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    if (x < 0.24 && y > 0.46) return "tail";
    if (x < 0.42 && y > 0.58) return "butt";
    if (y < 0.45) return "head";
    if (x > 0.42 && x < 0.75 && y < 0.68) return "chin";
    return "body";
  }

  private setManualState(state: PetState, durationMs: number): void {
    this.manualState = state;
    this.manualStateUntil = performance.now() + durationMs;
    this.setState(state);
  }

  private clearManualState(): void {
    if (this.manualState === "head-pet" || this.headPetActiveStartedAt > 0) {
      this.resetHeadPetTracking();
    }
    this.manualState = null;
    this.manualStateUntil = 0;
    if (this.returnXAfterPeek !== null) {
      this.x = this.returnXAfterPeek;
      this.targetX = this.x;
      this.returnXAfterPeek = null;
    }
    if (this.returnYAfterTop !== null) {
      this.y = this.returnYAfterTop;
      this.targetY = this.y;
      this.returnYAfterTop = null;
    }
    if (!this.dragging && !this.falling) this.setState("idle");
  }

  private say(message: string, durationMs: number): void {
    window.clearTimeout(this.speechTimer);
    this.speech.textContent = message;
    this.speech.classList.add("visible");

    this.speechTimer = window.setTimeout(() => {
      this.speech.classList.remove("visible");
    }, durationMs);
  }

  private togglePanel(force?: boolean): void {
    const shouldOpen = force ?? this.panel.hidden;
    this.panel.hidden = !shouldOpen;
    document.body.classList.toggle("panel-open", shouldOpen);

    if (shouldOpen) {
      this.status.textContent = STATE_LABELS[this.state];
    }
  }

  private renderPersonality(): void {
    const profile = getMockeryProfile(this.personality.mockery);
    this.moodValue.textContent = this.personality.mood;
    this.grudgeValue.textContent = String(this.personality.grudge);
    this.pet.dataset.mockeryTier = profile.tier;
    this.mockeryValue.textContent =
      `${this.personality.mockery} · ${profile.label}`;
    required<HTMLInputElement>("#mockery-control").value = String(
      this.personality.mockery,
    );
  }

  private getMockeryDelay(min: number, max: number): number {
    const factor = getMockeryProfile(
      this.personality.mockery,
    ).idleDelayFactor;
    return this.randomBetween(
      Math.round(min * factor),
      Math.round(max * factor),
    );
  }

  private randomBetween(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }
}
