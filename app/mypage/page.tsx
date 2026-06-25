"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStreak, getDueCards, getCollection, getWeakCards,
  getLevelProgress, getTodayCount, getStudyCalendar,
  getMyLevel, setMyLevel, clearMyLevel,
  getMorningReviewStats,
  type ReviewRecord, type LearningRecord, type StreakInfo,
} from "@/lib/review-system";

// ── 타입 별칭 (SWC TSX 파서 호환) ─────────────────────────────
type LvColorStyle  = { bg: string; text: string; border: string };
type LevelProgMap  = Record<string, { learned: number }>;
type CalendarMap   = Record<string, LearningRecord[]>;
type MRStats       = ReturnType<typeof getMorningReviewStats>;
type HeatmapProps  = { calendar: CalendarMap };

// ── 상수 ──────────────────────────────────────────────────────

// Lv.X 색상 (4구간) + 구 급수 fallback
function getLvColor(level: string) {
  const m = level.match(/^Lv\.(\d+)$/);
  if (m) {
    const n = parseInt(m[1]);
    if (n <= 5)  return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" } as LvColorStyle;
    if (n <= 10) return { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-300" }    as LvColorStyle;
    if (n <= 15) return { bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-300" } as LvColorStyle;
    return             { bg: "bg-rose-100",     text: "text-rose-700",    border: "border-rose-300" }    as LvColorStyle;
  }
  // 구 급수 fallback
  const OLD: Record<string, LvColorStyle> = {
    "8급": { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-300" },
    "7급": { bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-300" },
    "6급": { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300" },
    "5급": { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
    "4급": { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
    "3급": { bg: "bg-pink-100",   text: "text-pink-700",   border: "border-pink-300" },
  };
  return OLD[level] ?? ({ bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" } as LvColorStyle);
}

// Lv.1~20 정의
const ALL_LV_LEVELS = Array.from({ length: 20 }, (_, i) => {
  const n = i + 1;
  const label = n <= 3 ? "입문" : n <= 6 ? "기초" : n <= 10 ? "초급" : n <= 14 ? "중급" : n <= 17 ? "고급" : "심화";
  return { lv: `Lv.${n}`, label };
});

function getLvBg(lv: string) {
  const n = parseInt(lv.replace("Lv.", ""));
  if (n <= 5)  return "bg-emerald-500";
  if (n <= 10) return "bg-blue-500";
  if (n <= 15) return "bg-violet-500";
  return "bg-rose-500";
}

// 각 Lv당 31자 (Lv.1~17) or 30자 (Lv.18~20)
function getLvTotal(lv: string) {
  const n = parseInt(lv.replace("Lv.", ""));
  return n <= 17 ? 31 : 30;
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function QualityBadge({ avg }: { avg: number }) {
  if (avg >= 2.5) return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">잘 알아요</span>;
  if (avg >= 1.5) return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">복습 필요</span>;
  return <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">취약</span>;
}

// ── 캘린더 히트맵 컴포넌트 ────────────────────────────────────
function CalendarHeatmap({ calendar }: HeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  function heatColor(count: number) {
    if (count === 0) return "bg-gray-100";
    if (count <= 2)  return "bg-amber-200";
    if (count <= 5)  return "bg-amber-400";
    return "bg-orange-500";
  }

  function fmt(d: Date) { return d.toISOString().split("T")[0]; }

  const firstDay = days[0];
  const offset = (firstDay.getDay() + 6) % 7;
  const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-bold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const key = fmt(d);
          const count = calendar[key]?.length ?? 0;
          const isToday = key === fmt(today);
          return (
            <div
              key={key}
              title={`${key}: ${count}자`}
              className={`aspect-square rounded-sm flex items-center justify-center ${heatColor(count)} ${
                isToday ? "ring-2 ring-amber-500 ring-offset-1" : ""
              }`}
            >
              <span className="text-[8px] text-gray-500 font-medium">{d.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 justify-end mt-2">
        <span className="text-[10px] text-gray-400">적음</span>
        {["bg-gray-100", "bg-amber-200", "bg-amber-400", "bg-orange-500"].map((c) => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-gray-400">많음</span>
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function MyPage() {
  const [streak, setStreak]         = useState<StreakInfo>({ current: 0, longest: 0, last_active: "" });
  const [dueCards, setDueCards]     = useState<ReviewRecord[]>([]);
  const [collection, setCollection] = useState<LearningRecord[]>([]);
  const [weakCards, setWeakCards]   = useState<ReviewRecord[]>([]);
  const [levelProg, setLevelProg]   = useState<LevelProgMap>({});
  const [todayCount, setToday]      = useState(0);
  const [calendar, setCalendar]     = useState<CalendarMap>({});
  const [tab, setTab]               = useState<"review" | "collection" | "weak" | "history">("review");
  const [myLevel, setMyLv]          = useState<string | null>(null);
  const [mrStats, setMrStats]       = useState<MRStats | null>(null);

  useEffect(() => {
    setStreak(getStreak());
    setDueCards(getDueCards());
    setCollection(getCollection());
    setWeakCards(getWeakCards(10));
    setLevelProg(getLevelProgress());
    setToday(getTodayCount());
    setCalendar(getStudyCalendar());
    setMyLv(getMyLevel());
    setMrStats(getMorningReviewStats());
  }, []);

  function handleSetLevel(level: string) {
    if (myLevel === level) {
      clearMyLevel();
      setMyLv(null);
    } else {
      setMyLevel(level);
      setMyLv(level);
    }
  }

  const totalLearned = collection.length;
  const today = new Date().toISOString().split("T")[0];
  const isActiveToday = streak.last_active === today;
  const historyDates = Object.keys(calendar).sort((a, b) => b.localeCompare(a));

  const TABS = [
    { id: "review" as const,     label: "복습",   badge: dueCards.length > 0 ? dueCards.length : undefined },
    { id: "collection" as const, label: "보관함", badge: undefined },
    { id: "weak" as const,       label: "취약",   badge: undefined },
    { id: "history" as const,    label: "기록",   badge: undefined },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="text-amber-600 font-bold text-sm">← 홈</Link>
          <h1 className="text-lg font-black text-gray-800">마이페이지</h1>
          <Link href="/quiz" className="text-amber-600 font-bold text-sm">퀴즈 →</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* 상단 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{isActiveToday ? "🔥" : "💤"}</div>
            <div className="text-2xl font-black text-amber-600">{streak.current}일</div>
            <div className="text-[11px] text-gray-400 mt-0.5">연속 학습</div>
            <div className="text-[10px] text-gray-300 mt-0.5">최장 {streak.longest}일</div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">📖</div>
            <div className="text-2xl font-black text-blue-600">{todayCount}자</div>
            <div className="text-[11px] text-gray-400 mt-0.5">오늘 학습</div>
            <div className="text-[10px] text-gray-300 mt-0.5">누적 {totalLearned}자</div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{dueCards.length > 0 ? "📬" : "✅"}</div>
            <div className={`text-2xl font-black ${dueCards.length > 0 ? "text-rose-500" : "text-green-500"}`}>
              {dueCards.length}장
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">복습 대기</div>
            <div className="text-[10px] text-gray-300 mt-0.5">오늘까지</div>
          </div>
        </div>

        {/* 아침 복습 통계 */}
        {mrStats && mrStats.total > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-gray-700">🌅 아침 복습 현황</p>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                성공률 {mrStats.passRate}%
              </span>
            </div>
            {/* 최근 7일 */}
            <div className="flex gap-1.5 mb-3">
              {mrStats.recentDays.map((d, i) => {
                const dayLabel = ["일","월","화","수","목","금","토"][new Date(d.date).getDay()];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm ${
                      d.passed === true  ? "bg-indigo-500 text-white" :
                      d.passed === false ? "bg-rose-100 text-rose-400" :
                      "bg-gray-100 text-gray-300"
                    }`}>
                      {d.passed === true ? "✓" : d.passed === false ? "✗" : "·"}
                    </div>
                    <span className="text-[9px] text-gray-400">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
            {/* 요약 수치 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-indigo-50 rounded-xl py-2">
                <p className="text-lg font-black text-indigo-600">{mrStats.passed}</p>
                <p className="text-[10px] text-gray-400">성공</p>
              </div>
              <div className="bg-rose-50 rounded-xl py-2">
                <p className="text-lg font-black text-rose-500">{mrStats.total - mrStats.passed}</p>
                <p className="text-[10px] text-gray-400">실패</p>
              </div>
              <div className="bg-amber-50 rounded-xl py-2">
                <p className="text-lg font-black text-amber-600">{mrStats.currentStreak}</p>
                <p className="text-[10px] text-gray-400">연속 성공</p>
              </div>
            </div>
          </div>
        )}

        {/* 내 레벨 설정 */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-gray-700">📌 내 레벨 설정</p>
            <p className="text-[11px] text-gray-400">홈에서 바로 시작하려면 설정하세요</p>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {ALL_LV_LEVELS.map(({ lv, label }) => {
              const isSelected = myLevel === lv;
              const bg = getLvBg(lv);
              return (
                <button
                  key={lv}
                  onClick={() => handleSetLevel(lv)}
                  className={`rounded-xl border-2 py-2 flex flex-col items-center transition-all ${
                    isSelected
                      ? `border-transparent shadow-md scale-105 ${bg} text-white`
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-black leading-tight">{lv}</span>
                  <span className="text-[9px] font-medium mt-0.5 opacity-80">{label}</span>
                </button>
              );
            })}
          </div>
          {myLevel && (
            <p className="text-xs text-amber-600 font-bold mt-3 text-center">
              {myLevel} 설정 완료 · 홈에서 바로 시작할 수 있어요
            </p>
          )}
        </div>

        {/* 탭 */}
        <div className="flex bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {TABS.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-xs font-bold relative transition-colors ${
                tab === id ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-amber-50"
              }`}
            >
              {label}
              {badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 복습하기 */}
        {tab === "review" && (
          <div className="space-y-3">
            {dueCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-bold text-gray-700 mb-1">오늘 복습할 한자가 없어요!</p>
                <p className="text-xs text-gray-400 mb-4">새 한자를 학습하거나 퀴즈를 풀어봐요</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/home" className="bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-xl">학습하기</Link>
                  <Link href="/quiz" className="bg-gray-100 text-gray-700 font-bold text-sm px-4 py-2 rounded-xl">퀴즈 풀기</Link>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 font-medium">{dueCards.length}개 복습해요</p>
                {dueCards.map((r) => {
                  const c = getLvColor(r.card.level);
                  return (
                    <Link
                      key={`${r.card.level}_${r.card.hanja}`}
                      href={`/review/${encodeURIComponent(r.card.level)}/${encodeURIComponent(r.card.hanja)}`}
                      className="flex items-center gap-3 bg-white rounded-2xl border border-amber-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xl font-black leading-none">{r.card.hanja}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-800 truncate">{r.card.full_reading}</p>
                        <p className="text-[11px] text-gray-400">복습 {r.total_reviews}회 · {r.interval}일 간격</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                          {r.card.level}
                        </span>
                        <QualityBadge avg={r.avg_quality} />
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* 보관함 */}
        {tab === "collection" && (
          <div>
            {collection.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="font-bold text-gray-700 mb-1">아직 보관함이 비어 있어요</p>
                <p className="text-xs text-gray-400">한자를 학습하면 여기에 쌓여요!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 font-medium mb-3">총 {collection.length}자 완료 🏆</p>
                <div className="grid grid-cols-5 gap-2">
                  {collection.map((r) => {
                    const c = getLvColor(r.level);
                    return (
                      <div key={`${r.level}_${r.hanja}`} className={`rounded-xl border p-2 text-center ${c.bg} ${c.border}`}>
                        <div className={`text-2xl font-black ${c.text}`}>{r.hanja}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5 truncate">{r.sound}</div>
                        <div className={`text-[9px] font-bold ${c.text}`}>{r.level}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* 취약 한자 */}
        {tab === "weak" && (
          <div className="space-y-3">
            {weakCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">💪</div>
                <p className="font-bold text-gray-700 mb-1">취약 한자가 없어요!</p>
                <p className="text-xs text-gray-400">복습을 2회 이상 완료하면 분석이 시작돼요.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 font-medium">집중 복습이 필요해요</p>
                  <Link href="/quiz?mode=weak" className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                    취약 집중 퀴즈 →
                  </Link>
                </div>
                {weakCards.map((r) => {
                  const c = getLvColor(r.card.level);
                  const pct = Math.round((r.avg_quality / 3) * 100);
                  return (
                    <div key={`${r.card.level}_${r.card.hanja}`} className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xl font-black">{r.card.hanja}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-gray-800">{r.card.full_reading}</p>
                          <p className="text-[11px] text-gray-400">복습 {r.total_reviews}회 · 정확도 {pct}%</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                          {r.card.level}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-red-400 to-rose-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>어려움</span>
                        <span className="font-bold">{pct}%</span>
                        <span>쉬움</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* 학습 기록 */}
        {tab === "history" && (
          <div className="space-y-4">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 mb-4">최근 35일 학습 현황</p>
              <CalendarHeatmap calendar={calendar} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 mb-4">레벨별 진도</p>
              <div className="space-y-3">
                {ALL_LV_LEVELS.map(({ lv, label }) => {
                  const learned = levelProg[lv]?.learned ?? 0;
                  const total   = getLvTotal(lv);
                  const pct     = Math.min(100, Math.round((learned / total) * 100));
                  const c       = getLvColor(lv);
                  if (learned === 0) return null;
                  return (
                    <div key={lv}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>{lv}</span>
                          <span className="text-xs text-gray-400">{label}</span>
                          <span className="text-xs text-gray-500">{learned}/{total}자</span>
                        </div>
                        <span className={`text-xs font-black ${c.text}`}>{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${pct === 100 ? "bg-green-400" : "bg-gradient-to-r from-amber-300 to-orange-400"}`}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {ALL_LV_LEVELS.every(({ lv }) => (levelProg[lv]?.learned ?? 0) === 0) && (
                  <p className="text-xs text-gray-400 text-center py-2">아직 학습한 레벨이 없어요</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-500 mb-4">날짜별 학습 이력</p>
              {historyDates.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm text-gray-400">아직 학습 이력이 없어요</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyDates.map((date) => {
                    const records = calendar[date];
                    const dateObj = new Date(date);
                    const label = dateObj.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
                    return (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-500">{label}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{records.length}자</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {records.map((r, i) => {
                            const c = getLvColor(r.level);
                            return (
                              <div key={`${r.hanja}-${i}`} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 border ${c.bg} ${c.border}`}>
                                <span className={`text-sm font-black ${c.text}`}>{r.hanja}</span>
                                <span className="text-[10px] text-gray-500">{r.sound}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 pb-4">
          한자 하루 한자 · 소리와 뜻으로 여는 문해력
        </p>
      </main>
    </div>
  );
}
