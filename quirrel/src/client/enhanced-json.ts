import SuperJSON from "superjson";

export function stringify(value: any): string {
  return SuperJSON.stringify(value);
}

export function parse(string: string): any {
  const parsedJSON = JSON.parse(string);

  if (typeof parsedJSON === "object" && parsedJSON?.json) {
    return SuperJSON.deserialize(parsedJSON);
  }

  return parsedJSON;
}
