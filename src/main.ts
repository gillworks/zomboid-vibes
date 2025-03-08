import { Game } from "./js/core/Game";

// Initialize the game when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
  game.init();
});
