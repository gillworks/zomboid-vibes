import { Player } from "../entities/Player";

export class UIManager {
  private player: Player;

  private healthBar: HTMLElement | null;
  private hungerBar: HTMLElement | null;

  constructor(player: Player) {
    this.player = player;

    // Get UI elements
    this.healthBar = document.getElementById("health-bar");
    this.hungerBar = document.getElementById("hunger-bar");
  }

  public update(): void {
    this.updateHealthBar();
    this.updateHungerBar();
  }

  private updateHealthBar(): void {
    if (this.healthBar) {
      const health = this.player.getHealth();
      this.healthBar.style.width = `${health}%`;

      // Change color based on health level
      if (health < 25) {
        this.healthBar.style.backgroundColor = "#ff0000"; // Red
      } else if (health < 50) {
        this.healthBar.style.backgroundColor = "#ff8800"; // Orange
      } else {
        this.healthBar.style.backgroundColor = "#8b0000"; // Dark red
      }
    }
  }

  private updateHungerBar(): void {
    if (this.hungerBar) {
      const hunger = this.player.getHunger();
      this.hungerBar.style.width = `${hunger}%`;

      // Change color based on hunger level
      if (hunger < 25) {
        this.hungerBar.style.backgroundColor = "#ff0000"; // Red
      } else if (hunger < 50) {
        this.hungerBar.style.backgroundColor = "#ff8800"; // Orange
      } else {
        this.hungerBar.style.backgroundColor = "#8b8000"; // Dark yellow
      }
    }
  }

  public showMessage(message: string, duration: number = 3000): void {
    // Create a message element
    const messageElement = document.createElement("div");
    messageElement.className = "game-message";
    messageElement.textContent = message;

    // Add to the UI container
    const uiContainer = document.getElementById("ui-container");
    if (uiContainer) {
      uiContainer.appendChild(messageElement);

      // Remove after duration
      setTimeout(() => {
        if (messageElement.parentNode === uiContainer) {
          uiContainer.removeChild(messageElement);
        }
      }, duration);
    }
  }

  public showItemPickup(itemName: string): void {
    this.showMessage(`Picked up: ${itemName}`);
  }

  public showDamage(amount: number): void {
    this.showMessage(`Took ${amount} damage!`, 1500);
  }

  public reset(): void {
    this.update();
  }
}
