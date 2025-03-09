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
      probability: 0.4,
      color: 0xf5deb3,
    },
    {
      type: "food",
      name: "Water Bottle",
      value: 40,
      probability: 0.3,
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
      probability: 0.03,
      color: 0x8b4513,
    },
    {
      type: "weapon",
      name: "Pistol",
      value: 30,
      probability: 0.02,
      color: 0x2f4f4f,
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
  }

  private spawnItem(): void {
    // Don't spawn if we've reached the maximum
    if (this.items.length >= this.maxItems) return;

    // Calculate a random position in the world
    const worldSize = this.world.getWorldSize();
    const halfWorldSize = worldSize / 2;

    // Random position
    const x = (Math.random() - 0.5) * worldSize;
    const z = (Math.random() - 0.5) * worldSize;

    // Choose a random item type based on probability
    const itemType = this.chooseRandomItemType();

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
    console.log("Picking up item:", item);

    // Add the actual Item object to player inventory
    const added = this.player.addToInventory(item);
    console.log("Item added to inventory:", added);

    if (added) {
      // Item is now managed by the inventory system
      // Remove from list (but don't remove from scene yet, as that's handled in addToInventory)
      this.items.splice(index, 1);
      console.log("Item removed from items list");
    }
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
