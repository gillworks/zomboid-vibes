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
  }

  public update(delta: number): void {
    // Update world elements if needed
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
}
