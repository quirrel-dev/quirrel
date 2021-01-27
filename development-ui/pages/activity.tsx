import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";

export default function Activity() {
  const { activity } = useQuirrel();
  return (
    <BaseLayout selectedPage="activity">
      <Table
        items={activity}
        extractKey={(item) => "" + item.date}
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
          {
            title: "...",
            render: (a) => {
              switch (a.type) {
                case "scheduled":
                  return a.payload.body;
                case "rescheduled":
                  return a.payload.runAt;
                default:
                  return null;
              }
            },
          },
        ]}
      />
    </BaseLayout>
  );
}
