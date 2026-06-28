import { trackGaEvent } from "./track";

/** Traffic & funnel — GA only. Game choices stay in Redis via queueSync. */

export function trackLobbyView(locale: string) {
  trackGaEvent("lobby_view", { locale });
}

export function trackCaseStart(caseId: string, locale: string) {
  trackGaEvent("case_start", { case_id: caseId, locale });
}

export function trackNodeView(
  caseId: string,
  nodeId: string,
  category: string
) {
  trackGaEvent("node_view", {
    case_id: caseId,
    node_id: nodeId,
    category,
  });
}

export function trackChoiceMade(
  caseId: string,
  nodeId: string,
  choiceId: string
) {
  trackGaEvent("choice_made", {
    case_id: caseId,
    node_id: nodeId,
    choice_id: choiceId,
  });
}

export function trackVerdictSubmitted(caseId: string, verdictId: string) {
  trackGaEvent("verdict_submitted", {
    case_id: caseId,
    verdict_id: verdictId,
  });
}

export function trackCaseComplete(caseId: string, endingId: string) {
  trackGaEvent("case_complete", {
    case_id: caseId,
    ending_id: endingId,
  });
}

export function trackCaseReset(caseId: string) {
  trackGaEvent("case_reset", { case_id: caseId });
}

export function trackLocaleChange(locale: string) {
  trackGaEvent("locale_change", { locale });
}

export function trackExecutorNameSet() {
  trackGaEvent("executor_name_set", { success: true });
}

export function trackEmailRegister(linked: boolean) {
  trackGaEvent("email_register", { linked });
}

export function trackChangelogView(version: string) {
  trackGaEvent("changelog_view", { version });
}
