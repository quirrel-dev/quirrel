---
title: How Quirrel works
---

This document serves to satisfy the needs of all people interested in the inner workings of Quirrel.
If you want to learn even more about it, feel free to read [the sources](https://github.com/quirrel-dev).

## How it communicates with your application

On a schematic level, Quirrel works the following way:

1. Your application calls the Quirrel server with a request that goes like "In 5 minutes, call me back at https://my-application.com/api/queues/myQueue and supply payload `{ "foo": "bar" }`".
2. Quirrel takes this job and gives it to the scheduler (more about that below).
3. After 5 minutes have elapsed, the job is ready for execution, so the scheduler passes it back to the Quirrel server.
4. The Quirrel server then makes an HTTP request to the specified location with the specified payload attached.
5. Your application receives the job and executes it.

### How requests are authenticated

Requests from your application to the Quirrel server are authenticated using a random token that's obtained from the server.

What's more interesting is how request in the other direction are authenticated:
How does the application make sure that requests are indeed coming from the Quirrel server and not from some (potentially malicious) impostor?
To solve that problem, Quirrel uses the afore-mentioned token to sign its requests.
How this works can be seen in the [secure-webhooks](https://github.com/quirrel-dev/secure-webhooks) package, which was written for usage in Quirrel, but surely can be applied elsewhere.

:::note
Signature-based authentication schemes are also frequently used
for webhook-like usecases, e.g.
[Stripe's](https://stripe.com/docs/webhooks/signatures) and [Paddle's](https://developer.paddle.com/webhook-reference/verifying-webhooks) event notification system.
:::

### How end-to-end encryption works

Because you don't want your data to get into the wrong hands, Quirrel performs client-side end-to-end encryption of job payloads.

The logic has been extracted into its own package called [secure-e2ee](https://github.com/quirrel-dev/secure-e2ee), and it basically works like this:

You configure it with one encryption secret and potentially multiple decryption secrets, each 32 characters long.  
Whenever a job is about to be sent to the Quirrel server, it is combined with a random *initialisation vector* and then encrypted with `aes-256-gcm`.
We then send over the initialisation vector, the encrypted payload and the encryption secret descriptor, which is the first four characters of the encryption secret's md5 hash.

Whenever a secret is compromised, you can generate a new encryption secret and move the old one to the decryption secrets.
Having the secret descriptor now allows us to determine which secret needs to be used for decrypting old jobs.  
The initialisation vector works similar to salts for password hashing, making it a lot harder to brute-force the encryption.

## How the job scheduler works

Quirrel uses its own, tailor-made job scheduling library called [Owl](https://github.com/quirrel-dev/owl).
It makes heavy use of Redis' Sorted Sets and Pub/Sub and should scale quite well.

More information on the job scheduler can be found in Owl's [README](https://github.com/quirrel-dev/owl/blob/main/README.md).

## How the development UI works

Upon opening [ui.quirrel.dev](https://ui.quirrel.dev),
the website tries to connect to your local development instance of Quirrel (default: `localhost:9181`) to get a snapshot of all pending jobs.
Real-time updates are implemented by subscribing to an activity log that's published via websockets.
