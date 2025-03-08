import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
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
  private controls: OrbitControls;
  private stats: Stats;
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
    this.scene.fog = new THREE.FogExp2(0x111111, 0.05);

    // Create the camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 10);

    // Create the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document
      .getElementById("game-container")
      ?.appendChild(this.renderer.domElement);

    // Create the controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Create the stats
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);

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
    // Initialize the world
    this.world = new World(this.scene, this.loadingManager);
    this.world.init();

    // Initialize the player
    this.player = new Player(this.scene, this.camera, this.loadingManager);

    // Initialize the input manager
    this.inputManager = new InputManager(this.player);

    // Initialize the UI manager
    this.uiManager = new UIManager(this.player);

    // Initialize the zombie manager
    this.zombieManager = new ZombieManager(
      this.scene,
      this.player,
      this.world,
      this.loadingManager
    );

    // Initialize the item manager
    this.itemManager = new ItemManager(
      this.scene,
      this.player,
      this.world,
      this.loadingManager
    );

    // Set up the lights
    this.setupLights();

    // Start the animation loop
    this.animate();
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

    this.stats.begin();

    const delta = this.clock.getDelta();

    // Update controls
    this.controls.update();

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

    this.stats.end();
  }

  private gameOver(): void {
    this.isGameOver = true;
    const gameOverScreen = document.getElementById("game-over");
    if (gameOverScreen) {
      gameOverScreen.classList.remove("hidden");
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
