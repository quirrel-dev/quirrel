import { useState } from "react";
import { Table } from "../components/Table";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";

interface InvokeButtonProps {
  invoke(): Promise<void>;
}

function InvokeButton(props: InvokeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      className="bg-transparent hover:bg-indigo-500 text-indigo-700 font-semibold hover:text-white py-2 px-4 border border-indigo-500 hover:border-transparent rounded w-20"
      onClick={async () => {
        setIsLoading(true);
        await props.invoke();
        setIsLoading(false);
      }}
    >
      {isLoading ? "..." : "Invoke"}
    </button>
  );
}

export default function Pending() {
  const { pending, invoke } = useQuirrel();
  return (
    <BaseLayout selectedPage="pending">
      <Table
        items={pending}
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
        ]}
        endOfRow={(job) => <InvokeButton invoke={() => invoke(job)} />}
      />
    </BaseLayout>
  );
}
