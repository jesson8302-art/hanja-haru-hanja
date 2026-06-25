"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDueCards, getStreak, getTodayCount, getMyLevel, setMyLevel, type StreakInfo } from "@/lib/review-system";
import MorningReview from "@/components/MorningReview";
import { useAuth } from "@/contexts/AuthContext";

const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const lv = i + 1;
  const label =
    lv <= 3  ? "입문" :
    lv <= 6  ? "기초" :
    lv <= 10 ? "초급" :
    lv <= 14 ? "중급" :
    lv <= 17 ? "고급" : "심화";
  const audience =
    lv <= 3  ? "초등 저학년" :
    lv <= 6  ? "초등 중학년" :
    lv <= 10 ? "초등 고학년" :
    lv <= 14 ? "중학교" :
    lv <= 17 ? "고등학교" : "고3·성인";
  return { lv: `Lv.${lv}`, label, audience };
});

function getLvColor(lv: number) {
  if (lv <= 5)  return { bg: "bg-emerald-500", ring: "ring-emerald-200", card: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", grad: "from-emerald-400 to-teal-500" };
  if (lv <= 10) return { bg: "bg-blue-500",    ring: "ring-blue-200",    card: "bg-blue-50 border-blue-200 hover:bg-blue-100",         grad: "from-blue-400 to-indigo-500" };
  if (lv <= 15) return { bg: "bg-violet-500",  ring: "ring-violet-200",  card: "bg-violet-50 border-violet-200 hover:bg-violet-100",   grad: "from-violet-400 to-purple-500" };
  return              { bg: "bg-rose-500",     ring: "ring-rose-200",    card: "bg-rose-50 border-rose-200 hover:bg-rose-100",         grad: "from-rose-400 to-red-500" };
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [dueCount,   setDue]    = useState(0);
  const [todayCount, setToday]  = useState(0);
  const [streak,     setStreak] = useState<StreakInfo>({ current: 0, longest: 0, last_active: "" });
  const [myLevel,    setMyLv]   = useState<string | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [showAll,    setShowAll] = useState(false);

  // 인증 가드
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setDue(getDueCards().length);
    setStreak(getStreak());
    setToday(getTodayCount());
    setMyLv(getMyLevel());
  }, []);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-4xl animate-bounce">📖</div>
      </div>
    );
  }

  const lvNum   = myLevel ? parseInt(myLevel.replace("Lv.", "")) : null;
  const lvColor = lvNum ? getLvColor(lvNum) : null;
  const lvInfo  = lvNum ? LEVELS[lvNum - 1] : null;

  const dayOfWeek  = new Date().getDay();
  const isFriday   = dayOfWeek === 5;
  const isSaturday = dayOfWeek === 6;

  function handleSelectLevel(lv: string) {
    setMyLevel(lv);
    setMyLv(lv);
    window.location.href = `/learn/${encodeURIComponent(lv)}`;
  }

  const visibleLevels = showAll ? LEVELS : LEVELS.slice(0, 12);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {!reviewDone && <MorningReview onDone={() => setReviewDone(true)} />}

      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">📖</span>
          <div>
            <h1 className="text-xl font-black text-amber-700 leading-tight">한자 하루 한자</h1>
            <p className="text-xs text-amber-500 font-medium">소리와 뜻으로 배우는 한자 문해력</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {streak.current > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
                🔥 {streak.current}일
              </span>
            )}
            {dueCount > 0 && (
              <Link href="/mypage" className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                📬 {dueCount}
              </Link>
            )}
            <Link href="/quiz" className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">퀴즈</Link>
            <Link href="/mypage" className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100">MY</Link>
            <button
              onClick={async () => { await logout(); router.replace("/login"); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
              title={user.displayName ?? user.email ?? ""}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {isSaturday && (
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <div>
                <p className="font-black text-sm">오늘은 한 주간의 복습 날이에요!</p>
                <p className="text-rose-100 text-xs">이번 주에 배운 한자를 다시 확인해봐요</p>
              </div>
            </div>
            <Link href="/mypage" className="flex-shrink-0 bg-white text-rose-600 font-black text-xs px-4 py-2 rounded-full shadow">
              복습하러 가기 →
            </Link>
          </div>
        </div>
      )}
      {isFriday && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 text-white px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <div>
              <p className="font-black text-sm">내일은 한 주간의 복습 날이에요!</p>
              <p className="text-amber-100 text-xs">오늘 학습을 마무리하고 내일 복습을 준비해봐요</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">

        {myLevel && lvColor && lvInfo ? (
          <section className="mb-8">
            <div className={`bg-gradient-to-r ${lvColor.grad} rounded-3xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white bg-opacity-30 text-white text-xs font-black px-2.5 py-0.5 rounded-full">내 레벨</span>
                    <span className="font-black text-lg">{myLevel} — {lvInfo.label}</span>
                  </div>
                  <p className="text-white text-opacity-80 text-sm mb-4">{lvInfo.audience} · 오늘도 한 자씩 꾸준히!</p>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/learn/${encodeURIComponent(myLevel)}`}
                      className="inline-block bg-white text-gray-800 font-black px-6 py-3 rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                      지금 학습 시작 →
                    </Link>
                    <button
                      onClick={() => setShowAll(true)}
                      className="text-white text-opacity-70 hover:text-opacity-100 text-xs font-bold underline underline-offset-2"
                    >
                      레벨 변경
                    </button>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  {todayCount > 0 && (
                    <div className="bg-white bg-opacity-20 rounded-2xl px-4 py-3 text-center">
                      <p className="text-2xl font-black">{todayCount}자</p>
                      <p className="text-white text-opacity-70 text-xs">오늘 학습</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {(!myLevel || showAll) && (
          <>
            {(todayCount > 0 || dueCount > 0) && !myLevel && (
              <div className="flex gap-3 mb-6">
                {todayCount > 0 && (
                  <div className="flex-1 bg-white rounded-2xl border border-amber-200 shadow-sm px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl">📖</span>
                    <div>
                      <p className="text-xs text-gray-400">오늘 학습</p>
                      <p className="text-lg font-black text-blue-600">{todayCount}자</p>
                    </div>
                  </div>
                )}
                {dueCount > 0 && (
                  <Link href="/mypage" className="flex-1 bg-white rounded-2xl border border-rose-200 shadow-sm px-4 py-3 flex items-center gap-3 hover:bg-rose-50">
                    <span className="text-2xl">📬</span>
                    <div>
                      <p className="text-xs text-gray-400">복습 대기</p>
                      <p className="text-lg font-black text-rose-500">{dueCount}자</p>
                    </div>
                  </Link>
                )}
              </div>
            )}

            <section className="text-center mb-5">
              <h2 className="text-2xl font-black text-gray-800 mb-1">레벨을 선택하세요</h2>
              <p className="text-gray-500 text-sm">각 레벨은 약 30~31자로 구성되어 있어요</p>
            </section>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 mb-4">
              {visibleLevels.map(({ lv, label, audience }) => {
                const n = parseInt(lv.replace("Lv.", ""));
                const c = getLvColor(n);
                const isMine = myLevel === lv;
                return (
                  <button
                    key={lv}
                    onClick={() => handleSelectLevel(lv)}
                    className={`relative rounded-2xl border-2 p-3 flex flex-col items-center text-center transition-all hover:shadow-md hover:-translate-y-0.5 ${c.card} ${isMine ? `ring-2 ${c.ring}` : ""}`}
                  >
                    {isMine && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                    )}
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 ${c.bg}`}>{lv}</span>
                    <span className="text-gray-800 font-bold text-xs mb-0.5 leading-tight">{label}</span>
                    <span className="text-gray-400 text-[10px] leading-tight">{audience}</span>
                  </button>
                );
              })}
            </div>

            {!showAll && LEVELS.length > 12 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-2.5 text-sm font-bold text-gray-500 border border-gray-200 rounded-2xl hover:bg-gray-50 mb-6"
              >
                전체 레벨 보기 (Lv.13~20) ↓
              </button>
            )}
            {showAll && myLevel && (
              <button
                onClick={() => setShowAll(false)}
      