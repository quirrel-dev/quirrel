import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";

export default function Activity() {
  const { activity } = useQuirrel();
  return (
    <BaseLayout selectedPage="activity">
      <Table
        items={activity}
        columns={[
          {
            title: "Endpoint",
            render: (a) => a.payload.endpoint,
          },
          {
            title: "ID",
            render: (a) => a.payload.id,
          },
          {
            title: "Event",
            render: (a) => a.type,
          },
        ]}
      />
    </BaseLayout>
  );
}
