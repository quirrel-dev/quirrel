import { useEffect, useState } from "react";
import { useQuirrel } from "../hooks/useQuirrel";
import { Modal } from "./Modal";
import { Table } from "./Table";

export function StatsModal() {
  const [showModal, setShowModal] = useState(false);

  const { connectedTo } = useQuirrel();

  const [stats, setStats] = useState<Record<string, { count: number }>>({});

  useEffect(() => {
    if (!showModal) {
      setStats({});
    }

    async function run() {
      const response = await fetch(connectedTo?.baseUrl + "/queues/stats", {
        headers: {
          Authorization: `Bearer ${connectedTo?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const stats = await response.json();
      setStats(stats);
    }

    run();
  }, [connectedTo, showModal]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-gray-600 hover:text-gray-700"
      >
        Stats
      </button>
      <Modal show={showModal} onRequestClose={() => setShowModal(false)}>
        <div className="bg-white m-4">
          <div className="text-left">
            <h3
              className="my-4 text-lg font-medium text-gray-900"
              id="modal-headline"
            >
              Queue Statistics
            </h3>
            <div className="mx-4">
            <Table
              items={Object.entries(stats)}
              extractKey={([endpoint]) => endpoint}
              columns={[
                {
                  title: "Endpoint",
                  render([endpoint]) {
                    return new URL(endpoint).pathname;
                  },
                  renderTooltip([endpoint]) {
                    return endpoint;
                  },
                },
                {
                  title: "Job Count",
                  render([, { count }]) {
                    return count;
                  },
                },
              ]}
            />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
