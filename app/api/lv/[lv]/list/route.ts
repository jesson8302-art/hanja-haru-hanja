import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export interface HanjaMeta {
  char: string;
  sound: string;
  meaning: string;
  level: string; // Lv.X
}

interface LevelMapEntry {
  char: string;
  sound: string;
  meaning: string;
  급수: string;
}

/**
 * GET /api/lv/[lv]/list
 * Lv.1~20 해당 레벨의 한자 메타데이터 목록 반환
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { lv: string } }
) {
  const lv = decodeURIComponent(params.lv); // e.g. "Lv.1"

  const mapPath = path.join(process.cwd(), "public", "level-map.json");
  let levelMap: Record<string, LevelMapEntry[]>;
  try {
    levelMap = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  } catch {
    return NextResponse.json({ error: "레벨 맵을 읽을 수 없어요." }, { status: 500 });
  }

  const entries = levelMap[lv];
  if (!entries) {
    return NextResponse.json({ error: `${lv}에 해당하는 콘텐츠가 없어요.` }, { status: 404 });
  }

  const result: HanjaMeta[] = entries.map((e) => ({
    char: e.char,
    sound: e.sound,
    meaning: e.meaning,
    level: lv,
  }));

  return NextResponse.json(result);
}
