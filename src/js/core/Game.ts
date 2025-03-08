import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

import { Player } from "../entities/Player";
import { World } from "./World";
import { InputManager } from "./InputManager";
import { UIManager } from "../ui/UIManager";
import { ZombieManager } from "../entities/ZombieManager";
import { ItemManager } from "../entities/ItemManager";

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private world: World;
  private player: Player;
  private inputManager: InputManager;
  private uiManager: UIManager;
  private zombieManager: ZombieManager;
  private itemManager: ItemManager;

  private isGameOver: boolean = false;
  private isLoading: boolean = true;
  private loadingManager: THREE.LoadingManager;

  constructor() {
    // Create the scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.FogExp2(0x333333, 0.01);

    // Create the camera with isometric perspective
    this.camera = new THREE.PerspectiveCamera(
      45, // Narrower FOV for more isometric feel
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Set up isometric camera position (high up and at an angle)
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    // Create the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    const progressBar = document.getElementById("progress-bar");
    const loadingText = document.getElementById("loading-text");

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = (itemsLoaded / itemsTotal) * 100;
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (loadingText) {
        loadingText.textContent = `Loading... ${Math.round(progress)}%`;
      }
    };

    this.loadingManager.onLoad = () => {
      setTimeout(() => {
        this.isLoading = false;
        const loadingScreen = document.getElementById("loading-screen");
        if (loadingScreen) {
          loadingScreen.style.opacity = "0";
          setTimeout(() => {
            loadingScreen.style.display = "none";
          }, 500);
        }
      }, 1000);
    };
  }

  public init(): void {
    // Create the world
    this.world = new World(this.scene, this.loadingManager);
    this.world.init();

    // Create the player
    this.player = new Player(this.scene, this.camera, this.loadingManager);

    // Position the player at a road intersection in the neighborhood
    // The roads are positioned at multiples of blockSize (30)
    // So we'll place the player at the first intersection (0, 0)
    this.player.getPlayerGroup().position.set(0, 0, 0);

    // Set the world reference for collision detection
    this.player.setWorld(this.world);

    // Create the input manager
    this.inputManager = new InputManager(this.player);

    // Create the zombie manager
    this.zombieManager = new ZombieManager(
      this.scene,
      this.player,
      this.world,
      this.loadingManager
    );

    // Connect zombie manager to input manager
    this.inputManager.setZombieManager(this.zombieManager);

    // Create the item manager
    this.itemManager = new ItemManager(
      this.scene,
      this.player,
      this.world,
      this.loadingManager
    );

    // Create the UI manager
    this.uiManager = new UIManager(this.player);

    // Set up lights
    this.setupLights();

    // Start the animation loop
    this.animate();

    // Manually trigger the loading completion since we're not loading external assets
    setTimeout(() => {
      // Simulate loading progress
      const progressBar = document.getElementById("progress-bar");
      if (progressBar) {
        progressBar.style.width = "100%";
      }

      const loadingText = document.getElementById("loading-text");
      if (loadingText) {
        loadingText.textContent = "Loading... 100%";
      }

      // Trigger the onLoad callback
      if (this.loadingManager.onLoad) {
        this.loadingManager.onLoad();
      }
    }, 1000);
  }

  private setupLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    this.scene.add(directionalLight);

    // Add a hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    this.scene.add(hemisphereLight);
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
      this.uiManager.update();

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

    // Hide game over screen
    const gameOverScreen = document.getElementById("game-over");
    if (gameOverScreen) {
      gameOverScreen.classList.add("hidden");
    }

    // Reset player
    this.player.reset();

    // Reset zombies
    this.zombieManager.reset();

    // Reset items
    this.itemManager.reset();

    // Reset UI
    this.uiManager.reset();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
