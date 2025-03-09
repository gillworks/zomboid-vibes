import { LightingSystem } from "./LightingSystem";

// Command interface
interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => void;
}

export class CommandManager {
  private commands: Map<string, Command> = new Map();
  private commandContainer: HTMLElement | null;
  private commandInput: HTMLInputElement | null;
  private commandSuggestions: HTMLElement | null;
  private lightingSystem: LightingSystem | null = null;
  private isTimeFreezed: boolean = false;
  private isCommandInputOpen: boolean = false;

  constructor() {
    this.commandContainer = document.getElementById("command-container");
    this.commandInput = document.getElementById(
      "command-input"
    ) as HTMLInputElement;
    this.commandSuggestions = document.getElementById("command-suggestions");
    this.isCommandInputOpen = false;

    this.setupEventListeners();
    this.registerCommands();
  }

  public setLightingSystem(lightingSystem: LightingSystem): void {
    this.lightingSystem = lightingSystem;
  }

  private setupEventListeners(): void {
    // Handle slash key to open command input
    document.addEventListener("keydown", (event) => {
      // Only open command input if not already open and not typing in another input
      if (
        event.key === "/" &&
        this.commandContainer?.classList.contains("hidden") &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        this.openCommandInput();
      }

      // Handle escape key to close command input
      if (
        event.key === "Escape" &&
        !this.commandContainer?.classList.contains("hidden")
      ) {
        this.closeCommandInput();
      }
    });

    // Handle command submission
    this.commandInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.executeCommand(this.commandInput.value);
        this.closeCommandInput();
      }
    });

    // Handle input changes for suggestions
    this.commandInput?.addEventListener("input", () => {
      this.updateSuggestions();
    });

    // Handle arrow keys for suggestion navigation
    this.commandInput?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.navigateSuggestions(event.key === "ArrowDown" ? 1 : -1);
      }
    });
  }

  private registerCommands(): void {
    // Register the freezetime command
    this.registerCommand({
      name: "freezetime",
      description: "Freezes the time of day at its current position",
      execute: () => {
        if (!this.lightingSystem) return;

        this.isTimeFreezed = !this.isTimeFreezed;
        this.lightingSystem.setTimeFrozen(this.isTimeFreezed);

        const message = this.isTimeFreezed
          ? "Time has been frozen"
          : "Time is flowing normally";

        this.showCommandFeedback(message);
      },
    });

    // Register time command
    this.registerCommand({
      name: "time",
      description:
        "Sets the time of day in 24-hour format (e.g., /time 1400 for 2pm)",
      execute: (args) => {
        if (!this.lightingSystem) return;

        if (args.length === 0) {
          // If no time provided, show current time
          const currentTime = this.lightingSystem.getTimeOfDay();
          const hours = Math.floor(currentTime * 24);
          const minutes = Math.floor((currentTime * 24 * 60) % 60);
          const formattedTime = `${hours.toString().padStart(2, "0")}${minutes
            .toString()
            .padStart(2, "0")}`;
          this.showCommandFeedback(
            `Current time: ${formattedTime} (${this.formatTimeForDisplay(
              hours,
              minutes
            )})`
          );
          return;
        }

        // Parse the time argument
        const timeArg = args[0];
        if (!/^\d{1,4}$/.test(timeArg)) {
          this.showCommandFeedback(
            "Invalid time format. Use 24-hour format (e.g., 1400 for 2pm)"
          );
          return;
        }

        // Parse hours and minutes
        let hours, minutes;
        if (timeArg.length <= 2) {
          // If only hours provided (e.g., "14" or "3")
          hours = parseInt(timeArg);
          minutes = 0;
        } else {
          // If hours and minutes provided (e.g., "1430" or "0305")
          const paddedTime = timeArg.padStart(4, "0");
          hours = parseInt(paddedTime.substring(0, 2));
          minutes = parseInt(paddedTime.substring(2, 4));
        }

        // Validate hours and minutes
        if (hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
          this.showCommandFeedback(
            "Invalid time. Hours must be 0-23 and minutes must be 0-59."
          );
          return;
        }

        // Convert to time of day value (0-1)
        const timeOfDay = (hours + minutes / 60) / 24;

        // Set the time
        this.lightingSystem.setTimeOfDay(timeOfDay);

        // Format time for display
        const displayTime = this.formatTimeForDisplay(hours, minutes);

        this.showCommandFeedback(`Time set to ${displayTime}`);
      },
    });

    // Register help command
    this.registerCommand({
      name: "help",
      description: "Shows a list of available commands",
      execute: () => {
        let helpText = "Available commands:\n";
        this.commands.forEach((command) => {
          helpText += `/${command.name} - ${command.description}\n`;
        });
        console.log(helpText);
        this.showCommandFeedback(helpText);
      },
    });
  }

  private registerCommand(command: Command): void {
    this.commands.set(command.name.toLowerCase(), command);
  }

  private openCommandInput(): void {
    if (this.commandContainer) {
      this.commandContainer.classList.remove("hidden");
      this.commandInput?.focus();
      this.isCommandInputOpen = true;
    }
  }

  private closeCommandInput(): void {
    if (this.commandContainer) {
      this.commandContainer.classList.add("hidden");
      if (this.commandInput) {
        this.commandInput.value = "";
      }
      if (this.commandSuggestions) {
        this.commandSuggestions.style.display = "none";
      }
      this.isCommandInputOpen = false;
    }
  }

  public isInputOpen(): boolean {
    return this.isCommandInputOpen;
  }

  private executeCommand(input: string): void {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const parts = trimmedInput.split(" ");
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (command) {
      command.execute(args);
    } else {
      this.showCommandFeedback(`Unknown command: ${commandName}`);
    }
  }

  private updateSuggestions(): void {
    if (!this.commandInput || !this.commandSuggestions) return;

    const input = this.commandInput.value.toLowerCase();
    if (!input) {
      this.commandSuggestions.style.display = "none";
      return;
    }

    // Filter commands that match the input
    const matchingCommands = Array.from(this.commands.values()).filter(
      (command) => command.name.toLowerCase().includes(input)
    );

    if (matchingCommands.length === 0) {
      this.commandSuggestions.style.display = "none";
      return;
    }

    // Display suggestions
    this.commandSuggestions.innerHTML = "";
    this.commandSuggestions.style.display = "block";

    matchingCommands.forEach((command) => {
      const suggestionElement = document.createElement("div");
      suggestionElement.className = "command-suggestion";
      suggestionElement.textContent = command.name;
      suggestionElement.addEventListener("click", () => {
        if (this.commandInput) {
          this.commandInput.value = command.name;
          this.commandInput.focus();
        }
      });
      this.commandSuggestions?.appendChild(suggestionElement);
    });
  }

  private navigateSuggestions(direction: number): void {
    const suggestions = this.commandSuggestions?.querySelectorAll(
      ".command-suggestion"
    );
    if (!suggestions || suggestions.length === 0) return;

    // Find currently selected suggestion
    const selectedIndex = Array.from(suggestions).findIndex((el) =>
      el.classList.contains("selected")
    );

    // Remove current selection
    suggestions.forEach((el) => el.classList.remove("selected"));

    // Calculate new index
    let newIndex;
    if (selectedIndex === -1) {
      newIndex = direction > 0 ? 0 : suggestions.length - 1;
    } else {
      newIndex =
        (selectedIndex + direction + suggestions.length) % suggestions.length;
    }

    // Apply new selection
    suggestions[newIndex].classList.add("selected");
    if (this.commandInput) {
      this.commandInput.value = suggestions[newIndex].textContent || "";
    }
  }

  private showCommandFeedback(message: string): void {
    // Create or get feedback element
    let feedbackElement = document.getElementById("command-feedback");
    if (!feedbackElement) {
      feedbackElement = document.createElement("div");
      feedbackElement.id = "command-feedback";
      document.getElementById("ui-container")?.appendChild(feedbackElement);
    }

    // Set message and show feedback
    feedbackElement.textContent = message;
    feedbackElement.classList.add("active");

    // Hide after a delay
    setTimeout(() => {
      feedbackElement.classList.remove("active");
    }, 3000);
  }

  private formatTimeForDisplay(hours: number, minutes: number): string {
    // Convert 24-hour time to 12-hour format with AM/PM
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${period}`;
  }
}
