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
    let material: THREE.MeshStandardMaterial;

    // Choose geometry based on item type
    switch (type) {
      case "food":
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.5,
          metalness: 0.5,
          emissive: color,
          emissiveIntensity: 0.2,
        });
        break;
      case "medkit":
        geometry = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.5,
          metalness: 0.5,
          emissive: color,
          emissiveIntensity: 0.2,
        });
        break;
      case "weapon":
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        material = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.5,
          metalness: 0.5,
          emissive: color,
          emissiveIntensity: 0.2,
        });
        break;
      case "ammo":
        // Create a larger, more visible box shape for ammo
        geometry = new THREE.BoxGeometry(0.4, 0.3, 0.5);
        // Make ammo boxes brighter and more reflective
        material = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.3,
          metalness: 0.7,
          emissive: color,
          emissiveIntensity: 0.5, // Higher emissive intensity for better visibility
        });
        break;
      default:
        geometry = new THREE.SphereGeometry(0.3, 16, 16);
        material = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.5,
          metalness: 0.5,
          emissive: color,
          emissiveIntensity: 0.2,
        });
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private addFloatingAnimation(): void {
    // Store original position
    const originalY = this.itemMesh.position.y;

    // For ammo items, float higher and rotate faster
    const isAmmo = this.type === "ammo";
    const floatHeight = isAmmo ? 0.2 : 0.1; // Higher float for ammo
    const rotationSpeed = isAmmo ? 0.03 : 0.01; // Faster rotation for ammo

    // Create animation function
    const animate = () => {
      // Only continue if the mesh is still in the scene
      if (!this.itemMesh.parent) return;

      // Calculate new Y position with sine wave
      const time = Date.now() * 0.001;
      this.itemMesh.position.y = originalY + Math.sin(time * 2) * floatHeight;

      // Rotate the item
      this.itemMesh.rotation.y += rotationSpeed;

      // Request next frame
      requestAnimationFrame(animate);
    };

    // Start animation
    animate();
  }

  public setPosition(x: number, y: number, z: number): void {
    // For ammo items, position them higher off the ground for better visibility
    const heightOffset = this.type === "ammo" ? 1.5 : 1.0;
    this.itemMesh.position.set(x, heightOffset, z);
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

  // Add a method to check if this is a pistol
  public isPistol(): boolean {
    return this.type === "weapon" && this.name === "Pistol";
  }

  public isAmmo(): boolean {
    return this.type === "ammo";
  }
}
