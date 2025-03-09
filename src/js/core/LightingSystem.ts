import * as THREE from "three";
import { World } from "./World";

export class LightingSystem {
  private scene: THREE.Scene;
  private world: World;

  // Day/night cycle properties
  private dayDuration: number = 600; // 10 minutes in seconds
  private timeOfDay: number = 0; // 0 to 1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
  private daySpeed: number = 1 / this.dayDuration; // How fast the day progresses
  private isTimeFrozen: boolean = false; // Whether time is frozen

  // Lighting objects
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight; // Sun/moon
  private hemisphereLight!: THREE.HemisphereLight;

  // New atmospheric effects
  private sunLight!: THREE.DirectionalLight; // Separate sun light for better control
  private moonLight!: THREE.DirectionalLight; // Separate moon light
  private sunPosition: THREE.Vector3 = new THREE.Vector3();
  private moonPosition: THREE.Vector3 = new THREE.Vector3();

  // Street lamps
  private streetLamps: THREE.Group;
  private streetLampPositions: THREE.Vector3[] = [];
  private streetLampLights: THREE.PointLight[] = [];

  // Enhanced color presets for different times of day
  private skyColors = {
    night: new THREE.Color(0x0a0a20), // Deep blue night
    predawn: new THREE.Color(0x1a1a35), // Very dark blue before dawn
    dawn: new THREE.Color(0xf08c7a), // Pinkish orange sunrise
    morningGold: new THREE.Color(0xffd700), // Golden morning light
    day: new THREE.Color(0x87ceeb), // Light blue day
    lateAfternoon: new THREE.Color(0xd6eaff), // Slightly warmer late afternoon
    dusk: new THREE.Color(0xff7f50), // Orange sunset
    twilight: new THREE.Color(0x4a548c), // Blue-purple twilight
  };

  private fogColors = {
    night: new THREE.Color(0x0a0a15), // Dark blue night fog
    predawn: new THREE.Color(0x1a1a30), // Very dark blue fog before dawn
    dawn: new THREE.Color(0xd8b5b0), // Pinkish dawn fog
    morningGold: new THREE.Color(0xf0e68c), // Golden morning fog
    day: new THREE.Color(0xcfe8ef), // Light blue day fog
    lateAfternoon: new THREE.Color(0xe6dfd0), // Warm late afternoon fog
    dusk: new THREE.Color(0xd99c76), // Orange dusk fog
    twilight: new THREE.Color(0x3a4466), // Blue-purple twilight fog
  };

  private groundColors = {
    night: new THREE.Color(0x0a0a15), // Dark night ground
    predawn: new THREE.Color(0x1a1a30), // Very dark blue ground before dawn
    dawn: new THREE.Color(0x7a6a5a), // Dawn ground
    morningGold: new THREE.Color(0x8a7a6a), // Golden morning ground
    day: new THREE.Color(0x4caf50), // Green day ground
    lateAfternoon: new THREE.Color(0x5d9c5a), // Slightly warmer late afternoon ground
    dusk: new THREE.Color(0x7a5a4a), // Dusk ground
    twilight: new THREE.Color(0x3a3a4a), // Blue-purple twilight ground
  };

  private lightIntensities = {
    ambient: {
      night: 0.1,
      predawn: 0.15,
      dawn: 0.4,
      morningGold: 0.7,
      day: 1.0,
      lateAfternoon: 0.9,
      dusk: 0.6,
      twilight: 0.3,
    },
    directional: {
      night: 0.05,
      predawn: 0.1,
      dawn: 0.6,
      morningGold: 1.0,
      day: 1.2,
      lateAfternoon: 1.0,
      dusk: 0.7,
      twilight: 0.3,
    },
    hemisphere: {
      night: 0.05,
      predawn: 0.1,
      dawn: 0.5,
      morningGold: 0.8,
      day: 1.0,
      lateAfternoon: 0.9,
      dusk: 0.6,
      twilight: 0.2,
    },
  };

  // Light colors for different times of day
  private lightColors = {
    night: new THREE.Color(0x8080ff), // Cool blue moonlight
    predawn: new THREE.Color(0x9090ff), // Slightly brighter blue
    dawn: new THREE.Color(0xffb07a), // Warm orange sunrise
    morningGold: new THREE.Color(0xffd700), // Golden morning
    day: new THREE.Color(0xffffff), // Bright white daylight
    lateAfternoon: new THREE.Color(0xfff0d0), // Warm afternoon
    dusk: new THREE.Color(0xff9060), // Orange-red sunset
    twilight: new THREE.Color(0xa090ff), // Purple-blue twilight
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
    this.ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    this.scene.add(this.ambientLight);

    // Hemisphere light - sky and ground colors
    this.hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x4caf50, 1.0);
    this.scene.add(this.hemisphereLight);

    // Sun light - warm directional light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(100, 100, 50);
    this.sunLight.castShadow = true;

    // Configure shadow properties with optimized settings
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;

    // Add shadow bias to reduce shadow acne
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);

    // Moon light - cool directional light
    this.moonLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    this.moonLight.position.set(-100, 100, -50);
    this.moonLight.castShadow = true;

    // Configure moon shadow properties
    this.moonLight.shadow.mapSize.width = 512; // Lower resolution for moon shadows
    this.moonLight.shadow.mapSize.height = 512;
    this.moonLight.shadow.camera.near = 1;
    this.moonLight.shadow.camera.far = 300;
    this.moonLight.shadow.camera.left = -80;
    this.moonLight.shadow.camera.right = 80;
    this.moonLight.shadow.camera.top = 80;
    this.moonLight.shadow.camera.bottom = -80;

    // Add shadow bias to reduce shadow acne
    this.moonLight.shadow.bias = -0.0005;
    this.moonLight.shadow.normalBias = 0.02;

    this.scene.add(this.moonLight);

    // Keep directionalLight for backward compatibility
    this.directionalLight = this.sunLight;
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
    // Update time of day only if not frozen
    if (!this.isTimeFrozen) {
      this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 1;
    }

    // Update lighting based on time of day
    this.updateLighting(delta);
  }

  private updateLighting(_delta: number): void {
    // Calculate sun position based on time of day
    const sunAngle = Math.PI * 2 * (this.timeOfDay - 0.25); // -0.25 to start at sunrise
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.sin(sunAngle) * 100;
    const sunZ = 0;

    // Calculate moon position (opposite to sun)
    const moonAngle = Math.PI * 2 * (this.timeOfDay - 0.25 + 0.5); // Opposite to sun
    const moonX = Math.cos(moonAngle) * 100;
    const moonY = Math.sin(moonAngle) * 100;
    const moonZ = 0;

    // Update sun and moon positions
    this.sunPosition.set(sunX, Math.max(0.1, sunY), sunZ);
    this.moonPosition.set(moonX, Math.max(0.1, moonY), moonZ);

    this.sunLight.position.copy(this.sunPosition);
    this.moonLight.position.copy(this.moonPosition);

    // Determine if it's day or night
    const isDay = sunY > 0;

    // Interpolate colors and intensities based on time of day
    let skyColor, fogColor, groundColor, lightColor;
    let ambientIntensity, directionalIntensity, hemisphereIntensity;
    let sunIntensity = 0,
      moonIntensity = 0;

    // More granular time of day transitions
    if (this.timeOfDay < 0.2) {
      // Deep night (midnight to predawn)
      const t = this.timeOfDay / 0.2;
      skyColor = this.skyColors.night.clone().lerp(this.skyColors.predawn, t);
      fogColor = this.fogColors.night.clone().lerp(this.fogColors.predawn, t);
      groundColor = this.groundColors.night
        .clone()
        .lerp(this.groundColors.predawn, t);
      lightColor = this.lightColors.night
        .clone()
        .lerp(this.lightColors.predawn, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.night,
        this.lightIntensities.ambient.predawn,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.night,
        this.lightIntensities.directional.predawn,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.night,
        this.lightIntensities.hemisphere.predawn,
        t
      );

      moonIntensity = directionalIntensity;
      sunIntensity = 0;
    } else if (this.timeOfDay < 0.25) {
      // Predawn to dawn
      const t = (this.timeOfDay - 0.2) / 0.05;
      skyColor = this.skyColors.predawn.clone().lerp(this.skyColors.dawn, t);
      fogColor = this.fogColors.predawn.clone().lerp(this.fogColors.dawn, t);
      groundColor = this.groundColors.predawn
        .clone()
        .lerp(this.groundColors.dawn, t);
      lightColor = this.lightColors.predawn
        .clone()
        .lerp(this.lightColors.dawn, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.predawn,
        this.lightIntensities.ambient.dawn,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.predawn,
        this.lightIntensities.directional.dawn,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.predawn,
        this.lightIntensities.hemisphere.dawn,
        t
      );

      moonIntensity = this.lerp(directionalIntensity, 0, t);
      sunIntensity = this.lerp(0, directionalIntensity, t);
    } else if (this.timeOfDay < 0.3) {
      // Dawn to golden morning
      const t = (this.timeOfDay - 0.25) / 0.05;
      skyColor = this.skyColors.dawn
        .clone()
        .lerp(this.skyColors.morningGold, t);
      fogColor = this.fogColors.dawn
        .clone()
        .lerp(this.fogColors.morningGold, t);
      groundColor = this.groundColors.dawn
        .clone()
        .lerp(this.groundColors.morningGold, t);
      lightColor = this.lightColors.dawn
        .clone()
        .lerp(this.lightColors.morningGold, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.dawn,
        this.lightIntensities.ambient.morningGold,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.dawn,
        this.lightIntensities.directional.morningGold,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.dawn,
        this.lightIntensities.hemisphere.morningGold,
        t
      );

      sunIntensity = directionalIntensity;
      moonIntensity = 0;
    } else if (this.timeOfDay < 0.5) {
      // Golden morning to midday
      const t = (this.timeOfDay - 0.3) / 0.2;
      skyColor = this.skyColors.morningGold.clone().lerp(this.skyColors.day, t);
      fogColor = this.fogColors.morningGold.clone().lerp(this.fogColors.day, t);
      groundColor = this.groundColors.morningGold
        .clone()
        .lerp(this.groundColors.day, t);
      lightColor = this.lightColors.morningGold
        .clone()
        .lerp(this.lightColors.day, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.morningGold,
        this.lightIntensities.ambient.day,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.morningGold,
        this.lightIntensities.directional.day,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.morningGold,
        this.lightIntensities.hemisphere.day,
        t
      );

      sunIntensity = directionalIntensity;
      moonIntensity = 0;
    } else if (this.timeOfDay < 0.7) {
      // Midday to late afternoon
      const t = (this.timeOfDay - 0.5) / 0.2;
      skyColor = this.skyColors.day
        .clone()
        .lerp(this.skyColors.lateAfternoon, t);
      fogColor = this.fogColors.day
        .clone()
        .lerp(this.fogColors.lateAfternoon, t);
      groundColor = this.groundColors.day
        .clone()
        .lerp(this.groundColors.lateAfternoon, t);
      lightColor = this.lightColors.day
        .clone()
        .lerp(this.lightColors.lateAfternoon, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.day,
        this.lightIntensities.ambient.lateAfternoon,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.day,
        this.lightIntensities.directional.lateAfternoon,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.day,
        this.lightIntensities.hemisphere.lateAfternoon,
        t
      );

      sunIntensity = directionalIntensity;
      moonIntensity = 0;
    } else if (this.timeOfDay < 0.75) {
      // Late afternoon to dusk
      const t = (this.timeOfDay - 0.7) / 0.05;
      skyColor = this.skyColors.lateAfternoon
        .clone()
        .lerp(this.skyColors.dusk, t);
      fogColor = this.fogColors.lateAfternoon
        .clone()
        .lerp(this.fogColors.dusk, t);
      groundColor = this.groundColors.lateAfternoon
        .clone()
        .lerp(this.groundColors.dusk, t);
      lightColor = this.lightColors.lateAfternoon
        .clone()
        .lerp(this.lightColors.dusk, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.lateAfternoon,
        this.lightIntensities.ambient.dusk,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.lateAfternoon,
        this.lightIntensities.directional.dusk,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.lateAfternoon,
        this.lightIntensities.hemisphere.dusk,
        t
      );

      sunIntensity = directionalIntensity;
      moonIntensity = 0;
    } else if (this.timeOfDay < 0.8) {
      // Dusk to twilight
      const t = (this.timeOfDay - 0.75) / 0.05;
      skyColor = this.skyColors.dusk.clone().lerp(this.skyColors.twilight, t);
      fogColor = this.fogColors.dusk.clone().lerp(this.fogColors.twilight, t);
      groundColor = this.groundColors.dusk
        .clone()
        .lerp(this.groundColors.twilight, t);
      lightColor = this.lightColors.dusk
        .clone()
        .lerp(this.lightColors.twilight, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.dusk,
        this.lightIntensities.ambient.twilight,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.dusk,
        this.lightIntensities.directional.twilight,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.dusk,
        this.lightIntensities.hemisphere.twilight,
        t
      );

      sunIntensity = this.lerp(directionalIntensity, 0, t);
      moonIntensity = this.lerp(0, directionalIntensity, t);
    } else {
      // Twilight to night
      const t = (this.timeOfDay - 0.8) / 0.2;
      skyColor = this.skyColors.twilight.clone().lerp(this.skyColors.night, t);
      fogColor = this.fogColors.twilight.clone().lerp(this.fogColors.night, t);
      groundColor = this.groundColors.twilight
        .clone()
        .lerp(this.groundColors.night, t);
      lightColor = this.lightColors.twilight
        .clone()
        .lerp(this.lightColors.night, t);

      ambientIntensity = this.lerp(
        this.lightIntensities.ambient.twilight,
        this.lightIntensities.ambient.night,
        t
      );
      directionalIntensity = this.lerp(
        this.lightIntensities.directional.twilight,
        this.lightIntensities.directional.night,
        t
      );
      hemisphereIntensity = this.lerp(
        this.lightIntensities.hemisphere.twilight,
        this.lightIntensities.hemisphere.night,
        t
      );

      moonIntensity = directionalIntensity;
      sunIntensity = 0;
    }

    // Update scene background and fog
    this.scene.background = skyColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = fogColor;
    }

    // Update lights
    this.ambientLight.intensity = ambientIntensity;
    this.ambientLight.color = lightColor;

    // Update sun and moon lights
    this.sunLight.intensity = sunIntensity;
    this.sunLight.color = lightColor
      .clone()
      .lerp(new THREE.Color(0xffffff), 0.5); // Whiter sun

    this.moonLight.intensity = moonIntensity;
    this.moonLight.color = lightColor
      .clone()
      .lerp(new THREE.Color(0x8080ff), 0.5); // Bluer moon

    // Update hemisphere light
    this.hemisphereLight.intensity = hemisphereIntensity;
    this.hemisphereLight.color = skyColor;
    this.hemisphereLight.groundColor = groundColor;

    // Update street lamp lights based on time of day
    // Lamps turn on at dusk and turn off at dawn

    // Determine lamp intensity based on time of day
    let lampIntensity = 0;

    if (this.timeOfDay < 0.2) {
      // Night - full intensity
      lampIntensity = 1.0;
    } else if (this.timeOfDay < 0.3) {
      // Dawn transition - fade out
      lampIntensity = 1.0 - (this.timeOfDay - 0.2) / 0.1;
    } else if (this.timeOfDay < 0.7) {
      // Day - off
      lampIntensity = 0;
    } else if (this.timeOfDay < 0.8) {
      // Dusk transition - fade in
      lampIntensity = (this.timeOfDay - 0.7) / 0.1;
    } else {
      // Night - full intensity
      lampIntensity = 1.0;
    }

    // Apply lamp intensity
    const actualLampIntensity = 2.0 * lampIntensity; // Base intensity of 2.0

    // Update all street lamp lights
    for (const light of this.streetLampLights) {
      light.intensity = actualLampIntensity;

      // Adjust lamp color based on time of day
      if (this.timeOfDay > 0.7 && this.timeOfDay < 0.8) {
        // During dusk, make the lights more orange as they turn on
        const t = (this.timeOfDay - 0.7) / 0.1;
        light.color.setHex(0xffcc88).lerp(new THREE.Color(0xffffcc), t);
      } else {
        // Normal lamp color
        light.color.setHex(0xffffcc);
      }
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public setTimeOfDay(time: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    this.updateLighting(0);
  }

  public setTimeFrozen(frozen: boolean): void {
    this.isTimeFrozen = frozen;
  }

  public isTimeFreezed(): boolean {
    return this.isTimeFrozen;
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
