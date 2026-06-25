"use client";

import { useEffect, useRef } from "react";
import type { Story } from "@/types/story";
import { isHubNode } from "@/lib/engine";
import { resetReadingScroll } from "@/lib/scroll";

export function useReadingScrollAnchor(
  nodeId: string,
  phase: string,
  story: Story,
  enabled: boolean
) {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const isHub = isHubNode(story, nodeId);
    const mode =
      isHub && phase !== "ending" ? ("hub-focus" as const) : ("top" as const);

    const frame = requestAnimationFrame(() => {
      resetReadingScroll(mainRef.current, mode);
    });

    return () => cancelAnimationFrame(frame);
  }, [nodeId, phase, story, enabled]);

  return mainRef;
}
