import { InvokeButton } from "../components/InvokeButton";
import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { truncateUrl } from "../lib/truncate-url";

export default function Cron() {
  const { pending, invoke } = useQuirrel();
  const cronJobs = Object.values(pending).filter((job) => !!job.repeat?.cron);
  return (
    <Table
      items={cronJobs}
      extractKey={(item) => item.endpoint + item.id}
      columns={[
        {
          title: "Endpoint",
          render: (job) => truncateUrl(job.endpoint),
          renderTooltip: (job) => job.endpoint,
        },
        {
          title: "Schedule",
          render: (job) => {
            const cron = job.repeat?.cron!;
            const timezone = job.repeat?.cronTimezone;
            
            if (!timezone || timezone === "Etc/UTC") {
              return cron;
            }

            return `${cron} (${timezone})`;
          },
        },
        {
          title: "ID",
          render: (job) => job.id,
        },
      ]}
      endOfRow={(job) => <InvokeButton invoke={() => invoke(job)} />}
    />
  );
}
