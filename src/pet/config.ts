import type { InteractionZone, PetState } from "./types";

export const WINDOW_SIZE = 220;
const CARTOON = "/assets/shiba/sprites/cartoon-v1";
const TRANSITIONS = `${CARTOON}/transitions`;
const LOCOMOTION = `${CARTOON}/locomotion-v1`;
const LIFT = `${CARTOON}/lift-v1`;
const IDLE_TRANSITIONS = `${CARTOON}/idle-transitions-v1`;
const SCRATCH_EAR = `${CARTOON}/scratch-ear-v1`;
const CHASE_TAIL = `${CARTOON}/chase-tail-v2`;
const LICK_PAW_LOOP = `${CARTOON}/lick-paw-v1`;
const HEAD_PET = `${CARTOON}/head-pet-v1`;
const HEAD_POKE = `${CARTOON}/head-poke-v1`;

export const BEHAVIOR = {
  autonomousMovement: false,
} as const;

export const MOTION = {
  walkSpeed: 110,
  walkExitSpeed: 72,
  runSpeed: 950,
  runExitSpeed: 760,
  brakeDurationMs: 360,
  impactRecoverMs: 460,
  liftDistance: 58,
  resistAfterMs: 5_000,
  playDeadAfterMs: 7_500,
  shakeChanges: 6,
  gravity: 2_250,
  spring: 42,
  damping: 12,
  maxDelta: 0.034,
} as const;

export const SPRITES: Record<PetState, string> = {
  idle: `${CARTOON}/01-idle.png`,
  walk: `${LOCOMOTION}/start-walk-03.png`,
  run: `${LOCOMOTION}/accelerate-run-03.png`,
  brake: `${LOCOMOTION}/brake-stop-03.png`,
  lifted: `${LIFT}/lift-body-01.png`,
  falling: `${LIFT}/fall-01.png`,
  squash: `${LIFT}/impact-recover-05.png`,
  resist: `${CARTOON}/14-cursor-hug.png`,
  dizzy: `${CARTOON}/15-dizzy-tongue.png`,
  sitting: `${CARTOON}/04-sitting-side-eye.png`,
  "head-pet": `${HEAD_PET}/head-pet-loop-01.png`,
  "poke-wary": `${HEAD_POKE}/head-poke-01.png`,
  "poke-annoyed": `${HEAD_POKE}/head-poke-02.png`,
  "poke-block": `${HEAD_POKE}/head-poke-03.png`,
  "poke-push": `${HEAD_POKE}/head-poke-04.png`,
  tongue: `${CARTOON}/01-idle.png`,
  "chin-rest": `${CARTOON}/16-chin-paws.png`,
  "back-side-eye": `${CARTOON}/17-back-side-eye.png`,
  "lick-paw": `${CARTOON}/18-lick-paw.png`,
  "scratch-ear": `${CARTOON}/19-scratch-ear.png`,
  "chase-tail": `${CARTOON}/20-chase-tail.png`,
  "tail-sleep": `${CARTOON}/21-tail-sleep.png`,
  pancake: `${CARTOON}/22-pancake.png`,
  sunglasses: `${CARTOON}/07-walk-contact.png`,
  "long-dog": `${CARTOON}/01-idle.png`,
  phone: `${CARTOON}/04-sitting-side-eye.png`,
  coffee: `${CARTOON}/04-sitting-side-eye.png`,
  blanket: `${CARTOON}/21-tail-sleep.png`,
  sign: `${CARTOON}/04-sitting-side-eye.png`,
  "check-alive": `${CARTOON}/04-sitting-side-eye.png`,
  toy: `${CARTOON}/07-walk-contact.png`,
  "top-hang": `${CARTOON}/03-lifted.png`,
  "butt-block": `${CARTOON}/17-back-side-eye.png`,
  "hide-behind": `${CARTOON}/17-back-side-eye.png`,
  "play-dead": `${CARTOON}/05-play-dead.png`,
  "belly-up": `${CARTOON}/06-belly-up.png`,
};

export const ANIMATION_FRAMES: Partial<
  Record<PetState, readonly string[]>
> = {
  walk: [
    `${LOCOMOTION}/start-walk-02.png`,
    `${LOCOMOTION}/start-walk-03.png`,
    `${LOCOMOTION}/start-walk-04.png`,
    `${LOCOMOTION}/start-walk-05.png`,
  ],
  run: [
    `${LOCOMOTION}/accelerate-run-03.png`,
    `${LOCOMOTION}/accelerate-run-04.png`,
    `${LOCOMOTION}/accelerate-run-05.png`,
    `${LOCOMOTION}/accelerate-run-04.png`,
  ],
  falling: [
    `${LIFT}/fall-01.png`,
    `${LIFT}/fall-02.png`,
    `${LIFT}/fall-03.png`,
    `${LIFT}/fall-04.png`,
    `${LIFT}/fall-05.png`,
  ],
  "scratch-ear": [
    `${SCRATCH_EAR}/scratch-ear-loop-01.png`,
    `${SCRATCH_EAR}/scratch-ear-loop-02.png`,
    `${SCRATCH_EAR}/scratch-ear-loop-03.png`,
    `${SCRATCH_EAR}/scratch-ear-loop-04.png`,
  ],
  "lick-paw": [
    `${LICK_PAW_LOOP}/lick-paw-loop-01.png`,
    `${LICK_PAW_LOOP}/lick-paw-loop-02.png`,
    `${LICK_PAW_LOOP}/lick-paw-loop-03.png`,
    `${LICK_PAW_LOOP}/lick-paw-loop-04.png`,
  ],
  "head-pet": [
    `${HEAD_PET}/head-pet-loop-01.png`,
    `${HEAD_PET}/head-pet-loop-02.png`,
    `${HEAD_PET}/head-pet-loop-03.png`,
    `${HEAD_PET}/head-pet-loop-04.png`,
  ],
  "chase-tail": [
    `${CHASE_TAIL}/chase-tail-loop-01.png`,
    `${CHASE_TAIL}/chase-tail-loop-02.png`,
    `${CHASE_TAIL}/chase-tail-loop-03.png`,
    `${CHASE_TAIL}/chase-tail-loop-04.png`,
    `${CHASE_TAIL}/chase-tail-loop-05.png`,
    `${CHASE_TAIL}/chase-tail-loop-06.png`,
    `${CHASE_TAIL}/chase-tail-loop-07.png`,
    `${CHASE_TAIL}/chase-tail-loop-08.png`,
    `${CHASE_TAIL}/chase-tail-loop-09.png`,
    `${CHASE_TAIL}/chase-tail-loop-10.png`,
    `${CHASE_TAIL}/chase-tail-loop-11.png`,
    `${CHASE_TAIL}/chase-tail-loop-12.png`,
  ],
};

export const FRAME_INTERVALS: Partial<Record<PetState, number>> = {
  walk: 105,
  run: 68,
  lifted: 118,
  falling: 72,
  "head-pet": 210,
  "lick-paw": 150,
  "scratch-ear": 105,
  "chase-tail": 64,
};

const LIFT_BODY = [
  `${LIFT}/lift-body-01.png`,
  `${LIFT}/lift-body-02.png`,
  `${LIFT}/lift-body-03.png`,
  `${LIFT}/lift-body-04.png`,
  `${LIFT}/lift-body-05.png`,
] as const;

const LIFT_SCRUFF = [
  `${LIFT}/lift-scruff-01.png`,
  `${LIFT}/lift-scruff-02.png`,
  `${LIFT}/lift-scruff-03.png`,
  `${LIFT}/lift-scruff-04.png`,
  `${LIFT}/lift-scruff-05.png`,
] as const;

export const LIFTED_FRAMES: Readonly<
  Record<InteractionZone, readonly string[]>
> = {
  head: LIFT_SCRUFF,
  chin: LIFT_SCRUFF,
  body: LIFT_BODY,
  butt: LIFT_BODY,
  tail: [...LIFT_BODY].reverse(),
};

export function getLiftedFrames(
  zone: InteractionZone,
): readonly string[] {
  return LIFTED_FRAMES[zone];
}

const STAND_TO_LIFT = [
  `${LIFT}/stand-to-lift-01.png`,
  `${LIFT}/stand-to-lift-02.png`,
  `${LIFT}/stand-to-lift-03.png`,
  `${LIFT}/stand-to-lift-04.png`,
] as const;

const SIT_TO_LIFT = [
  `${LIFT}/sit-to-lift-01.png`,
  `${LIFT}/sit-to-lift-02.png`,
  `${LIFT}/sit-to-lift-03.png`,
  `${LIFT}/sit-to-lift-04.png`,
] as const;

const PRONE_TO_LIFT = [
  `${LIFT}/prone-to-lift-01.png`,
  `${LIFT}/prone-to-lift-02.png`,
  `${LIFT}/prone-to-lift-03.png`,
  `${LIFT}/prone-to-lift-04.png`,
] as const;

const BELLY_TO_LIFT = [
  `${LIFT}/belly-to-lift-01.png`,
  `${LIFT}/belly-to-lift-02.png`,
  `${LIFT}/belly-to-lift-03.png`,
  `${LIFT}/belly-to-lift-04.png`,
] as const;

export const LIFT_TRANSITION_INTERVAL = 72;
export const LIFT_ENTRY_FRAMES = [
  ...STAND_TO_LIFT,
  ...SIT_TO_LIFT,
  ...PRONE_TO_LIFT,
  ...BELLY_TO_LIFT,
] as const;

const SIT_LIKE_STATES: readonly PetState[] = [
  "sitting",
  "head-pet",
  "poke-wary",
  "poke-annoyed",
  "poke-block",
  "poke-push",
  "back-side-eye",
  "lick-paw",
  "scratch-ear",
  "phone",
  "coffee",
  "sign",
  "check-alive",
];

const PRONE_LIKE_STATES: readonly PetState[] = [
  "chin-rest",
  "play-dead",
  "tail-sleep",
  "pancake",
];

export function getLiftTransition(
  from: PetState,
): readonly string[] {
  if (from === "belly-up") return BELLY_TO_LIFT;
  if (SIT_LIKE_STATES.includes(from)) return SIT_TO_LIFT;
  if (PRONE_LIKE_STATES.includes(from)) return PRONE_TO_LIFT;
  return STAND_TO_LIFT;
}

const IMPACT_RECOVER = [
  `${LIFT}/impact-recover-01.png`,
  `${LIFT}/impact-recover-02.png`,
  `${LIFT}/impact-recover-03.png`,
  `${LIFT}/impact-recover-04.png`,
  `${LIFT}/impact-recover-05.png`,
] as const;

const START_WALK = [
  `${LOCOMOTION}/start-walk-01.png`,
  `${LOCOMOTION}/start-walk-02.png`,
  `${LOCOMOTION}/start-walk-03.png`,
  `${LOCOMOTION}/start-walk-04.png`,
  `${LOCOMOTION}/start-walk-05.png`,
] as const;

const ACCELERATE_RUN = [
  `${LOCOMOTION}/accelerate-run-01.png`,
  `${LOCOMOTION}/accelerate-run-02.png`,
  `${LOCOMOTION}/accelerate-run-03.png`,
  `${LOCOMOTION}/accelerate-run-04.png`,
  `${LOCOMOTION}/accelerate-run-05.png`,
] as const;

const BRAKE_STOP = [
  `${LOCOMOTION}/brake-stop-01.png`,
  `${LOCOMOTION}/brake-stop-02.png`,
  `${LOCOMOTION}/brake-stop-03.png`,
  `${LOCOMOTION}/brake-stop-04.png`,
  `${LOCOMOTION}/brake-stop-05.png`,
] as const;

export const MOTION_TRANSITION_INTERVAL = 64;

export const MOTION_TRANSITIONS: Readonly<
  Record<string, readonly string[]>
> = {
  "idle>walk": START_WALK,
  "idle>run": ACCELERATE_RUN,
  "idle>brake": BRAKE_STOP,
  "walk>run": ACCELERATE_RUN,
  "run>walk": [...ACCELERATE_RUN].reverse(),
  "walk>idle": BRAKE_STOP.slice(3),
  "run>idle": BRAKE_STOP,
  "walk>brake": BRAKE_STOP,
  "run>brake": BRAKE_STOP,
  "brake>idle": BRAKE_STOP.slice(3),
  "brake>walk": START_WALK.slice(1),
  "brake>run": ACCELERATE_RUN,
};

export function getMotionTransition(
  from: PetState,
  to: PetState,
): readonly string[] | undefined {
  return MOTION_TRANSITIONS[`${from}>${to}`];
}

const STAND_TO_SIT = [
  `${TRANSITIONS}/stand-to-sit-01.png`,
  `${TRANSITIONS}/stand-to-sit-02.png`,
  `${TRANSITIONS}/stand-to-sit-03.png`,
  `${TRANSITIONS}/stand-to-sit-04.png`,
] as const;

const SIT_TO_PRONE = [
  `${TRANSITIONS}/sit-to-prone-01.png`,
  `${TRANSITIONS}/sit-to-prone-02.png`,
  `${TRANSITIONS}/sit-to-prone-03.png`,
  `${TRANSITIONS}/sit-to-prone-04.png`,
] as const;

const PRONE_TO_BELLY = [
  `${TRANSITIONS}/prone-to-belly-01.png`,
  `${TRANSITIONS}/prone-to-belly-02.png`,
  `${TRANSITIONS}/prone-to-belly-03.png`,
  `${TRANSITIONS}/prone-to-belly-04.png`,
] as const;

const SIT_TO_BACK_LOOK = [
  `${IDLE_TRANSITIONS}/sit-to-back-look-01.png`,
  `${IDLE_TRANSITIONS}/sit-to-back-look-02.png`,
  `${IDLE_TRANSITIONS}/sit-to-back-look-03.png`,
  `${IDLE_TRANSITIONS}/sit-to-back-look-04.png`,
] as const;

const SIT_TO_LICK_PAW = [
  `${IDLE_TRANSITIONS}/sit-to-lick-paw-01.png`,
  `${IDLE_TRANSITIONS}/sit-to-lick-paw-02.png`,
  `${IDLE_TRANSITIONS}/sit-to-lick-paw-03.png`,
  `${IDLE_TRANSITIONS}/sit-to-lick-paw-04.png`,
] as const;

const SIT_TO_SCRATCH_EAR = [
  `${IDLE_TRANSITIONS}/sit-to-scratch-ear-01.png`,
  `${IDLE_TRANSITIONS}/sit-to-scratch-ear-02.png`,
  `${IDLE_TRANSITIONS}/sit-to-scratch-ear-03.png`,
  `${IDLE_TRANSITIONS}/sit-to-scratch-ear-04.png`,
] as const;

const SIT_TO_HEAD_PET = [
  `${HEAD_PET}/sit-to-head-pet-01.png`,
  `${HEAD_PET}/sit-to-head-pet-02.png`,
  `${HEAD_PET}/sit-to-head-pet-03.png`,
  `${HEAD_PET}/sit-to-head-pet-04.png`,
] as const;

const STAND_TO_CHASE_TAIL = [
  `${CHASE_TAIL}/stand-to-chase-tail-01.png`,
  `${CHASE_TAIL}/stand-to-chase-tail-02.png`,
  `${CHASE_TAIL}/stand-to-chase-tail-03.png`,
  `${CHASE_TAIL}/stand-to-chase-tail-04.png`,
] as const;

const PRONE_TO_TAIL_SLEEP = [
  `${IDLE_TRANSITIONS}/prone-to-tail-sleep-01.png`,
  `${IDLE_TRANSITIONS}/prone-to-tail-sleep-02.png`,
  `${IDLE_TRANSITIONS}/prone-to-tail-sleep-03.png`,
  `${IDLE_TRANSITIONS}/prone-to-tail-sleep-04.png`,
] as const;

const PRONE_TO_PLAY_DEAD = [
  `${IDLE_TRANSITIONS}/prone-to-play-dead-01.png`,
  `${IDLE_TRANSITIONS}/prone-to-play-dead-02.png`,
  `${IDLE_TRANSITIONS}/prone-to-play-dead-03.png`,
  `${IDLE_TRANSITIONS}/prone-to-play-dead-04.png`,
] as const;

const reverse = (frames: readonly string[]): readonly string[] =>
  [...frames].reverse();

const SIT_TO_STAND = reverse(STAND_TO_SIT);
const PRONE_TO_SIT = reverse(SIT_TO_PRONE);
const BELLY_TO_PRONE = reverse(PRONE_TO_BELLY);
const BACK_LOOK_TO_SIT = reverse(SIT_TO_BACK_LOOK);
const LICK_PAW_TO_SIT = reverse(SIT_TO_LICK_PAW);
const SCRATCH_EAR_TO_SIT = reverse(SIT_TO_SCRATCH_EAR);
const HEAD_PET_TO_SIT = reverse(SIT_TO_HEAD_PET);
const CHASE_TAIL_TO_STAND = reverse(STAND_TO_CHASE_TAIL);
const TAIL_SLEEP_TO_PRONE = reverse(PRONE_TO_TAIL_SLEEP);
const PLAY_DEAD_TO_PRONE = reverse(PRONE_TO_PLAY_DEAD);
const STAND_TO_PRONE = [
  ...STAND_TO_SIT,
  ...SIT_TO_PRONE,
] as const;
const PRONE_TO_STAND = [
  ...PRONE_TO_SIT,
  ...SIT_TO_STAND,
] as const;
const STAND_TO_BELLY = [
  ...STAND_TO_PRONE,
  ...PRONE_TO_BELLY,
] as const;
const BELLY_TO_STAND = [
  ...BELLY_TO_PRONE,
  ...PRONE_TO_STAND,
] as const;
const STAND_TO_BACK_LOOK = [
  ...STAND_TO_SIT,
  ...SIT_TO_BACK_LOOK,
] as const;
const BACK_LOOK_TO_STAND = [
  ...BACK_LOOK_TO_SIT,
  ...SIT_TO_STAND,
] as const;
const STAND_TO_LICK_PAW = [
  ...STAND_TO_SIT,
  ...SIT_TO_LICK_PAW,
] as const;
const LICK_PAW_TO_STAND = [
  ...LICK_PAW_TO_SIT,
  ...SIT_TO_STAND,
] as const;
const STAND_TO_SCRATCH_EAR = [
  ...STAND_TO_SIT,
  ...SIT_TO_SCRATCH_EAR,
] as const;
const SCRATCH_EAR_TO_STAND = [
  ...SCRATCH_EAR_TO_SIT,
  ...SIT_TO_STAND,
] as const;
const STAND_TO_HEAD_PET = [
  ...STAND_TO_SIT,
  ...SIT_TO_HEAD_PET,
] as const;
const HEAD_PET_TO_STAND = [
  ...HEAD_PET_TO_SIT,
  ...SIT_TO_STAND,
] as const;
const STAND_TO_TAIL_SLEEP = [
  ...STAND_TO_PRONE,
  ...PRONE_TO_TAIL_SLEEP,
] as const;
const TAIL_SLEEP_TO_STAND = [
  ...TAIL_SLEEP_TO_PRONE,
  ...PRONE_TO_STAND,
] as const;
const STAND_TO_PLAY_DEAD = [
  ...STAND_TO_PRONE,
  ...PRONE_TO_PLAY_DEAD,
] as const;
const PLAY_DEAD_TO_STAND = [
  ...PLAY_DEAD_TO_PRONE,
  ...PRONE_TO_STAND,
] as const;
const SIT_TO_PLAY_DEAD_FULL = [
  ...SIT_TO_PRONE,
  ...PRONE_TO_PLAY_DEAD,
] as const;
const PLAY_DEAD_TO_SIT_FULL = [
  ...PLAY_DEAD_TO_PRONE,
  ...PRONE_TO_SIT,
] as const;

export const POSE_TRANSITION_INTERVAL = 88;

export const POSE_TRANSITIONS: Readonly<
  Record<string, readonly string[]>
> = {
  "falling>squash": IMPACT_RECOVER,
  "idle>sitting": STAND_TO_SIT,
  "sitting>idle": SIT_TO_STAND,
  "sitting>chin-rest": SIT_TO_PRONE,
  "chin-rest>sitting": PRONE_TO_SIT,
  "sitting>back-side-eye": SIT_TO_BACK_LOOK,
  "back-side-eye>sitting": BACK_LOOK_TO_SIT,
  "sitting>lick-paw": SIT_TO_LICK_PAW,
  "lick-paw>sitting": LICK_PAW_TO_SIT,
  "sitting>scratch-ear": SIT_TO_SCRATCH_EAR,
  "scratch-ear>sitting": SCRATCH_EAR_TO_SIT,
  "sitting>head-pet": SIT_TO_HEAD_PET,
  "head-pet>sitting": HEAD_PET_TO_SIT,
  "chin-rest>tail-sleep": PRONE_TO_TAIL_SLEEP,
  "tail-sleep>chin-rest": TAIL_SLEEP_TO_PRONE,
  "chin-rest>play-dead": PRONE_TO_PLAY_DEAD,
  "play-dead>chin-rest": PLAY_DEAD_TO_PRONE,
  "sitting>play-dead": SIT_TO_PLAY_DEAD_FULL,
  "play-dead>sitting": PLAY_DEAD_TO_SIT_FULL,
  "chin-rest>belly-up": PRONE_TO_BELLY,
  "play-dead>belly-up": PRONE_TO_BELLY,
  "belly-up>chin-rest": BELLY_TO_PRONE,
  "belly-up>play-dead": BELLY_TO_PRONE,
  "idle>back-side-eye": STAND_TO_BACK_LOOK,
  "back-side-eye>idle": BACK_LOOK_TO_STAND,
  "idle>lick-paw": STAND_TO_LICK_PAW,
  "lick-paw>idle": LICK_PAW_TO_STAND,
  "idle>scratch-ear": STAND_TO_SCRATCH_EAR,
  "scratch-ear>idle": SCRATCH_EAR_TO_STAND,
  "idle>head-pet": STAND_TO_HEAD_PET,
  "head-pet>idle": HEAD_PET_TO_STAND,
  "idle>chase-tail": STAND_TO_CHASE_TAIL,
  "chase-tail>idle": CHASE_TAIL_TO_STAND,
  "idle>tail-sleep": STAND_TO_TAIL_SLEEP,
  "tail-sleep>idle": TAIL_SLEEP_TO_STAND,
  "idle>chin-rest": STAND_TO_PRONE,
  "idle>play-dead": STAND_TO_PLAY_DEAD,
  "chin-rest>idle": PRONE_TO_STAND,
  "play-dead>idle": PLAY_DEAD_TO_STAND,
  "idle>belly-up": STAND_TO_BELLY,
  "belly-up>idle": BELLY_TO_STAND,
};

export function getPoseTransition(
  from: PetState,
  to: PetState,
): readonly string[] | undefined {
  return POSE_TRANSITIONS[`${from}>${to}`];
}

export const STATE_LABELS: Record<PetState, string> = {
  idle: "正在装作很忙",
  walk: "勉强走两步",
  run: "被迫营业中",
  brake: "肥屁股刹不住了",
  lifted: "四脚离地，尊严扫地",
  falling: "正在自由落体",
  squash: "短暂变成柴犬饼",
  resist: "已经开始记仇",
  dizzy: "脑浆摇匀了",
  sitting: "正在审判主人",
  "head-pet": "嘴上嫌弃，身体很诚实",
  "poke-wary": "还在假装不在意",
  "poke-annoyed": "飞机耳已经启动",
  "poke-block": "爪子正在礼貌警告",
  "poke-push": "正在把你的手推开",
  tongue: "偷偷吐了下舌头",
  "chin-rest": "下巴已经失去支撑",
  "back-side-eye": "没看你，真的",
  "lick-paw": "假装讲卫生",
  "scratch-ear": "挠得很投入",
  "chase-tail": "差一点就抓到了",
  "tail-sleep": "把脸藏好了",
  pancake: "被按成柴犬饼",
  sunglasses: "戴墨镜走猫步",
  "long-dog": "突然拉得很长",
  phone: "正在偷偷刷手机",
  coffee: "咖啡最后还是进了狗嘴",
  blanket: "凌晨自动盖被",
  sign: "已经发出正式警告",
  "check-alive": "正在检查主人生命体征",
  toy: "正在推一个无辜的小球",
  "top-hang": "趴在屏幕顶边晃腿",
  "butt-block": "用屁股短暂挡一下",
  "hide-behind": "躲在窗口后面偷看",
  "play-dead": "死了，但没完全死",
  "belly-up": "彻底躺平",
};
