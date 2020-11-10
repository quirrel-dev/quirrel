import { InvokeButton } from "../components/InvokeButton";
import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";
import _ from "lodash";

export default function Pending() {
  const { pending, invoke } = useQuirrel();
  return (
    <BaseLayout selectedPage="pending">
      <Table
        items={_.sortBy(pending, job => job.runAt)}
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
        ]}
        endOfRow={(job) => <InvokeButton invoke={() => invoke(job)} />}
      />
    </BaseLayout>
  );
}
