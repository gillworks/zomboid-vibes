import { Player } from "../entities/Player";
import * as THREE from "three";
import { ZombieManager } from "../entities/ZombieManager";
import { LightingSystem } from "./LightingSystem";

export class InputManager {
  private player: Player;
  private zombieManager?: ZombieManager;
  private lightingSystem?: LightingSystem;
  private keys: { [key: string]: boolean } = {};

  // Define isometric directions
  private readonly ISO_DIRECTIONS = {
    UP: new THREE.Vector3(-1, 0, -1), // North-West
    DOWN: new THREE.Vector3(1, 0, 1), // South-East
    LEFT: new THREE.Vector3(-1, 0, 1), // South-West
    RIGHT: new THREE.Vector3(1, 0, -1), // North-East
  };

  constructor(player: Player) {
    this.player = player;

    // Set up keyboard event listeners
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));

    // Set up mouse event listeners for attacks
    window.addEventListener("mousedown", this.onMouseDown.bind(this));

    // Set up UI event listeners
    this.setupUIListeners();
  }

  // Set the zombie manager reference
  public setZombieManager(zombieManager: ZombieManager): void {
    this.zombieManager = zombieManager;
  }

  public setLightingSystem(lightingSystem: LightingSystem): void {
    this.lightingSystem = lightingSystem;
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;

    // Handle time control keys only when the help panel is open
    if (this.lightingSystem) {
      const timeControlsHelp = document.getElementById("time-controls-help");
      const isHelpPanelOpen =
        timeControlsHelp && !timeControlsHelp.classList.contains("hidden");

      // Only process time control keys if the help panel is open
      if (isHelpPanelOpen) {
        switch (event.key.toLowerCase()) {
          case "t": // Speed up time
            this.lightingSystem.setDaySpeed(10); // 10x speed
            console.log("Time speed: 10x");
            this.showTimeControlFeedback("Time speed: 10x");
            break;
          case "y": // Slow down time
            this.lightingSystem.setDaySpeed(1); // Normal speed
            console.log("Time speed: 1x");
            this.showTimeControlFeedback("Time speed: 1x");
            break;
          case "u": // Set to dawn
            this.lightingSystem.setTimeOfDay(0.25);
            console.log("Time set to dawn");
            this.showTimeControlFeedback("Time set to dawn");
            break;
          case "i":
            // Only set to noon if help panel is open, otherwise toggle inventory
            this.lightingSystem.setTimeOfDay(0.5);
            console.log("Time set to noon");
            this.showTimeControlFeedback("Time set to noon");
            // Prevent the inventory from toggling when using the time control
            event.preventDefault();
            return;
          case "o": // Set to dusk
            this.lightingSystem.setTimeOfDay(0.75);
            console.log("Time set to dusk");
            this.showTimeControlFeedback("Time set to dusk");
            break;
          case "p": // Set to midnight
            this.lightingSystem.setTimeOfDay(0);
            console.log("Time set to midnight");
            this.showTimeControlFeedback("Time set to midnight");
            break;
        }
      }
    }

    // Handle player movement
    this.handlePlayerMovement();

    // Handle inventory
    if (event.key.toLowerCase() === "i") {
      // Check if the help panel is open
      const timeControlsHelp = document.getElementById("time-controls-help");
      const isHelpPanelOpen =
        timeControlsHelp && !timeControlsHelp.classList.contains("hidden");

      // Only toggle inventory if the help panel is not open
      if (!isHelpPanelOpen) {
        this.toggleInventory();
      }
    }

    // Space key can still be used as an alternative attack method
    if (event.key === " " || event.key === "space") {
      this.handlePlayerAttack();
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

  private onMouseDown(event: MouseEvent): void {
    // Left mouse button (button 0) for attack
    if (event.button === 0) {
      console.log("Left mouse click detected - attacking");
      this.handlePlayerAttack();
    }
  }

  private handlePlayerAttack(): void {
    // Make sure we have a zombie manager
    if (!this.zombieManager) {
      console.log("No zombie manager available");
      return;
    }

    // Get zombies and attack
    const zombies = this.zombieManager.getZombies();
    console.log("Attacking zombies, count:", zombies.length);
    this.player.attack(zombies);
  }

  private handlePlayerMovement(): void {
    // Reset player movement first
    this.player.stopMoving();

    // Create a movement vector for diagonal movement
    const moveVector = new THREE.Vector3(0, 0, 0);

    // Add movement components based on pressed keys, using isometric directions
    if (this.keys["w"] || this.keys["arrowup"]) {
      moveVector.add(this.ISO_DIRECTIONS.UP);
    }
    if (this.keys["s"] || this.keys["arrowdown"]) {
      moveVector.add(this.ISO_DIRECTIONS.DOWN);
    }
    if (this.keys["a"] || this.keys["arrowleft"]) {
      moveVector.add(this.ISO_DIRECTIONS.LEFT);
    }
    if (this.keys["d"] || this.keys["arrowright"]) {
      moveVector.add(this.ISO_DIRECTIONS.RIGHT);
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
        // Check if it's a water bottle
        if (item.name === "Water Bottle") {
          this.player.drink(item.value);
        } else {
          this.player.eat(item.value);
        }
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
    const inventoryPanel = document.getElementById("inventory-panel");
    const closeInventoryButton = document.getElementById("close-inventory");

    if (inventoryButton && inventoryPanel && closeInventoryButton) {
      inventoryButton.addEventListener("click", () => {
        inventoryPanel.classList.remove("hidden");
        this.populateInventory();
      });

      closeInventoryButton.addEventListener("click", () => {
        inventoryPanel.classList.add("hidden");
      });
    }

    // Time display help
    const timeDisplay = document.getElementById("time-display");
    const timeControlsHelp = document.getElementById("time-controls-help");
    const helpCloseButton = document.querySelector(".help-close");

    if (timeDisplay && timeControlsHelp && helpCloseButton) {
      timeDisplay.addEventListener("click", () => {
        timeControlsHelp.classList.toggle("hidden");
      });

      helpCloseButton.addEventListener("click", (e) => {
        e.stopPropagation();
        timeControlsHelp.classList.add("hidden");
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

  // Add a method to show feedback when time controls are used
  private showTimeControlFeedback(message: string): void {
    // Create or get the feedback element
    let feedbackElement = document.getElementById("time-control-feedback");

    if (!feedbackElement) {
      feedbackElement = document.createElement("div");
      feedbackElement.id = "time-control-feedback";
      document.body.appendChild(feedbackElement);
    }

    // Set the message and show the feedback
    feedbackElement.textContent = message;
    feedbackElement.classList.add("active");

    // Hide the feedback after a short delay
    setTimeout(() => {
      feedbackElement.classList.remove("active");
    }, 1500);
  }
}
