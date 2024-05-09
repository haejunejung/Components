import {useRef, useState} from 'react';
import {getOwnerDocument} from '@/shared/lib/utils/get-owner-document';
import {useDisposables} from '../use-disposables';
import {useEvent} from '../use-event';

// Only the necessary props from a DOMRect
type Rect = {left: number; right: number; top: number; bottom: number};

function pointerRectFromPointerEvent(event: PointerEvent): Rect {
  // Center of the pointer geometry
  let offsetX = event.width / 2;
  let offsetY = event.height / 2;

  return {
    top: event.clientY - offsetY,
    right: event.clientX + offsetX,
    bottom: event.clientY + offsetY,
    left: event.clientX - offsetX,
  };
}

function areRectsOverlapping(a: Rect | null, b: Rect | null) {
  if (!a || !b) {
    return false;
  }

  if (a.right < b.left || a.left > b.right) {
    return false;
  }

  if (a.bottom < b.top || a.top > b.bottom) {
    return false;
  }

  return true;
}

export function useActivePress({
  disabled = false,
}: Partial<{disabled: boolean}> = {}) {
  const target = useRef<HTMLElement | null>(null);
  const [pressed, setPressed] = useState<boolean>(false);
  const d = useDisposables();

  const reset = useEvent(() => {
    target.current = null;
    setPressed(false);
    d.dispose();
  });

  const handlePointerDown = useEvent((event: PointerEvent) => {
    d.dispose();

    if (target.current !== null) return;

    target.current = event.currentTarget as HTMLElement;

    setPressed(true);

    {
      const owner = getOwnerDocument(event.currentTarget as Element)!;

      d.addEventListener(owner, 'pointerup', reset, false);

      d.addEventListener(
        owner,
        'pointermove',
        (event: PointerEvent) => {
          if (target.current) {
            const pointerRect = pointerRectFromPointerEvent(event);
            setPressed(
              areRectsOverlapping(
                pointerRect,
                target.current.getBoundingClientRect(),
              ),
            );
          }
        },
        false,
      );

      d.addEventListener(owner, 'pointercancel', reset, false);
    }
  });

  return {
    pressed,
    pressProps: disabled
      ? {}
      : {
          onPointerDown: handlePointerDown,
          onPointerUp: reset,
          onClick: reset,
        },
  };
}
