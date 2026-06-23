import type { PlayerState, StoryNode, Story } from "@/types/story";
import { buildDynamicContent } from "@/lib/season-history";

export function resolveNodeContent(
  node: StoryNode,
  state: PlayerState,
  story?: Story
): string[] {
  const lines = [...node.content];
  if (!node.contentIf) {
    // fall through
  } else {
    for (const block of node.contentIf) {
      const viewedOk =
        !block.whenViewed ||
        block.whenViewed.every((id) => state.viewedNodes.includes(id));
      const flagsOk =
        !block.whenFlags ||
        block.whenFlags.every((f) => state.flags.includes(f));
      if (viewedOk && flagsOk) {
        lines.push("", ...block.lines);
      }
    }
  }

  const dynamicKeys = story?.flow.dynamicContentKeys;
  if (dynamicKeys?.[node.id]) {
    lines.push(...buildDynamicContent(dynamicKeys[node.id]));
  }

  return lines;
}
