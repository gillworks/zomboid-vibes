import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

export class Player {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private loadingManager: THREE.LoadingManager;

  private playerGroup: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerHead!: THREE.Mesh;

  private moveSpeed: number = 5;
  private rotationSpeed: number = 2;
  private isMoving: boolean = false;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();

  private health: number = 100;
  private hunger: number = 100;
  private inventory: any[] = [];
  private maxInventorySlots: number = 16;
  private equippedItem: any = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    loadingManager: THREE.LoadingManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.loadingManager = loadingManager;

    this.playerGroup = new THREE.Group();
    this.createPlayerModel();

    this.scene.add(this.playerGroup);

    // Initialize inventory with empty slots
    for (let i = 0; i < this.maxInventorySlots; i++) {
      this.inventory.push(null);
    }

    // Set initial position
    this.playerGroup.position.set(0, 0, 0);
  }

  private createPlayerModel(): void {
    // Create a simple player model
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2266cc,
      roughness: 0.7,
      metalness: 0.3,
    });
    this.playerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.playerBody.position.y = 0.75;
    this.playerBody.castShadow = true;
    this.playerGroup.add(this.playerBody);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.playerHead = new THREE.Mesh(headGeometry, headMaterial);
    this.playerHead.position.y = 1.85;
    this.playerHead.castShadow = true;
    this.playerGroup.add(this.playerHead);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x2266cc,
      roughness: 0.7,
      metalness: 0.3,
    });

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.7, 0.75, 0);
    leftArm.rotation.z = Math.PI / 2;
    leftArm.castShadow = true;
    this.playerGroup.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.7, 0.75, 0);
    rightArm.rotation.z = -Math.PI / 2;
    rightArm.castShadow = true;
    this.playerGroup.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.2,
    });

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.25, 0);
    leftLeg.castShadow = true;
    this.playerGroup.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.25, 0);
    rightLeg.castShadow = true;
    this.playerGroup.add(rightLeg);
  }

  public update(delta: number): void {
    // Update player movement
    if (this.isMoving) {
      const moveAmount = this.moveSpeed * delta;
      this.playerGroup.position.add(
        this.moveDirection.clone().multiplyScalar(moveAmount)
      );

      // Update camera to follow player but maintain isometric angle
      this.updateCameraPosition();

      // Rotate the player model to face the direction of movement
      this.rotateToFaceMovement();
    }

    // Decrease hunger over time
    this.hunger -= 0.01;
    if (this.hunger < 0) {
      this.hunger = 0;
      // Start taking damage when starving
      this.takeDamage(0.05);
    }
  }

  // New method to rotate the player model to face the direction of movement
  private rotateToFaceMovement(): void {
    if (this.moveDirection.length() > 0) {
      // Calculate the angle to face the movement direction
      // For isometric view, we need to adjust the angle calculation
      const angle = Math.atan2(this.moveDirection.x, this.moveDirection.z);

      // Smoothly rotate towards the target
      this.playerGroup.rotation.y = angle;
    }
  }

  // Update movement methods to use screen-relative directions
  public moveForward(): void {
    this.isMoving = true;
    // Move towards the top of the screen (negative Z in isometric view)
    this.moveDirection.set(0, 0, -1).normalize();
  }

  public moveBackward(): void {
    this.isMoving = true;
    // Move towards the bottom of the screen (positive Z in isometric view)
    this.moveDirection.set(0, 0, 1).normalize();
  }

  public moveLeft(): void {
    this.isMoving = true;
    // Move towards the left of the screen (negative X in isometric view)
    this.moveDirection.set(-1, 0, 0).normalize();
  }

  public moveRight(): void {
    this.isMoving = true;
    // Move towards the right of the screen (positive X in isometric view)
    this.moveDirection.set(1, 0, 0).normalize();
  }

  public stopMoving(): void {
    this.isMoving = false;
  }

  // Keep these methods for potential future use, but they won't be called by input manager
  public rotateLeft(delta: number): void {
    this.playerGroup.rotation.y += this.rotationSpeed * delta;
  }

  public rotateRight(delta: number): void {
    this.playerGroup.rotation.y -= this.rotationSpeed * delta;
  }

  private updateCameraPosition(): void {
    // Update camera to follow player but maintain isometric angle
    const offset = new THREE.Vector3(20, 20, 20);
    this.camera.position.copy(this.playerGroup.position).add(offset);
    this.camera.lookAt(this.playerGroup.position);
  }

  public takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health < 0) {
      this.health = 0;
    }

    // Visual feedback for taking damage
    const originalColor = (
      this.playerBody.material as THREE.MeshStandardMaterial
    ).color.clone();
    (this.playerBody.material as THREE.MeshStandardMaterial).color.set(
      0xff0000
    );

    // Reset color after a short time
    setTimeout(() => {
      (this.playerBody.material as THREE.MeshStandardMaterial).color.copy(
        originalColor
      );
    }, 200);
  }

  public heal(amount: number): void {
    this.health += amount;
    if (this.health > 100) {
      this.health = 100;
    }
  }

  public eat(amount: number): void {
    this.hunger += amount;
    if (this.hunger > 100) {
      this.hunger = 100;
    }
  }

  public addToInventory(item: any): boolean {
    // Find an empty slot in the inventory
    const emptySlot = this.inventory.findIndex((slot) => slot === null);

    if (emptySlot !== -1) {
      this.inventory[emptySlot] = item;
      return true;
    }

    return false; // Inventory is full
  }

  public removeFromInventory(index: number): any {
    if (index >= 0 && index < this.inventory.length) {
      const item = this.inventory[index];
      this.inventory[index] = null;
      return item;
    }

    return null;
  }

  public equipItem(index: number): void {
    if (
      index >= 0 &&
      index < this.inventory.length &&
      this.inventory[index] !== null
    ) {
      this.equippedItem = this.inventory[index];
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.playerGroup.position.clone();
  }

  public getRotation(): THREE.Euler {
    return this.playerGroup.rotation.clone();
  }

  public getHealth(): number {
    return this.health;
  }

  public getHunger(): number {
    return this.hunger;
  }

  public getInventory(): any[] {
    return [...this.inventory];
  }

  public getEquippedItem(): any {
    return this.equippedItem;
  }

  public reset(): void {
    // Reset player state
    this.health = 100;
    this.hunger = 100;
    this.inventory = Array(this.maxInventorySlots).fill(null);
    this.equippedItem = null;

    // Reset position
    this.playerGroup.position.set(0, 0, 0);
    this.playerGroup.rotation.set(0, 0, 0);
  }

  // Add these new methods for diagonal movement
  public setMoveDirection(direction: THREE.Vector3): void {
    this.moveDirection.copy(direction);
  }

  public startMoving(): void {
    this.isMoving = true;
  }
}
