"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Script from "next/script";

type Tab = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithKakao } = useAuth();

  const [tab,        setTab]      = useState<Tab>("login");
  const [email,      setEmail]    = useState("");
  const [password,   setPassword] = useState("");
  const [name,       setName]     = useState("");
  const [error,      setError]    = useState("");
  const [busy,       setBusy]     = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  // 카카오 SDK 로드 확인
  useEffect(() => {
    if (!kakaoKey || kakaoKey === "YOUR_KAKAO_JS_KEY_HERE") return;
    const check = setInterval(() => {
      const win = window as Window & { Kakao?: { init: (k: string) => void; isInitialized: () => boolean } };
      if (win.Kakao) {
        if (!win.Kakao.isInitialized()) win.Kakao.init(kakaoKey);
        setKakaoReady(true);
        clearInterval(check);
      }
    }, 200);
    return () => clearInterval(check);
  }, [kakaoKey]);

  useEffect(() => {
    if (!loading && user) {
      const agreed = localStorage.getItem("terms_agreed");
      if (!agreed) {
        router.replace("/terms");
      } else {
        router.replace("/home");
      }
    }
  }, [user, loading, router]);

  function mapError(code: string) {
    const MAP: Record<string, string> = {
      "auth/user-not-found":      "가입되지 않은 이메일입니다.",
      "auth/wrong-password":      "비밀번호가 올바르지 않습니다.",
      "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
      "auth/weak-password":       "비밀번호는 6자 이상이어야 합니다.",
      "auth/invalid-email":       "이메일 형식이 올바르지 않습니다.",
      "auth/too-many-requests":   "너무 많은 시도. 잠시 후 다시 시도해주세요.",
      "auth/popup-closed-by-user": "로그인 창이 닫혔습니다. 다시 시도해주세요.",
    };
    return MAP[code] ?? "오류가 발생했습니다. 다시 시도해주세요.";
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (tab === "login") {
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) { setError("이름을 입력해주세요."); setBusy(false); return; }
        await signUpWithEmail(email, password, name);
        localStorage.setItem("terms_agreed", JSON.stringify({ service: true, privacy: true, marketing: false, date: new Date().toISOString() }));
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(mapError(code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
      const agreed = localStorage.getItem("terms_agreed");
      if (!agreed) router.replace("/terms");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(mapError(code));
    } finally {
      setBusy(false);
    }
  }

  async function handleKakao() {
    setError("");
    setBusy(true);
    try {
      await signInWithKakao();
      const agreed = localStorage.getItem("terms_agreed");
      if (!agreed) router.replace("/terms");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "카카오 로그인에 실패했습니다.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-4xl animate-bounce">📖</div>
      </div>
    );
  }

  return (
    <>
      {kakaoKey && kakaoKey !== "YOUR_KAKAO_JS_KEY_HERE" && (
        <Script src="https://developers.kakao.com/sdk/js/kakao.js" strategy="afterInteractive" />
      )}

      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
        <header className="bg-white border-b border-amber-200 shadow-sm">
          <div className="max-w-sm mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-amber-600 font-bold text-sm">← 홈</Link>
            <div className="flex items-center gap-2 mx-auto">
              <span className="text-2xl">📖</span>
              <h1 className="text-base font-black text-amber-700">한자 하루 한자</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">

            {/* 탭 */}
            <div className="flex bg-white rounded-2xl border border-gray-100 shadow-sm p-1 mb-6">
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${
                    tab === t ? "bg-amber-500 text-white shadow-sm" : "text-gray-400"
                  }`}
                >
                  {t === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            {/* 소셜 로그인 */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-98 disabled:opacity-60"
              >
                <GoogleIcon />
                Google로 {tab === "login" ? "로그인" : "가입"}
              </button>

              <button
                onClick={handleKakao}
                disabled={busy || !kakaoReady}
                className="w-full flex items-center justify-center gap-3 bg-yellow-300 border border-yellow-400 rounded-2xl px-4 py-3.5 font-bold text-gray-800 hover:bg-yellow-400 shadow-sm transition-all active:scale-98 disabled:opacity-60"
              >
                <KakaoIcon />
                {kakaoReady ? `카카오로 ${tab === "login" ? "로그인" : "가입"}` : "카카오 로딩 중..."}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">또는 이메일로</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* 이메일 폼 */}
            <form onSubmit={handleEmail} className="flex flex-col gap-3">
              {tab === "signup" && (
                <input
                  type="text"
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-amber-400 bg-white"
                />
              )}
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-amber-400 bg-white"
              />
              <input
                type="password"
                placeholder="비밀번호 (6자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-amber-400 bg-white"
              />

              {error && (
                <p className="text-red-500 text-xs font-bold text-center bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl shadow-md transition-all active:scale-98 disabled:opacity-60 text-base mt-1"
              >
                {busy ? "처리 중..." : tab === "login" ? "로그인" : "회원가입"}
              </button>
            </form>

            {tab === "signup" && (
              <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
                회원가입 시{" "}
                <Link href="/terms" className="text-amber-600 underline underline-offset-2">이용약관</Link>
                {" "}및{" "}
                <Link href="/terms" className="text-amber-600 underline underline-offset-2">개인정보처리방침</Link>
                에 동의하게 됩니다.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.6 2.3 30.1 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.7-.2-3.3-.4-4.9H24v9.3h12.5c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4c4.1-3.8 6.5-9.4 6.5-16.1-.1-.2-.1-.3-.4-.5z"/>
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5l-7.9-6.1C1 16.3 0 20 0 24s1 7.7 2.7 10.6l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15.1-5.5l-7-5.4c-2 1.3-4.5 2.1-8.1 2.1-6.2 0-11.5-4.2-13.4-9.8l-7.9 6.1C6.7 42.6 14.7 48 24 48z"/>
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#3C1E1E" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.5 6.8l-.9 3.4 4-2.5c.8.1 1.6.2 2.4.2 5.5 0 10-3.6 10-8S17.5 3 12 3z"/>
    </svg>
  );
}
