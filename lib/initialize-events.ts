import { sseManager } from "./sse-manager";
import { initializeEventHandlers } from "./event-handlers";

let initialized = false;

export function ensureEventHandlersInitialized(): void {
  if (initialized) return;
  initialized = true;

  sseManager.registerEventListeners();
  initializeEventHandlers();
}
