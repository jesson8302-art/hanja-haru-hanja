"use client";

import Link from "next/link";

const GRADES = [
  {
    emoji: "🌱",
    target: "초등 저학년",
    chars: "50~100자",
    desc: "한자어가 뜻을 품고 있다는 감각을 심어줍니다.",
    badge: "Lv.1~5",
    color: "from-emerald-400 to-teal-500",
    light: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  {
    emoji: "📗",
    target: "초등 고학년",
    chars: "200~300자",
    desc: "사회·과학 교과서 개념어(지형, 생태, 분류, 관계)의 뿌리를 이해합니다.",
    badge: "Lv.6~10",
    color: "from-blue-400 to-indigo-500",
    light: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
  {
    emoji: "📘",
    target: "중학생",
    chars: "300~500자",
    desc: "국어·역사·과학 교과서 핵심어가 이 범위 안에 거의 다 들어옵니다.",
    badge: "Lv.11~15",
    color: "from-violet-400 to-purple-500",
    light: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
  },
  {
    emoji: "📕",
    target: "고등학생·성인",
    chars: "500~600자",
    desc: "수능 어휘 완전 커버. 900자까지 가면 비문학 독해에 명확한 차이가 생깁니다.",
    badge: "Lv.16~20",
    color: "from-rose-400 to-red-500",
    light: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
  },
];

const STEPS = [
  { n: 1, icon: "🧬", title: "어원 이야기", desc: "한자가 왜 이렇게 생겼는지, 그림처럼 이해합니다." },
  { n: 2, icon: "📝", title: "교과서 단어", desc: "오늘 한자가 들어간 실제 교과서 어휘 3개를 배웁니다." },
  { n: 3, icon: "🎯", title: "독해 퀴즈",  desc: "짧은 지문을 읽고 의미를 확인합니다." },
  { n: 4, icon: "✍️", title: "쓰기 챌린지", desc: "내 언어로 한 문장을 만들어봅니다." },
  { n: 5, icon: "🔁", title: "반복 낭독",  desc: "10번 소리내어 읽으며 장기 기억에 새깁니다." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── 네비 ── */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <span className="font-black text-amber-700 text-lg">한자 하루 한자</span>
          </div>
          <Link
            href="/"
            className="bg-amber-500 hover:bg-amber-600 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            지금 시작하기 →
          </Link>
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <section className="bg-gradient-to-b from-amber-50 to-white pt-20 pb-24 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-black px-4 py-1.5 rounded-full mb-6">
          ✨ 하루 1자 · 20레벨 · 600자 완성
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-5">
          600자면<br />
          <span className="text-amber-500">교과서가 달라 보입니다.</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          국어·사회·과학·역사 교과서 핵심 어휘의 뿌리는 한자입니다.<br />
          하루 한 자씩, 600자를 완주하면 교과서가 통째로 읽힙니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/"
            className="bg-amber-500 hover:bg-amber-600 text-white font-black text-base px-8 py-4 rounded-2xl shadow-lg shadow-amber-200 transition-all hover:-translate-y-0.5"
          >
            무료로 시작하기 →
          </Link>
          <span className="text-gray-400 text-sm">로그인 없이 바로 시작 · 기기에 저장</span>
        </div>
      </section>

      {/* ── 숫자로 보는 앱 ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6">
          {[
            { num: "600자", sub: "교과서 완성 목표" },
            { num: "20레벨", sub: "체계적인 난이도 설계" },
            { num: "하루 1자", sub: "부담 없이 꾸준히" },
          ].map(({ num, sub }) => (
            <div key={num} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-amber-500 mb-1">{num}</div>
              <div className="text-sm text-gray-400 font-medium">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 학년별 목표 ── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              내 학년에 맞는 목표가 있어요
            </h2>
            <p className="text-gray-500">교육 연구를 바탕으로 학년별 최적 학습량을 설계했습니다.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {GRADES.map((g) => (
              <div key={g.target} className={`rounded-2xl border-2 p-6 ${g.light}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-white border ${g.text}`}>
                        {g.badge}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xl font-black ${g.text}`}>{g.chars}</span>
                </div>
                <h3 className="font-black text-gray-800 text-lg mb-1">{g.target}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5단계 학습법 ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              한 자를 제대로 배우는 5단계
            </h2>
            <p className="text-gray-500">단순 암기가 아닙니다. 이해하고 쓰고 말하며 장기 기억에 새깁니다.</p>
          </div>
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                  {s.n}
                </div>
                <div className="text-xl flex-shrink-0">{s.icon}</div>
                <div>
                  <p className="font-black text-gray-800 text-sm">{s.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 마케팅 메시지 ── */}
      <section className="py-20 px-6 bg-gradient-to-br from-amber-500 to-orange-500 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-amber-100 text-sm font-bold mb-4">완주 목표가 명확한 유일한 한자 앱</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-5 leading-tight">
            1800자는 끝이 안 보여요.<br />
            600자는 완주할 수 있어요.
          </h2>
          <p className="text-amber-100 text-base leading-relaxed mb-8">
            "교과서 한자어 완성" — 명확한 성취감이 있어야<br />
            포기하지 않고 끝까지 갑니다.
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-amber-600 font-black text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            지금 Lv.1부터 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="text-center py-8 text-gray-400 text-xs border-t border-gray-100 bg-white">
        <p className="mb-1">📖 한자 하루 한자 · 소리와 뜻으로 여는 문해력</p>
        <p>학습 데이터는 이 기기에만 저장됩니다 · 로그인 불필요</p>
      </footer>

    </div>
  );
}
