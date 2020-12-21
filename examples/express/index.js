require("dotenv").config()
const app = require("express")()
const { Queue } = require("quirrel/express")

const emailQueue = Queue("emailQueue", async (payload) => {
  console.log("This is the ... " + payload);
});

app.use(emailQueue);

app.listen(4000, () => {
  console.log("Listening on :4000");
});

emailQueue.enqueue("1st Job", {
  delay: "1m",
});
emailQueue.enqueue("2nd Job", {
  delay: "1.2m",
});
emailQueue.enqueue("3rd Job", {
  delay: "30s",
});
