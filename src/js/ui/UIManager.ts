import { Player } from "../entities/Player";

export class UIManager {
  private player: Player;

  private healthBar: HTMLElement | null;
  private hungerBar: HTMLElement | null;
  private thirstBar: HTMLElement | null;

  constructor(player: Player) {
    this.player = player;

    // Get UI elements
    this.healthBar = document.getElementById("health-bar");
    this.hungerBar = document.getElementById("hunger-bar");
    this.thirstBar = document.getElementById("thirst-bar");
  }

  public update(): void {
    this.updateHealthBar();
    this.updateHungerBar();
    this.updateThirstBar();
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

  private updateThirstBar(): void {
    if (this.thirstBar) {
      const thirst = this.player.getThirst();
      this.thirstBar.style.width = `${thirst}%`;

      // Change color based on thirst level
      if (thirst < 25) {
        this.thirstBar.style.backgroundColor = "#ff0000"; // Red
      } else if (thirst < 50) {
        this.thirstBar.style.backgroundColor = "#1e90ff"; // Lighter blue
      } else {
        this.thirstBar.style.backgroundColor = "#0000cd"; // Medium blue
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
