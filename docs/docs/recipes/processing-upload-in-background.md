---
title: Processing Uploads in the Background
---

Uploaded data shouldn't be sent to Quirrel, but be stored in your own database.
Add a new DB entity for it:

```prisma
model UploadedCSV {
  id          Number @id @default(autoincrement())
  data        String
}
```

Then when a user uploads something, you insert it into the database and enqueue the resulting record's ID into Quirrel.

```ts
// app/mutations/uploadCsvForProcessing
import db from "db"
import csvProcessingQueue from "app/api/process-csv"

export default async function uploadCsvForProcessing(data: string) {
  const record = await db.uploadedCsv.create({
    data: {data},
  })

  await csvProcessingQueue.enqueue(record.id)

  return record.id
}
```

Our Quirrel Queue then fetches the corresponding data from the database and does the required processing.
After that's done, it deletes the database record (alternative: add a flag called "finishedProcessing" and set it to true).

```ts
// app/api/process-csv
import db from "db"
import {Queue} from "quirrel/blitz"

export default Queue("api/process-csv", async (uploadId: number) => {
  const upload = await db.uplodadedCsv.findUnique({
    where: {id: uploadId},
  })

  await doYourProcessing(upload.data)

  await db.uplodadedCsv.delete({where: {id: uploadId}})
})
```

Now when you want to know wether an upload has already been processed, you can look it up in your own database:

```ts
// app/queries/hasFinishedProcessing
import db from "db"

export default async function hasFinishedProcessing(uploadId: number) {
  const count = await db.uploadedCsv.count({where: {uploadId}})
  return count === 0
}
```
