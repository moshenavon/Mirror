export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
