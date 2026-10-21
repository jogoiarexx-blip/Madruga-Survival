// Política de quadros para menus/pausa; independente de DOM, fácil de reproduzir.
export const IDLE_RENDER_INTERVAL_MS=250;
export function shouldRenderFrame({running,now,lastIdleRenderAt,intervalMs=IDLE_RENDER_INTERVAL_MS}) {
  return running || (Number.isFinite(now) && now-lastIdleRenderAt>=intervalMs);
}
