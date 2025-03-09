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

  // Store neighborhood size for use across methods
  private neighborhoodSize: number = 0;
  private neighborhoodHalfSize: number = 0;

  private buildings: THREE.Group;
  private trees: THREE.Group;
  private obstacles: THREE.Group;
  private roads: THREE.Group;
  private sidewalks: THREE.Group;
  private grassLots: THREE.Group; // Group for grass lots

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

  // Track house positions to prevent trees from spawning inside houses
  private housePlots: Set<string> = new Set();

  private noise: SimplexNoise;

  constructor(scene: THREE.Scene, loadingManager: THREE.LoadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;

    // Initialize the terrain
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

    // Initialize groups
    this.buildings = new THREE.Group();
    this.trees = new THREE.Group();
    this.obstacles = new THREE.Group();
    this.roads = new THREE.Group();
    this.sidewalks = new THREE.Group();
    this.grassLots = new THREE.Group(); // Initialize grass lots group

    // Initialize noise generator
    this.noise = new SimplexNoise();
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
    this.scene.add(this.grassLots); // Add grass lots group to scene

    this.generateTrees();
    this.scene.add(this.trees);

    this.generateObstacles();
    this.scene.add(this.obstacles);

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
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Create separate materials for neighborhood and forest
    const neighborhoodMaterial = new THREE.MeshStandardMaterial({
      color: 0x3c3c3c, // Dark gray for the neighborhood
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true,
    });

    // Create two separate terrain meshes
    // 1. Neighborhood terrain (flat, gray)
    const neighborhoodGeometry = new THREE.PlaneGeometry(
      neighborhoodSize,
      neighborhoodSize,
      neighborhoodSize / this.gridSize,
      neighborhoodSize / this.gridSize
    );

    // Apply very subtle noise to neighborhood terrain
    const neighborhoodVertices = neighborhoodGeometry.attributes.position.array;
    for (let i = 0; i < neighborhoodVertices.length; i += 3) {
      const x = neighborhoodVertices[i];
      const z = neighborhoodVertices[i + 2];

      // Very subtle noise for flat terrain
      const elevation = this.noise.noise(x * 0.01, z * 0.01) * 0.1;
      neighborhoodVertices[i + 1] = elevation;
    }

    neighborhoodGeometry.computeVertexNormals();
    neighborhoodGeometry.attributes.position.needsUpdate = true;

    const neighborhoodTerrain = new THREE.Mesh(
      neighborhoodGeometry,
      neighborhoodMaterial
    );
    neighborhoodTerrain.rotation.x = -Math.PI / 2;
    neighborhoodTerrain.receiveShadow = true;
    neighborhoodTerrain.position.set(0, 0, 0);
    this.scene.add(neighborhoodTerrain);

    // 2. Forest terrain (uneven, green)
    // Create four separate forest sections around the neighborhood
    this.createForestSection(
      -neighborhoodHalfSize - this.worldSize / 4,
      0,
      this.worldSize / 2,
      this.worldSize
    ); // Left
    this.createForestSection(
      neighborhoodHalfSize + this.worldSize / 4,
      0,
      this.worldSize / 2,
      this.worldSize
    ); // Right
    this.createForestSection(
      0,
      -neighborhoodHalfSize - this.worldSize / 4,
      this.worldSize,
      this.worldSize / 2
    ); // Top
    this.createForestSection(
      0,
      neighborhoodHalfSize + this.worldSize / 4,
      this.worldSize,
      this.worldSize / 2
    ); // Bottom

    // Store the neighborhood size for other methods to use
    this.neighborhoodSize = neighborhoodSize;
    this.neighborhoodHalfSize = neighborhoodHalfSize;

    // The original terrain mesh is no longer needed
    // this.scene.add(this.terrain);
  }

  private createForestSection(
    x: number,
    z: number,
    width: number,
    depth: number
  ): void {
    // Create a simple plane geometry for the forest floor
    const forestGeometry = new THREE.PlaneGeometry(width, depth);

    // Create a canvas texture for the grass (same as neighborhood grass)
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    if (context) {
      // Fill with base grass color
      context.fillStyle = "#66bb6a";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle grass texture pattern
      context.fillStyle = "#5CAD60";

      // Create random grass blades
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const width = 1 + Math.random() * 2;
        const height = 3 + Math.random() * 5;

        context.fillRect(x, y, width, height);
      }
    }

    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    // Scale texture based on forest section size
    const textureRepeat = Math.max(width, depth) / 10;
    grassTexture.repeat.set(textureRepeat, textureRepeat);

    // Create grass material with the texture (same as neighborhood grass)
    const forestMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      color: 0x66bb6a, // Base green color
      roughness: 0.9,
      metalness: 0.0,
    });

    const forestTerrain = new THREE.Mesh(forestGeometry, forestMaterial);
    forestTerrain.rotation.x = -Math.PI / 2; // Rotate to be horizontal

    // Keep the position slightly lower to prevent z-fighting with the street
    forestTerrain.position.set(x, -0.01, z);
    forestTerrain.receiveShadow = true;

    // Add to scene
    this.scene.add(forestTerrain);
  }

  private generateRoads(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333, // Dark gray for asphalt
      roughness: 0.9,
      metalness: 0.1,
    });

    // Calculate the number of blocks that can fit in the neighborhood
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

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
    const linesMaterial = new THREE.MeshStandardMaterial({
      color: 0xeeeeee, // Slightly off-white
      roughness: 0.7, // Increase roughness
      metalness: 0.0, // No metalness for road paint
    });

    // Horizontal road markings
    for (let i = 0; i <= numBlocksZ; i++) {
      const z = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(z) > neighborhoodHalfSize) continue;

      // Create dotted line segments between intersections
      for (let j = 0; j < numBlocksX; j++) {
        const startX =
          -neighborhoodHalfSize + j * this.blockSize + this.roadWidth / 2;
        const endX =
          -neighborhoodHalfSize + (j + 1) * this.blockSize - this.roadWidth / 2;
        const segmentLength = endX - startX;

        if (segmentLength <= 0) continue; // Skip if segment is too small

        // Create dotted lines
        const dashLength = 1; // Length of each dash
        const gapLength = 1; // Length of gap between dashes
        const totalDashes = Math.floor(
          segmentLength / (dashLength + gapLength)
        );

        for (let k = 0; k < totalDashes; k++) {
          const dashX = startX + (dashLength + gapLength) * k + dashLength / 2;

          // Skip if this dash would extend into the intersection
          if (dashX + dashLength / 2 > endX) continue;

          const lineGeometry = new THREE.BoxGeometry(dashLength, 0.05, 0.3);
          const line = new THREE.Mesh(lineGeometry, linesMaterial);
          line.position.set(dashX, 0.11, z);
          line.receiveShadow = true;
          this.roads.add(line);
        }
      }
    }

    // Vertical road markings
    for (let i = 0; i <= numBlocksX; i++) {
      const x = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(x) > neighborhoodHalfSize) continue;

      // Create dotted line segments between intersections
      for (let j = 0; j < numBlocksZ; j++) {
        const startZ =
          -neighborhoodHalfSize + j * this.blockSize + this.roadWidth / 2;
        const endZ =
          -neighborhoodHalfSize + (j + 1) * this.blockSize - this.roadWidth / 2;
        const segmentLength = endZ - startZ;

        if (segmentLength <= 0) continue; // Skip if segment is too small

        // Create dotted lines
        const dashLength = 1; // Length of each dash
        const gapLength = 1; // Length of gap between dashes
        const totalDashes = Math.floor(
          segmentLength / (dashLength + gapLength)
        );

        for (let k = 0; k < totalDashes; k++) {
          const dashZ = startZ + (dashLength + gapLength) * k + dashLength / 2;

          // Skip if this dash would extend into the intersection
          if (dashZ + dashLength / 2 > endZ) continue;

          const lineGeometry = new THREE.BoxGeometry(0.3, 0.05, dashLength);
          const line = new THREE.Mesh(lineGeometry, linesMaterial);
          line.position.set(x, 0.11, dashZ);
          line.receiveShadow = true;
          this.roads.add(line);
        }
      }
    }
  }

  private generateSidewalks(): void {
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999, // Light gray for concrete
      roughness: 0.8,
      metalness: 0.1,
    });

    // Calculate the number of blocks that can fit in the neighborhood
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

    // Create sidewalks along horizontal roads (only within the neighborhood)
    for (let i = 0; i <= numBlocksZ; i++) {
      const z = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(z) > neighborhoodHalfSize) continue;

      // Create sidewalk segments between intersections
      for (let j = 0; j < numBlocksX; j++) {
        const startX =
          -neighborhoodHalfSize + j * this.blockSize + this.roadWidth / 2;
        const endX =
          -neighborhoodHalfSize + (j + 1) * this.blockSize - this.roadWidth / 2;
        const segmentLength = endX - startX;

        if (segmentLength <= 0) continue; // Skip if segment is too small

        // Sidewalk above the road
        const sidewalkTop = new THREE.Mesh(
          new THREE.BoxGeometry(segmentLength, 0.15, this.sidewalkWidth),
          sidewalkMaterial
        );
        sidewalkTop.position.set(
          startX + segmentLength / 2,
          0.075,
          z - (this.roadWidth / 2 + this.sidewalkWidth / 2)
        );
        this.sidewalks.add(sidewalkTop);

        // Sidewalk below the road
        const sidewalkBottom = new THREE.Mesh(
          new THREE.BoxGeometry(segmentLength, 0.15, this.sidewalkWidth),
          sidewalkMaterial
        );
        sidewalkBottom.position.set(
          startX + segmentLength / 2,
          0.075,
          z + (this.roadWidth / 2 + this.sidewalkWidth / 2)
        );
        this.sidewalks.add(sidewalkBottom);
      }
    }

    // Create sidewalks along vertical roads (only within the neighborhood)
    for (let i = 0; i <= numBlocksX; i++) {
      const x = -neighborhoodHalfSize + i * this.blockSize;

      // Skip if outside the neighborhood
      if (Math.abs(x) > neighborhoodHalfSize) continue;

      // Create sidewalk segments between intersections
      for (let j = 0; j < numBlocksZ; j++) {
        const startZ =
          -neighborhoodHalfSize + j * this.blockSize + this.roadWidth / 2;
        const endZ =
          -neighborhoodHalfSize + (j + 1) * this.blockSize - this.roadWidth / 2;
        const segmentLength = endZ - startZ;

        if (segmentLength <= 0) continue; // Skip if segment is too small

        // Sidewalk to the left of the road
        const sidewalkLeft = new THREE.Mesh(
          new THREE.BoxGeometry(this.sidewalkWidth, 0.15, segmentLength),
          sidewalkMaterial
        );
        sidewalkLeft.position.set(
          x - (this.roadWidth / 2 + this.sidewalkWidth / 2),
          0.075,
          startZ + segmentLength / 2
        );
        this.sidewalks.add(sidewalkLeft);

        // Sidewalk to the right of the road
        const sidewalkRight = new THREE.Mesh(
          new THREE.BoxGeometry(this.sidewalkWidth, 0.15, segmentLength),
          sidewalkMaterial
        );
        sidewalkRight.position.set(
          x + (this.roadWidth / 2 + this.sidewalkWidth / 2),
          0.075,
          startZ + segmentLength / 2
        );
        this.sidewalks.add(sidewalkRight);
      }
    }
  }

  private generateBuildings(): void {
    // Calculate the neighborhood size and blocks
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

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

    // Clear the house plots set before generating new houses
    this.housePlots.clear();

    // For each block in the grid
    for (let blockX = 0; blockX < numBlocksX; blockX++) {
      for (let blockZ = 0; blockZ < numBlocksZ; blockZ++) {
        // Calculate the block's center position
        const blockCenterX =
          -neighborhoodHalfSize + blockX * this.blockSize + this.blockSize / 2;
        const blockCenterZ =
          -neighborhoodHalfSize + blockZ * this.blockSize + this.blockSize / 2;

        // Calculate the usable area within the block (excluding roads and sidewalks)
        const usableWidth =
          this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);
        const usableHeight =
          this.blockSize - (this.roadWidth + this.sidewalkWidth * 2);

        // Create grass for the entire block
        this.createGrassBlock(
          blockCenterX,
          blockCenterZ,
          usableWidth,
          usableHeight
        );

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

              // Track this plot as having a house
              const plotKey = `${Math.round(houseX)},${Math.round(houseZ)}`;
              this.housePlots.add(plotKey);
            }
          }
        }
      }
    }
  }

  /**
   * Creates a grass block covering the entire usable area of a city block
   */
  private createGrassBlock(
    blockCenterX: number,
    blockCenterZ: number,
    width: number,
    height: number
  ): void {
    // Create a canvas texture for the grass
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    if (context) {
      // Fill with base grass color
      context.fillStyle = "#66bb6a";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle grass texture pattern
      context.fillStyle = "#5CAD60";

      // Create random grass blades
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const width = 1 + Math.random() * 2;
        const height = 3 + Math.random() * 5;

        context.fillRect(x, y, width, height);
      }
    }

    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    // Scale texture based on block size
    const textureRepeat = Math.max(width, height) / 10;
    grassTexture.repeat.set(textureRepeat, textureRepeat);

    // Create grass material with the texture
    const grassMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      color: 0x66bb6a, // Base green color
      roughness: 0.9,
      metalness: 0.0,
    });

    // Create a slightly elevated grass plane for the entire block
    const grassGeometry = new THREE.PlaneGeometry(width, height);
    const grassBlock = new THREE.Mesh(grassGeometry, grassMaterial);

    // Position the grass slightly above the terrain to avoid z-fighting
    grassBlock.position.set(blockCenterX, 0.01, blockCenterZ);
    grassBlock.rotation.x = -Math.PI / 2;
    grassBlock.receiveShadow = true;

    // Add some random variation to the grass color
    const hueVariation = Math.random() * 0.05 - 0.025; // ±2.5% hue variation
    const color = new THREE.Color(grassMaterial.color.getHex());
    color.offsetHSL(hueVariation, 0, 0);
    grassBlock.material = grassMaterial.clone();
    grassBlock.material.color = color;

    // Add the grass block to the dedicated group
    this.grassLots.add(grassBlock);
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

    // Calculate the neighborhood size
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

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

    // Number of trees in the forest
    const forestTreeCount = 300;

    // Create forest trees in each of the four forest sections
    this.createForestTrees(
      -this.neighborhoodHalfSize - this.worldSize / 4,
      0,
      this.worldSize / 2,
      this.worldSize,
      forestTreeCount / 4,
      trunkGeometry,
      trunkMaterial,
      topGeometry,
      topMaterial
    ); // Left

    this.createForestTrees(
      this.neighborhoodHalfSize + this.worldSize / 4,
      0,
      this.worldSize / 2,
      this.worldSize,
      forestTreeCount / 4,
      trunkGeometry,
      trunkMaterial,
      topGeometry,
      topMaterial
    ); // Right

    this.createForestTrees(
      0,
      -this.neighborhoodHalfSize - this.worldSize / 4,
      this.worldSize,
      this.worldSize / 2,
      forestTreeCount / 4,
      trunkGeometry,
      trunkMaterial,
      topGeometry,
      topMaterial
    ); // Top

    this.createForestTrees(
      0,
      this.neighborhoodHalfSize + this.worldSize / 4,
      this.worldSize,
      this.worldSize / 2,
      forestTreeCount / 4,
      trunkGeometry,
      trunkMaterial,
      topGeometry,
      topMaterial
    ); // Bottom
  }

  private createForestTrees(
    sectionX: number,
    sectionZ: number,
    sectionWidth: number,
    sectionDepth: number,
    treeCount: number,
    trunkGeometry: THREE.CylinderGeometry,
    trunkMaterial: THREE.MeshStandardMaterial,
    topGeometry: THREE.ConeGeometry | THREE.SphereGeometry,
    topMaterial: THREE.MeshStandardMaterial
  ): void {
    // Calculate section boundaries
    const halfWidth = sectionWidth / 2;
    const halfDepth = sectionDepth / 2;
    const minX = sectionX - halfWidth;
    const maxX = sectionX + halfWidth;
    const minZ = sectionZ - halfDepth;
    const maxZ = sectionZ + halfDepth;

    for (let i = 0; i < treeCount; i++) {
      // Create a tree
      const tree = this.createTree(
        trunkGeometry,
        trunkMaterial,
        topGeometry,
        topMaterial
      );

      // Position the tree randomly within this forest section
      const x = minX + Math.random() * sectionWidth;
      const z = minZ + Math.random() * sectionDepth;

      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAt(x, z);

      // Position the tree
      tree.position.set(x, terrainHeight, z);

      // Add some random rotation
      tree.rotation.y = Math.random() * Math.PI * 2;

      // Add some random scaling for dense forest feel
      const scale = 0.8 + Math.random() * 0.7;
      tree.scale.set(scale, scale, scale);

      this.trees.add(tree);
    }
  }

  private generateNeighborhoodTrees(
    trunkGeometry: THREE.CylinderGeometry,
    trunkMaterial: THREE.MeshStandardMaterial,
    topGeometry: THREE.SphereGeometry,
    topMaterial: THREE.MeshStandardMaterial
  ): void {
    // Calculate the neighborhood size
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

    // For each block in the grid
    for (let blockX = 0; blockX < numBlocksX; blockX++) {
      for (let blockZ = 0; blockZ < numBlocksZ; blockZ++) {
        // Calculate the block's center position
        const blockCenterX =
          -neighborhoodHalfSize + blockX * this.blockSize + this.blockSize / 2;
        const blockCenterZ =
          -neighborhoodHalfSize + blockZ * this.blockSize + this.blockSize / 2;

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

            // Check if there's a house on this plot
            const plotKey = `${Math.round(plotCenterX)},${Math.round(
              plotCenterZ
            )}`;
            if (this.housePlots.has(plotKey)) {
              // Skip this plot if it has a house
              continue;
            }

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
    // Calculate the neighborhood size
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

    // Check if the position is outside the neighborhood
    if (
      Math.abs(x) > neighborhoodHalfSize ||
      Math.abs(z) > neighborhoodHalfSize
    ) {
      return false; // No roads outside the neighborhood
    }

    // Check distance to horizontal roads
    for (let i = 0; i <= numBlocksZ; i++) {
      const roadZ = -neighborhoodHalfSize + i * this.blockSize;
      const distance = Math.abs(z - roadZ);

      if (distance < this.roadWidth / 2 + 2) {
        return true;
      }
    }

    // Check distance to vertical roads
    for (let i = 0; i <= numBlocksX; i++) {
      const roadX = -neighborhoodHalfSize + i * this.blockSize;
      const distance = Math.abs(x - roadX);

      if (distance < this.roadWidth / 2 + 2) {
        return true;
      }
    }

    return false;
  }

  private generateObstacles(): void {
    // Create obstacles like rocks, trash cans, mailboxes, etc.

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

    // Calculate the neighborhood size
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;
    const numBlocksX = Math.floor(neighborhoodSize / this.blockSize);
    const numBlocksZ = Math.floor(neighborhoodSize / this.blockSize);

    // Place obstacles in each block
    for (let blockX = 0; blockX < numBlocksX; blockX++) {
      for (let blockZ = 0; blockZ < numBlocksZ; blockZ++) {
        // Calculate the block's center position
        const blockCenterX =
          -neighborhoodHalfSize + blockX * this.blockSize + this.blockSize / 2;
        const blockCenterZ =
          -neighborhoodHalfSize + blockZ * this.blockSize + this.blockSize / 2;

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

    // Road debris removed as it's not needed at this stage
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
    // Calculate the neighborhood size
    const neighborhoodSize =
      Math.floor(this.worldSize / this.blockSize) * this.blockSize;
    const neighborhoodHalfSize = neighborhoodSize / 2;

    // Skip if the block is outside the neighborhood
    if (
      Math.abs(blockCenterX) > neighborhoodHalfSize ||
      Math.abs(blockCenterZ) > neighborhoodHalfSize
    ) {
      return;
    }

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
    // Number of rocks in the forest
    const forestRockCount = 100;

    // Create forest rocks in each of the four forest sections
    this.createForestRocks(
      -this.neighborhoodHalfSize - this.worldSize / 4,
      0,
      this.worldSize / 2,
      this.worldSize,
      forestRockCount / 4,
      rockGeometries,
      rockMaterial
    ); // Left

    this.createForestRocks(
      this.neighborhoodHalfSize + this.worldSize / 4,
      0,
      this.worldSize / 2,
      this.worldSize,
      forestRockCount / 4,
      rockGeometries,
      rockMaterial
    ); // Right

    this.createForestRocks(
      0,
      -this.neighborhoodHalfSize - this.worldSize / 4,
      this.worldSize,
      this.worldSize / 2,
      forestRockCount / 4,
      rockGeometries,
      rockMaterial
    ); // Top

    this.createForestRocks(
      0,
      this.neighborhoodHalfSize + this.worldSize / 4,
      this.worldSize,
      this.worldSize / 2,
      forestRockCount / 4,
      rockGeometries,
      rockMaterial
    ); // Bottom
  }

  private createForestRocks(
    sectionX: number,
    sectionZ: number,
    sectionWidth: number,
    sectionDepth: number,
    rockCount: number,
    rockGeometries: THREE.DodecahedronGeometry[],
    rockMaterial: THREE.MeshStandardMaterial
  ): void {
    // Calculate section boundaries
    const halfWidth = sectionWidth / 2;
    const halfDepth = sectionDepth / 2;
    const minX = sectionX - halfWidth;
    const maxX = sectionX + halfWidth;
    const minZ = sectionZ - halfDepth;
    const maxZ = sectionZ + halfDepth;

    for (let i = 0; i < rockCount; i++) {
      // Choose a random rock geometry
      const rockGeometry =
        rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);

      rock.castShadow = true;
      rock.receiveShadow = true;

      // Position the rock randomly within this forest section
      const x = minX + Math.random() * sectionWidth;
      const z = minZ + Math.random() * sectionDepth;

      // Get the terrain height at this position
      const terrainHeight = this.getTerrainHeightAt(x, z);

      // Position the rock
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
    // Check if the position is within the neighborhood
    const isInNeighborhood =
      Math.abs(x) < this.neighborhoodHalfSize &&
      Math.abs(z) < this.neighborhoodHalfSize;

    // Apply different noise based on whether the position is in the neighborhood or forest
    if (isInNeighborhood) {
      // Very subtle noise for the neighborhood (flat terrain)
      return this.noise.noise(x * 0.01, z * 0.01) * 0.1;
    } else {
      // More pronounced noise for the forest (slightly uneven terrain)
      return this.noise.noise(x * 0.02, z * 0.02) * 0.5;
    }
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
