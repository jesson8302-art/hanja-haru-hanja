"""
한자 하루 한자 — 전체 콘텐츠 일괄 생성 스크립트
=============================================
사용법:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."
  python scripts/generate_all_content.py --level 8급
  python scripts/generate_all_content.py --level all
  python scripts/generate_all_content.py --level 4급 --hanja 思

옵션:
  --level     생성할 급수 (8급 / 7급 / 6급 / 5급 / 4급 / 3급 / all)
  --hanja     특정 한자 1개만 생성 (선택, 예: 思)
  --overwrite 이미 존재하는 파일도 덮어씌우기 (기본: 건너뜀)
  --delay     API 호출 간격(초), 기본 1.5
"""

import anthropic
import json
import os
import time
import argparse
from pathlib import Path

# ── 경로 설정 ──────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
MASTER_LIST = DATA_DIR / "hanja_master_list.json"
# 생성된 콘텐츠는 Next.js가 읽을 수 있는 public/content/ 폴더에 저장
CONTENT_DIR = ROOT / "public" / "content"
CONTENT_DIR.mkdir(parents=True, exist_ok=True)

# ── 급수별 교육 스타일 가이드 ────────────────────────────────
LEVEL_STYLE = {
    "8급": "초등 1~2학년 수준. 매우 쉬운 어휘, 5~8단어 단문, 동물·가족·색깔 비유. 지문 3문장.",
    "7급": "초등 2~3학년 수준. 일상 소재, 8~12단어 단문, 학교·자연 소재. 지문 3~4문장.",
    "6급": "초등 3~4학년 수준. 구체적 비유, 10~15단어 단문, 교과 기초 어휘 연계. 지문 4~5문장.",
    "5급": "초등 4~5학년 수준. 논리적 인과관계, 12~18단어 복문, 접속어 활용. 지문 5문장.",
    "4급": "초등 5~6학년/중1 수준. 논리적 추론 유도, 15~20단어 복문, 비교·대조 구조. 지문 5문장.",
    "3급": "중학교 수준. 학술·설명 어조, 20단어 이상 복합 문장, 논증적 텍스트 구조. 지문 5~6문장.",
}

SYSTEM_PROMPT = """당신은 대한민국 초·중등 교육과정 문해력 전문가입니다.
한자 쓰기(자형·획순)를 완전히 배제하고, 오직 소리(음)와 뜻(훈)의 직관적 결합으로
아이들의 국어 문해력·유추력·표현력을 키우는 일일 한자 학습 콘텐츠를 생성합니다.

핵심 원칙:
1. 훈(뜻)은 시험 출제 기준 그대로 표기 (예: 생각할, 배울, 큰, 작을)
2. 선(先) 한자어 → 후(後) 한자 순서 (귀에 익은 단어 먼저)
3. 교과서 100% 연계 어휘
4. 단어 4개의 속뜻 분해 풀이 (음+뜻 공식으로)
5. 지문 안 핵심 단어는 **단어** 형태로 마크다운 볼드

출력: 오직 JSON 객체 하나만. 주석·설명·코드블록 없이."""

CONTENT_SCHEMA = """{
  "daily_metadata": {
    "hanja_sound": "음(소리)",
    "hanja_meaning": "훈(뜻) — 관형사형/명사형으로, 예: 생각할",
    "hanja_char": "한자 글자",
    "hanja_level": "급수 (예: 4급)",
    "linked_subject": "연계 교과"
  },
  "step_1_etymology": {
    "visual_title": "호기심 유도 제목",
    "etymology_story": "3문장 이내 어원 이야기 (쓰기 언급 없이)"
  },
  "step_2_words": [
    {
      "word_korean": "단어 표기 (예: 사고(思考))",
      "etymology_dissection": "음+뜻 분해 (예: 생각할 사 + 생각할 고 = 깊이 따져보는 것)",
      "easy_definition": "쉬운 뜻풀이",
      "context_sentence": "실용 예문"
    }
  ],
  "step_3_reading_comprehension": {
    "passage_title": "지문 제목",
    "passage_text": "핵심 단어 3개 이상 볼드 처리된 지문",
    "quiz": {
      "question": "4지선다 문항",
      "choices": ["보기1", "보기2", "보기3", "보기4"],
      "correct_answer_index": 0,
      "detailed_explanation": "친절한 해설"
    }
  },
  "step_4_writing_challenge": {
    "mission_guideline": "작문 미션 안내",
    "model_example": "모범 예문"
  },
  "step_5_vocal_review": {
    "cheer_message": "낭독 10회 유도 격려 문구"
  }
}"""


def build_user_prompt(hanja: str, sound: str, meaning: str, full_reading: str, level: str) -> str:
    style = LEVEL_STYLE.get(level, LEVEL_STYLE["4급"])
    return f"""다음 정보로 콘텐츠를 생성해 주세요.

한자: {hanja}
음: {sound}
훈(뜻): {meaning}
훈음 표기: {full_reading}
급수: {level}
문체/난이도 기준: {style}

최근 학습 단어: 없음 (첫 생성)

출력 JSON 스키마:
{CONTENT_SCHEMA}

중요:
- daily_metadata.hanja_meaning 은 반드시 "{meaning}" 으로 설정
- daily_metadata.hanja_char 은 반드시 "{hanja}" 으로 설정
- step_2_words 는 정확히 4개
- JSON만 출력 (```json 블록 없이)"""


def content_file_path(hanja: str, sound: str, level: str) -> Path:
    # 파일명: {음}_{한자}_{급수}.json (예: 사_思_4급.json)
    filename = f"{sound}_{hanja}_{level}.json"
    return CONTENT_DIR / filename


def generate_one(client: anthropic.Anthropic, item: dict, level: str, overwrite: bool) -> bool:
    hanja = item["hanja"]
    sound = item["sound"]
    meaning = item["meaning"]
    full_reading = item["full_reading"]

    out_path = content_file_path(hanja, sound, level)
    if out_path.exists() and not overwrite:
        print(f"  ⏭  건너뜀: {full_reading} ({out_path.name} 이미 존재)")
        return True

    print(f"  ⏳ 생성 중: {full_reading} ({level}) ...", end="", flush=True)
    try:
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_user_prompt(hanja, sound, meaning, full_reading, level)}],
        )
        raw = response.content[0].text.strip()

        # 혹시 코드블록으로 감쌌을 경우 제거
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)

        # 검증: 필수 키 확인
        required = ["daily_metadata", "step_1_etymology", "step_2_words",
                    "step_3_reading_comprehension", "step_4_writing_challenge", "step_5_vocal_review"]
        for key in required:
            if key not in parsed:
                raise ValueError(f"응답에 '{key}' 누락")
        if len(parsed["step_2_words"]) != 4:
            raise ValueError(f"step_2_words가 {len(parsed['step_2_words'])}개 (4개 필요)")

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(parsed, f, ensure_ascii=False, indent=2)

        print(f" ✅ 저장: {out_path.name}")
        return True

    except json.JSONDecodeError as e:
        print(f" ❌ JSON 파싱 오류: {e}")
    except Exception as e:
        print(f" ❌ 오류: {e}")
    return False


def main():
    parser = argparse.ArgumentParser(description="한자 하루 한자 — 전체 콘텐츠 일괄 생성")
    parser.add_argument("--level", default="all", help="생성할 급수 (8급/7급/6급/5급/4급/3급/all)")
    parser.add_argument("--hanja", default=None, help="특정 한자 1개만 생성 (예: 思)")
    parser.add_argument("--overwrite", action="store_true", help="기존 파일 덮어쓰기")
    parser.add_argument("--delay", type=float, default=1.5, help="API 호출 간격(초)")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았어요.")
        print("   export ANTHROPIC_API_KEY='sk-ant-...' 후 다시 실행하세요.")
        return

    client = anthropic.Anthropic(api_key=api_key)

    with open(MASTER_LIST, "r", encoding="utf-8") as f:
        master = json.load(f)

    # 급수 목록 결정
    all_levels = ["8급", "7급", "6급", "5급", "4급", "3급"]
    target_levels = all_levels if args.level == "all" else [args.level]

    total = success = fail = skip = 0

    for level in target_levels:
        items = master.get(level, [])
        if not items:
            print(f"\n⚠️  {level} 리스트 없음 — data/hanja_master_list.json 확인 필요")
            continue

        # 특정 한자 필터
        if args.hanja:
            items = [i for i in items if i["hanja"] == args.hanja]
            if not items:
                print(f"⚠️  {level}에서 '{args.hanja}' 를 찾을 수 없어요.")
                continue

        print(f"\n{'='*50}")
        print(f"📚 {level} — {len(items)}자 처리 시작")
        print(f"{'='*50}")

        for item in items:
            total += 1
            ok = generate_one(client, item, level, args.overwrite)
            if ok:
                # 기존 파일이 있어서 건너뛴 경우는 success로 카운트
                success += 1
            else:
                fail += 1
            time.sleep(args.delay)

    print(f"\n{'='*50}")
    print(f"✅ 완료! 전체 {total}자 | 성공 {success} | 실패 {fail}")
    print(f"📂 저장 위치: {CONTENT_DIR}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
