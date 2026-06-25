import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export interface HanjaMeta {
  char: string;
  sound: string;
  meaning: string;
  level: string;
}

/**
 * GET /api/content/[level]/list
 * 해당 급수 전체 한자 메타데이터 목록 반환
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { level: string } }
) {
  const level = decodeURIComponent(params.level);
  const contentDir = path.join(process.cwd(), "public", "content");

  let files: string[];
  try {
    files = fs
      .readdirSync(contentDir)
      .filter((f) => f.endsWith(`_${level}.json`))
      .sort();
  } catch {
    return NextResponse.json({ error: "콘텐츠 디렉토리를 읽을 수 없어요." }, { status: 500 });
  }

  const result: HanjaMeta[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(contentDir, file), "utf-8");
      const data = JSON.parse(raw);
      const m = data.daily_metadata;
      result.push({
        char: m.hanja_char,
        sound: m.hanja_sound,
        meaning: m.hanja_meaning,
        level: m.hanja_level,
      });
    } catch {
      // 파싱 실패 시 파일명에서 추출
      const parts = file.replace(".json", "").split("_");
      if (parts.length >= 2) {
        result.push({ char: parts[1], sound: parts[0], meaning: "", level });
      }
    }
  }

  return NextResponse.json(result);
}
