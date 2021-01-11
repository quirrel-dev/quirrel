import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { BaseLayout } from "../layouts/BaseLayout";
import { QuirrelClient, Job } from "quirrel/client";
import _ from "lodash";
import { produce } from "immer";

let alreadyAlerted = false;

type JobDTO = Omit<Job<any>, "invoke" | "delete" | "runAt"> & {
  runAt: string;
};

interface QuirrelInstanceDetails {
  baseUrl: string;
  token?: string;
  encryptionSecret?: string;
}

namespace Quirrel {
  export interface ContextValue {
    activity: Quirrel.Activity[];
    pending: Quirrel.JobDescriptor[];
    completed: Quirrel.JobDescriptor[];
    invoke(job: Quirrel.JobDescriptor): Promise<void>;
    delete(job: Quirrel.JobDescriptor): Promise<void>;
    connectedTo?: QuirrelInstanceDetails;
    connectTo: (instance: QuirrelInstanceDetails) => void;
  }

  export namespace Activity {
    export interface Scheduled {
      type: "scheduled";
      payload: JobDTO;
      date: number;
    }
    export interface Started {
      type: "started";
      payload: { id: string; endpoint: string };
      date: number;
    }
    export interface Completed {
      type: "completed";
      payload: { id: string; endpoint: string };
      date: number;
    }
    export interface Rescheduled {
      type: "rescheduled";
      payload: { id: string; endpoint: string; runAt: string };
      date: number;
    }
    export interface Invoked {
      type: "invoked";
      payload: { id: string; endpoint: string };
      date: number;
    }
    export interface Deleted {
      type: "deleted";
      payload: { id: string; endpoint: string };
      date: number;
    }
    export interface Requested {
      type: "requested";
      payload: { id: string; endpoint: string };
      date: number;
    }
  }

  export type Activity =
    | Activity.Scheduled
    | Activity.Completed
    | Activity.Requested
    | Activity.Invoked
    | Activity.Rescheduled
    | Activity.Deleted
    | Activity.Started;

  export interface JobDescriptor extends JobDTO {
    started: boolean;
  }
}

const mockCtxValue: Quirrel.ContextValue = {
  activity: [],
  pending: [],
  completed: [],
  invoke: async () => {},
  delete: async () => {},
  connectTo: () => {},
  connectedTo: { baseUrl: "http://localhost:9181" },
};

const QuirrelCtx = React.createContext<Quirrel.ContextValue>(mockCtxValue);

export function useQuirrel() {
  return useContext(QuirrelCtx);
}

function useImmer<T>(defaultValue: T) {
  const [value, setState] = useState(defaultValue);
  const setStateWithImmer = useCallback(
    (recipe: (v: T) => void): void => {
      setState((prevState) => produce(prevState, recipe));
    },
    [setState]
  );

  return [value, setStateWithImmer] as const;
}

function useJobsReducer() {
  const [state, setState] = useImmer<
    Pick<Quirrel.ContextValue, "activity" | "pending" | "completed">
  >({
    activity: [],
    completed: [],
    pending: [],
  });

  const dump = useCallback(
    (jobs: JobDTO[]) =>
      setState((state) => {
        state.pending.push(
          ...jobs.map((j) => ({
            ...j,
            started: false,
          }))
        );
      }),
    [setState]
  );

  const onActivity = useCallback(
    (action: Quirrel.Activity) =>
      setState((state) => {
        state.activity.push(action);

        function findBy({ endpoint, id }: { endpoint: string; id: string }) {
          return (job: Quirrel.JobDescriptor) =>
            job.id === id && job.endpoint === endpoint;
        }

        function findJobIndex(arg: { endpoint: string; id: string }) {
          return state.pending.findIndex(findBy(arg));
        }

        function findJob(arg: { endpoint: string; id: string }) {
          return state.pending[findJobIndex(arg)];
        }

        switch (action.type) {
          case "started": {
            const job = findJob(action.payload);
            job.started = true;
            break;
          }

          case "scheduled": {
            state.pending.push({
              ...action.payload,
              started: false,
            });
            break;
          }

          case "invoked": {
            const job = findJob(action.payload);
            job.runAt = new Date(action.date).toISOString();
            break;
          }

          case "deleted": {
            const jobIndex = findJobIndex(action.payload);
            state.pending.splice(jobIndex, 1);
            break;
          }

          case "rescheduled": {
            const rescheduledJobIndex = state.completed.findIndex(
              findBy(action.payload)
            );

            const rescheduledJob = state.completed[rescheduledJobIndex];
            state.completed.splice(rescheduledJobIndex, 1);

            rescheduledJob.runAt = action.payload.runAt;
            state.pending.push(rescheduledJob);
            break;
          }

          case "completed": {
            const completedJobIndex = findJobIndex(action.payload);
            const completedJob = state.pending[completedJobIndex];

            state.completed.push(completedJob);
            state.pending.splice(completedJobIndex, 1);

            break;
          }
        }
      }),
    [setState]
  );

  return [
    state,
    {
      dump,
      onActivity,
    },
  ] as const;
}

function useQuirrelClient() {
  const [
    instanceDetails,
    setInstanceDetails,
  ] = useState<QuirrelInstanceDetails>();
  const clientGetter = useRef<(endpoint: string) => QuirrelClient<unknown>>();
  const isConnected = !!clientGetter.current;

  const useInstance = useCallback(
    (instanceDetails: QuirrelInstanceDetails) => {
      setInstanceDetails(instanceDetails);

      let { baseUrl, token } = instanceDetails;
      if (!(baseUrl.startsWith("https://") || baseUrl.startsWith("http://"))) {
        baseUrl = "https://" + baseUrl;
      }

      function getClient(endpoint: string) {
        const result = /((?:https?:\/\/)?.*?(?::\d+)?)\/(.*)/.exec(endpoint);
        if (!result) {
          alert("Not a valid endpoint: " + endpoint);
          throw new Error("Not a valid endpoint: " + endpoint);
        }

        const [, applicationBaseUrl, route] = result;

        return new QuirrelClient({
          async handler() {},
          route,
          config: {
            applicationBaseUrl,
            encryptionSecret: instanceDetails.encryptionSecret,
            quirrelBaseUrl: baseUrl,
            token,
          },
          catchDecryptionErrors(error) {
            if (alreadyAlerted) {
              return;
            }

            alreadyAlerted = true;
            window.alert(
              "One of your jobs can't be decrypted in the browser, since it's been encrypted with an old version of Quirrel. No worries though - this doesn't affect your application at all, since that uses Node's Crypto."
            );
          },
        });
      }

      clientGetter.current = getClient;
      return getClient;
    },
    [setInstanceDetails, clientGetter]
  );

  return {
    isConnected,
    instanceDetails,
    useInstance,
    getFor: clientGetter.current,
  };
}

async function isHealthy(baseUrl: string) {
  try {
    const res = await fetch(baseUrl + "/health");
    return res.status === 200;
  } catch (error) {
    return false;
  }
}

async function getAllEndpoints(client: QuirrelClient<any>) {
  const endpointsRes = await client.makeRequest("/queues");

  return (await endpointsRes.json()) as string[];
}

export function QuirrelProvider(props: PropsWithChildren<{}>) {
  const [jobsState, { dump, onActivity }] = useJobsReducer();
  const quirrelClient = useQuirrelClient();
  const connectedSocket = useRef<WebSocket>();

  const invoke = useCallback(
    async (job: Quirrel.JobDescriptor) => {
      const client = quirrelClient.getFor!(job.endpoint);
      await client.invoke(job.id);
    },
    [quirrelClient.getFor]
  );

  const deleteCallback = useCallback(
    async (job: Quirrel.JobDescriptor) => {
      const client = quirrelClient.getFor!(job.endpoint);
      await client.delete(job.id);
    },
    [quirrelClient.getFor]
  );

  const loadInitialJobs = useCallback(
    async (getClient: ReturnType<typeof quirrelClient.useInstance>) => {
      for (const endpoint of await getAllEndpoints(
        getClient("https://this.is.not.read/")
      )) {
        const client = getClient(endpoint);

        for await (const jobs of client.get()) {
          dump(
            jobs.map((j) => ({
              ...j,
              runAt: j.runAt.toISOString(),
            }))
          );
        }
      }
    },
    [dump]
  );

  const connectActivityStream = useCallback(
    (instanceDetails: QuirrelInstanceDetails) => {
      const { baseUrl, token } = instanceDetails;
      const isSecure = baseUrl.startsWith("https://");
      const baseUrlWithoutProtocol = baseUrl.slice(
        isSecure ? "https://".length : "http://".length
      );
      const socket = new WebSocket(
        `${isSecure ? "wss" : "ws"}://${baseUrlWithoutProtocol}/activity`,
        token || "ignored"
      );

      socket.onopen = () => {
        connectedSocket.current?.close();
        connectedSocket.current = socket;

        console.log("Connected successfully.");
      };

      socket.onclose = (ev) => {
        console.log(`Socket to ${baseUrl} was closed.`);
      };

      socket.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        onActivity({ type: data[0], payload: data[1], date: Date.now() });
      };
    },
    [dump, connectedSocket]
  );

  const connect = useCallback(
    async (instanceDetails: QuirrelInstanceDetails) => {
      if (!(await isHealthy(instanceDetails.baseUrl))) {
        return;
      }

      const getClient = quirrelClient.useInstance(instanceDetails);

      await loadInitialJobs(getClient);
      connectActivityStream(instanceDetails);
    },
    [quirrelClient.useInstance, loadInitialJobs, connectActivityStream]
  );

  useEffect(() => {
    connect({
      baseUrl: "http://localhost:9181",
    });
  });

  return (
    <QuirrelCtx.Provider
      value={{
        ...jobsState,
        connectTo: connect,
        connectedTo: quirrelClient.instanceDetails,
        invoke,
        delete: deleteCallback,
      }}
    >
      {quirrelClient.isConnected ? (
        props.children
      ) : (
        <BaseLayout>
          <span className="mx-auto items-center flex justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-black inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="inline text-black">Attaching to Quirrel ...</p>
          </span>
        </BaseLayout>
      )}
    </QuirrelCtx.Provider>
  );
}
