import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

import { Player } from "../entities/Player";
import { World } from "./World";
import { InputManager } from "./InputManager";
import { UIManager } from "../ui/UIManager";
import { ZombieManager } from "../entities/ZombieManager";
import { ItemManager } from "../entities/ItemManager";
import { LightingSystem } from "./LightingSystem";
import { CommandManager } from "./CommandManager";
import { ProjectileManager } from "../entities/ProjectileManager";

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private world!: World;
  private player!: Player;
  private inputManager!: InputManager;
  private uiManager!: UIManager;
  private zombieManager!: ZombieManager;
  private itemManager!: ItemManager;
  private lightingSystem!: LightingSystem;
  private commandManager!: CommandManager;
  private projectileManager!: ProjectileManager;

  private isGameOver: boolean = false;
  private isLoading: boolean = true;
  private loadingManager: THREE.LoadingManager;

  constructor() {
    // Create the scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Light blue sky color
    this.scene.fog = new THREE.FogExp2(0x9dc183, 0.005); // Lighter fog color and reduced density

    // Create the camera with isometric perspective
    this.camera = new THREE.PerspectiveCamera(
      45, // Narrower FOV for more isometric feel (original setting)
      window.innerWidth / window.innerHeight,
      0.1,
      1000 // Original far plane
    );

    // Set up isometric camera position (high up and at an angle)
    this.camera.position.set(20, 20, 20); // Original camera position
    this.camera.lookAt(0, 0, 0);

    // Create the renderer with enhanced settings for realistic lighting
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Enhanced shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

    // Set color output format
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Better color representation

    // Set tone mapping for HDR-like effects
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic tone mapping
    this.renderer.toneMappingExposure = 1.2; // Slightly increased exposure for more vibrant lighting

    document
      .getElementById("game-container")
      ?.appendChild(this.renderer.domElement);

    // Create the clock
    this.clock = new THREE.Clock();

    // Create the loading manager
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoadingManager();

    // Handle window resize
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  private setupLoadingManager(): void {
    this.loadingManager = new THREE.LoadingManager();

    // Set up loading events
    this.loadingManager.onLoad = () => {
      console.log("Loading complete!");
      this.isLoading = false;

      // Hide loading screen with a fade out
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
        loadingScreen.classList.add("fade-out");
        setTimeout(() => {
          loadingScreen.style.display = "none";
        }, 500);
      }
    };

    this.loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      console.log(`Loading: ${itemsLoaded}/${itemsTotal}`);

      // Update progress bar
      const progressBar = document.getElementById("progress-bar");
      if (progressBar) {
        const percent = (itemsLoaded / itemsTotal) * 100;
        progressBar.style.width = `${percent}%`;
      }

      // Update loading text
      const loadingText = document.getElementById("loading-text");
      if (loadingText) {
        loadingText.textContent = `Loading... ${Math.round(
          (itemsLoaded / itemsTotal) * 100
        )}%`;
      }
    };

    this.loadingManager.onError = (url) => {
      console.error(`Error loading ${url}`);
    };
  }

  public init(): void {
    // Setup loading manager
    this.setupLoadingManager();

    // Create the clock
    this.clock = new THREE.Clock();

    // Initialize the world
    this.world = new World(this.scene, this.loadingManager);
    this.world.init();

    // Initialize the player
    this.player = new Player(this.scene, this.camera, this.loadingManager);
    this.player.setWorld(this.world);

    // Initialize the zombie manager
    this.zombieManager = new ZombieManager(
      this.scene,
      this.player,
      this.world,
      this.loadingManager
    );

    // Initialize the projectile manager
    this.projectileManager = new ProjectileManager(
      this.scene,
      this.world,
      this.zombieManager
    );

    // Connect the projectile manager to the player
    this.player.setProjectileManager(this.projectileManager);

    // Initialize the item manager
    this.itemManager = new ItemManager(
      this.scene,
      this.player,
      this.world,
      this.loadingManager
    );

    // Initialize the lighting system
    this.lightingSystem = new LightingSystem(this.scene, this.world);
    this.lightingSystem.createStreetLamps();

    // Create the command manager
    this.commandManager = new CommandManager();
    this.commandManager.setLightingSystem(this.lightingSystem);

    // Set up input manager
    this.inputManager = new InputManager(this.player);
    this.inputManager.setZombieManager(this.zombieManager);
    this.inputManager.setLightingSystem(this.lightingSystem);
    this.inputManager.setCommandManager(this.commandManager);

    // Initialize the UI manager and connect it to the lighting system
    this.uiManager = new UIManager(this.player);
    this.uiManager.setLightingSystem(this.lightingSystem);

    // Connect the UI manager to the player for damage effects
    this.player.setUIManager(this.uiManager);

    // Start the animation loop
    this.animate();

    // Manually trigger loading completion since we're not loading external assets
    setTimeout(() => {
      if (this.isLoading && this.loadingManager.onLoad) {
        console.log("Manually triggering loading completion");
        this.loadingManager.onLoad();
      }
    }, 1000);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    if (this.isLoading) return;

    const delta = this.clock.getDelta();

    // Update TWEEN
    TWEEN.update();

    // Update game entities
    if (!this.isGameOver) {
      this.player.update(delta);
      this.zombieManager.update(delta);
      this.itemManager.update(delta);
      this.world.update(delta);
      this.projectileManager.update(delta);
      this.uiManager.update();
      this.inputManager.update();

      // Update lighting system
      this.lightingSystem.update(delta);

      // Check for game over condition
      if (this.player.getHealth() <= 0) {
        this.gameOver();
      }
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private gameOver(): void {
    this.isGameOver = true;
    const gameOverScreen = document.getElementById("game-over");
    if (gameOverScreen) {
      gameOverScreen.classList.remove("hidden");
    }

    // Update the cause of death message
    const deathCauseElement = document.getElementById("death-cause");
    if (deathCauseElement) {
      let causeOfDeath = this.player.getCauseOfDeath();

      // Format the cause of death message
      let causeMessage = "Cause of death: ";
      switch (causeOfDeath) {
        case "zombie attack":
          causeMessage += "Eaten by zombies";
          break;
        case "starvation":
          causeMessage += "Starvation";
          break;
        case "dehydration":
          causeMessage += "Dehydration";
          break;
        default:
          causeMessage += "Unknown";
      }

      deathCauseElement.textContent = causeMessage;
    }

    const restartButton = document.getElementById("restart-button");
    if (restartButton) {
      restartButton.addEventListener("click", this.restart.bind(this));
    }
  }

  private restart(): void {
    // Reset game state
    this.isGameOver = false;

    // Reset all game components
    this.player.reset();
    this.zombieManager.reset();
    this.uiManager.reset();

    // Hide game over screen
    const gameOverScreen = document.getElementById("game-over");
    if (gameOverScreen) {
      gameOverScreen.classList.add("hidden");
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
