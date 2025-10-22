import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;

  if (secret) {
    // 校验调用方密钥，避免被恶意触发
    const provided = request.headers.get("x-revalidate-secret");
    if (provided !== secret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await readBody(request);

  if (!payload.slug && !payload.tag) {
    return NextResponse.json(
      { message: "Missing slug or tag" },
      { status: 400 }
    );
  }

  const tag = payload.tag ?? `page:${payload.slug}`;
  revalidateTag(tag);

  return NextResponse.json({ revalidated: true, tag });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

