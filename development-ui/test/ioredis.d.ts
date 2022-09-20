declare module "ioredis-mock" {
  import { Redis } from "ioredis";
  class RedisMock extends Redis {}
  export = RedisMock;
}
