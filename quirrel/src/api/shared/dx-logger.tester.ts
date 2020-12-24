import { DxLogger } from "./dx-logger";

const dxLogger = new DxLogger();

dxLogger.started("localhost:9181", true);
dxLogger.started("localhost:9181", false);

dxLogger.jobCreated({
  body: '{"a":"very","long":{"json":"object"},"with":{"even":{"more":"attributes"}}}',
  endpoint: "https://localhost:9181/api/queues",
  id: "my-random-job",
  tokenId: "anonymous",
})

const done = dxLogger.startingExecution({
  body: '{"a":"very","long":{"json":"object"},"with":{"even":{"more":"attributes"}}}',
  endpoint: "https://localhost:9181/api/queues",
  id: "my-random-job",
  tokenId: "anonymous",
});

setTimeout(done, 2000);

const done2 = dxLogger.startingExecution({
  body: 'hello world',
  endpoint: "https://localhost:9181/api/secondQueue",
  id: "another-job",
  tokenId: "anonymous",
});

setTimeout(done2, 1000);
