import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

interface LevelMapEntry {
  char: string;
  sound: string;
  meaning: string;
  급수: string;
}

/**
 * GET /api/lv/[lv]?char=學
 * Lv.X + char로 실제 JSON 콘텐츠 반환
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { lv: string } }
) {
  const lv       = decodeURIComponent(params.lv);
  const charParam = req.nextUrl.searchParams.get("char");

  const mapPath = path.join(process.cwd(), "public", "level-map.json");
  let levelMap: Record<string, LevelMapEntry[]>;
  try {
    levelMap = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  } catch {
    return NextResponse.json({ error: "레벨 맵을 읽을 수 없어요." }, { status: 500 });
  }

  const entries = levelMap[lv];
  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: `${lv}에 해당하는 콘텐츠가 없어요.` }, { status: 404 });
  }

  let entry: LevelMapEntry | undefined;

  if (charParam) {
    entry = entries.find((e) => e.char === charParam);
    if (!entry) {
      return NextResponse.json({ error: `'${charParam}' 한자를 ${lv}에서 찾을 수 없어요.` }, { status: 404 });
    }
  } else {
    // 날짜 기반 순환
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    entry = entries[dayOfYear % entries.length];
  }

  // 실제 파일 찾기: {sound}_{char}_{급수}.json
  const contentDir = path.join(process.cwd(), "public", "content");
  const fileName   = `${entry.sound}_${entry.char}_${entry.급수}.json`;
  const filePath   = path.join(contentDir, fileName);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    // 응답에 lv 정보도 함께
    return NextResponse.json({ ...data, _lv: lv });
  } catch {
    return NextResponse.json({ error: `콘텐츠 파일을 읽을 수 없어요: ${fileName}` }, { status: 500 });
  }
}
