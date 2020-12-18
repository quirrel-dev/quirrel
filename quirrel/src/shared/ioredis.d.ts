declare module "ioredis-mock" {
  import { Redis } from "ioredis";
  class RedisMock extends Redis {
    createConnectedClient(): RedisMock;
  }
  export = RedisMock;
}
