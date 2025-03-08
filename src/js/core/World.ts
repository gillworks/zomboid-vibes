import * as THREE from "three";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

export class World {
  private scene: THREE.Scene;
  private loadingManager: THREE.LoadingManager;

  // Increase world size for a larger neighborhood
  private worldSize: number = 200;
  private gridSize: number = 1;
  private terrainGeometry: THREE.PlaneGeometry;
  private terrainMaterial: THREE.MeshStandardMaterial;
  private terrain: THREE.Mesh;

  private buildings: THREE.Group;
  private trees: THREE.Group;
  private obstacles: THREE.Group;
  private roads: THREE.Group;
  private sidewalks: THREE.Group;

  // Neighborhood configuration
  private blockSize: number = 30; // Size of a city block
  private roadWidth: number = 8; // Width of roads
  private sidewalkWidth: number = 2; // Width of sidewalks
  private plotSize: number = 10; // Size of a house plot
  private houseSize: number = 8; // Size of houses
  private housePadding: number = 1; // Space between houses and plot edge

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
    this.roads = new THREE.Group();
    this.sidewalks = new THREE.Group();
  }

  public init(): void {
    this.generateTerrain();
    this.scene.add(this.terrain);

    this.generateRoads();
    this.scene.add(this.roads);

    this.generateSidewalks();
    this.scene.add(this.sidewalks);

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
    // Clear existing colliders
    this.colliders = [];
    this.collisionRadius = {};

    // Add buildings to colliders
    this.buildings.children.forEach((building) => {
      // For grouped objects (like houses), add each child to colliders
      if (building instanceof THREE.Group) {
        building.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            this.colliders.push(child);

            // Calculate collision radius based on the mesh's geometry
            if (child.geometry instanceof THREE.BoxGeometry) {
              const size = new THREE.Vector3();
              child.geometry.computeBoundingBox();
              child.geometry.boundingBox?.getSize(size);

              // Use half the maximum dimension as the collision radius
              const maxDimension = Math.max(size.x, size.z);
              this.collisionRadius[child.id] = (maxDimension / 2) * 0.8; // 80% of actual size for better gameplay
            } else {
              // Default collision radius for non-box geometries
              this.collisionRadius[child.id] = 0.5;
            }
          }
        });
      } else if (building instanceof THREE.Mesh) {
        this.colliders.push(building);

        // For houses, use a slightly smaller radius than actual size for better gameplay
        this.collisionRadius[building.id] = (this.houseSize / 2) * 0.8;
      }
    });

    // Add obstacles to colliders
    this.obstacles.children.forEach((obstacle) => {
      if (obstacle instanceof THREE.Group) {
        // For grouped obstacles (like mailboxes), add the group as a collider
        this.colliders.push(obstacle);
        this.collisionRadius[obstacle.id] = 0.3; // Small collision radius for grouped obstacles
      } else if (obstacle instanceof THREE.Mesh) {
        // For individual obstacles
        this.colliders.push(obstacle);

        // Set collision radius based on the obstacle's scale
        const scale = obstacle.scale.x; // Assuming uniform scaling
        this.collisionRadius[obstacle.id] = 0.3 * scale;
      }
    });

    // Add trees to colliders (only the trunks)
    this.trees.children.forEach((tree) => {
      if (tree instanceof THREE.Group) {
        // Find the trunk in the tree group (first child)
        const trunk = tree.children[0];
        if (trunk) {
          this.colliders.push(trunk);

          // Set collision radius based on the tree's scale
          const scale = tree.scale.x; // Assuming uniform scaling
          this.collisionRadius[trunk.id] = 0.3 * scale;
        }
      }
    });

    // Add roads and sidewalks as non-colliders (for future use if needed)
    // We don't add them to this.colliders because we want players to walk on them

    console.log(`Initialized ${this.colliders.length} colliders`);

    // Verify that all colliders have a valid collision radius
    let missingRadiusCount = 0;
    this.colliders.forEach((collider) => {
      if (this.collisionRadius[collider.id] === undefined) {
        missingRadiusCount++;
        // Set a default radius for any missing entries
        this.collisionRadius[collider.id] = 0.5;
      }
    });

    if (missingRadiusCount > 0) {
      console.warn(
        `Fixed ${missingRadiusCount} colliders with missing radius values`
      );
    }
  }

  // Check if a position collides with any object
  public checkCollision(
    position: THREE.Vector3,
    radius: number = 0.5
  ): boolean {
    // Check if position is outside the world boundaries
    const halfWorldSize = this.worldSize / 2;
    if (
      position.x < -halfWorldSize + radius ||
      position.x > halfWorldSize - radius ||
      position.z < -halfWorldSize + radius ||
      position.z > halfWorldSize - radius
    ) {
      return true; // Collision with world boundary
    }

    // Check collisions with objects
    for (const collider of this.colliders) {
      // Skip if the collider doesn't have a valid position
      if (!collider.position || !this.collisionRadius[collider.id]) {
        continue;
      }

      // Get the world position of the collider
      const colliderWorldPos = new THREE.Vector3();
      collider.getWorldPosition(colliderWorldPos);

      // Create 2D positions (ignoring Y-axis) for distance calculation
      const pos2D = new THREE.Vector2(position.x, position.z);
      const colliderPos2D = new THREE.Vector2(
        colliderWorldPos.x,
        colliderWorldPos.z
      );

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

    // Define the neighborhood boundary
    const neighborhoodMargin = 10;
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize +
      neighborhoodMargin;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Create a grass material for the forest floor
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x4caf50, // Green for grass
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    // Create a UV attribute for the terrain geometry
    const uvs = [];
    const positionAttribute = this.terrainGeometry.attributes.position;
    const count = positionAttribute.count;

    for (let i = 0; i < count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);

      // Normalize coordinates to [0, 1] range for UV mapping
      const u = (x + this.worldSize / 2) / this.worldSize;
      const v = (z + this.worldSize / 2) / this.worldSize;

      uvs.push(u, v);
    }

    this.terrainGeometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(uvs, 2)
    );

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];

      // Check if the vertex is within the neighborhood
      const isInNeighborhood =
        Math.abs(x) < neighborhoodHalfSize &&
        Math.abs(z) < neighborhoodHalfSize;

      // Apply different noise based on whether the vertex is in the neighborhood or forest
      let elevation;

      if (isInNeighborhood) {
        // Very subtle noise for the neighborhood (flat terrain)
        elevation = this.noise.noise(x * 0.01, z * 0.01) * 0.1;
      } else {
        // More pronounced noise for the forest (slightly uneven terrain)
        elevation = this.noise.noise(x * 0.02, z * 0.02) * 0.5;
      }

      // Set the y-coordinate (height) of the vertex
      vertices[i + 1] = elevation;
    }

    // Update the geometry
    this.terrainGeometry.computeVertexNormals();
    this.terrainGeometry.attributes.position.needsUpdate = true;

    // Create a grid helper (only visible in development)
    // const gridHelper = new THREE.GridHelper(
    //   this.worldSize,
    //   this.worldSize / this.gridSize
    // );
    // gridHelper.position.y = 0.01;
    // this.scene.add(gridHelper);
  }

  private generateRoads(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333, // Dark gray for asphalt
      roughness: 0.9,
      metalness: 0.1,
    });

    // Calculate the number of blocks that can fit in the world
    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // Define the neighborhood boundary
    const neighborhoodSize = numBlocksX * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Create horizontal roads (only within the neighborhood)
    for (let i = 0; i <= numBlocksZ; i++) {
      const z = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(z) > neighborhoodHalfSize) continue;

      const roadGeometry = new THREE.BoxGeometry(
        neighborhoodSize,
        0.1,
        this.roadWidth
      );
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.position.set(0, 0.05, z);
      this.roads.add(road);
    }

    // Create vertical roads (only within the neighborhood)
    for (let i = 0; i <= numBlocksX; i++) {
      const x = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(x) > neighborhoodHalfSize) continue;

      const roadGeometry = new THREE.BoxGeometry(
        this.roadWidth,
        0.1,
        neighborhoodSize
      );
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.position.set(x, 0.05, 0);
      this.roads.add(road);
    }

    // Add road markings (white lines)
    const linesMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Horizontal road markings
    for (let i = 0; i <= numBlocksZ; i++) {
      const z = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(z) > neighborhoodHalfSize) continue;

      const lineGeometry = new THREE.BoxGeometry(neighborhoodSize, 0.05, 0.3);
      const line = new THREE.Mesh(lineGeometry, linesMaterial);
      line.position.set(0, 0.1, z);
      this.roads.add(line);
    }

    // Vertical road markings
    for (let i = 0; i <= numBlocksX; i++) {
      const x = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(x) > neighborhoodHalfSize) continue;

      const lineGeometry = new THREE.BoxGeometry(0.3, 0.05, neighborhoodSize);
      const line = new THREE.Mesh(lineGeometry, linesMaterial);
      line.position.set(x, 0.1, 0);
      this.roads.add(line);
    }
  }

  private generateSidewalks(): void {
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999, // Light gray for concrete
      roughness: 0.8,
      metalness: 0.1,
    });

    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // Define the neighborhood boundary
    const neighborhoodSize = numBlocksX * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Create sidewalks along horizontal roads (only within the neighborhood)
    for (let i = 0; i <= numBlocksZ; i++) {
      const z = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(z) > neighborhoodHalfSize) continue;

      // Sidewalk above the road
      const sidewalkTop = new THREE.Mesh(
        new THREE.BoxGeometry(neighborhoodSize, 0.15, this.sidewalkWidth),
        sidewalkMaterial
      );
      sidewalkTop.position.set(
        0,
        0.075,
        z - (this.roadWidth / 2 + this.sidewalkWidth / 2)
      );
      this.sidewalks.add(sidewalkTop);

      // Sidewalk below the road
      const sidewalkBottom = new THREE.Mesh(
        new THREE.BoxGeometry(neighborhoodSize, 0.15, this.sidewalkWidth),
        sidewalkMaterial
      );
      sidewalkBottom.position.set(
        0,
        0.075,
        z + (this.roadWidth / 2 + this.sidewalkWidth / 2)
      );
      this.sidewalks.add(sidewalkBottom);
    }

    // Create sidewalks along vertical roads (only within the neighborhood)
    for (let i = 0; i <= numBlocksX; i++) {
      const x = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(x) > neighborhoodHalfSize) continue;

      // Sidewalk to the left of the road
      const sidewalkLeft = new THREE.Mesh(
        new THREE.BoxGeometry(this.sidewalkWidth, 0.15, neighborhoodSize),
        sidewalkMaterial
      );
      sidewalkLeft.position.set(
        x - (this.roadWidth / 2 + this.sidewalkWidth / 2),
        0.075,
        0
      );
      this.sidewalks.add(sidewalkLeft);

      // Sidewalk to the right of the road
      const sidewalkRight = new THREE.Mesh(
        new THREE.BoxGeometry(this.sidewalkWidth, 0.15, neighborhoodSize),
        sidewalkMaterial
      );
      sidewalkRight.position.set(
        x + (this.roadWidth / 2 + this.sidewalkWidth / 2),
        0.075,
        0
      );
      this.sidewalks.add(sidewalkRight);
    }
  }

  private generateBuildings(): void {
    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // House materials with different colors
    const houseMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0xa0522d,
        roughness: 0.7,
        metalness: 0.2,
      }), // Brown
      new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.7,
        metalness: 0.2,
      }), // Saddle Brown
      new THREE.MeshStandardMaterial({
        color: 0xcd853f,
        roughness: 0.7,
        metalness: 0.2,
      }), // Peru
      new THREE.MeshStandardMaterial({
        color: 0xdeb887,
        roughness: 0.7,
        metalness: 0.2,
      }), // Burlywood
      new THREE.MeshStandardMaterial({
        color: 0xd2b48c,
        roughness: 0.7,
        metalness: 0.2,
      }), // Tan
    ];

    // Roof material
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b0000, // Dark red
      roughness: 0.7,
      metalness: 0.2,
    });

    // For each block in the grid
    for (let blockX = 0; blockX < numBlocksX; blockX++) {
      for (let blockZ = 0; blockZ < numBlocksZ; blockZ++) {
        // Calculate the block's center position
        const blockCenterX =
          -halfWorldSize + blockX * this.blockSize + this.blockSize / 2;
        const blockCenterZ =
          -halfWorldSize + blockZ * this.blockSize + this.blockSize / 2;

        // Calculate the usable area within the block (excluding roads and sidewalks)
        const usableWidth =
          this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);
        const usableHeight =
          this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);

        // Calculate how many plots can fit in this block
        const plotsPerRow = Math.floor(usableWidth / this.plotSize);
        const plotsPerColumn = Math.floor(usableHeight / this.plotSize);

        // Skip if the block is too small for any plots
        if (plotsPerRow <= 0 || plotsPerColumn <= 0) continue;

        // Calculate the starting position for the first plot
        const startX =
          blockCenterX - (plotsPerRow * this.plotSize) / 2 + this.plotSize / 2;
        const startZ =
          blockCenterZ -
          (plotsPerColumn * this.plotSize) / 2 +
          this.plotSize / 2;

        // Create houses on each plot
        for (let plotX = 0; plotX < plotsPerRow; plotX++) {
          for (let plotZ = 0; plotZ < plotsPerColumn; plotZ++) {
            // Calculate the position for this house
            const houseX = startX + plotX * this.plotSize;
            const houseZ = startZ + plotZ * this.plotSize;

            // Randomly decide if we should place a house here (80% chance)
            if (Math.random() < 0.8) {
              // Create the house
              this.createHouse(
                houseX,
                houseZ,
                houseMaterials[
                  Math.floor(Math.random() * houseMaterials.length)
                ],
                roofMaterial
              );
            }
          }
        }
      }
    }
  }

  private createHouse(
    x: number,
    z: number,
    wallMaterial: THREE.Material,
    roofMaterial: THREE.Material
  ): void {
    // Create a group for the house
    const house = new THREE.Group();

    // Randomize house height between 3 and 5
    const houseHeight = 3 + Math.random() * 2;

    // Create the main building
    const buildingGeometry = new THREE.BoxGeometry(
      this.houseSize - this.housePadding * 2,
      houseHeight,
      this.houseSize - this.housePadding * 2
    );
    const building = new THREE.Mesh(buildingGeometry, wallMaterial);
    building.position.y = houseHeight / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    house.add(building);

    // Create a pitched roof
    const roofHeight = 1.5;
    const roofGeometry = new THREE.ConeGeometry(
      (this.houseSize - this.housePadding) * 0.75,
      roofHeight,
      4
    );
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = houseHeight + roofHeight / 2;
    roof.rotation.y = Math.PI / 4; // Rotate to align with the house
    roof.castShadow = true;
    house.add(roof);

    // Add a door
    const doorWidth = 1;
    const doorHeight = 2;
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown door
    const door = new THREE.Mesh(doorGeometry, doorMaterial);

    // Position the door on a random side of the house
    const side = Math.floor(Math.random() * 4);
    const doorOffset = (this.houseSize - this.housePadding * 2) / 2;

    switch (side) {
      case 0: // Front
        door.position.set(0, doorHeight / 2, doorOffset);
        break;
      case 1: // Right
        door.position.set(doorOffset, doorHeight / 2, 0);
        door.rotation.y = Math.PI / 2;
        break;
      case 2: // Back
        door.position.set(0, doorHeight / 2, -doorOffset);
        door.rotation.y = Math.PI;
        break;
      case 3: // Left
        door.position.set(-doorOffset, doorHeight / 2, 0);
        door.rotation.y = -Math.PI / 2;
        break;
    }

    house.add(door);

    // Add windows
    this.addWindowsToHouse(house, houseHeight);

    // Position the house
    house.position.set(x, 0, z);

    // Add a small random rotation for variety
    house.rotation.y = Math.random() * Math.PI * 0.1;

    // Add the house to the buildings group
    this.buildings.add(house);

    // Add a small yard with a fence
    this.createYard(x, z);
  }

  private addWindowsToHouse(house: THREE.Group, houseHeight: number): void {
    const windowSize = 0.8;
    const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xadd8e6, // Light blue
      transparent: true,
      opacity: 0.7,
    });

    const houseWidth = this.houseSize - this.housePadding * 2;
    const windowOffset = houseWidth / 2;

    // Add windows to each side of the house
    for (let side = 0; side < 4; side++) {
      // Add 1-3 windows per side
      const windowCount = 1 + Math.floor(Math.random() * 3);

      for (let i = 0; i < windowCount; i++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);

        // Position windows evenly along the wall
        const xOffset = (i - (windowCount - 1) / 2) * (windowSize * 1.5);

        // Position windows at a height of 2/3 of the house height
        const yPos = houseHeight * 0.66;

        switch (side) {
          case 0: // Front
            window.position.set(xOffset, yPos, windowOffset);
            break;
          case 1: // Right
            window.position.set(windowOffset, yPos, xOffset);
            window.rotation.y = Math.PI / 2;
            break;
          case 2: // Back
            window.position.set(xOffset, yPos, -windowOffset);
            window.rotation.y = Math.PI;
            break;
          case 3: // Left
            window.position.set(-windowOffset, yPos, xOffset);
            window.rotation.y = -Math.PI / 2;
            break;
        }

        house.add(window);
      }
    }
  }

  private createYard(x: number, z: number): void {
    // Create a simple fence around the plot
    const fenceHeight = 0.8;
    const fenceMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      roughness: 0.8,
      metalness: 0.2,
    });

    const halfPlotSize = this.plotSize / 2;

    // Create the four sides of the fence
    const fenceGeometryX = new THREE.BoxGeometry(
      this.plotSize,
      fenceHeight,
      0.1
    );
    const fenceGeometryZ = new THREE.BoxGeometry(
      0.1,
      fenceHeight,
      this.plotSize
    );

    // Front fence (with gap for entrance)
    const frontFenceLeft = new THREE.Mesh(
      new THREE.BoxGeometry(halfPlotSize - 1, fenceHeight, 0.1),
      fenceMaterial
    );
    frontFenceLeft.position.set(x - 1, fenceHeight / 2, z + halfPlotSize);
    this.obstacles.add(frontFenceLeft);

    const frontFenceRight = new THREE.Mesh(
      new THREE.BoxGeometry(halfPlotSize - 1, fenceHeight, 0.1),
      fenceMaterial
    );
    frontFenceRight.position.set(x + 1, fenceHeight / 2, z + halfPlotSize);
    this.obstacles.add(frontFenceRight);

    // Back fence
    const backFence = new THREE.Mesh(fenceGeometryX, fenceMaterial);
    backFence.position.set(x, fenceHeight / 2, z - halfPlotSize);
    this.obstacles.add(backFence);

    // Left fence
    const leftFence = new THREE.Mesh(fenceGeometryZ, fenceMaterial);
    leftFence.position.set(x - halfPlotSize, fenceHeight / 2, z);
    this.obstacles.add(leftFence);

    // Right fence
    const rightFence = new THREE.Mesh(fenceGeometryZ, fenceMaterial);
    rightFence.position.set(x + halfPlotSize, fenceHeight / 2, z);
    this.obstacles.add(rightFence);
  }

  private generateTrees(): void {
    // Create different tree types

    // Pine trees for the forest
    const pineTreeTrunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 2, 8);
    const treeTrunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown
      roughness: 0.9,
      metalness: 0.1,
    });

    const pineTreeTopGeometry = new THREE.ConeGeometry(1.5, 3, 8);
    const pineTreeTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e8b57, // Dark green
      roughness: 0.8,
      metalness: 0.1,
    });

    // Bushy trees for the neighborhood
    const bushyTreeTrunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8);
    const bushyTreeTopGeometry = new THREE.SphereGeometry(1.8, 8, 6);
    const bushyTreeTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x32cd32, // Lime green
      roughness: 0.8,
      metalness: 0.1,
    });

    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // 1. Generate forest around the neighborhood
    this.generateForest(
      pineTreeTrunkGeometry,
      treeTrunkMaterial,
      pineTreeTopGeometry,
      pineTreeTopMaterial
    );

    // 2. Generate bushy trees within neighborhood lots
    this.generateNeighborhoodTrees(
      bushyTreeTrunkGeometry,
      treeTrunkMaterial,
      bushyTreeTopGeometry,
      bushyTreeTopMaterial
    );
  }

  private generateForest(
    trunkGeometry: THREE.CylinderGeometry,
    trunkMaterial: THREE.MeshStandardMaterial,
    topGeometry: THREE.ConeGeometry | THREE.SphereGeometry,
    topMaterial: THREE.MeshStandardMaterial
  ): void {
    const halfWorldSize = this.worldSize / 2;

    // Define the neighborhood boundary (slightly larger than the actual neighborhood)
    const neighborhoodMargin = 10;
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize +
      neighborhoodMargin;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Number of trees in the forest
    const forestTreeCount = 300;

    for (let i = 0; i < forestTreeCount; i++) {
      // Create a tree
      const tree = this.createTree(
        trunkGeometry,
        trunkMaterial,
        topGeometry,
        topMaterial
      );

      // Position the tree outside the neighborhood but within the world bounds
      let x, z;
      let validPosition = false;
      let attempts = 0;

      while (!validPosition && attempts < 10) {
        // Generate a position within the world bounds
        x = (Math.random() - 0.5) * this.worldSize;
        z = (Math.random() - 0.5) * this.worldSize;

        // Check if the position is outside the neighborhood
        const isOutsideNeighborhood =
          Math.abs(x) > neighborhoodHalfSize - 5 ||
          Math.abs(z) > neighborhoodHalfSize - 5;

        // Check if the position is within the world bounds
        const isWithinWorldBounds =
          Math.abs(x) < halfWorldSize - 2 && Math.abs(z) < halfWorldSize - 2;

        if (isOutsideNeighborhood && isWithinWorldBounds) {
          validPosition = true;
        }

        attempts++;
      }

      if (validPosition) {
        // Get the terrain height at this position
        const terrainHeight = this.getTerrainHeightAt(x!, z!);

        // Position the tree
        tree.position.set(x!, terrainHeight, z!);

        // Add some random rotation
        tree.rotation.y = Math.random() * Math.PI * 2;

        // Add some random scaling for dense forest feel
        const scale = 0.8 + Math.random() * 0.7;
        tree.scale.set(scale, scale, scale);

        this.trees.add(tree);
      }
    }
  }

  private generateNeighborhoodTrees(
    trunkGeometry: THREE.CylinderGeometry,
    trunkMaterial: THREE.MeshStandardMaterial,
    topGeometry: THREE.SphereGeometry,
    topMaterial: THREE.MeshStandardMaterial
  ): void {
    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // For each block in the grid
    for (let blockX = 0; blockX < numBlocksX; blockX++) {
      for (let blockZ = 0; blockZ < numBlocksZ; blockZ++) {
        // Calculate the block's center position
        const blockCenterX =
          -halfWorldSize + blockX * this.blockSize + this.blockSize / 2;
        const blockCenterZ =
          -halfWorldSize + blockZ * this.blockSize + this.blockSize / 2;

        // Calculate the usable area within the block (excluding roads and sidewalks)
        const usableWidth =
          this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);
        const usableHeight =
          this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);

        // Calculate how many plots can fit in this block
        const plotsPerRow = Math.floor(usableWidth / this.plotSize);
        const plotsPerColumn = Math.floor(usableHeight / this.plotSize);

        // Skip if the block is too small for any plots
        if (plotsPerRow <= 0 || plotsPerColumn <= 0) continue;

        // Calculate the starting position for the first plot
        const startX =
          blockCenterX - (plotsPerRow * this.plotSize) / 2 + this.plotSize / 2;
        const startZ =
          blockCenterZ -
          (plotsPerColumn * this.plotSize) / 2 +
          this.plotSize / 2;

        // Add trees to each plot
        for (let plotX = 0; plotX < plotsPerRow; plotX++) {
          for (let plotZ = 0; plotZ < plotsPerColumn; plotZ++) {
            // Calculate the position for this plot
            const plotCenterX = startX + plotX * this.plotSize;
            const plotCenterZ = startZ + plotZ * this.plotSize;

            // 60% chance to add 1-2 trees to the plot
            if (Math.random() < 0.6) {
              // Number of trees for this plot (1 or 2)
              const treeCount = Math.random() < 0.3 ? 2 : 1;

              for (let t = 0; t < treeCount; t++) {
                // Create a bushy tree
                const tree = this.createTree(
                  trunkGeometry,
                  trunkMaterial,
                  topGeometry,
                  topMaterial
                );

                // Position the tree randomly within the plot, but not too close to the edges
                const offsetX = (Math.random() - 0.5) * (this.plotSize - 3);
                const offsetZ = (Math.random() - 0.5) * (this.plotSize - 3);

                const x = plotCenterX + offsetX;
                const z = plotCenterZ + offsetZ;

                // Get the terrain height at this position
                const terrainHeight = this.getTerrainHeightAt(x, z);

                // Position the tree
                tree.position.set(x, terrainHeight, z);

                // Add some random rotation
                tree.rotation.y = Math.random() * Math.PI * 2;

                // Add some random scaling for variety
                const scale = 0.7 + Math.random() * 0.3;
                tree.scale.set(scale, scale, scale);

                this.trees.add(tree);
              }
            }
          }
        }
      }
    }
  }

  private createTree(
    trunkGeometry: THREE.CylinderGeometry,
    trunkMaterial: THREE.MeshStandardMaterial,
    topGeometry: THREE.ConeGeometry | THREE.SphereGeometry,
    topMaterial: THREE.MeshStandardMaterial
  ): THREE.Group {
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

    return tree;
  }

  private isNearRoad(x: number, z: number): boolean {
    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // Check distance to horizontal roads
    for (let i = 0; i <= numBlocksZ; i++) {
      const roadZ = -halfWorldSize + i * this.blockSize;
      const distance = Math.abs(z - roadZ);

      if (distance < this.roadWidth / 2 + 2) {
        return true;
      }
    }

    // Check distance to vertical roads
    for (let i = 0; i <= numBlocksX; i++) {
      const roadX = -halfWorldSize + i * this.blockSize;
      const distance = Math.abs(x - roadX);

      if (distance < this.roadWidth / 2 + 2) {
        return true;
      }
    }

    return false;
  }

  private generateObstacles(): void {
    // Create obstacles like rocks, debris, trash cans, mailboxes, etc.

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

    // Trash can geometry
    const trashCanGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
    const trashCanMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444, // Dark gray
      roughness: 0.7,
      metalness: 0.3,
    });

    // Mailbox geometry
    const mailboxPostGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const mailboxBoxGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.4);
    const mailboxMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222, // Very dark gray
      roughness: 0.7,
      metalness: 0.3,
    });

    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // Place obstacles in each block
    for (let blockX = 0; blockX < numBlocksX; blockX++) {
      for (let blockZ = 0; blockZ < numBlocksZ; blockZ++) {
        // Calculate the block's center position
        const blockCenterX =
          -halfWorldSize + blockX * this.blockSize + this.blockSize / 2;
        const blockCenterZ =
          -halfWorldSize + blockZ * this.blockSize + this.blockSize / 2;

        // Add mailboxes and trash cans near houses
        this.addHouseholdObstacles(
          blockCenterX,
          blockCenterZ,
          trashCanGeometry,
          trashCanMaterial,
          mailboxPostGeometry,
          mailboxBoxGeometry,
          mailboxMaterial
        );
      }
    }

    // Add rocks to the forest area
    this.addForestRocks(rockGeometries, rockMaterial);

    // Add some debris along roads
    this.addRoadDebris(rockGeometries, rockMaterial);
  }

  private addHouseholdObstacles(
    blockCenterX: number,
    blockCenterZ: number,
    trashCanGeometry: THREE.CylinderGeometry,
    trashCanMaterial: THREE.MeshStandardMaterial,
    mailboxPostGeometry: THREE.BoxGeometry,
    mailboxBoxGeometry: THREE.BoxGeometry,
    mailboxMaterial: THREE.MeshStandardMaterial
  ): void {
    // Calculate the usable area within the block (excluding roads and sidewalks)
    const usableWidth =
      this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);
    const usableHeight =
      this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);

    // Calculate how many plots can fit in this block
    const plotsPerRow = Math.floor(usableWidth / this.plotSize);
    const plotsPerColumn = Math.floor(usableHeight / this.plotSize);

    // Skip if the block is too small for any plots
    if (plotsPerRow <= 0 || plotsPerColumn <= 0) return;

    // Calculate the starting position for the first plot
    const startX =
      blockCenterX - (plotsPerRow * this.plotSize) / 2 + this.plotSize / 2;
    const startZ =
      blockCenterZ - (plotsPerColumn * this.plotSize) / 2 + this.plotSize / 2;

    // Add obstacles to each plot
    for (let plotX = 0; plotX < plotsPerRow; plotX++) {
      for (let plotZ = 0; plotZ < plotsPerColumn; plotZ++) {
        // Calculate the position for this plot
        const plotCenterX = startX + plotX * this.plotSize;
        const plotCenterZ = startZ + plotZ * this.plotSize;

        // 80% chance to add a trash can
        if (Math.random() < 0.8) {
          const trashCan = new THREE.Mesh(trashCanGeometry, trashCanMaterial);
          trashCan.castShadow = true;
          trashCan.receiveShadow = true;

          // Position the trash can near the edge of the plot
          const angle = Math.random() * Math.PI * 2;
          const distance = this.plotSize / 2 - 0.5; // 0.5 units from the edge
          const x = plotCenterX + Math.cos(angle) * distance;
          const z = plotCenterZ + Math.sin(angle) * distance;

          trashCan.position.set(x, 0.4, z);
          this.obstacles.add(trashCan);
        }

        // 70% chance to add a mailbox
        if (Math.random() < 0.7) {
          const mailbox = new THREE.Group();

          // Create the post
          const post = new THREE.Mesh(mailboxPostGeometry, mailboxMaterial);
          post.position.y = 0.5;
          mailbox.add(post);

          // Create the box
          const box = new THREE.Mesh(mailboxBoxGeometry, mailboxMaterial);
          box.position.set(0, 1, 0.15);
          mailbox.add(box);

          // Position the mailbox near the front of the plot
          const x = plotCenterX + (Math.random() - 0.5) * 2;
          const z = plotCenterZ + this.plotSize / 2 - 0.3;

          mailbox.position.set(x, 0, z);
          mailbox.castShadow = true;
          mailbox.receiveShadow = true;

          this.obstacles.add(mailbox);
        }
      }
    }
  }

  private addForestRocks(
    rockGeometries: THREE.DodecahedronGeometry[],
    rockMaterial: THREE.MeshStandardMaterial
  ): void {
    const halfWorldSize = this.worldSize / 2;

    // Define the neighborhood boundary (slightly larger than the actual neighborhood)
    const neighborhoodMargin = 10;
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize +
      neighborhoodMargin;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Number of rocks in the forest
    const forestRockCount = 100;

    for (let i = 0; i < forestRockCount; i++) {
      // Choose a random rock geometry
      const rockGeometry =
        rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);

      rock.castShadow = true;
      rock.receiveShadow = true;

      // Position the rock outside the neighborhood but within the world bounds
      let x, z;
      let validPosition = false;
      let attempts = 0;

      while (!validPosition && attempts < 10) {
        // Generate a position within the world bounds
        x = (Math.random() - 0.5) * this.worldSize;
        z = (Math.random() - 0.5) * this.worldSize;

        // Check if the position is outside the neighborhood
        const isOutsideNeighborhood =
          Math.abs(x) > neighborhoodHalfSize - 5 ||
          Math.abs(z) > neighborhoodHalfSize - 5;

        // Check if the position is within the world bounds
        const isWithinWorldBounds =
          Math.abs(x) < halfWorldSize - 2 && Math.abs(z) < halfWorldSize - 2;

        if (isOutsideNeighborhood && isWithinWorldBounds) {
          validPosition = true;
        }

        attempts++;
      }

      if (validPosition) {
        // Get the terrain height at this position
        const terrainHeight = this.getTerrainHeightAt(x!, z!);

        // Position the rock
        rock.position.set(x!, terrainHeight + 0.3, z!);

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
  }

  private addRoadDebris(
    rockGeometries: THREE.DodecahedronGeometry[],
    rockMaterial: THREE.MeshStandardMaterial
  ): void {
    const halfWorldSize = this.worldSize / 2;
    const numBlocksX = Math.floor(this.worldSize / this.blockSize);
    const numBlocksZ = Math.floor(this.worldSize / this.blockSize);

    // Add debris along roads
    const debrisCount = 30; // Reduced from 40 to make it less cluttered

    // Create materials for different types of debris
    const paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, // White
      roughness: 0.9,
      metalness: 0.1,
    });

    const canMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      roughness: 0.4,
      metalness: 0.8,
    });

    for (let i = 0; i < debrisCount; i++) {
      // Choose a random debris type
      let debrisGeometry;
      let debrisMaterial;

      const debrisType = Math.floor(Math.random() * 3);
      switch (debrisType) {
        case 0: // Small rock
          debrisGeometry =
            rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
          debrisMaterial = rockMaterial;
          break;
        case 1: // Paper/trash
          debrisGeometry = new THREE.PlaneGeometry(0.3, 0.3);
          debrisMaterial = paperMaterial;
          break;
        case 2: // Can
          debrisGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8);
          debrisMaterial = canMaterial;
          break;
      }

      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);

      debris.castShadow = true;
      debris.receiveShadow = true;

      // Position the debris near a random road
      let x, z;

      // Decide whether to place along a horizontal or vertical road
      if (Math.random() < 0.5) {
        // Horizontal road
        const roadIndex = Math.floor(Math.random() * (numBlocksZ + 1));
        const roadZ = -halfWorldSize + roadIndex * this.blockSize;

        // Random position along the road
        x = (Math.random() - 0.5) * this.worldSize;
        z = roadZ + (Math.random() - 0.5) * this.roadWidth * 0.8;
      } else {
        // Vertical road
        const roadIndex = Math.floor(Math.random() * (numBlocksX + 1));
        const roadX = -halfWorldSize + roadIndex * this.blockSize;

        // Random position along the road
        x = roadX + (Math.random() - 0.5) * this.roadWidth * 0.8;
        z = (Math.random() - 0.5) * this.worldSize;
      }

      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAt(x, z);

      debris.position.set(x, terrainHeight + 0.05, z);

      // Add some random rotation
      debris.rotation.x = Math.random() * Math.PI;
      debris.rotation.y = Math.random() * Math.PI;
      debris.rotation.z = Math.random() * Math.PI;

      // Make debris smaller
      const scale = 0.2 + Math.random() * 0.2;
      debris.scale.set(scale, scale, scale);

      this.obstacles.add(debris);
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
