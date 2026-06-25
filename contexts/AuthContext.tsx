"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithKakao: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUpWithEmail(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  }

  async function signInWithKakao() {
    return new Promise<void>((resolve, reject) => {
      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!kakaoKey || kakaoKey === "YOUR_KAKAO_JS_KEY_HERE") {
        reject(new Error("카카오 키가 설정되지 않았습니다."));
        return;
      }
      const win = window as Window & { Kakao?: {
        init: (key: string) => void;
        isInitialized: () => boolean;
        Auth: {
          login: (opts: {
            success: (authObj: { access_token: string }) => void;
            fail: (err: unknown) => void;
          }) => void;
        };
        API: {
          request: (opts: {
            url: string;
            success: (res: { id: number; kakao_account?: { email?: string }; properties?: { nickname?: string } }) => void;
            fail: (err: unknown) => void;
          }) => void;
        };
      } };
      if (!win.Kakao) {
        reject(new Error("카카오 SDK가 로드되지 않았습니다."));
        return;
      }
      if (!win.Kakao.isInitialized()) win.Kakao.init(kakaoKey);
      win.Kakao.Auth.login({
        success: () => {
          win.Kakao!.API.request({
            url: "/v2/user/me",
            success: async (res) => {
              const email    = res.kakao_account?.email ?? `kakao_${res.id}@kakao.local`;
              const name     = res.properties?.nickname ?? "카카오 사용자";
              const password = `kakao_${res.id}_hanja2024`;
              try {
                await signInWithEmailAndPassword(auth, email, password);
              } catch {
                try {
                  const cred = await createUserWithEmailAndPassword(auth, email, password);
                  await updateProfile(cred.user, { displayName: name });
                } catch (e) {
                  reject(e); return;
                }
              }
              resolve();
            },
            fail: reject,
          });
        },
        fail: reject,
      });
    });
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithKakao, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
