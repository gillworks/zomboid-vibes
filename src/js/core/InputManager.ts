import { Player } from "../entities/Player";
import * as THREE from "three";

export class InputManager {
  private player: Player;
  private keys: { [key: string]: boolean } = {};

  constructor(player: Player) {
    this.player = player;

    // Set up keyboard event listeners
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));

    // Set up UI event listeners
    this.setupUIListeners();
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;

    // Handle player movement
    this.handlePlayerMovement();

    // Handle inventory
    if (event.key.toLowerCase() === "i") {
      this.toggleInventory();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;

    // Stop player movement if no movement keys are pressed
    if (!this.isAnyMovementKeyPressed()) {
      this.player.stopMoving();
    } else {
      // Handle player movement for remaining pressed keys
      this.handlePlayerMovement();
    }
  }

  private handlePlayerMovement(): void {
    // Reset player movement first
    this.player.stopMoving();

    // Create a movement vector for diagonal movement
    const moveVector = new THREE.Vector3(0, 0, 0);

    // Add movement components based on pressed keys
    if (this.keys["w"]) {
      moveVector.z -= 1; // Forward/Up
    }
    if (this.keys["s"]) {
      moveVector.z += 1; // Backward/Down
    }
    if (this.keys["a"]) {
      moveVector.x -= 1; // Left
    }
    if (this.keys["d"]) {
      moveVector.x += 1; // Right
    }

    // If we have movement, normalize and apply it
    if (moveVector.length() > 0) {
      moveVector.normalize();

      // Set custom movement direction
      this.player.setMoveDirection(moveVector);

      // Start moving
      this.player.startMoving();
    }
  }

  private isAnyMovementKeyPressed(): boolean {
    return this.keys["w"] || this.keys["a"] || this.keys["s"] || this.keys["d"];
  }

  private toggleInventory(): void {
    const inventoryPanel = document.getElementById("inventory-panel");
    if (inventoryPanel) {
      inventoryPanel.classList.toggle("hidden");

      // Populate inventory if it's being shown
      if (!inventoryPanel.classList.contains("hidden")) {
        this.populateInventory();
      }
    }
  }

  private populateInventory(): void {
    const inventorySlots = document.getElementById("inventory-slots");
    if (!inventorySlots) return;

    // Clear existing slots
    inventorySlots.innerHTML = "";

    // Get player inventory
    const inventory = this.player.getInventory();

    // Create slots
    inventory.forEach((item, index) => {
      const slot = document.createElement("div");
      slot.className = "inventory-slot";

      if (item) {
        slot.textContent = item.name;

        // Highlight equipped item
        if (item === this.player.getEquippedItem()) {
          slot.classList.add("selected");
        }

        // Add click event to use/equip item
        slot.addEventListener("click", () => {
          this.useItem(index);
        });
      }

      inventorySlots.appendChild(slot);
    });
  }

  private useItem(index: number): void {
    const inventory = this.player.getInventory();
    const item = inventory[index];

    if (!item) return;

    // Handle different item types
    switch (item.type) {
      case "weapon":
        this.player.equipItem(index);
        break;
      case "food":
        this.player.eat(item.value);
        this.player.removeFromInventory(index);
        break;
      case "medkit":
        this.player.heal(item.value);
        this.player.removeFromInventory(index);
        break;
    }

    // Update inventory display
    this.populateInventory();
  }

  private setupUIListeners(): void {
    // Inventory button
    const inventoryButton = document.getElementById("inventory-button");
    if (inventoryButton) {
      inventoryButton.addEventListener(
        "click",
        this.toggleInventory.bind(this)
      );
    }

    // Close inventory button
    const closeInventoryButton = document.getElementById("close-inventory");
    if (closeInventoryButton) {
      closeInventoryButton.addEventListener("click", () => {
        const inventoryPanel = document.getElementById("inventory-panel");
        if (inventoryPanel) {
          inventoryPanel.classList.add("hidden");
        }
      });
    }

    // Restart button
    const restartButton = document.getElementById("restart-button");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        const gameOverScreen = document.getElementById("game-over");
        if (gameOverScreen) {
          gameOverScreen.classList.add("hidden");
        }
      });
    }
  }
}
