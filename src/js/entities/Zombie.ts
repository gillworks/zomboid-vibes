import * as THREE from "three";
import { Player } from "./Player";
import { World } from "../core/World";

export class Zombie {
  private scene: THREE.Scene;
  private player: Player;
  private loadingManager: THREE.LoadingManager;
  private world: World | null = null; // Reference to the world for collision detection

  private zombieGroup: THREE.Group;
  private zombieBody!: THREE.Mesh;
  private zombieHead!: THREE.Mesh;

  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private leftFoot!: THREE.Mesh;
  private rightFoot!: THREE.Mesh;

  private animationTime: number = 0;
  private walkingSpeed: number = 3;

  private health: number = 100;
  private moveSpeed: number = 2;
  private attackRange: number = 1.5;
  private attackDamage: number = 10;
  private attackCooldown: number = 1; // seconds
  private timeSinceLastAttack: number = 0;

  private isDead_: boolean = false;

  // Collision properties
  private collisionRadius: number = 0.5;

  constructor(
    scene: THREE.Scene,
    player: Player,
    loadingManager: THREE.LoadingManager
  ) {
    this.scene = scene;
    this.player = player;
    this.loadingManager = loadingManager;

    this.zombieGroup = new THREE.Group();
    this.createZombieModel();

    this.scene.add(this.zombieGroup);
  }

  // Set the world reference for collision detection
  public setWorld(world: World): void {
    this.world = world;
  }

  private createZombieModel(): void {
    // Create a more realistic zombie model similar to the player character

    // Create a group for the zombie character
    const characterGroup = new THREE.Group();

    // Body - use a box for a more PZ-like character
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a6e4a, // Zombie green
      roughness: 0.8,
      metalness: 0.2,
    });
    this.zombieBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.zombieBody.position.y = 0.9;
    this.zombieBody.castShadow = true;
    characterGroup.add(this.zombieBody);

    // Add details to the body (tattered clothes)
    const clothesDetailGeometry = new THREE.BoxGeometry(0.65, 0.85, 0.35);
    const clothesDetailMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5a3a,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: true,
    });
    const clothesDetail = new THREE.Mesh(
      clothesDetailGeometry,
      clothesDetailMaterial
    );
    clothesDetail.position.copy(this.zombieBody.position);
    characterGroup.add(clothesDetail);

    // Head - smaller and more square-ish for PZ style
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8d8a0, // Sickly green-gray skin tone
      roughness: 0.7,
      metalness: 0.1,
    });
    this.zombieHead = new THREE.Mesh(headGeometry, headMaterial);
    this.zombieHead.position.y = 1.55;
    this.zombieHead.castShadow = true;
    characterGroup.add(this.zombieHead);

    // Add blood stains to the head
    const bloodGeometry = new THREE.BoxGeometry(0.42, 0.15, 0.42);
    const bloodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b0000, // Dark red blood
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
    });
    const blood = new THREE.Mesh(bloodGeometry, bloodMaterial);
    blood.position.y = 1.65;
    blood.scale.set(0.7, 0.3, 0.7);
    blood.castShadow = true;
    characterGroup.add(blood);

    // Arms - straight out in front for classic zombie pose
    // Left arm
    const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a6e4a, // Match zombie body
      roughness: 0.8,
      metalness: 0.2,
    });

    // Create arm groups to allow for better positioning
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.3, 1.2, 0);
    // Rotate arm group to point forward
    leftArmGroup.rotation.x = -Math.PI / 2.5; // Slightly upward
    leftArmGroup.rotation.z = 0.2; // Slightly outward
    characterGroup.add(leftArmGroup);

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    // Position relative to the arm group
    leftArm.position.set(0, -0.3, 0);
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);

    // Right arm
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.3, 1.2, 0);
    // Rotate arm group to point forward
    rightArmGroup.rotation.x = -Math.PI / 2.5; // Slightly upward
    rightArmGroup.rotation.z = -0.2; // Slightly outward
    characterGroup.add(rightArmGroup);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    // Position relative to the arm group
    rightArm.position.set(0, -0.3, 0);
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);

    // Hands - make them claw-like
    const handGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.15);
    const handMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8d8a0, // Match zombie skin
      roughness: 0.7,
      metalness: 0.1,
    });

    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -0.6, 0);
    leftHand.rotation.x = -0.3; // Claw-like angle
    leftHand.castShadow = true;
    leftArmGroup.add(leftHand);

    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0, -0.6, 0);
    rightHand.rotation.x = -0.3; // Claw-like angle
    rightHand.castShadow = true;
    rightArmGroup.add(rightHand);

    // Legs - use boxes for a more PZ-like character
    const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, // Dark tattered pants
      roughness: 0.8,
      metalness: 0.2,
    });

    // Create leg groups to allow for better positioning and parenting
    // Left leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.2, 0.35, 0);
    // Slight angle for shambling gait
    leftLegGroup.rotation.x = 0.1;
    characterGroup.add(leftLegGroup);

    const leftLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    leftLegMesh.position.set(0, 0, 0); // Position relative to leg group
    leftLegMesh.castShadow = true;
    leftLegGroup.add(leftLegMesh);
    this.leftLeg = leftLegGroup; // Store reference to the group

    // Right leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.2, 0.35, 0);
    // Slight angle for shambling gait
    rightLegGroup.rotation.x = -0.1;
    characterGroup.add(rightLegGroup);

    const rightLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    rightLegMesh.position.set(0, 0, 0); // Position relative to leg group
    rightLegMesh.castShadow = true;
    rightLegGroup.add(rightLegMesh);
    this.rightLeg = rightLegGroup; // Store reference to the group

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

    // Add the character group to the zombie group
    this.zombieGroup.add(characterGroup);

    // Rotate the entire character group to face forward (negative Z direction)
    characterGroup.rotation.y = Math.PI;

    // Adjust the overall scale to match the player
    this.zombieGroup.scale.set(1.2, 1.2, 1.2);
  }

  public update(delta: number): void {
    if (this.isDead_) return;

    // Update attack cooldown
    this.timeSinceLastAttack += delta;

    // Get direction to player
    const playerPos = this.player.getPosition();
    const zombiePos = this.zombieGroup.position.clone();

    // Calculate direction to player
    const direction = new THREE.Vector3()
      .subVectors(playerPos, zombiePos)
      .normalize();

    // Calculate distance to player
    const distance = zombiePos.distanceTo(playerPos);

    // Calculate the angle to face the player
    // Add PI to the angle to account for the initial rotation of the character model
    const angle = Math.atan2(direction.x, direction.z) + Math.PI;

    // Rotate to face the player
    this.zombieGroup.rotation.y = angle;

    // Animate arms with a slight swaying motion
    this.animateArms(delta);

    // If within attack range, attack player
    if (distance <= this.attackRange) {
      this.attackPlayer();
      this.resetLimbPositions();
    } else if (this.world) {
      // Move towards player with collision detection
      const moveAmount = this.moveSpeed * delta;

      // Calculate the intended new position
      const currentPosition = this.zombieGroup.position.clone();
      const intendedPosition = currentPosition
        .clone()
        .add(direction.clone().multiplyScalar(moveAmount));

      // Check for collisions and resolve them
      const newPosition = this.world.resolveCollision(
        currentPosition,
        intendedPosition,
        this.collisionRadius
      );

      // Update position
      this.zombieGroup.position.copy(newPosition);

      // Animate walking
      this.animateWalking(delta);
    }
  }

  private attackPlayer(): void {
    // Check cooldown
    if (this.timeSinceLastAttack < this.attackCooldown) return;

    // Reset cooldown
    this.timeSinceLastAttack = 0;

    // Deal damage to player
    this.player.takeDamage(this.attackDamage, "zombie attack");

    // Visual feedback for attack
    this.animateAttack();
  }

  private animateAttack(): void {
    // Simple attack animation
    const originalPosition = this.zombieGroup.position.clone();
    const playerPos = this.player.getPosition();
    const direction = new THREE.Vector3()
      .subVectors(playerPos, originalPosition)
      .normalize()
      .multiplyScalar(0.5);

    // Move forward quickly
    this.zombieGroup.position.add(direction);

    // Move back after a short delay
    setTimeout(() => {
      if (!this.isDead_) {
        this.zombieGroup.position.copy(originalPosition);
      }
    }, 200);
  }

  public takeDamage(amount: number): void {
    // Don't take damage if already dead
    if (this.isDead_) {
      console.log("Zombie is already dead, can't take more damage");
      return;
    }

    console.log("Zombie taking damage:", amount);
    console.log("Current health:", this.health);

    this.health -= amount;
    console.log("New health:", this.health);

    // Check if dead
    if (this.health <= 0) {
      this.health = 0;
      console.log("Zombie died!");
      this.die();
      return;
    }

    // Visual feedback for taking damage
    const originalColor = (
      this.zombieBody.material as THREE.MeshStandardMaterial
    ).color.clone();
    (this.zombieBody.material as THREE.MeshStandardMaterial).color.set(
      0xff0000
    );
    (this.zombieHead.material as THREE.MeshStandardMaterial).color.set(
      0xff0000
    );

    // Reset color after a short time
    setTimeout(() => {
      if (!this.isDead_) {
        (this.zombieBody.material as THREE.MeshStandardMaterial).color.copy(
          originalColor
        );
        (this.zombieHead.material as THREE.MeshStandardMaterial).color.copy(
          originalColor
        );
      }
    }, 200);
  }

  private die(): void {
    this.isDead_ = true;

    // Change color to indicate death
    (this.zombieBody.material as THREE.MeshStandardMaterial).color.set(
      0x666666
    );
    (this.zombieHead.material as THREE.MeshStandardMaterial).color.set(
      0x666666
    );

    // Fall to the ground - rotate the entire zombie group
    this.zombieGroup.rotation.x = Math.PI / 2;
    this.zombieGroup.position.y = 0.5;

    // Remove after a delay
    setTimeout(() => {
      this.removeFromScene();
    }, 3000);
  }

  public removeFromScene(): void {
    this.scene.remove(this.zombieGroup);
  }

  public setPosition(x: number, y: number, z: number): void {
    this.zombieGroup.position.set(x, y, z);
  }

  public getPosition(): THREE.Vector3 {
    return this.zombieGroup.position.clone();
  }

  public isDead(): boolean {
    return this.isDead_;
  }

  // Add a method to animate the arms
  private animateArms(delta: number): void {
    // Find the arm groups
    const characterGroup = this.zombieGroup.children[0] as THREE.Group;
    if (!characterGroup) return;

    // Look for the arm groups among the character group's children
    let leftArmGroup: THREE.Group | undefined;
    let rightArmGroup: THREE.Group | undefined;

    for (const child of characterGroup.children) {
      if (child instanceof THREE.Group) {
        // Identify arm groups by their position
        if (child.position.x < 0) {
          leftArmGroup = child;
        } else if (child.position.x > 0) {
          rightArmGroup = child;
        }
      }
    }

    if (leftArmGroup && rightArmGroup) {
      // Calculate a simple sine wave for the swaying motion
      const time = Date.now() * 0.001;
      const swayAmount = Math.sin(time * 2) * 0.05;

      // Apply the sway to the arm rotations
      leftArmGroup.rotation.z = 0.2 + swayAmount;
      rightArmGroup.rotation.z = -0.2 - swayAmount;
    }
  }

  // Add a method to animate the legs while walking
  private animateWalking(delta: number): void {
    // Increment animation time based on movement speed
    this.animationTime += delta * this.walkingSpeed;

    // Calculate swing amounts using sine waves
    // Use a slower, more exaggerated swing for zombie shamble
    const legSwing = Math.sin(this.animationTime * 3) * 0.25;

    // Animate legs in opposite phases
    if (this.leftLeg && this.rightLeg) {
      // Add the shambling gait base angles
      this.leftLeg.rotation.x = 0.1 + legSwing;
      this.rightLeg.rotation.x = -0.1 - legSwing;
    }
  }

  // Add a method to reset limb positions when not moving
  private resetLimbPositions(): void {
    // Reset legs to their default shambling positions
    if (this.leftLeg) this.leftLeg.rotation.x = 0.1;
    if (this.rightLeg) this.rightLeg.rotation.x = -0.1;
  }
}
