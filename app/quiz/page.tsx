"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getDueCards, getCollection, getWeakCards, submitReview,
  type LearningRecord, type ReviewRecord,
} from "@/lib/review-system";

// ── 타입 ──────────────────────────────────────────────────────
interface QuizCard { hanja: string; sound: string; meaning: string; level: string; full_reading: string; }

interface VocabQuestion {
  type: "word_to_def" | "def_to_word";
  prompt: string;      // 보여줄 것 (단어 or 뜻)
  answer: string;      // 정답
  hint: string;        // 어원 힌트
  cardChar: string;
  cardLevel: string;
  cardFullReading: string;
  choices: string[];
  correctIndex: number;
}

type Mode  = "review" | "all" | "weak";
type Phase = "select" | "loading" | "quiz" | "result";

// ── 헬퍼 ──────────────────────────────────────────────────────
function toQuizCard(r: ReviewRecord | LearningRecord): QuizCard {
  if ("card" in r) return { ...r.card };
  return { hanja: r.hanja, sound: r.sound, meaning: r.meaning, level: r.level, full_reading: `${r.meaning} ${r.sound}` };
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function enc(s: string) { return encodeURIComponent(s); }

interface WordEntry {
  word: string; def: string; etym: string;
  card: QuizCard;
}

async function buildQuestions(cards: QuizCard[]): Promise<VocabQuestion[]> {
  // 병렬 콘텐츠 로드
  const contents = await Promise.allSettled(
    cards.map((c) =>
      fetch(`/api/content/${enc(c.level)}?char=${enc(c.hanja)}`).then((r) => r.json())
    )
  );

  // 전체 단어 풀 구축
  const pool: WordEntry[] = [];
  contents.forEach((res, i) => {
    if (res.status !== "fulfilled" || !res.value?.step_2_words) return;
    (res.value.step_2_words as { word_korean: string; easy_definition: string; etymology_dissection: string }[])
      .forEach((w) => {
        pool.push({ word: w.word_korean, def: w.easy_definition, etym: w.etymology_dissection, card: cards[i] });
      });
  });

  if (pool.length < 4) return [];

  const selected = shuffle(pool).slice(0, 10);
  const questions: VocabQuestion[] = [];

  selected.forEach((entry, idx) => {
    const isWordToDef = idx % 2 === 0;
    const distractors = shuffle(pool.filter((w) => w.def !== entry.def)).slice(0, 3);
    if (distractors.length < 3) return; // 디스트랙터 부족 시 스킵

    if (isWordToDef) {
      // 단어 → 뜻 맞추기
      const choices = shuffle([entry.def, ...distractors.map((d) => d.def)]);
      questions.push({
        type: "word_to_def",
        prompt: entry.word,
        answer: entry.def,
        hint: entry.etym,
        cardChar: entry.card.hanja,
        cardLevel: entry.card.level,
        cardFullReading: entry.card.full_reading,
        choices,
        correctIndex: choices.indexOf(entry.def),
      });
    } else {
      // 뜻 → 단어 맞추기
      const choices = shuffle([entry.word, ...distractors.map((d) => d.word)]);
      questions.push({
        type: "def_to_word",
        prompt: entry.def,
        answer: entry.word,
        hint: entry.etym,
        cardChar: entry.card.hanja,
        cardLevel: entry.card.level,
        cardFullReading: entry.card.full_reading,
        choices,
        correctIndex: choices.indexOf(entry.word),
      });
    }
  });

  return questions;
}

// ── 메인 ──────────────────────────────────────────────────────
export default function QuizPage() {
  const [phase,     setPhase]     = useState<Phase>("select");
  const [mode,      setMode]      = useState<Mode>("all");
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [current,   setCurrent]   = useState(0);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [correct,   setCorrect]   = useState(0);
  const answersRef = useRef<{ card: QuizCard; ok: boolean }[]>([]);

  async function startQuiz(m: Mode) {
    setPhase("loading");
    const collection = getCollection().map(toQuizCard);
    let candidates: QuizCard[] = [];
    if (m === "review") candidates = getDueCards().map(toQuizCard);
    else if (m === "weak") candidates = getWeakCards(10).map(toQuizCard);
    else candidates = shuffle(collection);
    if (candidates.length === 0) candidates = shuffle(collection);
    const picked = shuffle(candidates).slice(0, Math.min(10, candidates.length));
    if (picked.length === 0) { setPhase("select"); return; }

    const qs = await buildQuestions(picked);
    if (qs.length === 0) { setPhase("select"); return; }

    answersRef.current = [];
    setQuestions(qs);
    setCurrent(0); setSelected(null); setConfirmed(false); setCorrect(0);
    setMode(m);
    setPhase("quiz");
  }

  function handleConfirm() {
    if (selected === null) return;
    const q = questions[current];
    const ok = selected === q.correctIndex;
    setConfirmed(true);
    if (ok) setCorrect((c) => c + 1);
    answersRef.current = [...answersRef.current, {
      card: { hanja: q.cardChar, sound: "", meaning: "", level: q.cardLevel, full_reading: q.cardFullReading },
      ok,
    }];
  }

  function handleNext() {
    const nextIdx = current + 1;
    if (nextIdx >= questions.length) {
      answersRef.current.forEach(({ card, ok }) => {
        submitReview(card, ok ? 3 : 0);
      });
      setPhase("result");
    } else {
      setCurrent(nextIdx); setSelected(null); setConfirmed(false);
    }
  }

  if (phase === "select") return <SelectScreen onStart={startQuiz} />;
  if (phase === "loading") return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📚</div>
        <p className="text-amber-600 font-bold">단어 퀴즈 준비 중...</p>
      </div>
    </div>
  );
  if (phase === "result") return (
    <ResultScreen score={correct} total={questions.length} questions={questions} answers={answersRef.current.map((a) => a.ok)} onRetry={() => startQuiz(mode)} />
  );

  const q = questions[current];
  const progress = Math.round((current / questions.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="bg-white border-b border-amber-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setPhase("select")} className="text-amber-600 font-bold text-sm">← 나가기</button>
          <span className="text-sm font-bold text-gray-600">{current + 1} / {questions.length}</span>
          <span className="text-sm font-bold text-green-600">{correct}✓</span>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* 문제 유형 안내 */}
        <div className="text-center">
          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
            q.type === "word_to_def"
              ? "bg-blue-100 text-blue-600"
              : "bg-purple-100 text-purple-600"
          }`}>
            {q.type === "word_to_def" ? "단어의 뜻을 고르세요" : "뜻에 맞는 단어를 고르세요"}
          </span>
        </div>

        {/* 문제 카드 */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <div className={`py-8 px-6 text-center ${
            q.type === "word_to_def"
              ? "bg-gradient-to-br from-blue-400 to-indigo-500"
              : "bg-gradient-to-br from-purple-400 to-fuchsia-500"
          }`}>
            <p className="text-white text-opacity-80 text-2xl font-black leading-snug">
              {q.prompt}
            </p>
            {q.type === "word_to_def" && (
              <p className="text-white text-opacity-60 text-xs mt-2">{q.hint}</p>
            )}
          </div>
        </div>

        {/* 보기 */}
        <div className="space-y-2">
          {q.choices.map((choice, i) => {
            let cls = "bg-white border-2 border-gray-200 text-gray-700 text-left hover:border-amber-300 hover:bg-amber-50";
            if (confirmed) {
              if (i === q.correctIndex) cls = "bg-green-50 border-2 border-green-400 text-green-800 font-bold text-left";
              else if (i === selected) cls = "bg-red-50 border-2 border-red-300 text-red-600 text-left";
              else cls = "bg-white border-2 border-gray-100 text-gray-300 text-left";
            } else if (i === selected) {
              cls = "bg-amber-50 border-2 border-amber-400 text-amber-800 font-bold text-left";
            }
            return (
              <button key={i} onClick={() => !confirmed && setSelected(i)}
                className={`w-full rounded-2xl px-4 py-3.5 text-sm transition-all ${cls}`}>
                <span className="font-black mr-2 text-gray-400">{i + 1}</span>
                {choice}
                {confirmed && i === q.correctIndex && <span className="float-right text-green-500">✓</span>}
                {confirmed && i === selected && i !== q.correctIndex && <span className="float-right text-red-400">✗</span>}
              </button>
            );
          })}
        </div>

        {/* 피드백 */}
        {confirmed && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-bold text-center ${
            selected === q.correctIndex
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-orange-50 border border-orange-200 text-orange-700"
          }`}>
            {selected === q.correctIndex
              ? "🎉 정답이에요!"
              : `💡 정답: ${q.choices[q.correctIndex]}`
            }
          </div>
        )}

        {/* 버튼 */}
        {!confirmed ? (
          <button onClick={handleConfirm} disabled={selected === null}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-sm transition-colors">
            정답 확인
          </button>
        ) : (
          <button onClick={handleNext}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl text-sm transition-colors">
            {current + 1 >= questions.length ? "결과 보기 →" : "다음 문제 →"}
          </button>
        )}
      </main>
    </div>
  );
}

// ── 모드 선택 ──────────────────────────────────────────────────
function SelectScreen({ onStart }: { onStart: (m: Mode) => void }) {
  const [dueCount, setDue]   = useState(0);
  const [total,    setTotal] = useState(0);
  const [weak,     setWeak]  = useState(0);

  useEffect(() => {
    setDue(getDueCards().length);
    setTotal(getCollection().length);
    setWeak(getWeakCards(10).length);
  }, []);

  const modes = [
    { mode: "review" as Mode, icon: "📬", title: "복습 퀴즈",  desc: "오늘 복습 예정 한자의 단어로", count: dueCount,  accent: "border-rose-300 hover:border-rose-400 hover:bg-rose-50",   cnt: "text-rose-500" },
    { mode: "all"    as Mode, icon: "🎯", title: "전체 연습",  desc: "배운 한자 단어 랜덤 10문제",  count: total,      accent: "border-amber-300 hover:border-amber-400 hover:bg-amber-50", cnt: "text-amber-600" },
    { mode: "weak"   as Mode, icon: "💪", title: "취약 집중",  desc: "자주 틀린 한자 단어 집중",    count: weak,       accent: "border-blue-300 hover:border-blue-400 hover:bg-blue-50",   cnt: "text-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="text-amber-600 font-bold text-sm">← 홈</Link>
          <h1 className="text-lg font-black text-gray-800">단어 퀴즈</h1>
          <Link href="/mypage" className="text-amber-600 font-bold text-sm">MY</Link>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-8">
        <p className="text-center text-gray-400 text-sm mb-2">배운 단어의 뜻을 얼마나 아는지 확인해봐요 ✏️</p>
        <p className="text-center text-gray-300 text-xs mb-8">한자 모양 암기 없이 · 뜻과 소리로 승부!</p>
        <div className="space-y-3">
          {modes.map(({ mode, icon, title, desc, count, accent, cnt }) => (
            <button key={mode} onClick={() => onStart(mode)} disabled={count === 0}
              className={`w-full bg-white rounded-2xl border-2 p-5 flex items-center gap-4 text-left transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${accent}`}>
              <span className="text-3xl flex-shrink-0">{icon}</span>
              <div className="flex-1">
                <p className="font-black text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={`text-xl font-black ${count > 0 ? cnt : "text-gray-300"}`}>{count}</p>
                <p className="text-[10px] text-gray-400">자</p>
              </div>
            </button>
          ))}
        </div>
        {total === 0 && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-amber-700 font-bold text-sm mb-2">아직 학습한 한자가 없어요</p>
            <Link href="/home" className="inline-block bg-amber-500 text-white font-bold text-sm px-5 py-2 rounded-xl">학습하러 가기</Link>
          </div>
        )}
      </main>
    </div>
  );
}

// ── 결과 화면 ──────────────────────────────────────────────────
function ResultScreen({ score, total, questions, answers, onRetry }: {
  score: number; total: number; questions: VocabQuestion[]; answers: boolean[]; onRetry: () => void;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const emoji = pct === 100 ? "🏆" : pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";
  const msg   = pct === 100 ? "완벽해요!" : pct >= 80 ? "아주 잘했어요!" : pct >= 60 ? "잘했어요!" : "더 연습해봐요!";
  const circum = 2 * Math.PI * 48;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/quiz" className="text-amber-600 font-bold text-sm">← 다시</Link>
          <h1 className="text-lg font-black text-gray-800">퀴즈 결과</h1>
          <Link href="/home" className="text-amber-600 font-bold text-sm">홈</Link>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-3xl shadow-md p-7 text-center">
          <div className="text-5xl mb-2">{emoji}</div>
          <h2 className="text-2xl font-black text-gray-800 mb-1">{msg}</h2>
          <p className="text-gray-400 text-sm mb-6">{total}문제 중 <strong className="text-amber-600">{score}개</strong> 정답</p>
          <div className="relative w-28 h-28 mx-auto mb-6">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="48" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle cx="55" cy="55" r="48" fill="none"
                stroke={pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${circum}`}
                strokeDashoffset={`${circum * (1 - pct / 100)}`}
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-gray-800">{pct}%</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onRetry} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm">다시 풀기</button>
            <Link href="/home" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm text-center">홈으로</Link>
          </div>
        </div>

        {/* 오답 노트 */}
        {answers.some((a) => !a) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-500 mb-3">📝 오답 노트</p>
            <div className="space-y-3">
              {questions.map((q, i) => {
                if (answers[i]) return null;
                return (
                  <div key={i} className="bg-red-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {q.type === "word_to_def" ? "단어 → 뜻" : "뜻 → 단어"}
                    </p>
                    <p className="text-sm font-bold text-gray-700 mb-0.5">Q. {q.prompt}</p>
                    <p className="text-sm text-green-700 font-bold">✓ {q.choices[q.correctIndex]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
