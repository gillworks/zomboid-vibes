import * as THREE from "three";

export class Item {
  private scene: THREE.Scene;
  private itemMesh: THREE.Mesh;

  private type: string;
  private name: string;
  private value: number;
  private quantity: number = 1;
  private maxStackSize: number = 10;

  constructor(
    scene: THREE.Scene,
    type: string,
    name: string,
    value: number,
    color: number
  ) {
    this.scene = scene;
    this.type = type;
    this.name = name;
    this.value = value;

    // Create the item mesh based on type
    this.itemMesh = this.createItemMesh(type, color);

    // Set initial position at origin with fixed height
    this.setPosition(0, 0, 0);

    // Add to scene
    this.scene.add(this.itemMesh);

    // Add floating animation
    this.addFloatingAnimation();
  }

  private createItemMesh(type: string, color: number): THREE.Mesh {
    let geometry: THREE.BufferGeometry;

    // Choose geometry based on item type
    switch (type) {
      case "food":
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        break;
      case "medkit":
        geometry = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        break;
      case "weapon":
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        break;
      default:
        geometry = new THREE.SphereGeometry(0.3, 16, 16);
    }

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.5,
      emissive: color,
      emissiveIntensity: 0.2,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private addFloatingAnimation(): void {
    // Store original position
    const originalY = this.itemMesh.position.y;

    // Create animation function
    const animate = () => {
      // Only continue if the mesh is still in the scene
      if (!this.itemMesh.parent) return;

      // Calculate new Y position with sine wave
      const time = Date.now() * 0.001;
      this.itemMesh.position.y = originalY + Math.sin(time * 2) * 0.1;

      // Rotate the item
      this.itemMesh.rotation.y += 0.01;

      // Request next frame
      requestAnimationFrame(animate);
    };

    // Start animation
    animate();
  }

  public setPosition(x: number, y: number, z: number): void {
    this.itemMesh.position.set(x, 1.0, z); // Fixed height of 1.0 units
  }

  public getPosition(): THREE.Vector3 {
    return this.itemMesh.position.clone();
  }

  public removeFromScene(): void {
    console.log("Removing item from scene:", this.name);
    this.scene.remove(this.itemMesh);
  }

  public getType(): string {
    return this.type;
  }

  public getName(): string {
    return this.name;
  }

  public getValue(): number {
    return this.value;
  }

  public getQuantity(): number {
    return this.quantity;
  }

  public setQuantity(quantity: number): void {
    this.quantity = quantity;
  }

  public incrementQuantity(amount: number = 1): void {
    this.quantity += amount;
  }

  public decrementQuantity(amount: number = 1): boolean {
    if (this.quantity >= amount) {
      this.quantity -= amount;
      return true;
    }
    return false;
  }

  public isStackable(): boolean {
    return this.type !== "weapon";
  }

  public getMaxStackSize(): number {
    return this.maxStackSize;
  }
}
