import confetti from "canvas-confetti";

export function fireConfetti() {
  const colors = ["#e85d3a", "#ffffff", "#f5b27a"];
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors,
  });
  setTimeout(() => {
    confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 250);
}
