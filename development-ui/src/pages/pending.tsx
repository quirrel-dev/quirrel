import { InvokeButton } from "../components/InvokeButton";
import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import _ from "lodash";
import { DeleteButton } from "../components/DeleteButton";
import { truncateUrl } from "../lib/truncate-url";

export default function Pending() {
  const { pending, invoke, delete: deleteJob } = useQuirrel();
  return (
    <Table
      items={_.sortBy(pending, (job) => job.runAt)}
      extractKey={({ endpoint, id }) => `${endpoint};${id}`}
      columns={[
        {
          title: "Endpoint",
          render: (job) => truncateUrl(job.endpoint),
          renderTooltip: (job) => job.endpoint,
        },
        {
          title: "ID",
          render: (job) => job.id,
        },
        {
          title: "Run At",
          render: (job) => job.runAt,
        },
        {
          title: "Payload",
          render: (job) => JSON.stringify(job.body),
        },
      ]}
      endOfRow={(job) => (
        <span className="w-32 flex justify-between items-center">
          <InvokeButton invoke={() => invoke(job)} />

          <DeleteButton delete={() => deleteJob(job)} />
        </span>
      )}
    />
  );
}
