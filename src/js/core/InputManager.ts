import { Player } from "../entities/Player";

export class InputManager {
  private player: Player;
  private keys: { [key: string]: boolean } = {};
  private isRightMouseDown: boolean = false;
  private lastMouseX: number = 0;

  constructor(player: Player) {
    this.player = player;

    // Set up keyboard event listeners
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));

    // Set up mouse event listeners for right-click rotation
    window.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));

    // Prevent context menu on right-click
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Set up UI event listeners
    this.setupUIListeners();
  }

  private onMouseDown(event: MouseEvent): void {
    // Check if it's the right mouse button (button 2)
    if (event.button === 2) {
      this.isRightMouseDown = true;
      this.lastMouseX = event.clientX;

      // Change cursor to indicate rotation mode
      const gameContainer = document.getElementById("game-container");
      if (gameContainer) {
        gameContainer.classList.add("rotating");
      }
    }
  }

  private onMouseUp(event: MouseEvent): void {
    // Check if it's the right mouse button (button 2)
    if (event.button === 2) {
      this.isRightMouseDown = false;

      // Reset cursor
      const gameContainer = document.getElementById("game-container");
      if (gameContainer) {
        gameContainer.classList.remove("rotating");
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isRightMouseDown) {
      const deltaX = event.clientX - this.lastMouseX;
      this.lastMouseX = event.clientX;

      // Rotate player based on mouse movement
      // Negative deltaX means rotate left, positive means rotate right
      if (deltaX < 0) {
        this.player.rotateLeft(-deltaX * 0.01); // Scale down the rotation speed
      } else if (deltaX > 0) {
        this.player.rotateRight(deltaX * 0.01); // Scale down the rotation speed
      }
    }
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
    if (this.keys["w"]) {
      this.player.moveForward();
    } else if (this.keys["s"]) {
      this.player.moveBackward();
    }

    if (this.keys["a"]) {
      this.player.moveLeft();
    } else if (this.keys["d"]) {
      this.player.moveRight();
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
