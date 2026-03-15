import { publish } from "@/lib/realtime/event-bus";

export async function POST(request: Request) {
  const body = await request.json();
  const { spaceId, browserId, cursorX, cursorY, color } = body;

  if (!spaceId || !browserId) {
    return new Response(null, { status: 400 });
  }

  switch (body.type) {
    case "leave":
      publish(spaceId, "cursor-leave", { browserId });
      break;
    case "node-select":
      publish(spaceId, "node-select", { browserId, nodeId: body.nodeId, color: body.color });
      break;
    case "node-deselect":
      publish(spaceId, "node-deselect", { browserId });
      break;
    case "node-drag":
      publish(spaceId, "node-drag", { browserId, nodeId: body.nodeId, x: body.x, y: body.y });
      break;
    default:
      publish(spaceId, "cursor-move", { browserId, cursorX, cursorY, color });
  }

  return new Response(null, { status: 204 });
}
