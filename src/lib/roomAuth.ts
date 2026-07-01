// Per-room secrets stored locally on the device. The host_secret is issued by
// the server on room creation and never re-transmitted, so other clients can
// never read it. Player id is remembered so we don't need to expose the
// device's client_id via public SELECT on the players table.

const HS = (roomId: string) => `imposter_host_secret_${roomId}`;
const PID = (roomId: string) => `imposter_player_id_${roomId}`;

export function setHostSecret(roomId: string, secret: string) {
  localStorage.setItem(HS(roomId), secret);
}
export function getHostSecret(roomId: string): string | null {
  return localStorage.getItem(HS(roomId));
}
export function clearHostSecret(roomId: string) {
  localStorage.removeItem(HS(roomId));
}

export function setPlayerId(roomId: string, id: string) {
  localStorage.setItem(PID(roomId), id);
}
export function getPlayerId(roomId: string): string | null {
  return localStorage.getItem(PID(roomId));
}
export function clearPlayerId(roomId: string) {
  localStorage.removeItem(PID(roomId));
}
