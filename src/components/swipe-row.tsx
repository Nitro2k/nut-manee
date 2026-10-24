"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { strings } from "@/lib/strings";

/** Fraction of the row width past which releasing deletes. */
const DELETE_THRESHOLD = 0.4;
/** Movement before deciding between a horizontal swipe and a vertical scroll. */
const AXIS_LOCK_PX = 8;

/**
 * Swipe left to delete. Vertical movement is left to the browser (`touch-action: pan-y`),
 * so the list still scrolls normally.
 */
export function SwipeRow({ onDelete, children }: { onDelete: () => void; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    swiped.current = false;
    setAnimating(false);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const moveX = e.clientX - start.current.x;
    const moveY = e.clientY - start.current.y;
    if (!axis.current) {
      if (Math.abs(moveX) < AXIS_LOCK_PX && Math.abs(moveY) < AXIS_LOCK_PX) return;
      axis.current = Math.abs(moveX) > Math.abs(moveY) ? "x" : "y";
      if (axis.current === "x") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (axis.current === "x") {
      swiped.current = true;
      setDx(Math.min(0, moveX));
    }
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    start.current = null;
    const width = e.currentTarget.offsetWidth;
    setAnimating(true);
    if (axis.current === "x" && -dx > width * DELETE_THRESHOLD) {
      setDx(-width);
      setTimeout(onDelete, 150);
    } else {
      setDx(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-end bg-red-600 px-5 text-white"
        aria-hidden
      >
        <Trash2 className="size-5" />
      </div>
      <div
        className="relative touch-pan-y bg-background"
        style={{
          transform: `translateX(${dx}px)`,
          transition: animating ? "transform 150ms ease-out" : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // A swipe shouldn't also count as a tap on the row.
          if (swiped.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        aria-roledescription={strings.swipeToDelete}
      >
        {children}
      </div>
    </div>
  );
}
