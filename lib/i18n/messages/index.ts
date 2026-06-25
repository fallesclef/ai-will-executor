import type { Locale } from "../types";
import zhTW from "./zh-TW";
import en from "./en";

export const messages: Record<Locale, typeof zhTW> = {
  "zh-TW": zhTW,
  en,
};

export type { Messages } from "./zh-TW";
