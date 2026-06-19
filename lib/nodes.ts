import type { GameState, StoryNode } from "@/types/story";

export function resolveNodeContent(
  node: StoryNode,
  state: GameState
): string[] {
  const lines = [...node.content];
  if (!node.contentIf) return lines;

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
  return lines;
}
