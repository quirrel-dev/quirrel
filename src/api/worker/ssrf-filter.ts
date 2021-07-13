// shamelessly stolem from https://github.com/y-mehta/ssrf-req-filter

import https from "https";
import http from "http";
import ipaddr from "ipaddr.js"

function checkIp(ip: string): boolean {
  if (!ipaddr.isValid(ip)) {
    return true;
  }
  try {
    const addr = ipaddr.parse(ip);
    const range = addr.range();
    if (range !== "unicast") {
      return false; // Private IP Range
    }
  } catch (err) {
    return false;
  }
  return true;
}

export function ssrfFilter(url: URL) {
  const agent = url.protocol === "https:" ? new https.Agent() : new http.Agent();
  const oldCreateConnection = (agent as any).createConnection;
  (agent as any).createConnection = function (options: any, func: any): any {
    const { host: address } = options;
    if (!checkIp(address)) {
      throw new Error(`Call to ${address} is blocked.`);
    }
    const socket = oldCreateConnection.call(this, options, func);
    socket.on("lookup", (error: any, address: string) => {
      if (error || checkIp(address)) {
        return false;
      }
      return socket.destroy(new Error(`Call to ${address} is blocked.`));
    });
    return socket;
  };
  return agent;
}
