"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TERMS = {
  service: `한자 하루 한자 이용약관

제1조 (목적)
본 약관은 한자 하루 한자(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스 이용)
1. 서비스를 이용하려면 본 약관에 동의하고 회원으로 가입해야 합니다.
2. 만 14세 미만 아동은 법정대리인의 동의 없이 서비스에 가입할 수 없습니다.
3. 부정한 방법으로 타인의 계정을 이용하거나 서비스를 악용하는 행위를 금지합니다.

제3조 (유료 서비스)
1. 서비스 내 일부 기능은 유료로 제공될 수 있습니다.
2. 결제는 앱스토어 또는 서비스 내 결제 수단을 통해 이루어집니다.
3. 환불은 관계 법령 및 환불 정책에 따라 처리됩니다.

제4조 (지식재산권)
서비스 내의 콘텐츠(한자 데이터, UI/UX 등)에 대한 지식재산권은 운영자에게 있으며 무단 복제·배포·수정을 금합니다.

제5조 (서비스 중단)
기술적 문제, 유지보수, 정부 명령 등 불가피한 사유로 서비스가 중단될 수 있으며, 이 경우 사전 공지합니다.

제6조 (책임의 한계)
서비스 이용으로 발생한 손해에 대해 운영자의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.

제7조 (약관 변경)
약관 변경 시 서비스 내 공지사항을 통해 7일 전에 안내하며, 변경 후에도 계속 이용하면 동의한 것으로 봅니다.

시행일: 2026년 1월 1일`,

  privacy: `개인정보 처리방침

1. 수집하는 개인정보
- 필수: 이름(닉네임), 이메일 주소, 소셜 로그인 고유 식별자
- 자동 수집: 학습 기록, 접속 일시, 기기 정보

2. 개인정보 이용 목적
- 회원 식별 및 인증
- 학습 데이터 저장·동기화
- 서비스 개선 및 오류 분석
- 법령상 의무 이행

3. 보유 및 이용 기간
회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보존 후 파기합니다.

4. 제3자 제공
원칙적으로 제3자에게 제공하지 않습니다. 단, 법령에 따른 요청 시 예외로 합니다.

5. 위탁 처리
Firebase(Google LLC): 인증·데이터 저장 (미국 소재, 개인정보 국외 이전)

6. 이용자 권리
개인정보 조회·수정·삭제를 요청할 수 있으며, 요청은 서비스 내 '계정 삭제' 기능 또는 이메일로 접수합니다.

7. 개인정보 보호책임자
이메일: jesson8302@gmail.com

시행일: 2026년 1월 1일`,

  marketing: `마케팅 정보 수신 동의 (선택)

1. 목적: 이벤트, 신규 콘텐츠, 학습 팁, 광고성 정보 전달
2. 항목: 이메일, 푸시 알림
3. 보유 기간: 동의 철회 시까지
4. 거부 권리: 동의하지 않아도 서비스 이용에 불이익이 없습니다.
5. 철회 방법: 마이페이지 > 알림 설정에서 언제든지 철회할 수 있습니다.`,
};

interface TermsAgreePageProps {
  onDone?: (marketing: boolean) => void;
}

export default function TermsPage({ onDone }: TermsAgreePageProps) {
  const router = useRouter();
  const [service,   setService]   = useState(false);
  const [privacy,   setPrivacy]   = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const allRequired = service && privacy;

  function handleAll(v: boolean) {
    setService(v);
    setPrivacy(v);
    setMarketing(v);
  }

  function handleSubmit() {
    if (!allRequired) return;
    if (typeof onDone === "function") {
      onDone(marketing);
      return;
    }
    localStorage.setItem("terms_agreed", JSON.stringify({ service: true, privacy: true, marketing, date: new Date().toISOString() }));
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/login" className="text-amber-600 font-bold text-sm">← 뒤로</Link>
          <h1 className="text-lg font-black text-amber-700 mx-auto">서비스 이용 약관</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {/* 전체 동의 */}
        <div className="bg-amber-500 rounded-2xl p-4 flex items-center gap-3 cursor-pointer" onClick={() => handleAll(!allRequired)}>
          <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 transition-all ${service && privacy && marketing ? "bg-white" : "bg-transparent"}`}>
            {service && privacy && marketing && <span className="text-amber-500 text-xs font-black">✓</span>}
          </div>
          <div className="text-white">
            <p className="font-black text-base">전체 동의하기</p>
            <p className="text-amber-100 text-xs">필수 및 선택 항목 모두 동의</p>
          </div>
        </div>

        {/* 이용약관 */}
        <TermsRow
          required
          checked={service}
          label="이용약관 동의"
          onCheck={() => setService(!service)}
          expanded={expanded === "service"}
          onExpand={() => setExpanded(expanded === "service" ? null : "service")}
          content={TERMS.service}
        />

        {/* 개인정보처리방침 */}
        <TermsRow
          required
          checked={privacy}
          label="개인정보 처리방침 동의"
          onCheck={() => setPrivacy(!privacy)}
          expanded={expanded === "privacy"}
          onExpand={() => setExpanded(expanded === "privacy" ? null : "privacy")}
          content={TERMS.privacy}
        />

        {/* 마케팅 선택동의 */}
        <TermsRow
          required={false}
          checked={marketing}
          label="마케팅 정보 수신 동의"
          onCheck={() => setMarketing(!marketing)}
          expanded={expanded === "marketing"}
          onExpand={() => setExpanded(expanded === "marketing" ? null : "marketing")}
          content={TERMS.marketing}
        />

        <p className="text-center text-xs text-gray-400 px-4">
          마케팅 동의는 선택 사항으로, 동의하지 않아도 모든 학습 기능을 이용할 수 있습니다.
        </p>
      </main>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 max-w-lg mx-auto w-full">
        <button
          onClick={handleSubmit}
          disabled={!allRequired}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
            allRequired
              ? "bg-amber-500 text-white shadow-md hover:bg-amber-600 active:scale-98"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          동의하고 시작하기
        </button>
        {!allRequired && (
          <p className="text-center text-xs text-red-400 mt-2">필수 항목에 모두 동의해주세요</p>
        )}
      </div>
    </div>
  );
}

interface TermsRowProps {
  required: boolean;
  checked: boolean;
  label: string;
  onCheck: () => void;
  expanded: boolean;
  onExpand: () => void;
  content: string;
}

function TermsRow({ required, checked, label, onCheck, expanded, onExpand, content }: TermsRowProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onCheck}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            checked ? "bg-amber-500 border-amber-500" : "border-gray-300"
          }`}
        >
          {checked && <span className="text-white text-[10px] font-black">✓</span>}
        </button>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">
            {label}
            <span className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${required ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"}`}>
              {required ? "필수" : "선택"}
            </span>
          </p>
        </div>
        <button
          onClick={onExpand}
          className="text-xs text-gray-400 hover:text-amber-500 font-bold transition-colors"
        >
          {expanded ? "닫기 ↑" : "보기 ↓"}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
          <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto bg-gray-50 rounded-xl p-3 mt-2">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
