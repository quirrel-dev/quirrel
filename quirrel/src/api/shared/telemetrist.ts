import PlausibleTelemetry from "plausible-telemetry";

new PlausibleTelemetry(
  "telemetry.quirrel.dev",
  "mobile"
)

export class Telemetrist extends PlausibleTelemetry {
  constructor(runningInDocker: boolean) {
    super("telemetry.quirrel.dev", runningInDocker ? "mobile" : "tablet");
  }

  public async dispatch(path: string, name = "pageview") {
    await this.record(path, name);
  }
}
