import axios from "axios";

// see https://github.com/plausible/analytics/blob/d463814da72f28b3323a520314fc52f195ed40ab/lib/plausible_web/controllers/api/external_controller.ex#L155
// for a mapping between screenwidth and device
enum ScreenWidth {
  Docker = 500, // Mobile
  Node = 900, // Tablet
}

let alreadyPrinted = false;
function printTelemetryMessage() {
  if (alreadyPrinted) {
    return;
  }

  console.log(
    "Telemetry: Quirrel collects **completely anonymous** telemetry data about general usage.\n" +
      "Participation in this anonymous program is optional, and you may opt-out if you'd not like to share any information.\n" +
      "To opt-out, set the QUIRREL_DISABLE_TELEMETRY environment variable."
  );

  alreadyPrinted = true;
}

export class Telemetrist {
  isDisabled: boolean;
  screenWidth: ScreenWidth;

  constructor(runningInDocker: boolean) {
    this.screenWidth = runningInDocker ? ScreenWidth.Docker : ScreenWidth.Node;

    if (process.env.QUIRREL_DISABLE_TELEMETRY) {
      this.isDisabled = true;
    } else {
      printTelemetryMessage();
      this.isDisabled = false;
    }
  }

  public async dispatch(path: string, name = "pageview") {
    if (this.isDisabled) {
      return;
    }

    axios.post("https://plausible.io/api/event", {
      name,
      url: `https://telemetry.quirrel.dev/${path}`,
      domain: "telemetry.quirrel.dev",
      screen_width: this.screenWidth,
    });
  }

  public async goal(name: string) {
    await this.dispatch("", name);
  }
}
