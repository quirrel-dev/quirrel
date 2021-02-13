const { Queue } = require("quirrel/redwood");

exports.handler = Queue("greeter", async (name) => {
  console.log(`Greetings, ${name}!`);
});
