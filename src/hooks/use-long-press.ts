/**
 * @see https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/interactions/src/useLongPress.ts
 */

import * as React from "react";

const DEFAULT_PRESS_DURATION_MS = 400;
const DEFAULT_MOVEMENT_THRESHOLD = 25;

type DetectionMode = "both" | "mouse" | "touch";
type CancelReason = "canceled-by-movement" | "canceled-by-timeout";

interface Coordinates {
  x: number;
  y: number;
}

interface LongPressEvent {
  nativeEvent: MouseEvent | TouchEvent;
  touches?: TouchList;
  pageX?: number;
  pageY?: number;
  persist: () => void;
}

interface LongPressCallbackMeta<Context = unknown> {
  context?: Context;
  reason?: CancelReason;
}

type LongPressCallback<Context = unknown> = (
  event: LongPressEvent,
  meta: LongPressCallbackMeta<Context>,
) => void;

interface LongPressOptions<Context = unknown> {
  threshold?: number;
  captureEvent?: boolean;
  detect?: DetectionMode;
  filterEvents?: (event: LongPressEvent) => boolean;
  cancelOnMovement?: boolean | number;
  onStart?: LongPressCallback<Context>;
  onMove?: LongPressCallback<Context>;
  onFinish?: LongPressCallback<Context>;
  onCancel?: LongPressCallback<Context>;
}

function isTouchEvent(
  event: LongPressEvent,
): event is LongPressEvent & { touches: TouchList } {
  const { nativeEvent } = event;
  return window.TouchEvent
    ? nativeEvent instanceof TouchEvent
    : "touches" in nativeEvent;
}

function isMouseEvent(
  event: LongPressEvent,
): event is LongPressEvent & { pageX: number; pageY: number } {
  return event.nativeEvent instanceof MouseEvent;
}

function getCurrentPosition(event: LongPressEvent): Coordinates | null {
  if (isTouchEvent(event)) {
    const touch = event.touches[0];
    if (!touch) return null;
    return {
      x: touch.pageX,
      y: touch.pageY,
    };
  }

  if (isMouseEvent(event)) {
    return {
      x: event.pageX,
      y: event.pageY,
    };
  }

  return null;
}

function useLongPress<Context = undefined>(
  callback: LongPressCallback<Context> | null,
  {
    threshold = DEFAULT_PRESS_DURATION_MS,
    captureEvent = false,
    detect = "both",
    cancelOnMovement = false,
    filterEvents,
    onStart,
    onMove,
    onFinish,
    onCancel,
  }: LongPressOptions<Context> = {},
) {
  const state = React.useRef({
    isLongPressActive: false,
    isPressed: false,
    startPosition: null as Coordinates | null,
  });

  const timer = React.useRef<NodeJS.Timeout | null>(null);
  const savedCallback = React.useRef(callback);

  const clearTimer = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = React.useCallback(
    (context?: Context) => (event: LongPressEvent) => {
      if (
        state.current.isPressed ||
        (!isMouseEvent(event) && !isTouchEvent(event))
      ) {
        return;
      }

      if (filterEvents?.call(null, event) === false) {
        return;
      }

      state.current.startPosition = getCurrentPosition(event);
      state.current.isPressed = true;

      if (captureEvent) {
        event.persist();
      }

      const meta: LongPressCallbackMeta<Context> =
        context === undefined ? {} : { context };
      onStart?.call(null, event, meta);

      timer.current = setTimeout(() => {
        if (savedCallback.current) {
          savedCallback.current(event, meta);
          state.current.isLongPressActive = true;
        }
      }, threshold);
    },
    [captureEvent, filterEvents, onStart, threshold],
  );

  const cancel = React.useCallback(
    (context?: Context, reason?: CancelReason) => (event: LongPressEvent) => {
      if (!isMouseEvent(event) && !isTouchEvent(event)) {
        return;
      }

      state.current.startPosition = null;

      if (captureEvent) {
        event.persist();
      }

      const meta: LongPressCallbackMeta<Context> =
        context === undefined ? {} : { context };

      if (state.current.isLongPressActive) {
        onFinish?.call(null, event, meta);
      } else if (state.current.isPressed) {
        onCancel?.call(null, event, {
          ...meta,
          reason: reason ?? "canceled-by-timeout",
        });
      }

      state.current.isLongPressActive = false;
      state.current.isPressed = false;
      clearTimer();
    },
    [captureEvent, onFinish, onCancel, clearTimer],
  );

  const move = React.useCallback(
    (context?: Context) => (event: LongPressEvent) => {
      onMove?.call(null, event, { context });

      if (cancelOnMovement && state.current.startPosition) {
        const currentPosition = getCurrentPosition(event);
        if (currentPosition) {
          const moveThreshold =
            cancelOnMovement === true
              ? DEFAULT_MOVEMENT_THRESHOLD
              : cancelOnMovement;
          const movedDistance = {
            x: Math.abs(currentPosition.x - state.current.startPosition.x),
            y: Math.abs(currentPosition.y - state.current.startPosition.y),
          };

          if (
            movedDistance.x > moveThreshold ||
            movedDistance.y > moveThreshold
          ) {
            cancel(context, "canceled-by-movement")(event);
          }
        }
      }
    },
    [cancel, cancelOnMovement, onMove],
  );

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  return React.useMemo<Record<string, EventListener>>(() => {
    if (callback === null) return {};

    const mouseHandlers = {
      onMouseDown: start(),
      onMouseMove: move(),
      onMouseUp: cancel(),
      onMouseLeave: cancel(),
    };

    const touchHandlers = {
      onTouchStart: start(),
      onTouchMove: move(),
      onTouchEnd: cancel(),
    };

    switch (detect) {
      case "mouse":
        return mouseHandlers;
      case "touch":
        return touchHandlers;
      default:
        return { ...mouseHandlers, ...touchHandlers };
    }
  }, [callback, cancel, detect, start, move]);
}

export { useLongPress, type LongPressCallback };
