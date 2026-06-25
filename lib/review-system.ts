/**
 * 간격 반복 복습 시스템 (SM-2 알고리즘 기반)
 * ─────────────────────────────────────────
 * 로그인 전: localStorage 저장
 * 로그인 후: DB 마이그레이션 예정
 */

export type ReviewQuality = 0 | 1 | 2 | 3;
// 0: 완전 까먹음  1: 어려움  2: 보통  3: 쉬움

export interface HanjaCard {
  hanja: string;        // 한자 글자 (예: 思)
  sound: string;        // 음 (예: 사)
  meaning: string;      // 훈 (예: 생각할)
  level: string;        // 급수 (예: 4급)
  full_reading: string; // 훈음 (예: 생각할 사)
}

export interface ReviewRecord {
  card: HanjaCard;
  repetitions: number;    // 성공적 복습 횟수
  interval: number;       // 다음 복습까지 일 수
  easiness: number;       // 쉬움 계수 (1.3~2.5, 초기값 2.5)
  next_review: string;    // ISO 날짜 문자열
  last_reviewed: string;  // ISO 날짜 문자열
  total_reviews: number;  // 누적 복습 횟수
  avg_quality: number;    // 평균 품질 점수
}

export interface LearningRecord {
  hanja: string;
  sound: string;
  meaning: string;
  full_reading: string;
  level: string;
  completed_at: string;   // ISO 날짜
  quiz_correct: boolean;
  essay_written: boolean;
  vocal_count: number;    // 낭독 횟수
}

const STORAGE_KEYS = {
  REVIEWS: "hhh_review_records",
  LEARNING: "hhh_learning_records",
  STREAK: "hhh_streak",
  LAST_ACTIVE: "hhh_last_active",
} as const;

// ── SM-2 알고리즘 ─────────────────────────────────────────

function sm2(record: ReviewRecord, quality: ReviewQuality): ReviewRecord {
  const q = quality; // 0~3 → SM-2는 0~5 사용, 여기서 0~3으로 매핑
  let { repetitions, interval, easiness } = record;

  // 쉬움 계수 업데이트 (SM-2 공식)
  const scaledQ = q * (5 / 3); // 0~3 → 0~5 스케일
  easiness = Math.max(1.3, easiness + 0.1 - (5 - scaledQ) * (0.08 + (5 - scaledQ) * 0.02));

  if (q < 1) {
    // 완전 까먹음: 처음부터 다시
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetitions += 1;
  }

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    ...record,
    repetitions,
    interval,
    easiness,
    next_review: next.toISOString().split("T")[0],
    last_reviewed: new Date().toISOString().split("T")[0],
    total_reviews: record.total_reviews + 1,
    avg_quality: ((record.avg_quality * record.total_reviews) + q) / (record.total_reviews + 1),
  };
}

// ── 스토리지 헬퍼 ─────────────────────────────────────────

function loadReviews(): Record<string, ReviewRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || "{}");
  } catch { return {}; }
}

function saveReviews(records: Record<string, ReviewRecord>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(records));
}

function loadLearning(): LearningRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEARNING) || "[]");
  } catch { return []; }
}

function saveLearning(records: LearningRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.LEARNING, JSON.stringify(records));
}

function cardKey(card: HanjaCard): string {
  return `${card.level}_${card.hanja}`;
}

// ── 공개 API ─────────────────────────────────────────────

/** 학습 완료 시 호출 — 복습 큐에 새 카드 등록 */
export function registerLearned(
  card: HanjaCard,
  opts: { quiz_correct: boolean; essay_written: boolean; vocal_count: number }
): void {
  const today = new Date().toISOString().split("T")[0];

  // 학습 이력 저장
  const learning = loadLearning();
  learning.push({ ...card, completed_at: new Date().toISOString(), ...opts });
  saveLearning(learning);

  // 복습 카드 초기화 (이미 있으면 유지)
  const reviews = loadReviews();
  const key = cardKey(card);
  if (!reviews[key]) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    reviews[key] = {
      card,
      repetitions: 0,
      interval: 1,
      easiness: 2.5,
      next_review: tomorrow.toISOString().split("T")[0],
      last_reviewed: today,
      total_reviews: 0,
      avg_quality: 0,
    };
    saveReviews(reviews);
  }

  // 스트릭 업데이트
  updateStreak();
}

/** 복습 완료 시 호출 */
export function submitReview(card: HanjaCard, quality: ReviewQuality): ReviewRecord {
  const reviews = loadReviews();
  const key = cardKey(card);
  const existing = reviews[key] || {
    card,
    repetitions: 0,
    interval: 1,
    easiness: 2.5,
    next_review: new Date().toISOString().split("T")[0],
    last_reviewed: new Date().toISOString().split("T")[0],
    total_reviews: 0,
    avg_quality: 0,
  };
  const updated = sm2(existing, quality);
  reviews[key] = updated;
  saveReviews(reviews);
  return updated;
}

/** 오늘 복습해야 할 카드 목록 */
export function getDueCards(): ReviewRecord[] {
  const reviews = loadReviews();
  const today = new Date().toISOString().split("T")[0];
  return Object.values(reviews)
    .filter((r) => r.next_review <= today)
    .sort((a, b) => a.next_review.localeCompare(b.next_review));
}

/** 전체 학습 이력 */
export function getLearningHistory(): LearningRecord[] {
  return loadLearning();
}

/** 보관함: 완료한 한자 (중복 제거, 최신순) */
export function getCollection(): LearningRecord[] {
  const records = loadLearning();
  const seen = new Set<string>();
  return records
    .slice()
    .reverse()
    .filter((r) => {
      const k = `${r.level}_${r.hanja}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** 취약 한자 (평균 품질 낮은 순 top N) */
export function getWeakCards(n = 5): ReviewRecord[] {
  const reviews = loadReviews();
  return Object.values(reviews)
    .filter((r) => r.total_reviews >= 2)
    .sort((a, b) => a.avg_quality - b.avg_quality)
    .slice(0, n);
}

/** 급수별 진도 */
export function getLevelProgress(): Record<string, { learned: number }> {
  const records = loadLearning();
  const result: Record<string, { learned: number }> = {};
  for (const r of records) {
    if (!result[r.level]) result[r.level] = { learned: 0 };
    result[r.level].learned++;
  }
  return result;
}

/** 오늘 학습한 한자 수 */
export function getTodayCount(): number {
  const today = new Date().toISOString().split("T")[0];
  return loadLearning().filter((r) => r.completed_at.startsWith(today)).length;
}

// ── 스트릭 ─────────────────────────────────────────────

export interface StreakInfo {
  current: number;
  longest: number;
  last_active: string;
}

function updateStreak(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().split("T")[0];
  const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
  const streak: StreakInfo = raw
    ? JSON.parse(raw)
    : { current: 0, longest: 0, last_active: "" };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];

  if (streak.last_active === today) {
    // 오늘 이미 업데이트됨
  } else if (streak.last_active === yStr) {
    streak.current += 1;
    streak.longest = Math.max(streak.longest, streak.current);
    streak.last_active = today;
  } else {
    // 연속 끊김
    streak.current = 1;
    streak.longest = Math.max(streak.longest, streak.current);
    streak.last_active = today;
  }

  localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
}

export function getStreak(): StreakInfo {
  if (typeof window === "undefined") return { current: 0, longest: 0, last_active: "" };
  const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
  return raw ? JSON.parse(raw) : { current: 0, longest: 0, last_active: "" };
}

/** 날짜별 학습 이력 맵 (YYYY-MM-DD → LearningRecord[]) */
export function getStudyCalendar(): Record<string, LearningRecord[]> {
  const records = loadLearning();
  const cal: Record<string, LearningRecord[]> = {};
  for (const r of records) {
    const date = r.completed_at.split("T")[0];
    if (!cal[date]) cal[date] = [];
    cal[date].push(r);
  }
  return cal;
}

// ── 내 급수 설정 ──────────────────────────────────────────────
const MY_LEVEL_KEY = "hhh_my_level";

export function getMyLevel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MY_LEVEL_KEY);
}

export function setMyLevel(level: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MY_LEVEL_KEY, level);
}

export function clearMyLevel(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MY_LEVEL_KEY);
}

// ── 아침 복습 ─────────────────────────────────────────────────

export interface MorningReviewRecord {
  date: string;
  target_date: string;
  hanja: string;
  sound: string;
  meaning: string;
  level: string;
  passed: boolean;
  skipped: boolean;
  sound_correct: boolean;
  meaning_correct: boolean;
  words_recalled: number;
}

const MORNING_REVIEW_KEY = "hhh_morning_reviews";

function loadMorningReviews(): MorningReviewRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(MORNING_REVIEW_KEY) || "[]"); }
  catch { return []; }
}

/** 어제 배운 한자 목록 (중복 제거) */
export function getYesterdayLearned(): LearningRecord[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];
  const seen = new Set<string>();
  return loadLearning()
    .filter((r) => r.completed_at.startsWith(yStr))
    .filter((r) => {
      const k = `${r.level}_${r.hanja}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** 오늘 아침 복습을 이미 했는지 */
export function hasDoneMorningReview(): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().split("T")[0];
  return loadMorningReviews().some((r) => r.date === today);
}

/** 아침 복습 결과 저장 */
export function saveMorningReview(record: MorningReviewRecord): void {
  if (typeof window === "undefined") return;
  const records = loadMorningReviews();
  records.push(record);
  localStorage.setItem(MORNING_REVIEW_KEY, JSON.stringify(records));
}

/** 아침 복습 통계 */
export function getMorningReviewStats(): {
  total: number;
  passed: number;
  skipped: number;
  passRate: number;
  currentStreak: number;
  recentDays: { date: string; passed: boolean | null }[];
} {
  const all = loadMorningReviews();
  const attempted = all.filter((r) => !r.skipped);
  const total = attempted.length;
  const passed = attempted.filter((r) => r.passed).length;
  const skipped = all.filter((r) => r.skipped).length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const today = new Date();
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));

  let currentStreak = 0;
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const rec = sorted.find((r) => r.date === dStr);
    if (rec && rec.passed) currentStreak++;
    else break;
  }

  const recentDays: { date: string; passed: boolean | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const rec = sorted.find((r) => r.date === dStr);
    recentDays.push({
      date: dStr,
      passed: rec ? (rec.skipped ? null : rec.passed) : null,
    });
  }

  return { total, passed, skipped