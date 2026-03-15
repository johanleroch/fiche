import { publish } from "@/lib/realtime/event-bus";

export async function POST(request: Request) {
  const body = await request.json();
  const { spaceId, browserId, cursorX, cursorY, color } = body;

  if (!spaceId || !browserId) {
    return new Response(null, { status: 400 });
  }

  if (body.type === "leave") {
    publish(spaceId, "cursor-leave", { browserId });
  } else {
    publish(spaceId, "cursor-move", { browserId, cursorX, cursorY, color });
  }

  return new Response(null, { status: 204 });
}
