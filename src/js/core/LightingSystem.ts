import * as THREE from "three";
import { World } from "./World";

export class LightingSystem {
  private scene: THREE.Scene;
  private world: World;

  // Day/night cycle properties
  private dayDuration: number = 600; // 10 minutes in seconds
  private timeOfDay: number = 0; // 0 to 1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
  private daySpeed: number = 1 / this.dayDuration; // How fast the day progresses

  // Lighting objects
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight; // Sun/moon
  private hemisphereLight!: THREE.HemisphereLight;

  // Street lamps
  private streetLamps: THREE.Group;
  private streetLampPositions: THREE.Vector3[] = [];
  private streetLampLights: THREE.PointLight[] = [];

  // Color presets for different times of day
  private skyColors = {
    night: new THREE.Color(0x0a0a20), // Deep blue night
    dawn: new THREE.Color(0xf08c7a), // Pinkish orange sunrise
    day: new THREE.Color(0x87ceeb), // Light blue day
    dusk: new THREE.Color(0xff7f50), // Orange sunset
  };

  private fogColors = {
    night: new THREE.Color(0x0a0a15), // Dark blue night fog
    dawn: new THREE.Color(0xd8b5b0), // Pinkish dawn fog
    day: new THREE.Color(0xcfe8ef), // Light blue day fog
    dusk: new THREE.Color(0xd99c76), // Orange dusk fog
  };

  private groundColors = {
    night: new THREE.Color(0x0a0a15), // Dark night ground
    dawn: new THREE.Color(0x7a6a5a), // Dawn ground
    day: new THREE.Color(0x4caf50), // Green day ground
    dusk: new THREE.Color(0x7a5a4a), // Dusk ground
  };

  private lightIntensities = {
    ambient: {
      night: 0.2,
      dawn: 0.5,
      day: 1.2,
      dusk: 0.7,
    },
    directional: {
      night: 0.1,
      dawn: 0.8,
      day: 1.2,
      dusk: 0.8,
    },
    hemisphere: {
      night: 0.1,
      dawn: 0.7,
      day: 1.0,
      dusk: 0.7,
    },
  };

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    this.streetLamps = new THREE.Group();
    this.scene.add(this.streetLamps);

    // Initialize lights
    this.setupLights();

    // Set initial time to early morning
    this.timeOfDay = 0.3; // Start at early morning
    this.updateLighting(0);
  }

  private setupLights(): void {
    // Ambient light - base illumination
    this.ambientLight = new THREE.AmbientLight(0x404040, 1.2);
    this.scene.add(this.ambientLight);

    // Directional light (sun/moon)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(100, 100, 50);
    this.directionalLight.castShadow = true;

    // Configure shadow properties with optimized settings
    this.directionalLight.shadow.mapSize.width = 1024; // Reduced from 2048
    this.directionalLight.shadow.mapSize.height = 1024; // Reduced from 2048
    this.directionalLight.shadow.camera.near = 1;
    this.directionalLight.shadow.camera.far = 300; // Reduced from 500
    this.directionalLight.shadow.camera.left = -80; // Reduced from -100
    this.directionalLight.shadow.camera.right = 80; // Reduced from 100
    this.directionalLight.shadow.camera.top = 80; // Reduced from 100
    this.directionalLight.shadow.camera.bottom = -80; // Reduced from -100

    // Add shadow bias to reduce shadow acne
    this.directionalLight.shadow.bias = -0.0005;

    this.scene.add(this.directionalLight);

    // Hemisphere light - sky and ground colors
    this.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x4caf50, 1.0);
    this.scene.add(this.hemisphereLight);
  }

  public createStreetLamps(): void {
    // Get world size and road information
    const worldSize = this.world.getWorldSize();
    const roadWidth = 8; // Same as in World.ts
    const blockSize = 30; // Same as in World.ts

    // Create lamp geometry and materials
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const lampHeadGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
    const lampHeadMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
    });

    const glassGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8);
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.7, // Moderate emissive intensity
      transparent: true,
      opacity: 0.8,
    });

    // Place lamps at selected corners to reduce total count
    // Only place lamps at every other block corner to reduce the total number
    for (let x = -worldSize / 2; x <= worldSize / 2; x += blockSize * 2) {
      for (let z = -worldSize / 2; z <= worldSize / 2; z += blockSize * 2) {
        // Place a lamp at this corner
        this.createStreetLamp(
          x,
          z,
          poleGeometry,
          poleMaterial,
          lampHeadGeometry,
          lampHeadMaterial,
          glassGeometry,
          glassMaterial
        );

        // Place a lamp at the diagonal corner for better coverage
        if (x + blockSize <= worldSize / 2 && z + blockSize <= worldSize / 2) {
          this.createStreetLamp(
            x + blockSize,
            z + blockSize,
            poleGeometry,
            poleMaterial,
            lampHeadGeometry,
            lampHeadMaterial,
            glassGeometry,
            glassMaterial
          );
        }
      }
    }

    console.log(`Created ${this.streetLampLights.length} street lamps`);
  }

  private createStreetLamp(
    x: number,
    z: number,
    poleGeometry: THREE.CylinderGeometry,
    poleMaterial: THREE.MeshStandardMaterial,
    lampHeadGeometry: THREE.CylinderGeometry,
    lampHeadMaterial: THREE.MeshStandardMaterial,
    glassGeometry: THREE.CylinderGeometry,
    glassMaterial: THREE.MeshStandardMaterial
  ): void {
    // Create lamp group
    const lamp = new THREE.Group();

    // Create pole
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2.5; // Half of pole height
    pole.castShadow = true;
    pole.receiveShadow = true;
    lamp.add(pole);

    // Create lamp head
    const lampHead = new THREE.Mesh(lampHeadGeometry, lampHeadMaterial);
    lampHead.position.y = 5.15; // Top of pole + half of lamp head height
    lampHead.castShadow = true;
    lampHead.receiveShadow = true;
    lamp.add(lampHead);

    // Create glass
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.y = 5.1; // Just below the lamp head
    lamp.add(glass);

    // Create light with optimized shadow settings
    const light = new THREE.PointLight(0xffffcc, 0, 15); // Reduced radius back to 15
    light.position.y = 5;

    // Only enable shadows on a small percentage of lights to improve performance
    if (Math.random() < 0.15) {
      // Reduced from 30% to 15%
      light.castShadow = true;
      light.shadow.mapSize.width = 256;
      light.shadow.mapSize.height = 256;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 12; // Reduced from 15 to 12
    }

    lamp.add(light);

    // Position the lamp
    lamp.position.set(x, 0, z);

    // Add to group
    this.streetLamps.add(lamp);

    // Store position and light reference
    this.streetLampPositions.push(new THREE.Vector3(x, 5, z));
    this.streetLampLights.push(light);
  }

  public update(delta: number): void {
    // Update time of day
    this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 1;

    // Update lighting based on time of day
    this.updateLighting(delta);
  }

  private updateLighting(_delta: number): void {
    // Calculate sun position based on time of day
    const sunAngle = Math.PI * 2 * (this.timeOfDay - 0.25); // -0.25 to start at sunrise
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.sin(sunAngle) * 100;
    const sunZ = 0;

    // Update directional light position (sun/moon)
    this.directionalLight.position.set(sunX, Math.max(0.1, sunY), sunZ);

    // Determine if it's day or night
    const isDay = sunY > 0;

    // Interpolate colors and intensities based on time of day
    let skyColor, fogColor, groundColor;
    let ambientIntensity, directionalIntensity, hemisphereIntensity;

    if (this.timeOfDay < 0.25) {
      // Night to dawn
      const t = this.timeOfDay / 0.25;
      skyColor = this.skyColors.night.clone().lerp(this.skyColors.dawn, t);
      fogColor = this.fogColors.night.clone().lerp(this.fogColors.dawn, t);
      groundColor = this.groundColors.night
        .clone()
        .lerp(this.groundColors.dawn, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.night,
        this.lightIntensities.ambient.dawn,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.night,
        this.lightIntensities.directional.dawn,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.night,
        this.lightIntensities.hemisphere.dawn,
        t
      );
    } else if (this.timeOfDay < 0.5) {
      // Dawn to day
      const t = (this.timeOfDay - 0.25) / 0.25;
      skyColor = this.skyColors.dawn.clone().lerp(this.skyColors.day, t);
      fogColor = this.fogColors.dawn.clone().lerp(this.fogColors.day, t);
      groundColor = this.groundColors.dawn
        .clone()
        .lerp(this.groundColors.day, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.dawn,
        this.lightIntensities.ambient.day,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.dawn,
        this.lightIntensities.directional.day,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.dawn,
        this.lightIntensities.hemisphere.day,
        t
      );
    } else if (this.timeOfDay < 0.75) {
      // Day to dusk
      const t = (this.timeOfDay - 0.5) / 0.25;
      skyColor = this.skyColors.day.clone().lerp(this.skyColors.dusk, t);
      fogColor = this.fogColors.day.clone().lerp(this.fogColors.dusk, t);
      groundColor = this.groundColors.day
        .clone()
        .lerp(this.groundColors.dusk, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.day,
        this.lightIntensities.ambient.dusk,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.day,
        this.lightIntensities.directional.dusk,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.day,
        this.lightIntensities.hemisphere.dusk,
        t
      );
    } else {
      // Dusk to night
      const t = (this.timeOfDay - 0.75) / 0.25;
      skyColor = this.skyColors.dusk.clone().lerp(this.skyColors.night, t);
      fogColor = this.fogColors.dusk.clone().lerp(this.fogColors.night, t);
      groundColor = this.groundColors.dusk
        .clone()
        .lerp(this.groundColors.night, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.dusk,
        this.lightIntensities.ambient.night,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.dusk,
        this.lightIntensities.directional.night,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.dusk,
        this.lightIntensities.hemisphere.night,
        t
      );
    }

    // Update scene background and fog
    this.scene.background = skyColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = fogColor;
    }

    // Update lights
    this.ambientLight.intensity = ambientIntensity;
    this.directionalLight.intensity = directionalIntensity;

    // Update hemisphere light
    this.hemisphereLight.intensity = hemisphereIntensity;
    this.hemisphereLight.color = skyColor;
    this.hemisphereLight.groundColor = groundColor;

    // Update street lamp lights based on time of day
    // Lamps turn on at dusk and turn off at dawn

    // Smooth transition for street lamps
    const targetLampIntensity = isDay ? 0 : 20; // Reduced from 20 to a more reasonable 2.0

    // If it's dawn or dusk, create a smooth transition
    let transitionFactor = 1;
    if (this.timeOfDay > 0.2 && this.timeOfDay < 0.3) {
      // Dawn transition
      transitionFactor = 1 - (this.timeOfDay - 0.2) / 0.1;
    } else if (this.timeOfDay > 0.7 && this.timeOfDay < 0.8) {
      // Dusk transition
      transitionFactor = (this.timeOfDay - 0.7) / 0.1;
    }

    // Apply lamp intensity with transition
    const actualLampIntensity = targetLampIntensity * transitionFactor;

    // Update all street lamp lights
    for (const light of this.streetLampLights) {
      light.intensity = actualLampIntensity;
    }

    // Update directional light color based on time of day
    if (isDay) {
      // Daytime - warm sunlight
      this.directionalLight.color.setHex(0xffffff);
    } else {
      // Nighttime - cool moonlight
      this.directionalLight.color.setHex(0xaabbff);
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public setTimeOfDay(time: number): void {
    this.timeOfDay = time % 1;
    this.updateLighting(0);
  }

  public setDayDuration(seconds: number): void {
    this.dayDuration = seconds;
    this.daySpeed = 1 / this.dayDuration;
  }

  /**
   * Set the speed of the day/night cycle
   * @param speed Speed multiplier (1 = normal, 2 = twice as fast, etc.)
   */
  public setDaySpeed(speed: number): void {
    this.daySpeed = speed / this.dayDuration;
  }
}
