/** 玩家自訂的數位遺囑執行人姓名（第八案鏡像 AI 亦以此命名） */

const STORAGE_KEY = "ai-will-executor-executor-name";

export const EXECUTOR_NAME_MIN = 1;
export const EXECUTOR_NAME_MAX = 16;

const NAME_PATTERN = /^[\p{L}\p{N}\s·.\-_']+$/u;

export function getExecutorName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
}

export function sanitizeExecutorName(raw: string): string {
  return raw.trim().slice(0, EXECUTOR_NAME_MAX);
}

export function isValidExecutorName(name: string): boolean {
  const trimmed = sanitizeExecutorName(name);
  return (
    trimmed.length >= EXECUTOR_NAME_MIN &&
    trimmed.length <= EXECUTOR_NAME_MAX &&
    NAME_PATTERN.test(trimmed)
  );
}

export function hasExecutorName(): boolean {
  return isValidExecutorName(getExecutorName());
}

export function setExecutorName(name: string): string {
  const trimmed = sanitizeExecutorName(name);
  if (typeof window !== "undefined" && trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  }
  return trimmed;
}

export function getAiExecutorName(executorName?: string): string {
  const name = executorName ?? getExecutorName();
  return name ? `AI ${name}` : "AI 執行人";
}

/** 系統檔案／節點代號用 slug（中文姓名會產生 EXECUTOR_ 前綴雜湊） */
export function toExecutorSystemSlug(name: string): string {
  const ascii = name
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
  if (ascii.length >= 2) return ascii;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return `EXECUTOR_${Math.abs(hash).toString(36).toUpperCase()}`;
}

/**
 * 將劇情中的預設名「Vincent」替換為玩家姓名。
 * 原始文本保留 Vincent 作為撰寫佔位，執行時統一換名。
 */
export function personalizeNarrative(
  text: string,
  executorName?: string
): string {
  const name = executorName ?? getExecutorName();
  if (!name || !text.includes("Vincent") && !text.includes("VINCENT")) {
    return text;
  }

  const aiName = getAiExecutorName(name);
  const slug = toExecutorSystemSlug(name);

  let s = text;
  s = s.replace(
    /VINCENT_BACKUP_PRELIMINARY_PROFILE/g,
    `${slug}_BACKUP_PRELIMINARY_PROFILE`
  );
  s = s.replace(/VINCENT_PRELIMINARY/g, `${slug}_PRELIMINARY`);
  s = s.replace(/AI Vincent/g, aiName);
  s = s.replace(/人類裁決者 Vincent/g, `人類裁決者 ${name}`);
  s = s.replace(/人類 Vincent/g, `人類 ${name}`);
  s = s.replace(/鏡像裁決者：AI Vincent/g, `鏡像裁決者：${aiName}`);
  s = s.replace(/鏡像身份：AI Vincent/g, `鏡像身份：${aiName}`);
  s = s.replace(/Vincent/g, name);
  s = s.replace(/VINCENT/g, slug);
  return s;
}

export function personalizeLines(
  lines: string[],
  executorName?: string
): string[] {
  return lines.map((line) => personalizeNarrative(line, executorName));
}

export function personalizeChoice<T extends { label: string }>(
  choice: T,
  executorName?: string
): T {
  return { ...choice, label: personalizeNarrative(choice.label, executorName) };
}
