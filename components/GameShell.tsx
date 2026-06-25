"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Story, PlayerState, Choice } from "@/types/story";
import {
  createInitialState,
  gameReducer,
  saveGame,
  loadGame,
  clearSave,
  canAccessVerdict,
  canUnlockSecretVerdict,
  canUnlockHiddenEnding,
  resolvePersonality,
  getVerdictLabel,
  isOnboardingNode,
  isHubNode,
  isReadOnlyNavigationNode,
} from "@/lib/engine";
import { resolveNodeContent } from "@/lib/nodes";
import { predictCrossroadChoice, predictD399Verdict, predictEvidenceChoice, computeMirrorSyncPercent } from "@/lib/season-history";
import { StatusPanel } from "@/components/StatusPanel";
import { NodeView } from "@/components/NodeView";
import { CaseDashboard } from "@/components/CaseDashboard";
import { getLocalPlayerId, registerPlayer } from "@/lib/player/client";
import { queueSync } from "@/lib/sync/client";
import { getNextCase, getStory, listCases } from "@/data/cases";
import { hasCompletedRequiredCases, shouldShowResonancePanel } from "@/lib/resonance";
import { ResonancePanel } from "@/components/ResonancePanel";
import {
  getExecutorName,
  getAiExecutorName,
  hasExecutorName,
  personalizeChoice,
  personalizeLines,
  personalizeNarrative,
} from "@/lib/executor-identity";
import { ExecutorNameForm } from "@/components/ExecutorNameForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StoryLocaleBanner } from "@/components/StoryLocaleBanner";
import { useLocale } from "@/lib/i18n/context";
import { useReadingScrollAnchor } from "@/lib/use-reading-scroll";

interface GameShellProps {
  caseId: string;
}

export function GameShell({ caseId }: GameShellProps) {
  const { t } = useLocale();
  const story = getStory(caseId);

  if (!story) {
    return (
      <div className="game-loading">
        <p className="game-loading__text">{t("game.caseNotFound")}</p>
        <Link href="/" className="choice-btn" style={{ marginTop: "1rem" }}>
          {t("common.returnLobby")}
        </Link>
      </div>
    );
  }

  return <GameShellContent story={story} />;
}

function GameShellContent({ story }: { story: Story }) {
  const { locale, t } = useLocale();
  const caseMeta = listCases(locale).find((c) => c.id === story.id);
  const prerequisitesMet =
    !caseMeta?.requiresCompletedCases?.length ||
    hasCompletedRequiredCases(caseMeta.requiresCompletedCases);

  if (!prerequisitesMet) {
    return (
      <div className="game-loading">
        <p className="game-loading__text">{t("game.accessDenied")}</p>
        <Link href="/" className="choice-btn" style={{ marginTop: "1rem" }}>
          {t("common.returnLobby")}
        </Link>
      </div>
    );
  }

  return <GameShellInner story={story} />;
}

function GameShellInner({ story }: { story: Story }) {
  const { locale, t } = useLocale();
  const [state, setState] = useState<PlayerState>(() =>
    createInitialState(story, getLocalPlayerId())
  );
  const [hydrated, setHydrated] = useState(false);
  const [nameReady, setNameReady] = useState(false);
  const [verdictDwellReady, setVerdictDwellReady] = useState(false);
  const [verdictDwellRemainingMs, setVerdictDwellRemainingMs] = useState(0);
  const { flow } = story;
  const executorName = getExecutorName();
  const mainRef = useReadingScrollAnchor(
    state.currentNodeId,
    state.phase,
    story,
    hydrated && nameReady
  );

  useEffect(() => {
    void registerPlayer(
      undefined,
      hasExecutorName() ? getExecutorName() : undefined
    );
    const saved = loadGame(story.id);
    if (saved) {
      setState({ ...saved, playerId: saved.playerId || getLocalPlayerId() });
    }
    setHydrated(true);
    setNameReady(hasExecutorName());
  }, [story.id]);

  useEffect(() => {
    if (hydrated) {
      saveGame(state);
      queueSync(state);
    }
  }, [state, hydrated]);

  const dispatch = useCallback(
    (action: Parameters<typeof gameReducer>[1]) => {
      setState((prev) => {
        const next = gameReducer(prev, action, story);
        if (action.type === "CHOICE") {
          queueSync(next, {
            type: "choice",
            nodeId: next.currentNodeId,
            choiceId: action.choiceId,
          });
        } else if (action.type === "VERDICT") {
          queueSync(next, {
            type: "complete",
            choiceId: action.choiceId,
            endingId: next.endingId ?? undefined,
          });
        } else if (action.type === "NAVIGATE") {
          queueSync(next, { type: "navigate", nodeId: action.nodeId });
        }
        return next;
      });
    },
    [story]
  );

  const handleNavigate = (nodeId: string) => {
    dispatch({ type: "NAVIGATE", nodeId });
  };

  const handleChoice = (choice: Choice) => {
    if (state.phase === "ending") return;

    if (state.currentNodeId === flow.verdictNodeId) {
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
      if (node && flow.returnToHubCategories.includes(node.category)) {
        setTimeout(() => {
          dispatch({ type: "NAVIGATE", nodeId: flow.hubNodeId });
        }, 0);
      }
    }
  };

  const handleReset = () => {
    clearSave(story.id);
    setState(createInitialState(story, state.playerId));
  };

  const verdictReady = canAccessVerdict(state, story);
  const currentNode = story.nodes[state.currentNodeId];
  const nodeContent = currentNode
    ? resolveNodeContent(currentNode, state, story)
    : [];
  const secretUnlocked = canUnlockSecretVerdict(state, story);
  const secretVerdict = flow.secretVerdict;

  useEffect(() => {
    if (state.currentNodeId !== flow.verdictNodeId) {
      setVerdictDwellReady(false);
      setVerdictDwellRemainingMs(0);
      return;
    }
    if (!secretVerdict || !secretUnlocked) {
      setVerdictDwellReady(false);
      setVerdictDwellRemainingMs(0);
      return;
    }
    const dwell = secretVerdict.dwellMs ?? 8000;
    const startedAt = Date.now();
    setVerdictDwellRemainingMs(dwell);
    const tick = window.setInterval(() => {
      const remaining = Math.max(0, dwell - (Date.now() - startedAt));
      setVerdictDwellRemainingMs(remaining);
      if (remaining <= 0) {
        setVerdictDwellReady(true);
        window.clearInterval(tick);
      }
    }, 200);
    const timer = window.setTimeout(() => setVerdictDwellReady(true), dwell);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
    };
  }, [
    state.currentNodeId,
    flow.verdictNodeId,
    secretVerdict,
    secretUnlocked,
  ]);

  const displayChoices = useMemo(() => {
    if (!currentNode?.choices) return undefined;
    if (state.currentNodeId !== flow.verdictNodeId || !secretVerdict) {
      return currentNode.choices;
    }
    return currentNode.choices.filter((c) => {
      if (c.id === secretVerdict.choiceId) {
        return secretUnlocked && verdictDwellReady;
      }
      return true;
    });
  }, [
    currentNode,
    state.currentNodeId,
    flow.verdictNodeId,
    secretVerdict,
    secretUnlocked,
    verdictDwellReady,
  ]);

  const crossroadPrediction =
    flow.predictionEnabled &&
    flow.crossroadNodeIds.includes(state.currentNodeId)
      ? predictCrossroadChoice(state.currentNodeId, state)
      : null;

  const verdictPrediction =
    flow.predictionEnabled &&
    state.currentNodeId === flow.verdictNodeId
      ? predictD399Verdict(state)
      : null;

  const evidencePrediction =
    flow.predictionEnabled &&
    currentNode?.category === "player_record"
      ? predictEvidenceChoice(state.currentNodeId, state)
      : null;

  const activePrediction =
    crossroadPrediction ?? verdictPrediction ?? evidencePrediction;

  const interfaceGlowChoiceId =
    flow.predictionEnabled && activePrediction
      ? activePrediction.choiceId
      : undefined;

  const fauxGlowLabel =
    flow.interfaceInterference?.nodeId === state.currentNodeId
      ? flow.interfaceInterference.glowLabel
      : undefined;
  const ending = state.endingId
    ? story.endings.find((e) => e.id === state.endingId)
    : null;
  const hiddenEndingActive =
    !!state.verdictChoiceId &&
    canUnlockHiddenEnding(state, story, state.verdictChoiceId);
  const personality =
    state.phase === "ending"
      ? resolvePersonality(state, story.personalityArchetypes)
      : null;

  const personalizedChoices = useMemo(() => {
    const base = displayChoices ?? currentNode?.choices;
    if (!base || !executorName) return base;
    return base.map((c) => personalizeChoice(c, executorName));
  }, [displayChoices, currentNode?.choices, executorName]);

  const predictionLabel = useMemo(() => {
    if (!activePrediction) return undefined;
    const label = personalizeNarrative(activePrediction.label, executorName);
    if (verdictPrediction) {
      return t("game.prediction", {
        aiName: getAiExecutorName(executorName),
        label,
        confidence: verdictPrediction.confidence,
      });
    }
    return t("game.predictionNoConfidence", {
      aiName: getAiExecutorName(executorName),
      label,
    });
  }, [activePrediction, executorName, verdictPrediction, t]);

  if (!hydrated) {
    return (
      <div className="game-loading">
        <span className="game-loading__text">{t("common.loading")}</span>
      </div>
    );
  }

  if (!nameReady) {
    return (
      <div className="game-shell game-shell--onboarding">
        <header className="game-header game-header--onboarding game-header--onboarding-gate">
          <span className="game-header__sys">{t("common.sys")}</span>
          <LanguageSwitcher />
        </header>
        <ExecutorNameForm
          variant="gate"
          onSaved={() => setNameReady(true)}
        />
      </div>
    );
  }

  const showResonanceMain =
    flow.resonanceEnabled &&
    shouldShowResonancePanel(story, state) &&
    currentNode &&
    (currentNode.id === "evidence_11" ||
      currentNode.id === "echoes" ||
      currentNode.id === "evidence_08" ||
      currentNode.category === "echoes" ||
      (state.phase === "ending" &&
        ["case-d173", "case-d206", "case-d301", "case-d399"].includes(
          story.id
        )));

  if (state.phase === "ending" && ending) {
    const nextCase = getNextCase(story.id, locale);
    return (
      <div className="game-shell">
        <header className="game-header">
          <div className="game-header__brand">
            <span className="game-header__sys">{t("common.sys")}</span>
            <h1 className="game-header__title">{story.title}</h1>
          </div>
          <div className="game-header__actions">
            <LanguageSwitcher />
          </div>
        </header>

        <main ref={mainRef} className="game-main game-main--ending">
          <StoryLocaleBanner caseId={story.id} />
          <article className="ending-view">
            {ending.isHidden && (
              <div className="ending-view__hidden-badge">
                {hiddenEndingActive
                  ? t("game.trueEnding")
                  : t("game.hiddenEnding")}
              </div>
            )}
            <header className="ending-view__header">
              <span className="ending-view__subtitle">
                {personalizeNarrative(ending.subtitle, executorName)}
              </span>
              <h2 className="ending-view__title">
                {personalizeNarrative(ending.title, executorName)}
              </h2>
              <div className="ending-view__divider" />
            </header>

            <div className="ending-view__body">
              {personalizeLines(ending.content, executorName).map((p, i) => (
                <p
                  key={i}
                  className={
                    p === "" ? "node-view__spacer" : "node-view__paragraph"
                  }
                >
                  {p}
                </p>
              ))}
              {ending.isHidden &&
                (() => {
                  const vid = state.verdictChoiceId;
                  let extra: string[] | undefined;
                  if (vid) {
                    extra = ending.epilogueForVerdict?.[vid];
                    if (!extra && vid === "verdict-approve") {
                      extra = ending.epilogueApprove;
                    }
                    if (!extra && vid === "verdict-seal") {
                      extra = ending.epilogueSeal;
                    }
                  }
                  if (!extra) return null;
                  return personalizeLines(extra, executorName).map((p, i) => (
                    <p
                      key={`ep-h-${i}`}
                      className={
                        p === "" ? "node-view__spacer" : "node-view__paragraph"
                      }
                    >
                      {p}
                    </p>
                  ));
                })()}
            </div>

            {personality && (
              <section className="personality-report">
                <h3 className="personality-report__title">
                  {t("game.personalityReport")}
                </h3>
                <div className="personality-report__card">
                  <p className="personality-report__verdict">
                    {t("game.yourVerdict", {
                      label: getVerdictLabel(story, state.verdictChoiceId),
                    })}
                  </p>
                  <span className="personality-report__archetype">
                    {personality.title}
                  </span>
                  <p className="personality-report__desc">
                    {personalizeNarrative(personality.description, executorName)}
                  </p>
                  <p className="personality-report__case">
                    {t("game.caseComment")}
                    {personalizeNarrative(personality.caseComment, executorName)}
                  </p>
                  <div className="personality-report__stats">
                    <span>
                      {t("stats.legal")} {state.stats.legal}
                    </span>
                    <span>
                      {t("stats.empathy")} {state.stats.empathy}
                    </span>
                    <span>
                      {t("stats.suspicion")} {state.stats.suspicion}
                    </span>
                    {story.flow.publicStatsEnabled && (
                      <>
                        <span>
                          {t("stats.public_trust")} {state.stats.public_trust}
                        </span>
                        <span>
                          {t("stats.social_stability")}{" "}
                          {state.stats.social_stability}
                        </span>
                        <span>
                          {t("stats.truth_pressure")}{" "}
                          {state.stats.truth_pressure}
                        </span>
                      </>
                    )}
                    {story.flow.mirrorStatsEnabled && (
                      <span>
                        {t("stats.mirror_integrity")}{" "}
                        {state.stats.mirror_integrity}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {flow.resonanceEnabled && shouldShowResonancePanel(story, state) && (
              <ResonancePanel state={state} story={story} />
            )}

            <footer className="ending-view__footer">
              {nextCase && (
                <Link
                  href={`/case/${nextCase.id}`}
                  className="choice-btn choice-btn--primary"
                >
                  <span className="choice-btn__marker">{">"}</span>
                  {t("game.nextCase", { subtitle: nextCase.subtitle })}
                </Link>
              )}
              <Link href="/" className="choice-btn">
                <span className="choice-btn__marker">{">"}</span>
                {t("game.chooseOtherCase")}
              </Link>
            </footer>
          </article>
        </main>
      </div>
    );
  }

  const onboarding = isOnboardingNode(story, state.currentNodeId);
  const isConsole = isHubNode(story, state.currentNodeId);
  const isVerdict = state.currentNodeId === flow.verdictNodeId;
  const isCrossroad = flow.crossroadNodeIds.includes(state.currentNodeId);
  const readOnlyNode = isReadOnlyNavigationNode(currentNode);
  const showBack =
    !onboarding &&
    !isConsole &&
    !isVerdict &&
    !isCrossroad &&
    currentNode?.category !== "contradiction" &&
    !readOnlyNode;

  if (onboarding) {
    return (
      <div className="game-shell game-shell--onboarding">
        <header className="game-header game-header--onboarding">
          <span className="game-header__sys">{t("common.sys")}</span>
          <LanguageSwitcher />
        </header>
        <main ref={mainRef} className="game-main game-main--onboarding">
          <StoryLocaleBanner caseId={story.id} />
          {currentNode && (
            <NodeView
              title={personalizeNarrative(currentNode.title, executorName)}
              subtitle={personalizeNarrative(
                currentNode.subtitle ?? "",
                executorName
              )}
              category={currentNode.category}
              categoryLabels={flow.categoryLabels}
              content={nodeContent}
              choices={personalizedChoices ?? currentNode.choices}
              onChoice={handleChoice}
              isVerdict={false}
            />
          )}
        </main>
        <footer className="game-footer">
          <span>{t("common.footer")}</span>
        </footer>
      </div>
    );
  }

  const verdictHint =
    state.currentNodeId === flow.verdictNodeId &&
    secretVerdict &&
    secretUnlocked &&
    !verdictDwellReady
      ? t("game.verdictDwell", {
          seconds: Math.ceil(verdictDwellRemainingMs / 1000),
        })
      : state.currentNodeId === flow.verdictNodeId &&
          secretVerdict &&
          !secretUnlocked
        ? t("game.verdictLocked")
        : undefined;

  return (
    <div className="game-shell">
      <header className="game-header">
        <div className="game-header__brand">
          <span className="game-header__sys">{t("common.sys")}</span>
          <h1 className="game-header__title">{story.title}</h1>
          <p className="game-header__subtitle">{story.subtitle}</p>
        </div>
        <div className="game-header__actions">
          <LanguageSwitcher />
          <Link href="/" className="header-btn header-btn--link">
            {t("common.caseList")}
          </Link>
          <button type="button" className="header-btn" onClick={handleReset}>
            {t("common.resetCase")}
          </button>
        </div>
      </header>

      <StoryLocaleBanner caseId={story.id} />

      <div className="game-body">
        <StatusPanel state={state} story={story} />

        <main ref={mainRef} className="game-main">
          {isConsole ? (
            <div className="main-content">
              <header className="main-content__header">
                <h2 className="main-content__title">{t("game.consoleTitle")}</h2>
                <span className="main-content__id">{story.caseNumber}</span>
              </header>
              <CaseDashboard
                story={story}
                state={state}
                onNavigate={handleNavigate}
                onVerdict={() => handleNavigate(flow.verdictNodeId)}
                canVerdict={verdictReady}
              />
            </div>
          ) : currentNode ? (
            <div className="main-content">
              <NodeView
                title={personalizeNarrative(currentNode.title, executorName)}
                subtitle={personalizeNarrative(
                  currentNode.subtitle ?? "",
                  executorName
                )}
                category={currentNode.category}
                categoryLabels={flow.categoryLabels}
                content={nodeContent}
                choices={personalizedChoices}
                onChoice={handleChoice}
                onBack={() => {
                  const backChoice = currentNode?.choices?.find(
                    (c) => c.id === "back-console" || c.id.endsWith("-back")
                  );
                  if (backChoice) {
                    handleChoice(backChoice);
                  } else {
                    handleNavigate(flow.hubNodeId);
                  }
                }}
                showBack={showBack}
                isVerdict={isVerdict}
                isCrossroad={isCrossroad}
                predictionLabel={predictionLabel}
                interfaceGlowChoiceId={interfaceGlowChoiceId}
                fauxGlowLabel={fauxGlowLabel}
                verdictHint={verdictHint}
              />
              {showResonanceMain && (
                <ResonancePanel state={state} story={story} />
              )}
            </div>
          ) : (
            <div className="main-content">
              <p>{t("game.nodeMissing")}</p>
            </div>
          )}
        </main>
      </div>

      <footer className="game-footer">
        <span>{t("common.footer")}</span>
        <span>
          {new Date().toLocaleDateString(locale === "en" ? "en-US" : "zh-TW")}
        </span>
      </footer>
    </div>
  );
}
