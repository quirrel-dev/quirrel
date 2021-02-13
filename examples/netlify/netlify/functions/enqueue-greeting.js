const greeter = require("./greeter").handler;

exports.handler = async (event, context) => {
  await greeter.enqueue(event.body, { delay: "1min" });
  return {
    statusCode: 200,
  };
};
