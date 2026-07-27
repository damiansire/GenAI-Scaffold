/**
 * Smooth streaming render utility.
 *
 * LLM SSE chunks arrive in irregular bursts; painting deltas as they arrive
 * makes text tear and forces a re-render per token. This util decouples the
 * model's cadence from the UI: incoming text is enqueued char-by-char and
 * drained on `requestAnimationFrame` at an adaptive speed, emitting at most one
 * `onTextUpdate` per frame.
 *
 * Framework-agnostic on purpose (no Angular, no DI) so it is unit-testable in
 * isolation. See `.agents/skills/streaming-render/SKILL.md`.
 */

export interface SmoothMessageParams {
  /**
   * Called at most once per animation frame with the characters drained this
   * frame and the full accumulated buffer so far.
   */
  onTextUpdate: (delta: string, buffer: string) => void;
  /** Initial drain speed in chars/second (default 10). */
  startSpeed?: number;
}

export interface SmoothMessageController {
  /** Enqueue a raw text delta (e.g. an SSE chunk) for smooth rendering. */
  pushText: (text: string) => void;
  /** Stop the rAF loop without draining the remaining queue. */
  stopAnimation: () => void;
  /**
   * Immediately drain the entire pending queue in a single `onTextUpdate` and
   * stop the loop. Call on stream finish or abort so no chars are stranded.
   */
  flushQueue: () => void;
  /** True while the rAF loop is scheduled. */
  isAnimationActive: () => boolean;
}

/**
 * Upper bound on the per-frame correction applied to the drain speed. Keeping
 * it well under 1 makes the approach to `targetSpeed` monotonic: the speed can
 * never overshoot and flip sign, no matter how large a burst arrives.
 */
const MAX_SPEED_CHANGE_RATE = 0.3;

type RafScheduler = (cb: (timestamp: number) => void) => number;
type RafCanceller = (id: number) => void;

/**
 * Resolve rAF/cancel from the global scope, falling back to timer-based shims
 * so the util works in non-browser test environments.
 */
function resolveRaf(): { raf: RafScheduler; cancel: RafCanceller } {
  const g = globalThis as typeof globalThis & {
    requestAnimationFrame?: RafScheduler;
    cancelAnimationFrame?: RafCanceller;
  };
  if (
    typeof g.requestAnimationFrame === 'function' &&
    typeof g.cancelAnimationFrame === 'function'
  ) {
    return {
      raf: g.requestAnimationFrame.bind(g),
      cancel: g.cancelAnimationFrame.bind(g),
    };
  }
  return {
    raf: (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number,
    cancel: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
  };
}

export function createSmoothMessage(params: SmoothMessageParams): SmoothMessageController {
  const { raf, cancel } = resolveRaf();
  const startSpeed = params.startSpeed ?? 10;

  const outputQueue: string[] = [];
  let buffer = '';
  let currentSpeed = startSpeed;
  let lastQueueLength = 0;
  let accumulatedTime = 0;
  let lastFrameTime = 0;
  let animationFrameId: number | null = null;
  let isActive = false;

  const stopAnimation = (): void => {
    isActive = false;
    if (animationFrameId !== null) {
      cancel(animationFrameId);
      animationFrameId = null;
    }
  };

  const emit = (delta: string): void => {
    if (!delta) return;
    buffer += delta;
    params.onTextUpdate(delta, buffer);
  };

  const flushQueue = (): void => {
    stopAnimation();
    if (outputQueue.length > 0) {
      const rest = outputQueue.splice(0, outputQueue.length).join('');
      emit(rest);
    }
  };

  const updateText = (timestamp: number): void => {
    if (!isActive) return;

    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const frameDuration = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    accumulatedTime += frameDuration;

    // Adaptive speed: grow toward the queue length under backpressure so the
    // text never lags far behind the model; ease back down as it drains.
    //
    // The gain is CAPPED and the result is FLOORED, and both matter. The gain
    // used to scale with the raw queue delta, so a single burst of ~12k chars
    // produced a correction factor above 1: the step overshot past the target,
    // `currentSpeed` went NEGATIVE, `charsToProcess` stayed at 0 and the text
    // froze on screen for seconds while the rAF loop kept spinning.
    const targetSpeed = Math.max(startSpeed, outputQueue.length);
    const speedChangeRate = Math.min(
      MAX_SPEED_CHANGE_RATE,
      Math.abs(outputQueue.length - lastQueueLength) * 0.0008 + 0.005,
    );
    currentSpeed = Math.max(
      startSpeed,
      currentSpeed + (targetSpeed - currentSpeed) * speedChangeRate,
    );
    lastQueueLength = outputQueue.length;

    const charsToProcess = Math.floor((accumulatedTime * currentSpeed) / 1000);
    if (charsToProcess > 0) {
      const actualChars = Math.min(charsToProcess, outputQueue.length);
      const charsToAdd = outputQueue.splice(0, actualChars).join('');
      // Subtract only the time the consumed chars cost, keeping the sub-char
      // remainder so the effective drain rate matches `currentSpeed` instead of
      // biasing below it (the discarded remainder grows worse at low speeds).
      accumulatedTime -= (actualChars * 1000) / currentSpeed;
      emit(charsToAdd);
    }

    if (outputQueue.length > 0 && isActive) {
      animationFrameId = raf(updateText);
    } else {
      stopAnimation();
    }
  };

  const start = (): void => {
    if (isActive) return;
    isActive = true;
    lastFrameTime = 0;
    accumulatedTime = 0;
    animationFrameId = raf(updateText);
  };

  const pushText = (text: string): void => {
    if (!text) return;
    for (const ch of text) outputQueue.push(ch);
    start();
  };

  return {
    pushText,
    stopAnimation,
    flushQueue,
    isAnimationActive: () => isActive,
  };
}
