import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/**
 * GET /api/content/[level]?char=軍
 * char 파라미터가 있으면 해당 한자 반환, 없으면 오늘 날짜 기반 순환
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { level: string } }
) {
  const level = decodeURIComponent(params.level);
  const charParam = req.nextUrl.searchParams.get("char");
  const contentDir = path.join(process.cwd(), "public", "content");

  let files: string[];
  try {
    files = fs.readdirSync(contentDir).filter((f) => f.endsWith(`_${level}.json`));
  } catch {
    return NextResponse.json({ error: "콘텐츠 디렉토리를 읽을 수 없어요." }, { status: 500 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: `${level} 콘텐츠가 아직 준비 중이에요!` }, { status: 404 });
  }

  let fileName: string | undefined;

  if (charParam) {
    // 특정 한자 지정
    fileName = files.find((f) => {
      const parts = f.replace(".json", "").split("_");
      return parts[1] === charParam;
    });
    if (!fileName) {
      return NextResponse.json({ error: `'${charParam}' 한자 콘텐츠를 찾을 수 없어요.` }, { status: 404 });
    }
  } else {
    // 날짜 기반 순환 (하위 호환)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    fileName = files[dayOfYear % files.length];
  }

  try {
    const raw = fs.readFileSync(path.join(contentDir, fileName), "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "콘텐츠 파일을 읽을 수 없어요." }, { status: 500 });
  }
}
