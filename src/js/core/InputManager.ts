import { Player } from "../entities/Player";
import * as THREE from "three";
import { ZombieManager } from "../entities/ZombieManager";
import { LightingSystem } from "./LightingSystem";

export class InputManager {
  private player: Player;
  private zombieManager?: ZombieManager;
  private lightingSystem?: LightingSystem;
  private keys: { [key: string]: boolean } = {};
  private isTimeAccelerated: boolean = false; // Track if time is accelerated

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

    // Toggle time controls help panel with 'T' key
    if (event.key.toLowerCase() === "t") {
      this.toggleTimeControlsHelp();
      return;
    }

    // Handle time control keys when the help panel is open
    const timeControlsHelp = document.getElementById("time-controls-help");
    if (
      timeControlsHelp &&
      !timeControlsHelp.classList.contains("hidden") &&
      this.lightingSystem
    ) {
      // Only process time control keys if the help panel is open
      switch (event.key.toLowerCase()) {
        case "y": // Toggle time speed
          this.toggleTimeSpeed();
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

    // Handle player movement
    this.handlePlayerMovement();

    // Handle inventory toggle with 'I' key
    if (event.key.toLowerCase() === "i") {
      // Check if the help panel is open
      const isHelpPanelOpen =
        timeControlsHelp && !timeControlsHelp.classList.contains("hidden");

      // Only toggle inventory if the help panel is not open
      if (!isHelpPanelOpen) {
        this.toggleInventory();
        return;
      }
    }

    // Handle hotbar key presses (1-3)
    if (event.key >= "1" && event.key <= "3") {
      const hotbarIndex = parseInt(event.key) - 1;
      this.useHotbarItem(hotbarIndex);
      return;
    }

    // Handle attack
    if (event.key === " " || event.key === "Space") {
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
      slot.setAttribute("data-index", index.toString());

      if (item) {
        // Get item properties, handling both Item objects and simple objects
        const itemName = item.getName ? item.getName() : item.name;
        const itemType = item.getType ? item.getType() : item.type;
        const itemQuantity = item.getQuantity
          ? item.getQuantity()
          : item.quantity || 1;
        const isStackable = item.isStackable
          ? item.isStackable()
          : itemType !== "weapon";

        // Create a container for the item name and quantity
        const itemInfo = document.createElement("div");
        itemInfo.className = "item-info";

        // Add item name
        const itemNameElement = document.createElement("div");
        itemNameElement.className = "item-name";
        itemNameElement.textContent = itemName;
        itemInfo.appendChild(itemNameElement);

        // Add quantity for stackable items with more than 1 item
        if (isStackable && itemQuantity > 1) {
          const itemQuantityElement = document.createElement("div");
          itemQuantityElement.className = "item-quantity";
          itemQuantityElement.textContent = `x${itemQuantity}`;
          itemInfo.appendChild(itemQuantityElement);
        }

        slot.appendChild(itemInfo);

        // Highlight equipped item
        if (
          item === this.player.getEquippedItem() &&
          this.player.getActiveHotbarSlot() === -1
        ) {
          slot.classList.add("selected");
        }

        // Add context menu for hotbar assignment
        slot.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          this.showHotbarAssignMenu(index, e);
        });

        // Add click event to use/equip item
        slot.addEventListener("click", () => {
          this.useItem(index);
        });
      }

      inventorySlots.appendChild(slot);
    });

    // Update hotbar display
    this.updateHotbarDisplay();
  }

  private showHotbarAssignMenu(
    inventoryIndex: number,
    event: MouseEvent
  ): void {
    // Remove any existing context menu
    const existingMenu = document.getElementById("hotbar-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement("div");
    menu.id = "hotbar-context-menu";
    menu.style.position = "absolute";
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    menu.style.border = "1px solid #fff";
    menu.style.borderRadius = "5px";
    menu.style.padding = "5px";
    menu.style.zIndex = "1000";

    // Add options for each hotbar slot
    for (let i = 0; i < 3; i++) {
      const option = document.createElement("div");
      option.textContent = `Assign to Slot ${i + 1}`;
      option.style.padding = "5px 10px";
      option.style.cursor = "pointer";
      option.style.borderBottom = i < 2 ? "1px solid #555" : "none";

      option.addEventListener("mouseover", () => {
        option.style.backgroundColor = "rgba(139, 0, 0, 0.7)";
      });

      option.addEventListener("mouseout", () => {
        option.style.backgroundColor = "transparent";
      });

      option.addEventListener("click", () => {
        this.player.moveToHotbar(inventoryIndex, i);
        menu.remove();
        this.populateInventory(); // Refresh inventory display
      });

      menu.appendChild(option);
    }

    // Add event listener to close menu when clicking elsewhere
    document.addEventListener(
      "click",
      () => {
        menu.remove();
      },
      { once: true }
    );

    // Add menu to the document
    document.body.appendChild(menu);
  }

  private updateHotbarDisplay(): void {
    const hotbar = this.player.getHotbar();
    const activeSlot = this.player.getActiveHotbarSlot();

    // Update each hotbar slot
    for (let i = 0; i < hotbar.length; i++) {
      const slotElement = document.querySelector(
        `.hotbar-slot[data-slot="${i}"]`
      );
      if (!slotElement) continue;

      // Clear existing content except the hotbar key
      const keyElement = slotElement.querySelector(".hotbar-key");
      slotElement.innerHTML = "";
      if (keyElement) {
        slotElement.appendChild(keyElement);
      }

      // Update active state
      if (i === activeSlot) {
        slotElement.classList.add("active");
      } else {
        slotElement.classList.remove("active");
      }

      const item = hotbar[i];
      if (item) {
        // Get item properties
        const itemName = item.getName ? item.getName() : item.name;
        const itemType = item.getType ? item.getType() : item.type;
        const itemQuantity = item.getQuantity
          ? item.getQuantity()
          : item.quantity || 1;
        const isStackable = item.isStackable
          ? item.isStackable()
          : itemType !== "weapon";

        // Create item info container
        const itemInfo = document.createElement("div");
        itemInfo.className = "hotbar-item-info";

        // Add item name
        const itemNameElement = document.createElement("div");
        itemNameElement.className = "hotbar-item-name";
        itemNameElement.textContent = itemName;
        itemInfo.appendChild(itemNameElement);

        // Add quantity for stackable items with more than 1 item
        if (isStackable && itemQuantity > 1) {
          const itemQuantityElement = document.createElement("div");
          itemQuantityElement.className = "hotbar-item-quantity";
          itemQuantityElement.textContent = `x${itemQuantity}`;
          itemInfo.appendChild(itemQuantityElement);
        }

        slotElement.appendChild(itemInfo);
      }
    }
  }

  private useHotbarItem(index: number): void {
    const hotbar = this.player.getHotbar();
    const item = hotbar[index];

    if (!item) return;

    // Get item type and other properties
    const itemType = item.getType ? item.getType() : item.type;
    const itemName = item.getName ? item.getName() : item.name;
    const itemValue = item.getValue ? item.getValue() : item.value;
    const itemQuantity = item.getQuantity
      ? item.getQuantity()
      : item.quantity || 1;

    // Handle different item types
    switch (itemType) {
      case "weapon":
        this.player.equipHotbarItem(index);
        break;
      case "food":
        // Check if it's a water bottle
        if (itemName === "Water Bottle") {
          this.player.drink(itemValue);
        } else {
          this.player.eat(itemValue);
        }

        // For stackable items, only remove one from the stack
        if (itemQuantity > 1) {
          this.player.removeFromHotbar(index, 1);
        } else {
          this.player.removeFromHotbar(index);
        }
        break;
      case "medkit":
        this.player.heal(itemValue);

        // For stackable items, only remove one from the stack
        if (itemQuantity > 1) {
          this.player.removeFromHotbar(index, 1);
        } else {
          this.player.removeFromHotbar(index);
        }
        break;
    }

    // Update hotbar display
    this.updateHotbarDisplay();
  }

  private useItem(index: number): void {
    const inventory = this.player.getInventory();
    const item = inventory[index];

    if (!item) return;

    // Get item type and other properties, handling both Item objects and simple objects
    const itemType = item.getType ? item.getType() : item.type;
    const itemName = item.getName ? item.getName() : item.name;
    const itemValue = item.getValue ? item.getValue() : item.value;
    const itemQuantity = item.getQuantity
      ? item.getQuantity()
      : item.quantity || 1;

    // Handle different item types
    switch (itemType) {
      case "weapon":
        this.player.equipItem(index);
        break;
      case "food":
        // Check if it's a water bottle
        if (itemName === "Water Bottle") {
          this.player.drink(itemValue);
        } else {
          this.player.eat(itemValue);
        }

        // For stackable items, only remove one from the stack
        if (itemQuantity > 1) {
          this.player.removeFromInventory(index, 1);
        } else {
          this.player.removeFromInventory(index);
        }
        break;
      case "medkit":
        this.player.heal(itemValue);

        // For stackable items, only remove one from the stack
        if (itemQuantity > 1) {
          this.player.removeFromInventory(index, 1);
        } else {
          this.player.removeFromInventory(index);
        }
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
        this.toggleInventory();
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

      helpCloseButton.addEventListener("click", () => {
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

    // Hotbar slot click events
    const hotbarSlots = document.querySelectorAll(".hotbar-slot");
    hotbarSlots.forEach((slot) => {
      slot.addEventListener("click", () => {
        const slotIndex = parseInt(slot.getAttribute("data-slot") || "0");
        this.useHotbarItem(slotIndex);
      });
    });
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

  // Toggle between normal and accelerated time speed
  private toggleTimeSpeed(): void {
    if (!this.lightingSystem) return;

    this.isTimeAccelerated = !this.isTimeAccelerated;

    if (this.isTimeAccelerated) {
      // Accelerate time (10x)
      this.lightingSystem.setDaySpeed(10);
      console.log("Time speed: 10x");
      this.showTimeControlFeedback("Time speed: 10x");
    } else {
      // Normal speed
      this.lightingSystem.setDaySpeed(1);
      console.log("Time speed: 1x");
      this.showTimeControlFeedback("Time speed: 1x");
    }
  }

  // Add a method to toggle the time controls help panel
  private toggleTimeControlsHelp(): void {
    const timeControlsHelp = document.getElementById("time-controls-help");
    if (timeControlsHelp) {
      timeControlsHelp.classList.toggle("hidden");

      // Show feedback when toggling
      if (!timeControlsHelp.classList.contains("hidden")) {
        this.showTimeControlFeedback("Time controls opened");
      } else {
        this.showTimeControlFeedback("Time controls closed");
      }
    }
  }

  public update(): void {
    this.handlePlayerMovement();

    // Update hotbar display (to keep it in sync with the game state)
    this.updateHotbarDisplay();
  }
}
