import * as THREE from "three";
import { Projectile } from "./Projectile";
import { Zombie } from "./Zombie";
import { World } from "../core/World";
import { ZombieManager } from "./ZombieManager";

export class ProjectileManager {
  private scene: THREE.Scene;
  private world: World;
  private zombieManager: ZombieManager;
  private projectiles: Projectile[] = [];

  constructor(scene: THREE.Scene, world: World, zombieManager: ZombieManager) {
    this.scene = scene;
    this.world = world;
    this.zombieManager = zombieManager;
  }

  public createProjectile(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number = 100
  ): void {
    // Create a new projectile
    const projectile = new Projectile(
      this.scene,
      position,
      direction,
      this.world,
      damage
    );

    // Add to the list of active projectiles
    this.projectiles.push(projectile);
  }

  public update(delta: number): void {
    // Get all zombies from the zombie manager
    const zombies = this.zombieManager.getZombies();
    console.log(
      `ProjectileManager: Got ${zombies.length} zombies from ZombieManager`
    );

    // Update each projectile
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      console.log(`ProjectileManager: Updating projectile ${i}`);

      // Update the projectile
      projectile.update(delta, zombies);

      // Remove inactive projectiles
      if (!projectile.isActiveProjectile()) {
        console.log(`ProjectileManager: Removing inactive projectile ${i}`);
        this.projectiles.splice(i, 1);
      }
    }
  }

  public getProjectileCount(): number {
    return this.projectiles.length;
  }
}
