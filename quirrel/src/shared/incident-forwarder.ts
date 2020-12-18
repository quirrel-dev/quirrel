import axios from "axios";

export class IncidentForwarder {
  private axios;
  constructor(incidentEndpoint: string, passphrase: string) {
    this.axios = axios.create({
      baseURL: incidentEndpoint,
      headers: {
        Authorization: `Bearer ${passphrase}`,
      },
    });
  }

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
      await this.axios.post("", {
        type: "incident",
        job,
        incident,
      });
    } catch (error) {
      console.error("Incident receiver is down: ", error);
    }
  }
}
