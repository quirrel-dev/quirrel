import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";

interface PendingJob {
  endpoint: string;
  id: string;
}

export default function Pending() {
  const { pending, invoke } = useQuirrel();
  return (
    <BaseLayout selectedPage="pending">
      <Table<PendingJob>
        items={pending}
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
            onClick={() => invoke(job)}
          >
            Invoke
          </button>
        )}
      />
    </BaseLayout>
  );
}
