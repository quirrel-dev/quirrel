import SuperJSON from "superjson";

export function stringify(value: any): string {
  const { json, meta } = SuperJSON.serialize(value);
  if (!meta) {
    return JSON.stringify(json);
  }

  return JSON.stringify({
    json,
    _superjson: meta,
  });
}

export function parse(string: string): any {
  const parsedJSON = JSON.parse(string);

  if (typeof parsedJSON === "object" && parsedJSON?._superjson) {
    return SuperJSON.deserialize({
      json: parsedJSON.json,
      meta: parsedJSON._superjson,
    });
  }

  return parsedJSON;
}
