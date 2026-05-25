const POOL = [
  "Agent_7", "NEURAL_X", "SYS_04", "GLITCH", "VOID_9", "PIXEL_42",
  "NOVA", "ECHO_3", "RAVEN", "CIPHER", "ZERO_K", "ORBIT_X",
  "PROXY_8", "SHADE", "ROGUE_2", "HEX_11", "MIRAGE", "VECTOR",
  "PHANTOM", "NULL_PTR", "DAEMON", "PULSE_5",
];

export function pickAINames(n: number): string[] {
  return [...POOL].sort(() => Math.random() - 0.5).slice(0, n);
}
