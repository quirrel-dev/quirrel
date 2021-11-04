import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { truncateUrl } from "../lib/truncate-url";

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
          render: (a) => truncateUrl(a.payload.endpoint),
          renderTooltip: (a) => a.payload.endpoint,
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
                return JSON.stringify(a.payload.body);
              case "rescheduled":
                return formatTime(new Date(a.payload.runAt));
              default:
                return null;
            }
          },
        },
      ]}
    />
  );
}
