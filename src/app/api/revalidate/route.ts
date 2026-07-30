import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-revalidate-secret");

  if (
    !process.env.SANITY_REVALIDATE_SECRET ||
    secret !== process.env.SANITY_REVALIDATE_SECRET
  ) {
    return NextResponse.json(
      { revalidated: false, message: "Invalid secret" },
      { status: 401 },
    );
  }

  revalidatePath("/", "page");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
