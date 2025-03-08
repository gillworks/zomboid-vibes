import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Zombie } from "./Zombie";
import { World } from "../core/World";

export class Player {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private loadingManager: THREE.LoadingManager;
  private world: World | null = null; // Reference to the world for collision detection

  private playerGroup: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerHead!: THREE.Mesh;

  private moveSpeed: number = 5;
  private rotationSpeed: number = 2;
  private isMoving: boolean = false;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();

  private health: number = 100;
  private hunger: number = 100;
  private thirst: number = 100;
  private inventory: any[] = [];
  private maxInventorySlots: number = 16;
  private equippedItem: any = null;

  // Add references to limbs for animation
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftFoot!: THREE.Mesh;
  private rightFoot!: THREE.Mesh;

  // Animation properties
  private animationTime: number = 0;
  private walkingSpeed: number = 5; // Animation speed multiplier

  private attackRange: number = 3;
  private attackDamage: number = 25;
  private attackCooldown: number = 0.1; // seconds
  private timeSinceLastAttack: number = 0;
  private isAttacking: boolean = false;
  private knockbackForce: number = 2; // Force of knockback effect

  // Track cause of death
  private causeOfDeath: string = "";

  // Collision properties
  private collisionRadius: number = 0.5;

  // New member variable for attack animation timeout
  private _attackAnimationTimeout: number | null = null;

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

    // Set initial position to the center of a road intersection
    // This ensures the player starts in an open area without collisions
    this.playerGroup.position.set(0, 0, 0);

    // Update camera position immediately
    this.updateCameraPosition();
  }

  // Set the world reference for collision detection
  public setWorld(world: World): void {
    this.world = world;
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

    // Create arm groups to allow for better positioning and parenting
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.4, 0.9, 0);
    characterGroup.add(leftArmGroup);

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(0, 0, 0); // Position relative to arm group
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    this.leftArm = leftArmGroup; // Store reference to the group instead

    // Right arm
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.4, 0.9, 0);
    characterGroup.add(rightArmGroup);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0, 0, 0); // Position relative to arm group
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    this.rightArm = rightArmGroup; // Store reference to the group instead

    // Hands
    const handGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const handMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0c8a0, // Skin tone
      roughness: 0.7,
      metalness: 0.1,
    });

    // Left hand - attach to left arm group
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -0.35, 0); // Position at the end of the arm
    leftHand.castShadow = true;
    leftArmGroup.add(leftHand); // Add to arm group instead of character group

    // Right hand - attach to right arm group
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0, -0.35, 0); // Position at the end of the arm
    rightHand.castShadow = true;
    rightArmGroup.add(rightHand); // Add to arm group instead of character group

    // Legs - use boxes for a more PZ-like character
    const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, // Dark pants
      roughness: 0.8,
      metalness: 0.2,
    });

    // Create leg groups to allow for better positioning and parenting
    // Left leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.2, 0.35, 0);
    characterGroup.add(leftLegGroup);

    const leftLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    leftLegMesh.position.set(0, 0, 0); // Position relative to leg group
    leftLegMesh.castShadow = true;
    leftLegGroup.add(leftLegMesh);
    this.leftLeg = leftLegGroup; // Store reference to the group instead

    // Right leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.2, 0.35, 0);
    characterGroup.add(rightLegGroup);

    const rightLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    rightLegMesh.position.set(0, 0, 0); // Position relative to leg group
    rightLegMesh.castShadow = true;
    rightLegGroup.add(rightLegMesh);
    this.rightLeg = rightLegGroup; // Store reference to the group instead

    // Feet
    const footGeometry = new THREE.BoxGeometry(0.25, 0.1, 0.35);
    const footMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a, // Dark shoes
      roughness: 0.9,
      metalness: 0.3,
    });

    // Left foot - attach to left leg group
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(0, -0.4, 0.05); // Position at the end of the leg
    leftFoot.castShadow = true;
    leftLegGroup.add(leftFoot); // Add to leg group instead of character group
    this.leftFoot = leftFoot;

    // Right foot - attach to right leg group
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0, -0.4, 0.05); // Position at the end of the leg
    rightFoot.castShadow = true;
    rightLegGroup.add(rightFoot); // Add to leg group instead of character group
    this.rightFoot = rightFoot;

    // Add a backpack (common in PZ)
    const backpackGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.2);
    const backpackMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a3a2a, // Brown backpack
      roughness: 0.9,
      metalness: 0.1,
    });
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    // Move backpack to the back of the character (negative Z)
    backpack.position.set(0, 0.9, -0.25);
    backpack.castShadow = true;
    characterGroup.add(backpack);

    // Add the character group to the player group
    this.playerGroup.add(characterGroup);

    // Rotate the entire character group to face forward (negative Z direction)
    characterGroup.rotation.y = Math.PI;

    // Increase the overall scale to make the character larger and comparable to zombies
    this.playerGroup.scale.set(1.2, 1.2, 1.2);
  }

  public update(delta: number): void {
    // Update player movement
    if (this.isMoving) {
      const moveAmount = this.moveSpeed * delta;

      // Calculate the intended new position
      const currentPosition = this.playerGroup.position.clone();
      const intendedPosition = currentPosition
        .clone()
        .add(this.moveDirection.clone().multiplyScalar(moveAmount));

      // Check for collisions and resolve them if world is available
      let newPosition = intendedPosition;
      if (this.world) {
        newPosition = this.world.resolveCollision(
          currentPosition,
          intendedPosition,
          this.collisionRadius
        );
      }

      // Update position
      this.playerGroup.position.copy(newPosition);

      // Update camera to follow player but maintain isometric angle
      this.updateCameraPosition();

      // Rotate the player model to face the direction of movement
      this.rotateToFaceMovement();

      // Animate walking
      this.animateWalking(delta);
    } else {
      // Reset limbs to default positions when not moving
      this.resetLimbPositions();
    }

    // Update attack cooldown
    if (this.timeSinceLastAttack < this.attackCooldown) {
      this.timeSinceLastAttack += delta;
    }

    // Update attack animation
    if (this.isAttacking) {
      this.animateAttack();
    }

    // Update TWEEN animations
    TWEEN.update();

    // Decrease hunger over time (rate cut by half)
    this.hunger -= 0.005;
    if (this.hunger < 0) {
      this.hunger = 0;
      // Start taking damage when starving
      this.takeDamage(0.05, "starvation");
    }

    // Decrease thirst over time (slightly faster than hunger, rate cut by half)
    this.thirst -= 0.0075;
    if (this.thirst < 0) {
      this.thirst = 0;
      // Start taking damage when dehydrated
      this.takeDamage(0.07, "dehydration"); // Dehydration is more dangerous than hunger
    }
  }

  // New method to rotate the player model to face the direction of movement
  private rotateToFaceMovement(): void {
    if (this.moveDirection.length() > 0) {
      // Calculate the angle to face the movement direction
      // For isometric view, we need to adjust the angle calculation
      // Add PI to the angle to account for the initial rotation of the character model
      const angle =
        Math.atan2(this.moveDirection.x, this.moveDirection.z) + Math.PI;

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
    // Slightly increase camera distance for the larger character
    const offset = new THREE.Vector3(22, 22, 22);
    this.camera.position.copy(this.playerGroup.position).add(offset);
    this.camera.lookAt(this.playerGroup.position);
  }

  public takeDamage(amount: number, cause: string = "unknown"): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      // Set cause of death if health reaches 0
      if (this.causeOfDeath === "") {
        this.causeOfDeath = cause;
      }
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

  public getPlayerGroup(): THREE.Group {
    return this.playerGroup;
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

  public getThirst(): number {
    return this.thirst;
  }

  public getInventory(): any[] {
    return [...this.inventory];
  }

  public getEquippedItem(): any {
    return this.equippedItem;
  }

  public getTimeSinceLastAttack(): number {
    return this.timeSinceLastAttack;
  }

  public getAttackCooldown(): number {
    return this.attackCooldown;
  }

  public getCauseOfDeath(): string {
    return this.causeOfDeath;
  }

  public reset(): void {
    // Reset player state
    this.health = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.inventory = Array(this.maxInventorySlots).fill(null);
    this.equippedItem = null;
    this.timeSinceLastAttack = 0;
    this.isAttacking = false;
    this.causeOfDeath = ""; // Reset cause of death

    // Reset position
    this.playerGroup.position.set(0, 0, 0);
    this.playerGroup.rotation.set(0, 0, 0);

    // Reset animation
    this.animationTime = 0;
    this.resetLimbPositions();
  }

  // Add these new methods for diagonal movement
  public setMoveDirection(direction: THREE.Vector3): void {
    this.moveDirection.copy(direction);
  }

  public startMoving(): void {
    this.isMoving = true;
  }

  private animateWalking(delta: number): void {
    // Increment animation time based on movement speed
    this.animationTime += delta * this.walkingSpeed;

    // Calculate swing amounts using sine waves
    const legSwing = Math.sin(this.animationTime * 5) * 0.3;
    const armSwing = Math.sin(this.animationTime * 5) * 0.2;

    // Animate legs in opposite phases
    if (this.leftLeg && this.rightLeg) {
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;

      // No need to manually move feet as they're now parented to legs
      // and will move automatically with their parent
    }

    // Animate arms in opposite phases to legs
    if (this.leftArm && this.rightArm) {
      this.leftArm.rotation.x = -armSwing;
      this.rightArm.rotation.x = armSwing;
    }
  }

  private resetLimbPositions(): void {
    // Reset all limbs to their default positions/rotations
    if (this.leftLeg) this.leftLeg.rotation.x = 0;
    if (this.rightLeg) this.rightLeg.rotation.x = 0;
    if (this.leftArm) this.leftArm.rotation.x = 0;
    if (this.rightArm) this.rightArm.rotation.x = 0;

    // No need to reset feet positions as they're now parented to legs
    // and will move automatically with their parent
  }

  public attack(zombies: Zombie[]): void {
    // Check if we can attack
    if (this.timeSinceLastAttack < this.attackCooldown) {
      console.log(
        "Attack on cooldown: ",
        this.timeSinceLastAttack,
        "/",
        this.attackCooldown
      );
      return;
    }

    // Remove the check for isAttacking to allow attack animation to always play
    console.log("Attack initiated");

    // Reset cooldown
    this.timeSinceLastAttack = 0;
    this.isAttacking = true;

    // Temporary fix: Force reset isAttacking after 500ms
    setTimeout(() => {
      console.log("Force resetting isAttacking flag");
      this.isAttacking = false;
    }, 500);

    // Play attack animation
    this.animateAttack();

    // Get player position and forward direction
    const playerPos = this.playerGroup.position.clone();
    const playerForward = new THREE.Vector3(0, 0, -1);
    playerForward.applyEuler(this.playerGroup.rotation);

    console.log("Player position:", playerPos);
    console.log("Player forward:", playerForward);
    console.log("Number of zombies:", zombies.length);

    // Check for zombies in range
    let hitZombie = false;
    for (const zombie of zombies) {
      if (zombie.isDead()) {
        console.log("Zombie is dead, skipping");
        continue;
      }

      const zombiePos = zombie.getPosition();
      const distanceToZombie = playerPos.distanceTo(zombiePos);

      console.log("Zombie position:", zombiePos);
      console.log("Distance to zombie:", distanceToZombie);

      // Check if zombie is within attack range
      if (distanceToZombie <= this.attackRange) {
        // Calculate angle between player forward and direction to zombie
        const directionToZombie = new THREE.Vector3()
          .subVectors(zombiePos, playerPos)
          .normalize();

        const angleToZombie = playerForward.angleTo(directionToZombie);

        console.log("Direction to zombie:", directionToZombie);
        console.log("Angle to zombie:", angleToZombie);
        console.log("Attack angle threshold:", Math.PI / 2);

        // Check if zombie is in front of the player (within a 180-degree arc)
        if (angleToZombie <= Math.PI / 2) {
          // Deal damage to zombie
          zombie.takeDamage(this.attackDamage);
          console.log("Hit zombie! Damage dealt:", this.attackDamage);
          hitZombie = true;

          // Apply knockback effect
          const knockbackDirection = directionToZombie.clone();
          const knockbackDistance = this.knockbackForce;
          const newPosition = zombiePos
            .clone()
            .add(knockbackDirection.multiplyScalar(knockbackDistance));

          // Set the zombie's new position with knockback
          zombie.setPosition(newPosition.x, newPosition.y, newPosition.z);
          console.log(
            "Applied knockback to zombie:",
            knockbackDistance,
            "units"
          );
        }
      }
    }

    if (!hitZombie) {
      console.log("No zombies hit");
    }
  }

  private animateAttack(): void {
    console.log("Starting attack animation");

    // Clear any existing animation timeouts to prevent conflicts
    if (this._attackAnimationTimeout) {
      clearTimeout(this._attackAnimationTimeout);
    }

    // Store original arm rotations
    const leftArmOriginalRotation = this.leftArm.rotation.clone();
    const rightArmOriginalRotation = this.rightArm.rotation.clone();

    console.log(
      "Original arm rotations:",
      leftArmOriginalRotation,
      rightArmOriginalRotation
    );

    // Make a more dramatic rotation - rotate arms forward and slightly outward
    this.leftArm.rotation.x = -Math.PI / 1.5; // More extreme forward rotation
    this.rightArm.rotation.x = -Math.PI / 1.5;

    // Add some rotation on other axes for more dramatic effect
    this.leftArm.rotation.z = -Math.PI / 6; // Rotate outward
    this.rightArm.rotation.z = Math.PI / 6;

    console.log("Arms rotated for attack");

    // Use setTimeout to return the arms to their original position after a delay
    this._attackAnimationTimeout = setTimeout(() => {
      // Return arms to original position
      this.leftArm.rotation.x = leftArmOriginalRotation.x;
      this.rightArm.rotation.x = rightArmOriginalRotation.x;
      this.leftArm.rotation.z = leftArmOriginalRotation.z;
      this.rightArm.rotation.z = rightArmOriginalRotation.z;

      console.log("Arms returned to original position");

      // Reset the attacking flag
      this.isAttacking = false;
      console.log("Attack animation completed");
    }, 400); // Slightly longer delay for more visibility
  }

  public canAttack(): boolean {
    // Remove the isAttacking check to allow attacking even during animation
    return this.timeSinceLastAttack >= this.attackCooldown;
  }

  public drink(amount: number): void {
    this.thirst += amount;
    if (this.thirst > 100) {
      this.thirst = 100;
    }
  }
}
