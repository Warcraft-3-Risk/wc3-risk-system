import { addScriptHook, W3TS_HOOK } from 'w3ts';
import { NameManager } from 'src/app/managers/names/name-manager';

const ESCAPE = '\\';
const ESCAPED = `${ESCAPE}"`;

let cache: gamecache;
let ready: boolean = false;
let queue: string[] = [];
let messageId: number = 1;

addScriptHook(W3TS_HOOK.MAIN_AFTER, (): void => {
  FlushGameCache(InitGameCache ('mmd.dat')!);
  cache = InitGameCache('mmd.dat')!;

  const timer = CreateTimer();

  TimerStart(timer, 0, false, () => {
    DestroyTimer(timer);

    ready = true;

    record('meta version=2');

    const nameManager = NameManager.getInstance ();

    for (let i = 0; i < bj_MAX_PLAYERS; i++) {
      const player = Player(i);
      const playerId = GetPlayerId(player);

      if (player &&
          GetPlayerController(player) === MAP_CONTROL_USER &&
          GetPlayerSlotState(player) !== PLAYER_SLOT_STATE_EMPTY) {
        const playerName = pack(nameManager.getBtag(player) ?? '');

        record(`meta player id=${playerId} name=${playerName}`);
      }
    }

    flush();
  });
});

function flush() {
  if (!ready) {
    // BJDebugMsg("Cannot flush before the MMD library is initialized");
    return;
  }

  while (queue.length) {
    const next = queue.shift();
    if(!next) break;
    emit(next);
  }
}

export function record(message: string): void {
  if (!ready) {
    queue.push(message);
    return;
  }

  emit(message);
}

function emit(message: string): void {
  if (!ready) {
    return;
  }

  const emitter = pickEmitter();

  if (!emitter) {
    // BJDebugMsg("No MMD emitter selectable");
    return;
  }

  if (emitter === GetLocalPlayer()) {
    const id = messageId++;

    // BJDebugMsg(`MMD Emit ${id}: ${message}`);

    StoreInteger(cache, `x:${id}`, message, id);
    SyncStoredInteger(cache, `x:${id}`, message);
  }
}

export function pack(message: string): string {
  let packed = '';

  for (let i = 0; i < message.length; i++) {
    let char = message[i];

    for (let j = 0; j < ESCAPED.length; j++) {
      if (char === ESCAPED[j]) {
        char = ESCAPE + char;
        break;
      }
    }

    packed += char;
  }

  return `"${packed}"`;
}

function pickEmitter(): player | null {
  let emitter: player | null = null;

  for (let i = 0; i < bj_MAX_PLAYERS; i++) {
    const player = Player(i);
    
    if (player &&
        GetPlayerController(player) === MAP_CONTROL_USER &&
        GetPlayerSlotState(player) === PLAYER_SLOT_STATE_PLAYING) {
      emitter = player;
      break;
    }
  }

  return emitter;
}

export { ready };