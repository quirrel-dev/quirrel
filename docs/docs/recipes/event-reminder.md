---
title: Event Reminder
---

This recipe schedules a booking reminder to be sent 30 minutes before show-time.

First, you define your [`Queue`](https://docs.quirrel.dev/api/queue#queue):

```ts title="api/booking-reminder.ts"
import { Queue } from "quirrel/next";

export default Queue("api/booking-reminder", async (bookingId) => {
  const booking = await findBooking(bookingId);

  await sendSms({
    to: booking.user.phoneNumber,
    body: `Put on your dancing shoes for ${booking.event.title} 🕺`,
  });
});
```

Import the above file somewhere else and call `.enqueue` to schedule a the reminder:

```ts
import bookingReminder from "api/booking-reminder"
import { subMinutes } from "date-fns"

async function createBooking(...) {
  const booking = await createBooking(...);

  await bookingReminder.enqueue(
    booking.id,
    {
      runAt: subMinutes(booking.event.date, 30),

      // allows us to address this job later for deletion
      id: booking.id
    }
  )
}
```

That's all we need! Your customers will now be reminded 30 minutes before their booking begins.

If a booking is canceled, we can also delete the reminder job:

```ts
import bookingReminder from "api/booking-reminder"

async function cancelBooking(...) {
  ...
  await bookingReminder.delete(
    bookingId // this is the same ID we set above
  )
}
```

If your SMS provider is flaky, specify a `retry` schedule:

```ts title="api/booking-reminder.ts"
export default Queue(
  "api/booking-reminder",
  ...,
  {
    // if execution fails, it will be retried
    // 10s, 1min and 2mins after the scheduled date
    retry: [ "10s", "1min", "2min" ]
  }
)
```
