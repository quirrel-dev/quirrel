import { InvokeButton } from "../components/InvokeButton";
import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";
import _ from "lodash";
import { DeleteButton } from "../components/DeleteButton";

export default function Pending() {
  const { pending, invoke, delete: deleteJob } = useQuirrel();
  return (
    <BaseLayout selectedPage="pending">
      <Table
        items={_.sortBy(pending, (job) => job.runAt)}
        extractKey={(item) => item.endpoint + ";" + item.id}
        columns={[
          {
            title: "Endpoint",
            render: (job) => job.endpoint,
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
            render: (job) => job.body,
          },
        ]}
        endOfRow={(job) => (
          <span className="w-32 flex justify-between items-center">
            <InvokeButton invoke={() => invoke(job)} />

            <DeleteButton delete={() => deleteJob(job)} />
          </span>
        )}
      />
    </BaseLayout>
  );
}
