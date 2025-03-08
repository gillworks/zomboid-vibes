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
    // Create a more realistic player model similar to Project Zomboid

    // Create a group for the player character
    const characterGroup = new THREE.Group();

    // Body - use a box for a more PZ-like character
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5e3a, // Green jacket like in PZ
      roughness: 0.8,
      metalness: 0.2,
    });
    this.playerBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.playerBody.position.y = 0.9;
    this.playerBody.castShadow = true;
    characterGroup.add(this.playerBody);

    // Add details to the body (jacket)
    const jacketDetailGeometry = new THREE.BoxGeometry(0.65, 0.85, 0.35);
    const jacketDetailMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4e2a,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: true,
    });
    const jacketDetail = new THREE.Mesh(
      jacketDetailGeometry,
      jacketDetailMaterial
    );
    jacketDetail.position.copy(this.playerBody.position);
    characterGroup.add(jacketDetail);

    // Head - smaller and more square-ish for PZ style
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0c8a0, // Skin tone
      roughness: 0.7,
      metalness: 0.1,
    });
    this.playerHead = new THREE.Mesh(headGeometry, headMaterial);
    this.playerHead.position.y = 1.55;
    this.playerHead.castShadow = true;
    characterGroup.add(this.playerHead);

    // Hair
    const hairGeometry = new THREE.BoxGeometry(0.42, 0.15, 0.42);
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a, // Dark brown
      roughness: 1.0,
      metalness: 0.0,
    });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.75;
    hair.castShadow = true;
    characterGroup.add(hair);

    // Arms - thinner and more angular
    // Left arm
    const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5e3a, // Match jacket
      roughness: 0.8,
      metalness: 0.2,
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.9, 0);
    leftArm.castShadow = true;
    characterGroup.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.9, 0);
    rightArm.castShadow = true;
    characterGroup.add(rightArm);

    // Hands
    const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const handMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0c8a0, // Skin tone
      roughness: 0.7,
      metalness: 0.1,
    });

    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-0.4, 0.55, 0);
    leftHand.castShadow = true;
    characterGroup.add(leftHand);

    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0.4, 0.55, 0);
    rightHand.castShadow = true;
    characterGroup.add(rightHand);

    // Legs - use boxes for a more PZ-like character
    const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, // Dark pants
      roughness: 0.8,
      metalness: 0.2,
    });

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.35, 0);
    leftLeg.castShadow = true;
    characterGroup.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.35, 0);
    rightLeg.castShadow = true;
    characterGroup.add(rightLeg);

    // Feet
    const footGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.35);
    const footMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a, // Dark shoes
      roughness: 0.9,
      metalness: 0.3,
    });

    // Left foot
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(-0.2, 0.05, 0.05);
    leftFoot.castShadow = true;
    characterGroup.add(leftFoot);

    // Right foot
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0.2, 0.05, 0.05);
    rightFoot.castShadow = true;
    characterGroup.add(rightFoot);

    // Add a backpack (common in PZ)
    const backpackGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.2);
    const backpackMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a3a2a, // Brown backpack
      roughness: 0.9,
      metalness: 0.1,
    });
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    backpack.position.set(0, 0.9, 0.25);
    backpack.castShadow = true;
    characterGroup.add(backpack);

    // Add the character group to the player group
    this.playerGroup.add(characterGroup);

    // Adjust the overall scale
    this.playerGroup.scale.set(0.8, 0.8, 0.8);
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
