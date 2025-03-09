# Zomboid Vibes

A Project Zomboid inspired survival game built with Three.js for the web browser.

![Zomboid Vibes Screenshot](screenshot.png)

## Description

Zomboid Vibes is a browser-based survival horror game inspired by Project Zomboid. The game features:

- First-person/third-person survival gameplay
- Zombie enemies that chase and attack the player
- Health and hunger mechanics
- Item collection and inventory management
- Procedurally generated terrain
- Realistic day/night cycle with dynamic lighting
- Street lamps that automatically turn on at night
- Building interiors (coming soon)
- Ranged weapons with ammo system

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/gillworks/zomboid-vibes.git
cd zomboid-vibes
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## How to Play

### Basic Controls

- **WASD**: Move the player
- **Mouse**: Look around
- **Left Click**: Attack zombies or shoot with equipped weapon
- **I**: Open/close inventory
- **E**: Interact with objects (coming soon)
- **1, 2, 3**: Select hotbar slots

### Weapons System

#### Melee Weapons

- Melee weapons like the Baseball Bat deal damage to zombies at close range
- Equip a melee weapon from your inventory or hotbar
- Left click to swing the weapon when zombies are in range

#### Pistol

- The pistol is a ranged weapon that can hit zombies from a distance
- To use the pistol:
  1. Find and pick up a pistol in the game world
  2. Find and pick up pistol ammo (yellow boxes)
  3. Equip the pistol from your inventory or hotbar
  4. Left click to shoot
  5. Monitor your ammo count displayed in the bottom right corner
- Each pistol shot:
  - Deals high damage to zombies
  - Has a longer range than melee weapons
  - Applies knockback to zombies
  - Consumes one ammo

### Time Controls

- **T**: Open/close time controls help panel
- **Click on the clock**: Show/hide time controls help panel
- The following controls only work when the help panel is open:
  - **Y**: Toggle time speed (normal/10x)
  - **U**: Set time to dawn
  - **I**: Set time to noon
  - **O**: Set time to dusk
  - **P**: Set time to midnight

## Features

### Dynamic Lighting System

The game features a realistic lighting system that simulates the day/night cycle:

- Smooth transitions between different times of day
- Dynamic sky colors that change from deep blue night to bright blue day
- Atmospheric fog that adjusts based on time of day
- Directional sunlight that moves across the sky
- Strategically placed street lamps that automatically turn on at dusk and off at dawn
- Performance-optimized shadows for an immersive experience without sacrificing framerate

### Time Display

A clock in the top-right corner shows the current in-game time:

- Visual indicator showing sun/moon position
- 12-hour time format with AM/PM
- Special visual effects during dawn and dusk

### Inventory and Hotbar System

- Collect items throughout the world
- Manage your inventory with up to 16 slots
- Equip items to your 3-slot hotbar for quick access
- Different item types:
  - Food: Restores hunger
  - Water: Restores thirst
  - Medkits: Restore health
  - Weapons: Used to attack zombies
  - Ammo: Used for ranged weapons

## Building for Production

To build the game for production, run:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technologies Used

- [Three.js](https://threejs.org/) - 3D graphics library
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Vite](https://vitejs.dev/) - Frontend build tool

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by [Project Zomboid](https://projectzomboid.com/)
- Built with [Three.js](https://threejs.org/)
