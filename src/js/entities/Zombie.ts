import * as THREE from "three";
import { Player } from "./Player";

export class Zombie {
  private scene: THREE.Scene;
  private player: Player;
  private loadingManager: THREE.LoadingManager;

  private zombieGroup: THREE.Group;
  private zombieBody!: THREE.Mesh;
  private zombieHead!: THREE.Mesh;

  private health: number = 100;
  private moveSpeed: number = 2;
  private attackRange: number = 1.5;
  private attackDamage: number = 10;
  private attackCooldown: number = 1; // seconds
  private timeSinceLastAttack: number = 0;

  private isDead_: boolean = false;

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

  private createZombieModel(): void {
    // Create a simple zombie model
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a6e2a, // Green
      roughness: 0.7,
      metalness: 0.3,
    });
    this.zombieBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.zombieBody.position.y = 0.75;
    this.zombieBody.castShadow = true;
    this.zombieGroup.add(this.zombieBody);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a6e2a, // Green
      roughness: 0.7,
      metalness: 0.1,
    });
    this.zombieHead = new THREE.Mesh(headGeometry, headMaterial);
    this.zombieHead.position.y = 1.85;
    this.zombieHead.castShadow = true;
    this.zombieGroup.add(this.zombieHead);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a6e2a, // Green
      roughness: 0.7,
      metalness: 0.3,
    });

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.7, 0.75, 0);
    leftArm.rotation.z = Math.PI / 2;
    leftArm.castShadow = true;
    this.zombieGroup.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.7, 0.75, 0);
    rightArm.rotation.z = -Math.PI / 2;
    rightArm.castShadow = true;
    this.zombieGroup.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4a1a, // Darker green
      roughness: 0.7,
      metalness: 0.2,
    });

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.25, 0);
    leftLeg.castShadow = true;
    this.zombieGroup.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.25, 0);
    rightLeg.castShadow = true;
    this.zombieGroup.add(rightLeg);
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

    // Look at player
    this.zombieGroup.lookAt(playerPos);

    // If within attack range, attack player
    if (distance <= this.attackRange) {
      this.attackPlayer();
    } else {
      // Move towards player
      const moveAmount = this.moveSpeed * delta;
      this.zombieGroup.position.add(direction.multiplyScalar(moveAmount));
    }
  }

  private attackPlayer(): void {
    // Check cooldown
    if (this.timeSinceLastAttack < this.attackCooldown) return;

    // Reset cooldown
    this.timeSinceLastAttack = 0;

    // Deal damage to player
    this.player.takeDamage(this.attackDamage);

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
    this.health -= amount;

    // Check if dead
    if (this.health <= 0) {
      this.health = 0;
      this.die();
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

    // Fall to the ground
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
}
