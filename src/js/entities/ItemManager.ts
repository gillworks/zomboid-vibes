import * as THREE from "three";
import { Player } from "./Player";
import { World } from "../core/World";
import { Item } from "./Item";

export class ItemManager {
  private scene: THREE.Scene;
  private player: Player;
  private world: World;
  private loadingManager: THREE.LoadingManager;

  private items: Item[] = [];
  private maxItems: number = 90;
  private spawnInterval: number = 3.33;
  private timeSinceLastSpawn: number = 0;

  // Item types and their probabilities
  private itemTypes = [
    {
      type: "food",
      name: "Canned Food",
      value: 40,
      probability: 0.3,
      color: 0xf5deb3,
    },
    {
      type: "food",
      name: "Water Bottle",
      value: 40,
      probability: 0.25,
      color: 0x87ceeb,
    },
    {
      type: "medkit",
      name: "Bandage",
      value: 20,
      probability: 0.15,
      color: 0xffffff,
    },
    {
      type: "medkit",
      name: "First Aid Kit",
      value: 40,
      probability: 0.1,
      color: 0xff0000,
    },
    {
      type: "weapon",
      name: "Baseball Bat",
      value: 15,
      probability: 0.05,
      color: 0x8b4513,
    },
    {
      type: "weapon",
      name: "Pistol",
      value: 30,
      probability: 0.05,
      color: 0x2f4f4f,
    },
    {
      type: "ammo",
      name: "Pistol Ammo",
      value: 10, // 10 bullets per pickup
      probability: 0.1,
      color: 0xffff00,
    },
  ];

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

    // Initial item spawn
    this.spawnInitialItems();
  }

  private spawnInitialItems(): void {
    // Spawn a few items at the start
    const initialCount = 30;
    for (let i = 0; i < initialCount; i++) {
      this.spawnItem();
    }

    // Guarantee some ammo boxes near the player
    this.spawnGuaranteedAmmo(5); // Spawn 5 ammo boxes
  }

  private spawnGuaranteedAmmo(count: number): void {
    const playerPos = this.player.getPosition();
    const worldSize = this.world.getWorldSize();
    const halfWorldSize = worldSize / 2;

    // Find the ammo item type
    const ammoType = this.itemTypes.find(
      (item) => item.type === "ammo" && item.name === "Pistol Ammo"
    );

    if (!ammoType) return;

    for (let i = 0; i < count; i++) {
      // Random angle
      const angle = Math.random() * Math.PI * 2;

      // Random distance between 3 and 10 units from player
      const distance = 3 + Math.random() * 7;

      // Calculate position
      let x = playerPos.x + Math.cos(angle) * distance;
      let z = playerPos.z + Math.sin(angle) * distance;

      // Clamp to world bounds
      x = Math.max(-halfWorldSize, Math.min(halfWorldSize, x));
      z = Math.max(-halfWorldSize, Math.min(halfWorldSize, z));

      // Create the ammo item
      const item = new Item(
        this.scene,
        ammoType.type,
        ammoType.name,
        ammoType.value,
        ammoType.color
      );

      item.setPosition(x, 0, z);

      // Add to the list
      this.items.push(item);
    }
  }

  private spawnItem(): void {
    // Don't spawn if we've reached the maximum
    if (this.items.length >= this.maxItems) return;

    // Choose a random item type based on probability
    const itemType = this.chooseRandomItemType();

    // Calculate a random position in the world
    const worldSize = this.world.getWorldSize();
    const halfWorldSize = worldSize / 2;

    let x, z;

    // For ammo, spawn closer to the player to make it easier to find
    if (itemType.type === "ammo") {
      const playerPos = this.player.getPosition();

      // Random angle
      const angle = Math.random() * Math.PI * 2;

      // Random distance between 5 and 15 units from player
      const distance = 5 + Math.random() * 10;

      // Calculate position
      x = playerPos.x + Math.cos(angle) * distance;
      z = playerPos.z + Math.sin(angle) * distance;

      // Clamp to world bounds
      x = Math.max(-halfWorldSize, Math.min(halfWorldSize, x));
      z = Math.max(-halfWorldSize, Math.min(halfWorldSize, z));
    } else {
      // Random position for other items
      x = (Math.random() - 0.5) * worldSize;
      z = (Math.random() - 0.5) * worldSize;
    }

    // Create the item
    const item = new Item(
      this.scene,
      itemType.type,
      itemType.name,
      itemType.value,
      itemType.color
    );

    item.setPosition(x, 0, z);

    // Add to the list
    this.items.push(item);
  }

  private chooseRandomItemType(): any {
    // Choose a random item type based on probability
    const rand = Math.random();
    let cumulativeProbability = 0;

    for (const itemType of this.itemTypes) {
      cumulativeProbability += itemType.probability;
      if (rand < cumulativeProbability) {
        return itemType;
      }
    }

    // Fallback to the first item type
    return this.itemTypes[0];
  }

  public update(delta: number): void {
    // Update spawn timer
    this.timeSinceLastSpawn += delta;
    if (this.timeSinceLastSpawn >= this.spawnInterval) {
      this.spawnItem();
      this.timeSinceLastSpawn = 0;
    }

    // Check for item pickups
    this.checkItemPickups();
  }

  private checkItemPickups(): void {
    const playerPos = this.player.getPosition();
    const pickupRange = 1.5;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const itemPos = item.getPosition();

      // Calculate distance to player
      const distance = itemPos.distanceTo(playerPos);

      // If within pickup range, pick up the item
      if (distance <= pickupRange) {
        this.pickupItem(i);
      }
    }
  }

  private pickupItem(index: number): void {
    const item = this.items[index];
    const itemType = item.getType();
    const itemName = item.getName();
    const itemValue = item.getValue();

    // Add to inventory (for all item types including ammo)
    const added = this.player.addToInventory({
      type: itemType,
      name: itemName,
      value: itemValue,
    });

    if (!added) {
      console.log("Inventory full, couldn't pick up item");
      return; // Don't remove the item if it couldn't be added
    }

    // Remove the item from the scene
    item.removeFromScene();

    // Remove from the list
    this.items.splice(index, 1);
  }

  public getItems(): Item[] {
    return this.items;
  }

  public reset(): void {
    // Remove all items
    for (const item of this.items) {
      item.removeFromScene();
    }

    // Clear the list
    this.items = [];

    // Reset timer
    this.timeSinceLastSpawn = 0;

    // Spawn initial items
    this.spawnInitialItems();
  }
}
