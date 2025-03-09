import { Player } from "../entities/Player";
import { LightingSystem } from "../core/LightingSystem";
import { ZombieManager } from "../entities/ZombieManager";

export class UIManager {
  private player: Player;
  private lightingSystem: LightingSystem | null = null;
  private zombieManager: ZombieManager | null = null;

  private healthBar: HTMLElement | null;
  private hungerBar: HTMLElement | null;
  private thirstBar: HTMLElement | null;
  private timeText: HTMLElement | null;
  private timeIcon: HTMLElement | null;
  private damageVignette: HTMLElement | null;
  private ammoDisplay: HTMLElement | null;
  private zombieCount: HTMLElement | null;

  constructor(player: Player) {
    this.player = player;

    // Get UI elements
    this.healthBar = document.getElementById("health-bar");
    this.hungerBar = document.getElementById("hunger-bar");
    this.thirstBar = document.getElementById("thirst-bar");
    this.timeText = document.getElementById("time-text");
    this.timeIcon = document.querySelector(".time-icon");
    this.damageVignette = document.getElementById("damage-vignette");
    this.ammoDisplay = document.getElementById("ammo-display");
    this.zombieCount = document.getElementById("zombie-count");

    // Create ammo display if it doesn't exist
    if (!this.ammoDisplay) {
      this.createAmmoDisplay();
    }
  }

  private createAmmoDisplay(): void {
    // Create ammo display container
    this.ammoDisplay = document.createElement("div");
    this.ammoDisplay.id = "ammo-display";
    this.ammoDisplay.className = "ammo-display hidden";

    // Add to UI container
    const uiContainer = document.getElementById("ui-container");
    if (uiContainer) {
      uiContainer.appendChild(this.ammoDisplay);
    }
  }

  public setLightingSystem(lightingSystem: LightingSystem): void {
    this.lightingSystem = lightingSystem;
  }

  public setZombieManager(zombieManager: ZombieManager): void {
    this.zombieManager = zombieManager;
  }

  public update(): void {
    this.updateHealthBar();
    this.updateHungerBar();
    this.updateThirstBar();
    this.updateTimeDisplay();
    this.updateZombieCount();
  }

  private updateTimeDisplay(): void {
    if (this.timeText && this.timeIcon && this.lightingSystem) {
      const timeOfDay = this.lightingSystem.getTimeOfDay();

      // Convert time of day (0-1) to hours and minutes
      const totalMinutes = Math.floor(timeOfDay * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Format time as 12-hour clock with AM/PM
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 === 0 ? 12 : hours % 12;
      const displayMinutes = minutes.toString().padStart(2, "0");

      this.timeText.textContent = `${displayHours}:${displayMinutes} ${period}`;

      // Update the time icon to reflect day/night
      // Rotate the gradient based on time of day
      const rotation = timeOfDay * 360;
      this.timeIcon.style.background = `linear-gradient(${rotation}deg, #ffdb58 0%, #ffdb58 50%, #0a0a20 50%, #0a0a20 100%)`;

      // Add a glow effect during dawn and dusk
      if (
        (timeOfDay > 0.2 && timeOfDay < 0.3) ||
        (timeOfDay > 0.7 && timeOfDay < 0.8)
      ) {
        this.timeIcon.style.boxShadow = "0 0 10px rgba(255, 215, 0, 0.8)";
      } else {
        this.timeIcon.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.5)";
      }
    }
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

  private updateZombieCount(): void {
    if (this.zombieCount && this.zombieManager) {
      const zombies = this.zombieManager.getZombies();
      const liveZombies = zombies.filter((zombie) => !zombie.isDead()).length;
      this.zombieCount.textContent = liveZombies.toString();
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
    // Show damage message
    //this.showMessage(`Took ${amount} damage!`, 1500);

    // Show damage vignette effect
    if (this.damageVignette) {
      this.damageVignette.classList.remove("hidden");
      this.damageVignette.classList.add("active");

      // Remove the effect after a short delay
      setTimeout(() => {
        if (this.damageVignette) {
          this.damageVignette.classList.remove("active");
          setTimeout(() => {
            if (this.damageVignette) {
              this.damageVignette.classList.add("hidden");
            }
          }, 200); // Wait for fade out transition
        }
      }, 300); // Duration of the effect
    }
  }

  public updateAmmoDisplay(ammo: number): void {
    if (!this.ammoDisplay) {
      this.createAmmoDisplay();
    }

    if (this.ammoDisplay) {
      // Show the ammo display
      this.ammoDisplay.classList.remove("hidden");

      // Update the text
      this.ammoDisplay.textContent = `Ammo: ${ammo}`;

      // Change color based on ammo level
      if (ammo === 0) {
        this.ammoDisplay.style.color = "#ff0000"; // Red for no ammo
      } else if (ammo < 5) {
        this.ammoDisplay.style.color = "#ff8800"; // Orange for low ammo
      } else {
        this.ammoDisplay.style.color = "#ffffff"; // White for normal
      }
    }
  }

  public hideAmmoDisplay(): void {
    if (this.ammoDisplay) {
      this.ammoDisplay.classList.add("hidden");
    }
  }

  public reset(): void {
    this.update();
    this.hideAmmoDisplay();
  }
}
