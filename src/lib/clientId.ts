const KEY = "imposter_client_id";

export function getClientId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const NAME_KEY = "imposter_player_name";
export function getStoredName(): string {
  return localStorage.getItem(NAME_KEY) || "";
}
export function setStoredName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}
