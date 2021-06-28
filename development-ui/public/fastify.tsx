import { initialize } from "./template";
import cookie from "js-cookie";

const config = cookie.get("Quirrel-UI-Config") ?? "";
const [authEnabled = "true"] = config.split("-");

initialize({
  authentication: {
    enabled: authEnabled === "true",
  },
  fixedEndpoint: window.location.origin,
  linkToAPIDocs: "/documentation",
});
