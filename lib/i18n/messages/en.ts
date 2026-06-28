import type { Messages } from "./zh-TW";

const en: Messages = {
  common: {
    sys: "AWE SYSTEM v3.1",
    footer: "AI WILL EXECUTOR · DIGITAL PROBATE DIVISION",
    loading: "Loading system…",
    returnLobby: "Back to Case Lobby",
    caseList: "Case List",
    resetCase: "Reset Case",
    viewed: "Read",
    pendingChoice: "No choice yet",
    storyLocaleBanner:
      "Story text is currently available in Traditional Chinese only. English translations will roll out case by case; the interface is now in English.",
  },
  language: {
    zhTW: "繁中",
    en: "EN",
    switchLabel: "Language",
  },
  lobby: {
    title: "AI Will Executor",
    subtitle: "Digital Probate Division · Case Lobby",
    accountTitle: "Executor Identity",
    accountHint:
      "Play without signing in. Link an email to sync full saves and restore them in the lobby.",
    emailPlaceholder: "email@example.com (optional)",
    register: "Register / Link",
    linkedAccount: "Linked account: {email}",
    anonymousIdentity:
      "Anonymous play identity created (progress still syncs to analytics).",
    casesTitle: "Available Cases",
    resonance: "System Resonance {percent}% · Tier {tier}",
    comingSoon: "Coming soon",
    d399Hint:
      "Complete verdicts for cases 1–7 first. Case 8 player records and mirror AI predictions need that foundation.",
    lockedPrereq: "Complete cases 1–7 first",
    needExecutorName: "Set your executor name first",
    acceptCase: "Take Case",
    notAvailable: "Not available yet",
    storyEnSoon: "English story coming soon",
    caseCompleted: "Completed",
    caseInProgress: "In progress",
    replayCase: "Replay case",
    continueCase: "Continue case",
    progressCloudHint:
      "Full saves sync to the cloud. Sign in with the same email on another device—the lobby will offer restore.",
  },
  cloudRestore: {
    tag: "CLOUD SAVE",
    title: "Cloud saves available",
    summary:
      "{total} case(s) can be restored ({completed} completed · {inProgress} in progress). Restore overwrites older local progress.",
    itemCompleted: "{caseId} · Completed",
    itemInProgress: "{caseId} · In progress",
    more: "+ {count} more…",
    confirm: "Restore to this device",
    dismiss: "Not now",
    done: "Cloud saves restored to this device.",
  },
  howToPlay: {
    tag: "GUIDE",
    title: "How to Play",
    intro:
      "You are an AI Will Executor: you review digital wills and AI records left by the deceased, then rule between evidence and ethics. Each case stands alone, but choices in cases 1–7 shape Case 8’s mirror AI and system resonance.",
    step1: 'Set your executor name in the lobby, pick a case, and tap "Take Case".',
    step2:
      'On the Case Console, read evidence, interviews, and will clauses by category. Read items show a "Read" badge.',
    step3:
      "Make choices at Crossroads and some evidence nodes—your stance builds hidden stats (legal, empathy, suspicion, etc.) and shapes endings.",
    step4:
      'After required review and crossroads, go to Final Verdict. Some cases have secret verdict unlock conditions.',
    step5:
      "Cases unlock in order: Case 8 requires verdicts in cases 1–7. After an ending, continue to the next case or return to the lobby.",
    step6:
      "Auto-save: no manual save button. Reading, choices, navigation, and verdicts instantly save to this browser.",
    step7:
      "No email required to play fully. Switching devices or clearing browser data starts fresh locally.",
    step8:
      "With a linked email, full saves auto-upload to the cloud within seconds while you play. On a new device, sign in with the same email and tap “Restore to this device” in the lobby—the only manual step.",
    tip: 'There is no "Save" button—playing auto-saves. Replay completed cases anytime; "Reset Case" clears local progress for that case.',
  },
  changelog: {
    title: "Release Notes",
    newUpdate: "UPDATE",
    announceSummary: "v{version} is live. Highlights:",
    viewAll: "View full changelog",
    dismiss: "Got it",
    close: "Close",
    lastSeen: "Last read: v{version}",
    typeFeature: "New",
    typeFix: "Fix",
    typeImprovement: "Improvement",
  },
  executor: {
    nameLabel: "Executor Name",
    required: "*",
    lobbyHint:
      "Shown at case login and in Case 8 as mirror AI (AI [your name]). You can change it anytime without losing saved progress.",
    namePlaceholder: "Enter your name",
    saveName: "Save Name",
    mirrorPreview: "Mirror codename preview: AI {name}",
    nameError: "Enter {min}–{max} characters (letters, numbers, or CJK).",
    gateTitle: "Executor Registration",
    gateHint1:
      "The Digital Probate Division must record your adjudicator identity.",
    gateHint2:
      "From Case 8 onward, the system may build a mirror backup from your name—use the name you want to see in the case file.",
    gatePlaceholder: "e.g. Alex, Lin, Chen Yi-An…",
    gateConfirm: "Confirm identity & enter",
  },
  game: {
    caseNotFound: "Case not found",
    accessDenied: "[Access denied] Complete verdicts for cases 1–7 first.",
    consoleTitle: "Case Console",
    nodeMissing: "Node not found",
    hiddenEnding: "Hidden ending unlocked",
    trueEnding: "True ending unlocked",
    personalityReport: "Adjudication Profile",
    yourVerdict: "Your verdict: {label}",
    caseComment: "Case note: ",
    nextCase: "Next case: {subtitle}",
    chooseOtherCase: "Choose another case",
    prediction: "{aiName} predicts: {label} (confidence {confidence}%)",
    predictionNoConfidence: "{aiName} predicts: {label}",
    verdictDwell:
      "[System] Latent verdict option detected… remain on this screen (~{seconds}s) before submitting.",
    verdictLocked:
      "[System] Secret verdict locked. Complete required evidence, interviews, and crossroads first.",
    fauxGlowNote: "(This option lit up before you touched the mouse.)",
  },
  node: {
    submitVerdict: "[Submit Verdict]",
    crossroad: "[Critical Decision]",
    choose: "[Choose]",
    backToConsole: "Back to case console",
  },
  status: {
    title: "Review Status",
    mainProgress: "Main flow progress",
    verdictReady: "✓ Ready to submit verdict",
    verdictPending: "Follow the main flow step by step",
    flowNodes: "Flow checkpoints",
    mirrorSync: "Mirror sync status",
    syncRate: "Sync rate {percent}%",
    electionRemaining: "{hours} hours remaining",
    electionHint: "Time advances as the review proceeds",
    hiddenStats: "Latent assessment (private)",
    mirrorIntegrity: "Mirror integrity",
    publicPressure: "Public pressure indices",
    statsNote: "* Values accumulate from your choices and affect the ending",
    choiceLog: "Choice log",
    noLog: "No entries yet",
  },
  stats: {
    legal: "Legal",
    empathy: "Empathy",
    suspicion: "Suspicion",
    public_trust: "Public trust",
    social_stability: "Social stability",
    truth_pressure: "Truth pressure",
    mirror_integrity: "Mirror integrity",
  },
  dashboard: {
    prereqLock: "Complete prerequisite review",
    crossroadTitle: "Critical decisions",
    crossroadDone: "All three critical decisions complete",
    enterCrossroad: "Enter critical decisions",
    needContradictions: "Complete contradiction review first",
    finalVerdict: "Final verdict",
    submitVerdict: "Submit verdict",
    needCrossroads: "Complete three critical decisions first",
  },
  resonance: {
    dormantAria: "System resonance dormant",
    title: "System Resonance",
    dormant: "Dormant",
    dormantLine1:
      "Cross-case semantic monitoring is not yet written to your adjudicator file.",
    dormantLine2:
      "After this case’s verdict, the system will first compare sealed lines from prior cases.",
    aria: "Cross-case semantic resonance",
    strength: "Resonance strength",
    unlockedLines: "Unlocked lines {unlocked}/{visible}",
    unlockAfterCase: "Unlock after completing the linked case",
    tier: "Tier {tier}",
    sealed:
      "[Sealed] After verdict {number}, this line enters the resonance graph.",
    suppressedNote:
      "System log: this line was actively deleted by AI and excluded from official output.",
    mirrorUnknown:
      "Anomaly node: graph node count does not match completed cases.",
    mirrorNode:
      "Mirror node: not deceased data; derived from adjudicator behavior patterns.",
    retroactive:
      "Retroactive seal: after Case 5, the system first compares prior anomalous lines.",
    statusStable: "Stable",
    statusElevated: "Elevated",
    statusCritical: "Critical",
    statusMonitoring: "Monitoring",
    statusWarning: "Warning threshold reached",
    statusCriticalThreshold: "National risk threshold reached",
    tierLabel1: "Initial detection",
    tierLabel2: "Resonance rising",
    tierLabel3: "National threshold",
    tierLabel4: "Mirror link",
    nextUnlockD173:
      "After Case 5 verdict, the system retroactively compares prior anomalous lines.",
    nextUnlockD206:
      "After Case 6, the resonance graph expands to corporate sealed layers.",
    nextUnlockD301:
      "After Case 7, national-level semantic nodes unlock.",
    nextUnlockD399:
      "After Case 8, a mirror adjudicator node is written to the graph.",
  },
};

export default en;
