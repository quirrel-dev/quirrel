import { Table } from "../components/Table";
import { BaseLayout } from "../layouts/BaseLayout";

interface PendingJob {
  endpoint: string;
  id: string;
}

export default function Pending() {
  return (
    <BaseLayout selectedPage="pending">
      <Table<PendingJob>
        items={[
          {
            endpoint: "https://localhost:1337/api/queues/email",
            id: "91231ndasd1231n",
          },
          {
            endpoint: "https://localhost:1337/api/queues/email",
            id: "dasbce",
          },
        ]}
        columns={[
          {
            title: "Endpoint",
            render: (job) => job.endpoint,
          },
          {
            title: "ID",
            render: (job) => job.id,
          },
        ]}
        endOfRow={(job) => (
          <button
            className="bg-transparent hover:bg-indigo-500 text-indigo-700 font-semibold hover:text-white py-2 px-4 border border-indigo-500 hover:border-transparent rounded"
            onClick={() => alert("Hello World")}
          >
            Invoke
          </button>
        )}
      />
    </BaseLayout>
  );
}
