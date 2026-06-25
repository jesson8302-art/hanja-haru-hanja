"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getDueCards,
  submitReview,
  type ReviewRecord,
  type ReviewQuality,
} from "@/lib/review-system";

const QUALITY_BUTTONS: {
  quality: ReviewQuality;
  label: string;
  sub: string;
  color: string;
}[] = [
  { quality: 0, label: "다시", sub: "완전히 잊음", color: "bg-red-500 hover:bg-red-600" },
  { quality: 1, label: "어려움", sub: "겨우 생각남", color: "bg-orange-500 hover:bg-orange-600" },
  { quality: 2, label: "보통", sub: "조금 버벅였어요", color: "bg-yellow-500 hover:bg-yellow-600" },
  { quality: 3, label: "쉬움", sub: "바로 알았어요", color: "bg-green-500 hover:bg-green-600" },
];

type Phase = "question" | "reveal" | "done";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();

  const level = decodeURIComponent(params.level as string);
  const hanjaParam = decodeURIComponent(params.hanja as string);

  const [queue, setQueue] = useState<ReviewRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [lastResult, setLastResult] = useState<ReviewRecord | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    const all = getDueCards();
    // 현재 한자를 첫 번째로, 나머지 같은 급수 한자를 이어붙임
    const target = all.filter(
      (r) => r.card.level === level && r.card.hanja === hanjaParam
    );
    const rest = all.filter(
      (r) => !(r.card.level === level && r.card.hanja === hanjaParam)
    );
    setQueue([...target, ...rest]);
  }, [level, hanjaParam]);

  const current = queue[currentIndex];

  function handleReveal() {
    setPhase("reveal");
  }

  function handleRate(quality: ReviewQuality) {
    if (!current) return;
    const result = submitReview(current.card, quality);
    setLastResult(result);
    setReviewedCount((c) => c + 1);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      setPhase("done");
    } else {
      setCurrentIndex(next);
      setPhase("question");
    }
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">복습할 한자가 없어요!</h2>
          <p className="text-sm text-gray-500 mb-6">오늘 복습이 모두 완료됐어요.</p>
          <Link href="/mypage" className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl">
            마이페이지로
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">복습 완료!</h2>
          <p className="text-gray-500 mb-2 text-sm">
            오늘 <strong className="text-amber-600">{reviewedCount}자</strong> 복습했어요.
          </p>
          {lastResult && (
            <div className="bg-amber-50 rounded-2xl p-4 mb-6 text-sm">
              <p className="text-gray-600">
                마지막 복습: <strong>{lastResult.card.full_reading}</strong>
              </p>
              <p className="text-gray-400 mt-1">
                다음 복습까지 <strong>{lastResult.interval}일</strong>
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Link
              href="/mypage"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              마이페이지
            </Link>
            <Link
              href="/home"
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const progress = Math.round(((currentIndex) / queue.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/mypage" className="text-amber-600 font-bold text-sm">← 마이페이지</Link>
          <span className="text-sm font-bold text-gray-600">
            {currentIndex + 1} / {queue.length}
          </span>
          <span className="text-xs text-gray-400">{reviewedCount}자 완료</span>
        </div>
        {/* 진행 바 */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-amber-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* 한자 카드 */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          {/* 급수 배지 */}
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-5 text-center">
            <div className="text-xs font-bold text-amber-100 mb-2">{current.card.level} 복습</div>
            <div className="text-8xl font-black text-white leading-none mb-3">
              {current.card.hanja}
            </div>
          </div>

          <div className="p-6">
            {phase === "question" ? (
              /* 질문 단계: 뜻과 소리 가리기 */
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">이 한자의 훈음은 무엇인가요?</p>
                <div className="bg-gray-50 rounded-2xl p-6 mb-6 border-2 border-dashed border-gray-200">
                  <p className="text-gray-300 text-2xl font-black tracking-widest">? ? ? ?</p>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  복습 {current.total_reviews}회 완료
                </div>
                <button
                  onClick={handleReveal}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-lg py-4 rounded-2xl transition-colors"
                >
                  정답 확인하기 👀
                </button>
              </div>
            ) : (
              /* 정답 공개 단계 */
              <div className="text-center">
                <div className="mb-4">
                  <p className="text-3xl font-black text-gray-800 mb-1">
                    {current.card.full_reading}
                  </p>
                  <p className="text-sm text-gray-400">
                    {current.card.level} · 복습 {current.total_reviews}회
                  </p>
                </div>

                {/* 간격 정보 */}
                <div className="bg-amber-50 rounded-2xl p-3 mb-5 text-xs text-amber-600">
                  현재 간격: {current.interval}일 · 다음에 더 길거나 짧게 조절돼요
                </div>

                {/* 평가 버튼 */}
                <p className="text-sm font-bold text-gray-600 mb-3">얼마나 기억했나요?</p>
                <div className="grid grid-cols-2 gap-3">
                  {QUALITY_BUTTONS.map(({ quality, label, sub, color }) => (
                    <button
                      key={quality}
                      onClick={() => handleRate(quality)}
                      className={`${color} text-white rounded-2xl py-4 transition-all active:scale-95`}
                    >
                      <div className="font-black text-lg">{label}</div>
                      <div className="text-xs opacity-80">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 큐 미리보기 */}
        {queue.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-bold mb-2">남은 복습 ({queue.length - currentIndex - 1}자)</p>
            <div className="flex flex-wrap gap-2">
              {queue.slice(currentIndex + 1, currentIndex + 6).map((r) => (
                <span
                  key={`${r.card.level}_${r.card.hanja}`}
                  className="bg-gray-50 border border-gray-200 text-gray-600 text-sm font-bold px-3 py-1 rounded-xl"
                >
                  {r.card.hanja}
                </span>
              ))}
              {queue.length - currentIndex - 1 > 5 && (
                <span className="text-xs text-gray-400 self-center">
                  +{queue.length - currentIndex - 6}자
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
