const STORAGE_KEY = "s2c-ai-usage";
export const AI_DAILY_LIMIT = 20;

type AiUsageState = {
  dayKey: string;
  used: number;
};

function pacificDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

export function nextAiResetDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const nextPacificMidnightGuess = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + 1, 0, 0, 0));
  const offset = timeZoneOffsetMs(nextPacificMidnightGuess, "America/Los_Angeles");

  return new Date(nextPacificMidnightGuess.getTime() - offset);
}

export function getAiUsage() {
  if (typeof window === "undefined") {
    return { used: 0, remaining: AI_DAILY_LIMIT, limit: AI_DAILY_LIMIT, resetAt: nextAiResetDate() };
  }

  const dayKey = pacificDayKey();
  let state: AiUsageState = { dayKey, used: 0 };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) state = JSON.parse(stored) as AiUsageState;
  } catch {
    state = { dayKey, used: 0 };
  }

  if (state.dayKey !== dayKey) {
    state = { dayKey, used: 0 };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return {
    used: state.used,
    remaining: Math.max(0, AI_DAILY_LIMIT - state.used),
    limit: AI_DAILY_LIMIT,
    resetAt: nextAiResetDate(),
  };
}

export function recordAiUsage(count = 1) {
  if (typeof window === "undefined") return getAiUsage();

  const usage = getAiUsage();
  const state: AiUsageState = {
    dayKey: pacificDayKey(),
    used: Math.max(0, usage.used + count),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("s2c-ai-usage"));

  return getAiUsage();
}
