// Client-side gate only for hiding UI. The server (server.js) enforces access.
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL || 'iberaza1@gmail.com').toLowerCase();

export function isOwner(email?: string | null): boolean {
  return !!email && email.toLowerCase() === OWNER_EMAIL;
}
