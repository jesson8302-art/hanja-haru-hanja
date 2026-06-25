"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getCollection } from "@/lib/review-system";
import { IDIOMS, type Idiom } from "@/lib/idioms-data";

// idioms sorted by unlock threshold
const SORTED_IDIOMS = [...IDIOMS].sort((a, b) => a.unlock_at - b.unlock_at);

// ── 퀴즈 ──────────────────────────────────────────────────────
type Q = { idiom: Idiom; options: string[]; correct: number };

function buildQuiz(pool: Idiom[]): Q[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 8);
  return shuffled.map((idiom) => {
    const others = pool
      .filter((i) => i.id !== idiom.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((i) => i.explanation);
    const opts = [...others, idiom.explanation].sort(() => Math.random() - 0.5);
    return { idiom, options: opts, correct: opts.indexOf(idiom.explanation) };
  });
}

function QuizScreen({ questions, onFinish }: { questions: Q[]; onFinish: (score: number) => void }) {
  const [idx, setIdx]       = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const score               = useRef(0);
  const q                   = questions[idx];

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.correct) score.current++;
  }

  function next() {
    if (idx + 1 >= questions.length) { onFinish(score.current); return; }
    setIdx((n) => n + 1);
    setPicked(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-amber-400 rounded-full transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400 font-bold">{idx + 1}/{questions.length}</span>
      </div>
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center">
        <p className="text-xs font-bold text-amber-100 mb-2">이 사자성어의 뜻은?</p>
        <p className="text-4xl font-black tracking-widest mb-2">{q.idiom.hanja}</p>
        <p className="text-amber-100 font-bold text-lg">{q.idiom.korean}</p>
      </div>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = "bg-white border-2 border-gray-200 text-gray-700";
          if (picked !== null) {
            if (i === q.correct) cls = "bg-green-100 border-2 border-green-400 text-green-800";
            else if (i === picked) cls = "bg-red-100 border-2 border-red-400 text-red-800";
            else cls = "bg-white border-2 border-gray-100 text-gray-400";
          }
          return (
            <button key={i} onClick={() => pick(i)}
              className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-left transition-all ${cls} ${picked === null ? "hover:border-amber-300 hover:bg-amber-50" : ""}`}>
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="text-center">
          <p className={`font-black text-sm mb-3 ${picked === q.correct ? "text-green-600" : "text-red-500"}`}>
            {picked === q.correct ? "정답!" : `오답 — ${q.idiom.explanation}`}
          </p>
          <button onClick={next} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-3 rounded-2xl text-sm">
            {idx + 1 < questions.length ? "다음 →" : "결과 보기"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 상세 모달 ──────────────────────────────────────────────────
function IdiomDetail({ idiom, onClose }: { idiom: Idiom; onClose: () => void }) {
  const levelLabel = { beginner: "초급", intermediate: "중급", advanced: "고급" }[idiom.level];
  const levelColor = { beginner: "bg-green-100 text-green-700", intermediate: "bg-amber-100 text-amber-700", advanced: "bg-rose-100 text-rose-700" }[idiom.level];
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-3xl p-6 text-white">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-4xl font-black tracking-widest mb-1">{idiom.hanja}</p>
              <p className="text-amber-100 font-bold text-lg">{idiom.korean}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${levelColor}`}>{levelLabel}</span>
              <button onClick={onClose} className="text-white text-2xl leading-none mt-1 opacity-70 hover:opacity-100">x</button>
            </div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-xl px-4 py-2 mt-2">
            <p className="font-bold text-sm">{idiom.meaning}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-black text-gray-400 mb-2">한자 분해</p>
            <div className="flex flex-wrap gap-2">
              {idiom.chars.map((c, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center min-w-[56px]">
                  <p className="text-2xl font-black text-amber-700">{c.hanja}</p>
                  <p className="text-[10px] font-bold text-gray-600">{c.sound} · {c.meaning}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs font-black text-blue-500 mb-1">뜻 풀이</p>
            <p className="text-sm font-bold text-gray-800">{idiom.explanation}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-black text-gray-400 mb-1">유래 · 맥락</p>
            <p className="text-sm text-gray-700 leading-relaxed">{idiom.story}</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-xs font-black text-green-500 mb-1">예문</p>
            <p className="text-sm text-gray-700 italic">"{idiom.example}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 잠금 카드 ──────────────────────────────────────────────────
function LockedCard({ unlockAt, learnedCount }: { unlockAt: number; learnedCount: number }) {
  const [showHint, setShowHint] = useState(false);
  const remaining = unlockAt - learnedCount;
  return (
    <div
      className="relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-150 transition-all min-h-[110px]"
      onClick={() => setShowHint((v) => !v)}
    >
      {showHint ? (
        <>
          <p className="text-2xl mb-1">🔓</p>
          <p className="text-xs font-black text-gray-500">{remaining}자 더</p>
          <p className="text-[10px] text-gray-400">학습하면 해금!</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center mb-2">
            <span className="text-2xl font-black text-gray-400">?</span>
          </div>
          <div className="flex gap-0.5 justify-center">
            {[0,1,2,3].map((i) => (
              <div key={i} className="w-4 h-4 bg-gray-300 rounded-sm flex items-center justify-center">
                <span className="text-[9px] font-black text-gray-400">?</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
type View = "list" | "quiz" | "result";

export default function IdiomsPage() {
  const [learnedCount, setLearned]    = useState<number | null>(null);
  const [selected, setSelected]       = useState<Idiom | null>(null);
  const [view, setView]               = useState<View>("list");
  const [quizQuestions, setQuestions] = useState<Q[]>([]);
  const [quizScore, setScore]         = useState(0);
  const [newlyUnlocked, setNewly]     = useState<string | null>(null);

  useEffect(() => {
    const count = getCollection().length;
    setLearned(count);
    // show newly unlocked hint
    const justUnlocked = SORTED_IDIOMS.find((i) => i.unlock_at === count);
    if (justUnlocked) setNewly(justUnlocked.korean);
  }, []);

  if (learnedCount === null) return null;

  const unlockedIdioms = SORTED_IDIOMS.filter((i) => i.unlock_at <= learnedCount);
  const totalUnlocked  = unlockedIdioms.length;
  const totalIdioms    = SORTED_IDIOMS.length;
  const nextUnlock     = SORTED_IDIOMS.find((i) => i.unlock_at > learnedCount);

  function startQuiz() {
    if (unlockedIdioms.length < 4) return;
    setQuestions(buildQuiz(unlockedIdioms));
    setScore(0);
    setView("quiz");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <Link href="/home" className="text-amber-600 font-bold text-sm">← 홈</Link>
          <h1 className="text-lg font-black text-gray-800 mx-auto">사자성어</h1>
          {view === "list"
            ? <button
                onClick={startQuiz}
                disabled={unlockedIdioms.length < 4}
                className={`text-white font-bold text-xs px-3 py-1.5 rounded-full transition-colors ${
                  unlockedIdioms.length >= 4 ? "bg-amber-500 hover:bg-amber-600" : "bg-gray-300 cursor-not-allowed"
                }`}>
                퀴즈
              </button>
            : <button onClick={() => setView("list")} className="text-amber-600 font-bold text-sm">목록</button>
          }
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">

        {/* 신규 해금 알림 */}
        {newlyUnlocked && view === "list" && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 mb-4 text-white flex items-center gap-3 shadow-md">
            <span className="text-2xl">🎉</span>
            <div className="flex-1">
              <p className="font-black text-sm">새 사자성어 해금!</p>
              <p className="text-amber-100 text-xs">'{newlyUnlocked}' 카드가 열렸어요</p>
            </div>
            <button onClick={() => setNewly(null)} className="text-white opacity-60 hover:opacity-100 text-xl leading-none">x</button>
          </div>
        )}

        {/* 진도 바 */}
        {view === "list" && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-gray-600">해금된 사자성어</p>
              <span className="text-xs font-black text-amber-600">{totalUnlocked} / {totalIdioms}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                style={{ width: `${(totalUnlocked / totalIdioms) * 100}%` }}
              />
            </div>
            {nextUnlock && (
              <p className="text-[11px] text-gray-400">
                다음 해금까지 <strong className="text-amber-600">{nextUnlock.unlock_at - learnedCount}자</strong> 더 학습
              </p>
            )}
          </div>
        )}

        {/* 목록 */}
        {view === "list" && (
          <div className="grid grid-cols-2 gap-3">
            {SORTED_IDIOMS.map((idiom) => {
              const isUnlocked = idiom.unlock_at <= learnedCount;
              if (!isUnlocked) {
                return <LockedCard key={idiom.id} unlockAt={idiom.unlock_at} learnedCount={learnedCount} />;
              }
              const levelColor: Record<string, string> = {
                beginner: "bg-green-100 text-green-700",
                intermediate: "bg-amber-100 text-amber-700",
                advanced: "bg-rose-100 text-rose-700",
              };
              const levelLabel: Record<string, string> = { beginner: "초급", intermediate: "중급", advanced: "고급" };
              return (
                <button
                  key={idiom.id}
                  onClick={() => setSelected(idiom)}
                  className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 text-left hover:shadow-md hover:border-amber-300 transition-all min-h-[110px] flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-2xl font-black text-gray-800 tracking-wider">{idiom.hanja}</p>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${levelColor[idiom.level]}`}>
                      {levelLabel[idiom.level]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-600 mb-1">{idiom.korean}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{idiom.explanation}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 퀴즈 */}
        {view === "quiz" && quizQuestions.length > 0 && (
          <QuizScreen questions={quizQuestions} onFinish={(s) => { setScore(s); setView("result"); }} />
        )}

        {/* 결과 */}
        {view === "result" && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="text-6xl mb-4">
              {quizScore >= quizQuestions.length * 0.8 ? "🏆" : quizScore >= quizQuestions.length * 0.5 ? "👍" : "📚"}
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">{quizScore} / {quizQuestions.length}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {quizScore >= quizQuestions.length * 0.8 ? "훌륭해요! 사자성어 마스터!" :
               quizScore >= quizQuestions.length * 0.5 ? "잘 했어요! 조금 더 연습해봐요." :
               "괜찮아요. 카드를 더 읽고 다시 도전해봐요."}
            </p>
            <div className="flex gap-3">
              <button onClick={startQuiz} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-3 rounded-2xl text-sm">다시 퀴즈</button>
              <button onClick={() => setView("list")} className="bg-white border border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-sm hover:bg-gray-50">목록으로</button>
            </div>
          </div>
        )}
      </main>

      {selected && <IdiomDetail idiom={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
