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
- Day/night cycle (coming soon)
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

- **WASD**: Move the player
- **Mouse**: Look around
- **I**: Open/close inventory
- **E**: Interact with objects (coming soon)
- **Left Click**: Attack (coming soon)
- **Right Click**: Use equipped item (coming soon)

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
