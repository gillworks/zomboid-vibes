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
- **Left Click**: Attack zombies
- **I**: Open/close inventory
- **E**: Interact with objects (coming soon)

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
