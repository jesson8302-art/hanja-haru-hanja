"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { registerLearned } from "@/lib/review-system";

interface Word {
  word_korean: string;
  etymology_dissection: string;
  easy_definition: string;
  context_sentence: string;
}
interface Content {
  daily_metadata: { hanja_sound: string; hanja_meaning: string; hanja_char: string; hanja_level?: string; level?: string; linked_subject: string };
  step_1_etymology: { visual_title: string; etymology_story: string };
  step_2_words: Word[];
  step_3_reading_comprehension: {
    passage_title: string;
    passage_text: string;
    quiz: { question: string; choices: string[]; correct_answer_index: number; detailed_explanation: string };
  };
  step_4_writing_challenge: { mission_guideline: string; model_example: string };
  step_5_vocal_review: { cheer_message: string };
}

function BoldText({ text }: { text?: string }) {
  const parts = (text ?? "").split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="text-amber-700 font-bold">{p}</strong> : p
      )}
    </>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center">{n}</span>
      <span className="text-amber-700 font-bold text-sm uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function LearnCharPage() {
  const { level, char: charParam } = useParams<{ level: string; char: string }>();
  const router = useRouter();

  const decodedLevel = decodeURIComponent(level);
  const decodedChar  = decodeURIComponent(charParam);

  const [content, setContent]     = useState<Content | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [step, setStep]           = useState(1);
  const [selected, setSelected]   = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [essay, setEssay]         = useState("");
  const [essayDone, setEssayDone] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [done, setDone]           = useState(false);
  const [alreadyKnow, setAlreadyKnow] = useState(false);

  useEffect(() => {
    const isLv = /^Lv\.\d+$/.test(decodedLevel);
    const apiUrl = isLv
      ? `/api/lv/${encodeURIComponent(decodedLevel)}?char=${encodeURIComponent(decodedChar)}`
      : `/api/content/${encodeURIComponent(decodedLevel)}?char=${encodeURIComponent(decodedChar)}`;
    fetch(apiUrl)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setContent(d);
        setLoading(false);
      })
      .catch(() => { setError("콘텐츠를 불러오는 중 오류가 발생했어요."); setLoading(false); });
  }, [decodedLevel, decodedChar]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">📖</div>
        <p className="text-amber-600 font-bold">불러오는 중...</p>
      </div>
    </div>
  );

  if (error || !content) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🚧</div>
        <p className="text-gray-600 font-bold mb-4">{error || "콘텐츠를 찾을 수 없어요."}</p>
        <Link href={`/learn/${encodeURIComponent(decodedLevel)}`} className="bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
          ← 목록으로
        </Link>
      </div>
    </div>
  );

  const { daily_metadata: meta, step_1_etymology: s1, step_2_words: s2,
          step_3_reading_comprehension: s3, step_4_writing_challenge: s4,
          step_5_vocal_review: s5 } = content;

  const TOTAL = 5;
  const progress = Math.round((step / TOTAL) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-amber-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/learn/${encodeURIComponent(decodedLevel)}`}
            className="text-amber-600 hover:text-amber-700 font-bold text-sm"
          >
            ← {decodedLevel} 목록
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{decodedLevel}</span>
            <span className="text-gray-500 text-xs">{meta.linked_subject}</span>
          </div>
          <span className="text-gray-400 text-sm font-medium">{step}/{TOTAL}</span>
        </div>
        <div className="h-1 bg-amber-100">
          <div className="h-1 bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* 한자 타이틀 */}
        <div className="flex items-center gap-5 bg-white rounded-3xl border border-amber-200 shadow-md p-6 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex flex-col items-center justify-center shadow-md flex-shrink-0">
            <span className="text-white text-4xl font-black leading-none">{meta.hanja_char}</span>
            <span className="text-amber-100 text-[10px] mt-1 font-medium">{meta.hanja_meaning} {meta.hanja_sound}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">오늘의 한자</p>
            <h1 className="text-2xl font-black text-gray-800 leading-tight">
              {meta.hanja_meaning} <span className="text-amber-600">{meta.hanja_sound}</span>
            </h1>
          </div>
        </div>

        {/* ── STEP 1: 어원 ── */}
        {step === 1 && !alreadyKnow && (
          <div>
            {/* 이미 알아요 버튼 */}
            <button
              onClick={() => setAlreadyKnow(true)}
              className="w-full mb-4 py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm font-bold hover:border-amber-300 hover:text-amber-500 transition-colors"
            >
              ✅ 이미 알고 있어요
            </button>
            <div className="bg-white rounded-3xl border border-amber-200 shadow-md p-6">
              <StepBadge n={1} label="어원 이야기" />
              <h2 className="text-lg font-black text-gray-800 mb-4">{s1.visual_title}</h2>
              <p className="text-gray-600 leading-relaxed text-sm bg-amber-50 rounded-2xl p-4 border border-amber-100">
                {s1.etymology_story}
              </p>
            </div>
          </div>
        )}

        {/* ── 이미 알아요: 빠른 확인 화면 ── */}
        {step === 1 && alreadyKnow && (
          <div className="bg-white rounded-3xl border border-amber-200 shadow-md p-6 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h2 className="text-lg font-black text-gray-800 mb-2">빠른 확인만 할게요!</h2>
            <p className="text-gray-500 text-sm mb-6">오늘의 한자를 이미 알고 있다면,<br />핵심만 확인하고 넘어가도 됩니다.</p>
            <div className="bg-amber-50 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">음</span>
                <span className="font-black text-gray-800">{meta.hanja_sound}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">뜻</span>
                <span className="font-black text-gray-800">{meta.hanja_meaning}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">관련 단어</span>
                <span className="font-bold text-gray-700 text-sm">
                  {s2.slice(0, 3).map((w) => w.word_korean).join(" · ")}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAlreadyKnow(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-400 text-sm font-bold"
              >
                자세히 배울게요
              </button>
              <button
                onClick={() => {
                  registerLearned(
                    { hanja: meta.hanja_char, sound: meta.hanja_sound, meaning: meta.hanja_meaning, level: decodedLevel, full_reading: `${meta.hanja_meaning} ${meta.hanja_sound}` },
                    { quiz_correct: true, essay_written: false, vocal_count: 0 }
                  );
                  setDone(true);
                }}
                className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-green-500 text-white font-black text-sm"
              >
                완료! 다음으로 →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 단어 ── */}
        {step === 2 && (
          <div>
            <StepBadge n={2} label="오늘의 단어" />
            <div className="space-y-4">
              {s2.map((w, i) => (
                <div key={i} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                    <span className="text-lg font-black text-gray-800">{w.word_korean}</span>
                  </div>
                  <p className="text-xs text-amber-600 font-semibold bg-amber-50 rounded-lg px-3 py-1.5 mb-2 inline-block">{w.etymology_dissection}</p>
                  <p className="text-sm text-gray-600 mb-2">{w.easy_definition}</p>
                  <p className="text-xs text-gray-400 italic border-l-2 border-amber-200 pl-3">{w.context_sentence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: 독해 퀴즈 ── */}
        {step === 3 && (
          <div>
            <StepBadge n={3} label="독해 지문 & 퀴즈" />
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-5">
              <h3 className="font-black text-gray-800 mb-3">{s3.passage_title}</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                <BoldText text={s3.passage_text} />
              </p>
            </div>
            {s3.quiz && <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">{s3.quiz.question}</p>
              <div className="space-y-2 mb-4">
                {s3.quiz.choices.map((c, i) => {
                  let cls = "border border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50";
                  if (submitted) {
                    if (i === s3.quiz.correct_answer_index) cls = "border-2 border-green-400 bg-green-50 text-green-700 font-bold";
                    else if (i === selected) cls = "border-2 border-red-300 bg-red-50 text-red-500";
                    else cls = "border border-gray-100 text-gray-400";
                  } else if (i === selected) cls = "border-2 border-amber-400 bg-amber-50 text-amber-700 font-bold";
                  return (
                    <button key={i} onClick={() => !submitted && setSelected(i)}
                      className={`w-full text-left text-sm rounded-xl px-4 py-3 transition-all ${cls}`}>
                      <span className="font-bold mr-2">{String.fromCharCode(9312 + i)}</span>{c}
                    </button>
                  );
                })}
              </div>
              {!submitted ? (
                <button
                  onClick={() => { if (selected !== null) { setSubmitted(true); setQuizCorrect(selected === s3.quiz.correct_answer_index); } }}
                  disabled={selected === null}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  정답 확인하기
                </button>
              ) : (
                <div className={`rounded-xl p-4 ${selected === s3.quiz.correct_answer_index ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
                  <p className="text-sm font-bold mb-1">
                    {selected === s3.quiz.correct_answer_index ? "🎉 정답이에요!" : "💡 아쉽지만 괜찮아요!"}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">{s3.quiz.detailed_explanation}</p>
                </div>
              )}
            </div>}
          </div>
        )}

        {/* ── STEP 4: 작문 ── */}
        {step === 4 && (
          <div>
            <StepBadge n={4} label="내 문장 만들기" />
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{s4.mission_guideline}</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[11px] text-amber-600 font-bold mb-1">✨ 모범 예문</p>
                <p className="text-xs text-gray-600 italic">{s4.model_example}</p>
              </div>
            </div>
            <textarea
              value={essay} onChange={(e) => setEssay(e.target.value)}
              placeholder="여기에 내 문장을 써 보세요..."
              rows={5}
              className="w-full border-2 border-amber-200 focus:border-amber-400 outline-none rounded-2xl p-4 text-sm text-gray-700 resize-none bg-white shadow-sm"
            />
            <button
              onClick={() => essay.trim() && setEssayDone(true)}
              disabled={!essay.trim()}
              className="mt-3 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {essayDone ? "✅ 저장 완료!" : "내 문장 완성하기"}
            </button>
          </div>
        )}

        {/* ── STEP 5: 낭독 ── */}
        {step === 5 && (
          <div>
            <StepBadge n={5} label="낭독 미션" />
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-5 text-center">
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{s5.cheer_message}</p>
              <div className="mb-4">
                <div className="text-4xl font-black text-amber-600 mb-1">
                  {meta.hanja_meaning} — {meta.hanja_sound}!
                </div>
                <p className="text-gray-400 text-xs">소리 내어 읽을 때마다 버튼을 눌러요</p>
              </div>
              <button
                onClick={() => {
                  const next = Math.min(readCount + 1, 10);
                  setReadCount(next);
                  if (next === 10 && !done) {
                    setDone(true);
                    registerLearned(
                      { hanja: meta.hanja_char, sound: meta.hanja_sound, meaning: meta.hanja_meaning, level: decodedLevel, full_reading: `${meta.hanja_meaning} ${meta.hanja_sound}` },
                      { quiz_correct: quizCorrect, essay_written: essayDone, vocal_count: next }
                    );
                  }
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl font-black shadow-lg active:scale-95 transition-transform mx-auto block"
              >
                {readCount < 10 ? `${readCount}/10` : "🎉"}
              </button>
              {readCount > 0 && (
                <div className="flex justify-center gap-1 mt-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < readCount ? "bg-amber-400" : "bg-gray-200"}`} />
                  ))}
                </div>
              )}
              {done && (
                <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-green-700 font-bold text-sm">🎊 학습 완료! 보관함에 쵀장됐어요.</p>
                </div>
              )}
            </div>

            {/* 완료 후 — 다음 한자 or 목록 */}
            {done && (
              <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 text-center space-y-3">
                <p className="text-sm font-bold text-gray-700">다음 한자를 계속 학습할까요? 📚</p>
                <div className="flex gap-3">
                  <Link
                    href={`/learn/${encodeURIComponent(decodedLevel)}`}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    목록에서 고르기
                  </Link>
                  <Link
                    href="/"
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    홈으로
                  </Link>
                </div>
              </div>
            )}

            {/* 오늘 배운 단어 총정리 */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mt-4">
              <p className="text-xs font-bold text-gray-500 mb-3">📌 오늘 배운 단어</p>
              <div className="flex flex-wrap gap-2">
                {s2.map((w) => (
                  <div key={w.word_korean} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
                    <p className="text-sm font-black text-gray-800">{w.word_korean}</p>
                    <p className="text-[10px] text-amber-600">{w.etymology_dissection.split(" = ")[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 하단 네비 */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex-1 border-2 border-amber-300 text-amber-600 font-bold py-3 rounded-2xl text-sm hover:bg-amber-50 transition-colors">
              ← 이전
            </button>
          )}
          {step < TOTAL && (
            <button onClick={() => setStep((s) => s + 1)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-sm transition-colors shadow-md">
              다음 →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
