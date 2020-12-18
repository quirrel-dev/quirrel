import axios from "axios";

// see https://github.com/plausible/analytics/blob/d463814da72f28b3323a520314fc52f195ed40ab/lib/plausible_web/controllers/api/external_controller.ex#L155
// for a mapping between screenwidth and device
enum ScreenWidth {
  Docker = 500, // Mobile
  Node = 900, // Tablet
}

export class Telemetrist {
  constructor(private readonly runningInDocker: boolean) {}

  private getScreenWidth() {
    return this.runningInDocker ? ScreenWidth.Docker : ScreenWidth.Node;
  }

  public async dispatch(path: string, name = "pageview") {
    try {
      await axios.post(
        "https://plausible.io/api/event",
        {
          name,
          url: `https://telemetry.quirrel.dev/${path}`,
          domain: "telemetry.quirrel.dev",
          screen_width: this.getScreenWidth(),
        },
        {
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  public async goal(name: string) {
    await this.dispatch("", name);
  }
}
