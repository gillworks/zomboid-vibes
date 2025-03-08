import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise";

export class World {
  private scene: THREE.Scene;
  private loadingManager: THREE.LoadingManager;

  private worldSize: number = 100;
  private gridSize: number = 1;
  private terrainGeometry: THREE.PlaneGeometry;
  private terrainMaterial: THREE.MeshStandardMaterial;
  private terrain: THREE.Mesh;

  private buildings: THREE.Group;
  private trees: THREE.Group;
  private obstacles: THREE.Group;

  // Collision-related properties
  private colliders: THREE.Object3D[] = [];
  private collisionRadius: { [id: string]: number } = {};

  private noise: SimplexNoise;

  constructor(scene: THREE.Scene, loadingManager: THREE.LoadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.noise = new SimplexNoise();

    this.terrainGeometry = new THREE.PlaneGeometry(
      this.worldSize,
      this.worldSize,
      this.worldSize / this.gridSize,
      this.worldSize / this.gridSize
    );

    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x3c3c3c,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true,
    });

    this.terrain = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;

    this.buildings = new THREE.Group();
    this.trees = new THREE.Group();
    this.obstacles = new THREE.Group();
  }

  public init(): void {
    this.generateTerrain();
    this.scene.add(this.terrain);

    this.generateBuildings();
    this.scene.add(this.buildings);

    this.generateTrees();
    this.scene.add(this.trees);

    this.generateObstacles();
    this.scene.add(this.obstacles);

    // Initialize colliders after all objects are created
    this.initializeColliders();
  }

  public update(delta: number): void {
    // Update world elements if needed
  }

  // Initialize colliders for all objects that should have collision
  private initializeColliders(): void {
    // Add buildings to colliders
    this.buildings.children.forEach((building) => {
      this.colliders.push(building);
      // Buildings are box-shaped with width and depth of 5
      // For a box, the maximum distance from center to corner in XZ plane is sqrt(5²/2 + 5²/2) = 5
      // Using a slightly smaller radius than actual size for better gameplay
      this.collisionRadius[building.id] = 3.0; // Increased from 2.3 to 3.0
    });

    // Add trees to colliders
    this.trees.children.forEach((tree) => {
      this.colliders.push(tree);
      // Trees have a trunk and top, use a radius that covers the trunk
      this.collisionRadius[tree.id] = 0.5; // Tree trunks are about 0.4 wide
    });

    // Add obstacles to colliders
    this.obstacles.children.forEach((obstacle) => {
      this.colliders.push(obstacle);
      // Obstacles (rocks) have varying sizes, use a radius based on their scale
      const scale = obstacle.scale.x;
      this.collisionRadius[obstacle.id] = 0.5 * scale; // Base radius * scale
    });

    console.log(`Initialized ${this.colliders.length} colliders`);
  }

  // Check if a position collides with any object
  public checkCollision(
    position: THREE.Vector3,
    radius: number = 0.5
  ): boolean {
    for (const collider of this.colliders) {
      const colliderPos = collider.position.clone();

      // Create 2D positions (ignoring Y-axis) for distance calculation
      const pos2D = new THREE.Vector2(position.x, position.z);
      const colliderPos2D = new THREE.Vector2(colliderPos.x, colliderPos.z);

      // Calculate distance in 2D (XZ plane only)
      const distance = pos2D.distanceTo(colliderPos2D);
      const collisionDistance = radius + this.collisionRadius[collider.id];

      if (distance < collisionDistance) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }

  // Get a valid position after collision resolution
  public resolveCollision(
    currentPosition: THREE.Vector3,
    intendedPosition: THREE.Vector3,
    radius: number = 0.5
  ): THREE.Vector3 {
    // If no collision at intended position, return it
    if (!this.checkCollision(intendedPosition, radius)) {
      return intendedPosition;
    }

    // Otherwise, find the direction of movement in 2D (XZ plane)
    const moveDirection2D = new THREE.Vector2(
      intendedPosition.x - currentPosition.x,
      intendedPosition.z - currentPosition.z
    ).normalize();

    // Calculate the maximum distance in 2D
    const currentPos2D = new THREE.Vector2(
      currentPosition.x,
      currentPosition.z
    );
    const intendedPos2D = new THREE.Vector2(
      intendedPosition.x,
      intendedPosition.z
    );
    const maxDistance = currentPos2D.distanceTo(intendedPos2D);

    // Start with current position
    let validPosition = currentPosition.clone();

    // Binary search for the maximum valid distance
    let minDist = 0;
    let maxDist = maxDistance;
    const precision = 0.1; // Precision of the search

    while (maxDist - minDist > precision) {
      const midDist = (minDist + maxDist) / 2;

      // Calculate test position in 2D
      const testPos2D = currentPos2D
        .clone()
        .add(moveDirection2D.clone().multiplyScalar(midDist));

      // Convert back to 3D for collision check
      const testPosition = new THREE.Vector3(
        testPos2D.x,
        intendedPosition.y, // Keep the original Y value
        testPos2D.y // y in 2D is z in 3D
      );

      if (this.checkCollision(testPosition, radius)) {
        maxDist = midDist;
      } else {
        minDist = midDist;
        validPosition = testPosition;
      }
    }

    return validPosition;
  }

  private generateTerrain(): void {
    // Apply noise to the terrain vertices
    const vertices = this.terrainGeometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];

      // Apply simplex noise for natural-looking terrain
      const elevation = this.noise.noise(x * 0.02, z * 0.02) * 0.5;

      // Set the y-coordinate (height) of the vertex
      vertices[i + 1] = elevation;
    }

    // Update the geometry
    this.terrainGeometry.computeVertexNormals();
    this.terrainGeometry.attributes.position.needsUpdate = true;

    // Create a grid helper
    const gridHelper = new THREE.GridHelper(
      this.worldSize,
      this.worldSize / this.gridSize
    );
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private generateBuildings(): void {
    // Create a few buildings scattered around the world
    const buildingCount = 10;
    const buildingGeometry = new THREE.BoxGeometry(5, 10, 5);
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.7,
      metalness: 0.2,
    });

    for (let i = 0; i < buildingCount; i++) {
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);

      // Position the building randomly in the world
      const x = (Math.random() - 0.5) * (this.worldSize - 10);
      const z = (Math.random() - 0.5) * (this.worldSize - 10);

      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAt(x, z);

      building.position.set(x, terrainHeight + 5, z);
      building.castShadow = true;
      building.receiveShadow = true;

      // Add some random rotation
      building.rotation.y = Math.random() * Math.PI * 2;

      this.buildings.add(building);
    }
  }

  private generateTrees(): void {
    // Create trees scattered around the world
    const treeCount = 50;

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Tree top
    const topGeometry = new THREE.ConeGeometry(1.5, 3, 8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e8b57,
      roughness: 0.8,
      metalness: 0.1,
    });

    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();

      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      trunk.position.y = 1;
      tree.add(trunk);

      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.castShadow = true;
      top.receiveShadow = true;
      top.position.y = 3.5;
      tree.add(top);

      // Position the tree randomly in the world
      const x = (Math.random() - 0.5) * (this.worldSize - 5);
      const z = (Math.random() - 0.5) * (this.worldSize - 5);

      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAt(x, z);

      tree.position.set(x, terrainHeight, z);

      // Add some random rotation
      tree.rotation.y = Math.random() * Math.PI * 2;

      this.trees.add(tree);
    }
  }

  private generateObstacles(): void {
    // Create obstacles like rocks, debris, etc.
    const obstacleCount = 30;

    // Rock geometry
    const rockGeometries = [
      new THREE.DodecahedronGeometry(0.5, 0),
      new THREE.DodecahedronGeometry(0.8, 1),
      new THREE.DodecahedronGeometry(0.6, 1),
    ];

    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1,
    });

    for (let i = 0; i < obstacleCount; i++) {
      // Choose a random rock geometry
      const rockGeometry =
        rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);

      rock.castShadow = true;
      rock.receiveShadow = true;

      // Position the rock randomly in the world
      const x = (Math.random() - 0.5) * (this.worldSize - 2);
      const z = (Math.random() - 0.5) * (this.worldSize - 2);

      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAt(x, z);

      rock.position.set(x, terrainHeight + 0.3, z);

      // Add some random rotation
      rock.rotation.x = Math.random() * Math.PI;
      rock.rotation.y = Math.random() * Math.PI;
      rock.rotation.z = Math.random() * Math.PI;

      // Add some random scaling
      const scale = 0.5 + Math.random() * 1.5;
      rock.scale.set(scale, scale, scale);

      this.obstacles.add(rock);
    }
  }

  private getTerrainHeightAt(x: number, z: number): number {
    // Calculate the terrain height at a given world position
    // This is a simplified version that uses the same noise function as the terrain generation
    return this.noise.noise(x * 0.02, z * 0.02) * 0.5;
  }

  public getWorldSize(): number {
    return this.worldSize;
  }

  public getObstacles(): THREE.Group {
    return this.obstacles;
  }

  public getBuildings(): THREE.Group {
    return this.buildings;
  }

  public getTrees(): THREE.Group {
    return this.trees;
  }

  public getColliders(): THREE.Object3D[] {
    return this.colliders;
  }
}
