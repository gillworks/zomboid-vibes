import * as THREE from "three";
import { Player } from "./Player";
import { World } from "../core/World";
import { Zombie } from "./Zombie";

export class ZombieManager {
  private scene: THREE.Scene;
  private player: Player;
  private world: World;
  private loadingManager: THREE.LoadingManager;

  private zombies: Zombie[] = [];
  private maxZombies: number = 20;
  private spawnInterval: number = 5; // seconds
  private timeSinceLastSpawn: number = 0;

  constructor(
    scene: THREE.Scene,
    player: Player,
    world: World,
    loadingManager: THREE.LoadingManager
  ) {
    this.scene = scene;
    this.player = player;
    this.world = world;
    this.loadingManager = loadingManager;

    // Initial zombie spawn
    this.spawnInitialZombies();
  }

  private spawnInitialZombies(): void {
    // Spawn a few zombies at the start
    const initialCount = 5;
    for (let i = 0; i < initialCount; i++) {
      this.spawnZombie();
    }
  }

  private spawnZombie(): void {
    // Don't spawn if we've reached the maximum
    if (this.zombies.length >= this.maxZombies) return;

    // Calculate a random position away from the player
    const playerPos = this.player.getPosition();
    const worldSize = this.world.getWorldSize();

    // Random angle
    const angle = Math.random() * Math.PI * 2;

    // Random distance between 20 and 40 units from player
    const distance = 20 + Math.random() * 20;

    // Calculate position
    const x = playerPos.x + Math.cos(angle) * distance;
    const z = playerPos.z + Math.sin(angle) * distance;

    // Clamp to world bounds
    const halfWorldSize = worldSize / 2;
    const clampedX = Math.max(-halfWorldSize, Math.min(halfWorldSize, x));
    const clampedZ = Math.max(-halfWorldSize, Math.min(halfWorldSize, z));

    // Create the zombie
    const zombie = new Zombie(this.scene, this.player, this.loadingManager);

    // Set the world reference for collision detection
    zombie.setWorld(this.world);

    zombie.setPosition(clampedX, 0, clampedZ);

    // Add to the list
    this.zombies.push(zombie);
  }

  public update(delta: number): void {
    // Update spawn timer
    this.timeSinceLastSpawn += delta;
    if (this.timeSinceLastSpawn >= this.spawnInterval) {
      this.spawnZombie();
      this.timeSinceLastSpawn = 0;
    }

    // Update all zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];

      // Update zombie
      zombie.update(delta);

      // Check if zombie is dead
      if (zombie.isDead()) {
        // Remove from scene
        zombie.removeFromScene();

        // Remove from list
        this.zombies.splice(i, 1);
      }
    }
  }

  public getZombies(): Zombie[] {
    return this.zombies;
  }

  public reset(): void {
    // Remove all zombies
    for (const zombie of this.zombies) {
      zombie.removeFromScene();
    }

    // Clear the list
    this.zombies = [];

    // Reset timer
    this.timeSinceLastSpawn = 0;

    // Spawn initial zombies
    this.spawnInitialZombies();
  }
}
