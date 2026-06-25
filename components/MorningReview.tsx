"use client";

import { useEffect, useState, useRef } from "react";
import {
  getYesterdayLearned,
  hasDoneMorningReview,
  saveMorningReview,
  type LearningRecord,
} from "@/lib/review-system";

interface WordItem {
  word_korean: string;
  word_hanja: string;
}

interface ContentData {
  step_2_words: WordItem[];
  daily_metadata: { hanja_meaning: string; hanja_sound: string };
}

type Phase = "intro" | "quiz" | "result";

function normalize(s: string) {
  return s.trim().replace(/\s+/g, "");
}

export default function MorningReview({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [target, setTarget] = useState<LearningRecord | null>(null);
  const [content, setContent] = useState<ContentData | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");

  // 입력값
  const [soundInput, setSoundInput] = useState("");
  const [meaningInput, setMeaningInput] = useState("");
  const [wordInputs, setWordInputs] = useState(["", ""]);

  // 결과
  const [soundOk, setSoundOk] = useState(false);
  const [meaningOk, setMeaningOk] = useState(false);
  const [wordResults, setWordResults] = useState<boolean[]>([]);
  const [passed, setPassed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasDoneMorningReview()) return;
    const yesterday = getYesterdayLearned();
    if (yesterday.length === 0) return;
    // 랜덤으로 하나 선택
    const pick = yesterday[Math.floor(Math.random() * yesterday.length)];
    setTarget(pick);

    // 콘텐츠 파일 로드 (단어 목록 가져오기)
    const fname = `${pick.sound}_${pick.hanja}_${pick.level}.json`;
    fetch(`/content/${fname}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setContent(d); })
      .catch(() => {});

    setShow(true);
  }, []);

  function handleSkip() {
    if (!target) return;
    const today = new Date().toISOString().split("T")[0];
    const yStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    saveMorningReview({
      date: today,
      target_date: yStr,
      hanja: target.hanja,
      sound: target.sound,
      meaning: "",
      level: target.level,
      passed: false,
      skipped: true,
      sound_correct: false,
      meaning_correct: false,
      words_recalled: 0,
    });
    setShow(false);
    onDone();
  }

  function handleSubmit() {
    if (!target || !content) return;

    const meta = content.daily_metadata;
    const sOk = normalize(soundInput) === normalize(meta.hanja_sound);
    const mOk = normalize(meaningInput) === normalize(meta.hanja_meaning) ||
                 normalize(meaningInput).includes(normalize(meta.hanja_meaning)) ||
                 normalize(meta.hanja_meaning).includes(normalize(meaningInput));

    const allWords = content.step_2_words.map((w) => normalize(w.word_korean));
    const wResults = wordInputs.map((inp) => {
      const n = normalize(inp);
      return n.length > 0 && allWords.some((w) => w === n || w.includes(n) || n.includes(w));
    });
    const wordsCorrect = wResults.filter(Boolean).length;
    const isPass = sOk && mOk && wordsCorrect >= 2;

    setSoundOk(sOk);
    setMeaningOk(mOk);
    setWordResults(wResults);
    setPassed(isPass);
    setPhase("result");

    const today = new Date().toISOString().split("T")[0];
    const yStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    saveMorningReview({
      date: today,
      target_date: yStr,
      hanja: target.hanja,
      sound: target.sound,
      meaning: meta.hanja_meaning,
      level: target.level,
      passed: isPass,
      skipped: false,
      sound_correct: sOk,
      meaning_correct: mOk,
      words_recalled: wordsCorrect,
    });
  }

  function handleClose() {
    setShow(false);
    onDone();
  }

  if (!show || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* 인트로 */}
        {phase === "intro" && (
          <div className="p-6 text-center">
            <div className="text-5xl mb-3">🤔</div>
            <h2 className="text-xl font-black text-gray-800 mb-1">어제 뭐 배웠지?</h2>
            <p className="text-gray-500 text-sm mb-5">
              어제 학습한 한자를 기억해 보세요.<br />
              음·뜻·단어 2개 이상 맞추면 성공!
            </p>
            {/* 한자 표시 (힌트) */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl py-6 mb-5">
              <span className="text-7xl font-black text-amber-700">{target.hanja}</span>
              <p className="text-xs text-gray-400 mt-2">{target.level}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-400 text-sm font-bold"
              >
                오늘은 패스
              </button>
              <button
                onClick={() => { setPhase("quiz"); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-amber-500 text-white font-black text-sm"
              >
                기억해볼게요 →
              </button>
            </div>
          </div>
        )}

        {/* 퀴즈 */}
        {phase === "quiz" && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-black text-amber-700">{target.hanja}</span>
              <div>
                <p className="text-xs text-gray-400">어제 배운 한자</p>
                <p className="text-xs text-gray-400">{target.level}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">음 (읽는 소리)</label>
                <input
                  ref={inputRef}
                  value={soundInput}
                  onChange={(e) => setSoundInput(e.target.value)}
                  placeholder="예: 인"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">뜻 (의미)</label>
                <input
                  value={meaningInput}
                  onChange={(e) => setMeaningInput(e.target.value)}
                  placeholder="예: 어질다"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  관련 단어 {wordInputs.length}개 이상
                </label>
                {wordInputs.map((v, i) => (
                  <input
                    key={i}
                    value={v}
                    onChange={(e) => {
                      const next = [...wordInputs];
                      next[i] = e.target.value;
                      // 마지막 칸에 입력하면 칸 추가 (최대 5개)
                      if (i === next.length - 1 && e.target.value && next.length < 5) {
                        next.push("");
                      }
                      setWordInputs(next);
                    }}
                    placeholder={`단어 ${i + 1} (예: 인자)`}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-amber-400 outline-none mb-2"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!soundInput || !meaningInput || wordInputs.filter(Boolean).length < 2}
              className="w-full py-3 rounded-2xl bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-sm"
            >
              제출하기
            </button>
          </div>
        )}

        {/* 결과 */}
        {phase === "result" && content && (
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">{passed ? "🎉" : "😢"}</div>
              <h2 className={`text-xl font-black ${passed ? "text-green-600" : "text-rose-500"}`}>
                {passed ? "완벽해요!" : "아쉬워요!"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {passed ? "어제 배운 한자를 잘 기억했어요!" : "정답을 확인하고 다시 외워봐요."}
              </p>
            </div>

            {/* 정답 확인 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">음</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{content.daily_metadata.hanja_sound}</span>
                  <span>{soundOk ? "✅" : "❌"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">뜻</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{content.daily_metadata.hanja_meaning}</span>
                  <span>{meaningOk ? "✅" : "❌"}</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p className="text-xs text-gray-500 mb-1">단어 (맞춘 것: {wordResults.filter(Boolean).length}개)</p>
                {content.step_2_words.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-gray-700">{w.word_korean}</span>
                    <span className="text-gray-400 text-xs">{w.word_hanja}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleClose}
              className={`w-full py-3 rounded-2xl font-black text-sm text-white ${
                passed ? "bg-green-500" : "bg-amber-500"
              }`}
            >
              {passed ? "오늘도 화이팅! →" : "다음엔 꼭 기억할게요 →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
