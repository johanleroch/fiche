// BroadcastChannel wrapper for same-device tab sync (zero network cost)

export type BoardMessage =
  | { type: "board-update"; nodes: unknown[]; edges: unknown[] }
  | { type: "cursor-move"; browserId: string; cursorX: number; cursorY: number; color: string }
  | { type: "cursor-leave"; browserId: string };

export function createBoardChannel(spaceId: string) {
  const bc = new BroadcastChannel(`fiche-sync-${spaceId}`);

  return {
    post(msg: BoardMessage) {
      bc.postMessage(msg);
    },
    onMessage(handler: (msg: BoardMessage) => void) {
      bc.onmessage = (e: MessageEvent<BoardMessage>) => handler(e.data);
    },
    close() {
      bc.close();
    },
  };
}
