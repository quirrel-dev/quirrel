import fetch from "cross-fetch";

export class IncidentForwarder {
  constructor(
    private readonly incidentEndpoint: string,
    private readonly passphrase: string
  ) {}

  async dispatch(
    job: {
      tokenId: string;
      id: string;
      endpoint: string;
      payload: string;
      runAt: Date;
    },
    incident: { status: number; body: string }
  ) {
    try {
      fetch(this.incidentEndpoint, {
        method: "POST",
        body: JSON.stringify({
          type: "incident",
          job,
          incident,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.passphrase}`,
        },
      });
    } catch (error) {
      console.error("Incident receiver is down: ", error);
    }
  }
}
