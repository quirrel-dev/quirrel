import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";

const intl = new Intl.DateTimeFormat([], {
  minute: "2-digit",
  hour: "2-digit",
  second: "2-digit",
});

function formatTime(date: Date) {
  return intl.format(date);
}

export default function Activity() {
  const { activity } = useQuirrel();
  return (
    <BaseLayout selectedPage="activity">
      <Table
        items={activity}
        extractKey={(item) => "" + item.date}
        columns={[
          {
            title: "Time",
            render: (a) => formatTime(new Date(a.date)),
          },
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
            title: "",
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
