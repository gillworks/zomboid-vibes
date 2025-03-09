import * as THREE from "three";
import { Zombie } from "./Zombie";
import { World } from "../core/World";

export class Projectile {
  private scene: THREE.Scene;
  private projectileMesh: THREE.Mesh;
  private direction: THREE.Vector3;
  private speed: number = 20; // Units per second
  private damage: number = 100; // Damage dealt to zombies (increased to one-shot zombies)
  private maxDistance: number = 100; // Maximum travel distance (increased for better range)
  private distanceTraveled: number = 0;
  private isActive: boolean = true;
  private world: World | null = null;
  private knockbackForce: number = 8; // Force of knockback effect (increased for more dramatic effect)

  constructor(
    scene: THREE.Scene,
    startPosition: THREE.Vector3,
    direction: THREE.Vector3,
    world: World | null = null,
    damage: number = 100
  ) {
    this.scene = scene;
    this.direction = direction.normalize();
    this.world = world;
    this.damage = damage; // Set the damage from the parameter

    // Create bullet mesh
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x444444,
    });

    this.projectileMesh = new THREE.Mesh(geometry, material);
    this.projectileMesh.castShadow = true;

    // Set initial position
    this.projectileMesh.position.copy(startPosition);

    // Add to scene
    this.scene.add(this.projectileMesh);
  }

  public update(delta: number, zombies: Zombie[]): void {
    if (!this.isActive) return;

    console.log(
      `Projectile update: Active projectile at position ${this.projectileMesh.position.x.toFixed(
        2
      )}, ${this.projectileMesh.position.y.toFixed(
        2
      )}, ${this.projectileMesh.position.z.toFixed(2)}`
    );
    console.log(`Projectile update: Received ${zombies.length} zombies`);

    // Log zombie positions for debugging
    zombies.forEach((zombie, index) => {
      if (!zombie.isDead()) {
        const zombiePos = zombie.getPosition();
        console.log(
          `Zombie ${index} position: ${zombiePos.x.toFixed(
            2
          )}, ${zombiePos.y.toFixed(2)}, ${zombiePos.z.toFixed(2)}`
        );
      }
    });

    // Calculate movement for this frame
    const moveAmount = this.speed * delta;
    const movement = this.direction.clone().multiplyScalar(moveAmount);

    // Store current position
    const currentPosition = this.projectileMesh.position.clone();

    // Calculate new position
    const newPosition = currentPosition.clone().add(movement);

    // Check for collisions with world
    if (this.world) {
      const resolvedPosition = this.world.resolveCollision(
        currentPosition,
        newPosition,
        0.05 // Bullet collision radius
      );

      // If position was changed by collision resolution, bullet hit something
      if (!resolvedPosition.equals(newPosition)) {
        this.deactivate();
        return;
      }

      // Update position
      this.projectileMesh.position.copy(resolvedPosition);
    } else {
      // No world collision, just update position
      this.projectileMesh.position.copy(newPosition);
    }

    // Update distance traveled
    this.distanceTraveled += moveAmount;

    // Check if maximum distance reached
    if (this.distanceTraveled >= this.maxDistance) {
      console.log(`Projectile reached maximum distance: ${this.maxDistance}`);
      this.deactivate();
      return;
    }

    // Check for collisions with zombies
    console.log(
      `Checking for zombie collisions with ${zombies.length} zombies`
    );
    this.checkZombieCollisions(zombies);
  }

  private checkZombieCollisions(zombies: Zombie[]): void {
    if (!this.isActive) return;

    const bulletPos = this.projectileMesh.position;
    const hitRadius = 1.5; // Increased collision radius for hitting zombies (was 0.5)

    console.log(`Checking collisions with ${zombies.length} zombies`);

    for (const zombie of zombies) {
      if (zombie.isDead()) continue;

      const zombiePos = zombie.getPosition();

      // Create a 2D distance calculation (ignoring Y-axis height differences)
      const horizontalDistance = Math.sqrt(
        Math.pow(bulletPos.x - zombiePos.x, 2) +
          Math.pow(bulletPos.z - zombiePos.z, 2)
      );

      // Original 3D distance calculation
      const distance = bulletPos.distanceTo(zombiePos);

      console.log(
        `Distance to zombie: 3D=${distance.toFixed(
          2
        )}, 2D=${horizontalDistance.toFixed(2)}, Hit radius: ${hitRadius}`
      );

      // If bullet hits zombie (using horizontal distance for more forgiving collision)
      if (horizontalDistance <= hitRadius) {
        console.log(`Hit zombie! Applying damage: ${this.damage}`);

        // Deal damage to zombie
        zombie.takeDamage(this.damage);

        // Apply knockback effect
        const knockbackDirection = this.direction.clone();
        const knockbackDistance = this.knockbackForce;
        const newPosition = zombiePos
          .clone()
          .add(knockbackDirection.multiplyScalar(knockbackDistance));

        // Set the zombie's new position with knockback
        zombie.setPosition(newPosition.x, 0.4, newPosition.z);

        // Deactivate bullet after hitting
        this.deactivate();
        return;
      }
    }
  }

  private deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.scene.remove(this.projectileMesh);
  }

  public isActiveProjectile(): boolean {
    return this.isActive;
  }

  public getPosition(): THREE.Vector3 {
    return this.projectileMesh.position.clone();
  }
}
