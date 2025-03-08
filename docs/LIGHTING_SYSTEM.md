# Lighting System Documentation

## Overview

The lighting system in Zomboid Vibes creates a realistic day/night cycle with dynamic lighting effects. It manages the sun/moon position, sky colors, fog, and street lamps to create an immersive environment that changes throughout the day.

## Key Components

### LightingSystem Class

The main class that handles all lighting-related functionality is located in `src/js/core/LightingSystem.ts`.

#### Properties

- `timeOfDay`: A value between 0 and 1 representing the current time of day (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
- `dayDuration`: The duration of a full day/night cycle in seconds (default: 600 seconds or 10 minutes)
- `daySpeed`: How fast the day progresses (calculated as 1 / dayDuration)
- `ambientLight`, `directionalLight`, `hemisphereLight`: The three main light sources
- `streetLamps`: A group containing all street lamp objects
- `streetLampLights`: Array of point lights used for street lamps
- Color presets for different times of day (sky, fog, ground)
- Light intensity presets for different times of day

#### Methods

- `update(delta)`: Updates the time of day and lighting based on the elapsed time
- `updateLighting(_delta)`: Updates all lighting elements based on the current time of day
- `createStreetLamps()`: Creates street lamps at road intersections
- `createStreetLamp(...)`: Creates a single street lamp with pole, head, glass, and light
- `getTimeOfDay()`: Returns the current time of day
- `setTimeOfDay(time)`: Sets the time of day to a specific value
- `setDayDuration(seconds)`: Sets the duration of a full day/night cycle
- `setDaySpeed(speed)`: Sets the speed multiplier for the day/night cycle

## Time of Day Representation

The time of day is represented as a value between 0 and 1:

- 0.0: Midnight
- 0.25: Sunrise/Dawn
- 0.5: Noon
- 0.75: Sunset/Dusk

## Lighting Transitions

The system smoothly transitions between four key lighting states:

1. **Night**: Deep blue sky, dark blue fog, minimal ambient light
2. **Dawn**: Pinkish-orange sky, pink fog, increasing directional light
3. **Day**: Bright blue sky, light blue fog, maximum light intensity
4. **Dusk**: Orange-red sky, orange fog, decreasing directional light

## Street Lamps

Street lamps are strategically placed at selected block corners and automatically turn on at dusk and off at dawn. The lamps provide illumination during nighttime, creating pools of light throughout the neighborhood. For performance optimization:

- Lamps are placed at every other block corner in a diagonal pattern for good coverage with fewer lights
- Only 15% of lamps cast shadows (reduced from 30%)
- Shadow map sizes are optimized (256×256)
- Shadow distance is limited to 12 units (reduced from 15)
- Light radius is set to 15 units
- Night intensity is set to 2.0 (balanced for good visibility without excessive performance impact)

The glass material on the lamps has an emissive property that makes them visually glow even when viewed from a distance.

## UI Integration

The lighting system integrates with the UI through:

- A clock display showing the current time
- A visual indicator showing the sun/moon position
- Keyboard shortcuts for controlling time (only active when the time controls help panel is open)
- Visual feedback when time controls are used

The time controls are intentionally restricted to only work when the help panel is open, preventing accidental time changes during normal gameplay.

## Performance Considerations

The lighting system is optimized for performance:

- Reduced shadow map sizes (1024×1024 for directional light)
- Limited shadow camera frustum
- Selective shadow casting for street lamps
- Optimized number of street lamps

## Usage Examples

### Setting the Time of Day

```typescript
// Set time to noon
lightingSystem.setTimeOfDay(0.5);

// Set time to sunset
lightingSystem.setTimeOfDay(0.75);
```

### Changing Day Duration

```typescript
// Set a full day/night cycle to last 20 minutes
lightingSystem.setDayDuration(1200);

// Speed up time (10x faster)
lightingSystem.setDaySpeed(10);
```

## Future Improvements

Potential enhancements for the lighting system:

- Weather effects (rain, fog, clouds)
- Indoor lighting that responds to time of day
- Light sources from player items (flashlights, lanterns)
- More detailed street lamp models
- Optimized shadow techniques for better performance
