"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCollection, getDueCards, registerLearned, type LearningRecord, type ReviewRecord } from "@/lib/review-system";

interface HanjaMeta {
  char: string;
  sound: string;
  meaning: string;
  level: string;
}

// Lv.X 형식인지 확인
function isLvFormat(level: string) {
  return /^Lv\.\d+$/.test(level);
}

// Lv 번호 추출
function getLvNum(level: string): number {
  return parseInt(level.replace("Lv.", "")) || 1;
}

// 레벨별 색상
function getLvColor(level: string) {
  if (!isLvFormat(level)) {
    // 구 급수 시스템 fallback
    const OLD: Record<string, { grad: string; badge: string; label: string }> = {
      "8급": { grad: "from-green-400 to-emerald-500",  badge: "bg-green-500",  label: "한자 첫걸음" },
      "7급": { grad: "from-teal-400 to-cyan-500",       badge: "bg-teal-500",   label: "기초 다지기" },
      "6급": { grad: "from-blue-400 to-sky-500",        badge: "bg-blue-500",   label: "교과서 속 한자" },
      "5급": { grad: "from-indigo-400 to-violet-500",   badge: "bg-indigo-500", label: "어휘력 키우기" },
      "4급": { grad: "from-purple-400 to-fuchsia-500",  badge: "bg-purple-500", label: "사고력·표현력" },
      "3급": { grad: "from-pink-400 to-rose-500",       badge: "bg-pink-500",   label: "교과 학술어" },
    };
    return OLD[level] ?? { grad: "from-amber-400 to-orange-500", badge: "bg-amber-500", label: level };
  }
  const n = getLvNum(level);
  if (n <= 5)  return { grad: "from-emerald-400 to-teal-500",  badge: "bg-emerald-500", label: "입문" };
  if (n <= 10) return { grad: "from-blue-400 to-indigo-500",   badge: "bg-blue-500",    label: "초급" };
  if (n <= 15) return { grad: "from-violet-400 to-purple-500", badge: "bg-violet-500",  label: "중급" };
  return             { grad: "from-rose-400 to-red-500",       badge: "bg-rose-500",    label: "고급" };
}

type Filter = "all" | "new" | "done" | "review";

export default function LevelPickerPage() {
  const { level } = useParams<{ level: string }>();
  const decodedLevel = decodeURIComponent(level);

  const [list, setList]           = useState<HanjaMeta[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<Filter>("all");
  const [collection, setCol]      = useState<LearningRecord[]>([]);
  const [dueCards, setDue]        = useState<ReviewRecord[]>([]);
  const [unlockedCount, setUnlocked] = useState(0);

  const isLv = isLvFormat(decodedLevel);
  const info = getLvColor(decodedLevel);

  useEffect(() => {
    setCol(getCollection());
    setDue(getDueCards());
    const apiUrl = isLv
      ? `/api/lv/${encodeURIComponent(decodedLevel)}/list`
      : `/api/content/${encodeURIComponent(decodedLevel)}/list`;

    fetch(apiUrl)
      .then((r) => r.json())
      .then((d: HanjaMeta[]) => { setList(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [decodedLevel, isLv]);

  // 일일 해금 로직: 하루 1자씩 잠금 해제
  useEffect(() => {
    if (list.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const key = `hanja_unlock_${decodedLevel}`;
    try {
      const raw = localStorage.getItem(key);
      const data: { count: number; lastDate: string } = raw
        ? JSON.parse(raw)
        : { count: 1, lastDate: today };

      let { count, lastDate } = data;

      // 오늘 처음 방문이면 +1 해금
      if (lastDate !== today && count < list.length) {
        count = count + 1;
        localStorage.setItem(key, JSON.stringify({ count, lastDate: today }));
      } else if (!raw) {
        localStorage.setItem(key, JSON.stringify({ count: 1, lastDate: today }));
      }

      setUnlocked(Math.min(count, list.length));
    } catch {
      setUnlocked(Math.min(1, list.length));
    }
  }, [list, decodedLevel]);

  const learnedSet = useMemo(() => new Set(collection.map((r) => r.hanja)), [collection]);
  const dueSet     = useMemo(() => new Set(dueCards.map((r) => r.card.hanja)), [dueCards]);

  // 해금된 목록 / 잠긴 목록
  const unlockedList = useMemo(() => list.slice(0, unlockedCount), [list, unlockedCount]);
  const lockedList   = useMemo(() => list.slice(unlockedCount),    [list, unlockedCount]);

  const filtered = useMemo(() => {
    if (filter === "done")   return unlockedList.filter((c) => learnedSet.has(c.char));
    if (filter === "new")    return unlockedList.filter((c) => !learnedSet.has(c.char));
    if (filter === "review") return unlockedList.filter((c) => dueSet.has(c.char));
    return unlockedList;
  }, [unlockedList, filter, learnedSet, dueSet]);

  // "이미 알아요" 빠른 패스
  function handleMarkKnown(item: HanjaMeta) {
    registerLearned(
      { hanja: item.char, sound: item.sound, meaning: item.meaning, level: decodedLevel,
        full_reading: `${item.meaning} ${item.sound}` },
      { quiz_correct: false, essay_written: false, vocal_count: 0 }
    );
    setCol(getCollection());
  }

  const doneCount   = list.filter((c) => learnedSet.has(c.char)).length;
  const reviewCount = unlockedList.filter((c) => dueSet.has(c.char)).length;
  const pct         = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0;

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: "all",    label: "해금",      count: unlockedList.length },
    { id: "new",    label: "미학습",    count: unlockedList.filter((c) => !learnedSet.has(c.char)).length },
    { id: "done",   label: "완료",      count: doneCount },
    { id: "review", label: "복습 대기", count: reviewCount },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-amber-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/home" className="text-amber-600 font-bold text-sm">← 홈</Link>
          <div className="flex items-center gap-2">
            <span className={`text-white text-xs font-bold px-2.5 py-1 rounded-full ${info.badge}`}>
              {decodedLevel}
            </span>
            <span className="text-gray-600 font-bold text-sm">{info.label}</span>
          </div>
          <Link href="/mypage" className="text-amber-600 font-bold text-sm">MY</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">

        {/* 진도 요약 */}
        {!loading && list.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 mb-4 flex items-center gap-4">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke={pct === 100 ? "#22c55e" : "#f59e0b"}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-gray-700">{pct}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-black text-gray-800 text-sm">
                {doneCount}자 완료 <span className="text-gray-400 font-normal">/ 총 {list.length}자</span>
              </p>
              {reviewCount > 0 && (
                <p className="text-xs text-rose-500 font-bold mt-0.5">📬 복습 대기 {reviewCount}자</p>
              )}
            </div>
            {unlockedList.some((c) => !learnedSet.has(c.char)) && (
              <button
                onClick={() => {
                  const next = unlockedList.find((c) => !learnedSet.has(c.char));
                  if (next) window.location.href = `/learn/${encodeURIComponent(decodedLevel)}/${encodeURIComponent(next.char)}`;
                }}
                className={`flex-shrink-0 text-white text-xs font-bold px-4 py-2 rounded-xl ${info.badge}`}
              >
                이어서 →
              </button>
            )}
          </div>
        )}

        {/* 필터 탭 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {FILTERS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                filter === id
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-amber-300"
              }`}
            >
              {label} <span className={filter === id ? "text-amber-100" : "text-gray-400"}>{count}</span>
            </button>
          ))}
        </div>

        {/* 한자 그리드 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3 animate-bounce">📖</div>
            <p className="text-amber-600 font-bold text-sm">한자 목록 불러오는 중...</p>
          </div>
        ) : filtered.length === 0 && lockedList.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-gray-500 text-sm">해당하는 한자가 없어요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">

            {/* ── 해금된 한자 ── */}
            {filtered.map((item) => {
              const isDone   = learnedSet.has(item.char);
              const isReview = dueSet.has(item.char);
              const globalIdx = list.indexOf(item);
              const isToday  = globalIdx === unlockedCount - 1 && !isDone;
              return (
                <div key={item.char} className="relative mt-3">
                  {isToday && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                      <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">오늘의 한자</span>
                    </div>
                  )}
                  <Link
                    href={`/learn/${encodeURIComponent(decodedLevel)}/${encodeURIComponent(item.char)}`}
                    className={`relative rounded-2xl border-2 px-4 py-3.5 flex items-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 block ${
                      isToday
                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                        : isDone
                          ? "bg-amber-50 border-amber-300"
                          : "bg-white border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    {isReview && (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">복</span>
                    )}
                    {isDone && !isReview && (
                      <span className="absolute -top-1.5 -right-1.5 bg-green-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xl font-black leading-tight ${isDone ? "text-amber-700" : "text-gray-800"}`}>{item.sound}</p>
                      <p className="text-sm text-gray-500 font-medium truncate">{item.meaning}</p>
                    </div>
                    <span className={`text-2xl font-black flex-shrink-0 ${isDone ? "text-amber-300" : "text-gray-200"}`}>{item.char}</span>
                  </Link>
                  {!isDone && (
                    <button
                      onClick={() => handleMarkKnown(item)}
                      className="absolute bottom-1.5 right-2 text-[9px] text-gray-300 hover:text-green-500 font-bold transition-colors"
                    >
                      ✓ 알아요
                    </button>
                  )}
                </div>
              );
            })}

            {/* ── 잠긴 한자 (블러) ── */}
            {filter === "all" && lockedList.map((item, i) => (
              <div key={`locked-${item.char}`} className="relative rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3.5 flex items-center gap-3 overflow-hidden mt-3">
                <div className="flex-1 min-w-0 select-none" style={{ filter: "blur(4px)" }}>
                  <p className="text-xl font-black text-gray-400">{item.sound}</p>
                  <p className="text-sm text-gray-400">{item.meaning}</p>
                </div>
                <span className="text-2xl font-black flex-shrink-0 text-gray-300 select-none" style={{ filter: "blur(4px)" }}>{item.char}</span>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/70 rounded-2xl">
                  <span className="text-lg">🔒</span>
                  <span className="text-[9px] text-gray-400 font-bold mt-1">
                    {i === 0 ? "내일 공개" : `${i + 1}일 후`}
                  </span>
                </div>
              </div>
            ))}

          </div>
        )}
      </main>
    </div>
  );
}