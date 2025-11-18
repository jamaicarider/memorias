import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };
    const expected = process.env.MEMORIA_PASSWORD ?? "lucasnatalia";

    if (!expected) {
      return NextResponse.json({ ok: false, error: "Server password not set" }, { status: 500 });
    }

    if (password === expected) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ ok: false, error: "Senha incorreta" }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
