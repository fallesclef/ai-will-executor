"use client";

import { useState, useEffect, useCallback } from "react";
import { story } from "@/data/story";
import {
  createInitialState,
  gameReducer,
  saveGame,
  loadGame,
  clearSave,
  canAccessVerdict,
  resolvePersonality,
  getVerdictLabel,
  isOnboardingNode,
  isHubNode,
} from "@/lib/engine";
import { resolveNodeContent } from "@/lib/nodes";
import type { GameState, Choice } from "@/types/story";
import { StatusPanel } from "@/components/StatusPanel";
import { NodeView } from "@/components/NodeView";
import { CaseDashboard } from "@/components/CaseDashboard";

const RETURN_TO_CONSOLE_CATEGORIES = new Set([
  "brief",
  "profile",
  "evidence",
  "interview",
  "ai_inquiry",
]);

export function GameShell() {
  const [state, setState] = useState<GameState>(() => createInitialState(story));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setState(saved);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveGame(state);
    }
  }, [state, hydrated]);

  const dispatch = useCallback(
    (action: Parameters<typeof gameReducer>[1]) => {
      setState((prev) => gameReducer(prev, action, story));
    },
    []
  );

  const handleNavigate = (nodeId: string) => {
    dispatch({ type: "NAVIGATE", nodeId });
  };

  const handleChoice = (choice: Choice) => {
    if (state.phase === "ending") return;

    if (state.currentNodeId === "verdict") {
      dispatch({
        type: "VERDICT",
        choiceId: choice.id,
        effects: choice.effects,
      });
      return;
    }

    dispatch({
      type: "CHOICE",
      choiceId: choice.id,
      effects: choice.effects,
      nextNodeId: choice.nextNodeId,
      flags: choice.flags,
    });

    if (!choice.nextNodeId) {
      const node = story.nodes[state.currentNodeId];
      if (node && RETURN_TO_CONSOLE_CATEGORIES.has(node.category)) {
        setTimeout(() => {
          dispatch({ type: "NAVIGATE", nodeId: "console" });
        }, 0);
      }
    }
  };

  const handleReset = () => {
    clearSave();
    setState(createInitialState(story));
  };

  const verdictReady = canAccessVerdict(state);
  const currentNode = story.nodes[state.currentNodeId];
  const nodeContent = currentNode
    ? resolveNodeContent(currentNode, state)
    : [];
  const ending = state.endingId
    ? story.endings.find((e) => e.id === state.endingId)
    : null;
  const personality =
    state.phase === "ending"
      ? resolvePersonality(state.stats, story.personalityArchetypes)
      : null;

  if (!hydrated) {
    return (
      <div className="game-loading">
        <span className="game-loading__text">系統載入中...</span>
      </div>
    );
  }

  if (state.phase === "ending" && ending) {
    return (
      <div className="game-shell">
        <header className="game-header">
          <div className="game-header__brand">
            <span className="game-header__sys">AWE SYSTEM v3.1</span>
            <h1 className="game-header__title">{story.title}</h1>
          </div>
        </header>

        <main className="game-main game-main--ending">
          <article className="ending-view">
            {ending.isHidden && (
              <div className="ending-view__hidden-badge">隱藏結局解鎖</div>
            )}
            <header className="ending-view__header">
              <span className="ending-view__subtitle">{ending.subtitle}</span>
              <h2 className="ending-view__title">{ending.title}</h2>
              <div className="ending-view__divider" />
            </header>

            <div className="ending-view__body">
              {ending.content.map((p, i) => (
                <p
                  key={i}
                  className={
                    p === "" ? "node-view__spacer" : "node-view__paragraph"
                  }
                >
                  {p}
                </p>
              ))}
              {ending.id === "ending-hidden" &&
                state.verdictChoiceId === "verdict-approve" &&
                ending.epilogueApprove?.map((p, i) => (
                  <p
                    key={`ep-a-${i}`}
                    className={
                      p === "" ? "node-view__spacer" : "node-view__paragraph"
                    }
                  >
                    {p}
                  </p>
                ))}
              {ending.id === "ending-hidden" &&
                state.verdictChoiceId === "verdict-seal" &&
                ending.epilogueSeal?.map((p, i) => (
                  <p
                    key={`ep-s-${i}`}
                    className={
                      p === "" ? "node-view__spacer" : "node-view__paragraph"
                    }
                  >
                    {p}
                  </p>
                ))}
            </div>

            {personality && (
              <section className="personality-report">
                <h3 className="personality-report__title">裁決人格報告</h3>
                <div className="personality-report__card">
                  <p className="personality-report__verdict">
                    你的裁決：{getVerdictLabel(state.verdictChoiceId)}
                  </p>
                  <span className="personality-report__archetype">
                    {personality.title}
                  </span>
                  <p className="personality-report__desc">
                    {personality.description}
                  </p>
                  <p className="personality-report__case">
                    本案評語：{personality.caseComment}
                  </p>
                  <div className="personality-report__stats">
                    <span>法理 {state.stats.legal}</span>
                    <span>共感 {state.stats.empathy}</span>
                    <span>懷疑 {state.stats.suspicion}</span>
                  </div>
                </div>
              </section>
            )}

            <footer className="ending-view__footer">
              <button type="button" className="choice-btn" onClick={handleReset}>
                <span className="choice-btn__marker">{">"}</span>
                重新審理本案
              </button>
            </footer>
          </article>
        </main>
      </div>
    );
  }

  const isOnboarding = isOnboardingNode(state.currentNodeId);
  const isConsole = isHubNode(state.currentNodeId);
  const isVerdict = state.currentNodeId === "verdict";
  const isCrossroad = state.currentNodeId.startsWith("crossroad_");
  const showBack =
    !isOnboarding &&
    !isConsole &&
    !isVerdict &&
    !isCrossroad &&
    currentNode?.category !== "contradiction";

  if (isOnboarding) {
    return (
      <div className="game-shell game-shell--onboarding">
        <header className="game-header game-header--onboarding">
          <span className="game-header__sys">AWE SYSTEM v3.1</span>
        </header>
        <main className="game-main game-main--onboarding">
          {currentNode && (
            <NodeView
              title={currentNode.title}
              subtitle={currentNode.subtitle}
              category={currentNode.category}
              content={nodeContent}
              choices={currentNode.choices}
              onChoice={handleChoice}
              isVerdict={false}
            />
          )}
        </main>
        <footer className="game-footer">
          <span>AI WILL EXECUTOR · DIGITAL PROBATE DIVISION</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <header className="game-header">
        <div className="game-header__brand">
          <span className="game-header__sys">AWE SYSTEM v3.1</span>
          <h1 className="game-header__title">{story.title}</h1>
          <p className="game-header__subtitle">{story.subtitle}</p>
        </div>
        <div className="game-header__actions">
          <button type="button" className="header-btn" onClick={handleReset}>
            重置案件
          </button>
        </div>
      </header>

      <div className="game-body">
        <StatusPanel state={state} story={story} />

        <main className="game-main">
          {isConsole ? (
            <div className="main-content">
              <header className="main-content__header">
                <h2 className="main-content__title">案件控制台</h2>
                <span className="main-content__id">{story.caseNumber}</span>
              </header>
              <CaseDashboard
                state={state}
                onNavigate={handleNavigate}
                onVerdict={() => handleNavigate("verdict")}
                canVerdict={verdictReady}
              />
            </div>
          ) : currentNode ? (
            <div className="main-content">
              <NodeView
                title={currentNode.title}
                subtitle={currentNode.subtitle}
                category={currentNode.category}
                content={nodeContent}
                choices={currentNode.choices}
                onChoice={handleChoice}
                onBack={() => handleNavigate("console")}
                showBack={showBack}
                isVerdict={isVerdict}
                isCrossroad={isCrossroad}
              />
            </div>
          ) : (
            <div className="main-content">
              <p>節點不存在</p>
            </div>
          )}
        </main>
      </div>

      <footer className="game-footer">
        <span>AI WILL EXECUTOR · DIGITAL PROBATE DIVISION</span>
        <span>{new Date().toLocaleDateString("zh-TW")}</span>
      </footer>
    </div>
  );
}
