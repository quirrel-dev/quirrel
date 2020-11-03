import { Table } from "../components/Table";
import { BaseLayout } from "../layouts/BaseLayout";

export default function Cron() {
  return (
    <BaseLayout selectedPage="cron">
      <Table
        items={[null]}
        extractKey={item => item}
        columns={[
          {
            title: "Endpoint",
            render: () => "Coming",
          },
          {
            title: "Schedule",
            render: () => "Soon",
          },
        ]}
      />
    </BaseLayout>
  );
}
