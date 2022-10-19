import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { BaseLayout } from "../layouts/BaseLayout";
import { QuirrelClient, Job } from "../../../client";
import { produce } from "immer";
import { getConnectionDetailsFromHash } from "../lib/encrypted-connection-details";
import { ConfigContext } from "..";

function ensureEndsWithSlash(v: string) {
  if (v.endsWith("/")) {
    return v;
  }
  return v + "/";
}

function withoutTrailingSlash(url: string): string {
  if (url.endsWith("/")) {
    return url.slice(0, url.length - 1);
  }

  return url;
}

function withoutBeginningSlash(url: string): string {
  if (url.startsWith("/")) {
    return url.slice(1);
  }

  return url;
}

let alreadyAlerted = false;

type JobDTO = Omit<Job<any>, "invoke" | "delete" | "runAt"> & {
  runAt: string;
};

export interface QuirrelInstanceDetails {
  baseUrl: string;
  token?: string;
  encryptionSecret?: string;
}

namespace Quirrel {
  export interface ContextValue {
    activity: Quirrel.Activity[];
    pending: Record<string, Quirrel.JobDescriptor>;
    completed: Record<string, Quirrel.JobDescriptor>;
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
  }

  export type Activity =
    | Activity.Scheduled
    | Activity.Completed
    | Activity.Invoked
    | Activity.Rescheduled
    | Activity.Deleted
    | Activity.Started;

  export interface JobDescriptor extends JobDTO {
    started: boolean;
  }
}

function jobKey(descriptor: Pick<Quirrel.JobDescriptor, "endpoint" | "id">) {
  return descriptor.endpoint + ";" + descriptor.id;
}

const mockCtxValue: Quirrel.ContextValue = {
  activity: [],
  pending: {},
  completed: {},
  invoke: async () => {},
  delete: async () => {},
  connectTo: () => {},
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
    completed: {},
    pending: {},
  });

  const dump = useCallback(
    (jobs: JobDTO[]) =>
      setState((state) => {
        jobs.forEach((j) => {
          state.pending[jobKey(j)] = {
            ...j,
            started: false,
          };
        });
      }),
    [setState]
  );

  const onActivity = useCallback(
    (action: Quirrel.Activity) =>
      setState((state) => {
        state.activity.push(action);

        function findJob(arg: { endpoint: string; id: string }) {
          return state.pending[jobKey(arg)];
        }

        switch (action.type) {
          case "started": {
            const job = findJob(action.payload);
            job.started = true;
            break;
          }

          case "scheduled": {
            state.pending[jobKey(action.payload)] = {
              ...action.payload,
              started: false,
            };
            break;
          }

          case "invoked": {
            const job = findJob(action.payload);
            job.runAt = new Date(action.date).toISOString();
            break;
          }

          case "deleted": {
            delete state.pending[jobKey(action.payload)];
            break;
          }

          case "rescheduled": {
            const rescheduledJob = state.completed[jobKey(action.payload)];
            delete state.completed[jobKey(action.payload)];

            rescheduledJob.runAt = action.payload.runAt;
            state.pending[jobKey(rescheduledJob)] = rescheduledJob;
            break;
          }

          case "completed": {
            const completedJob = state.pending[jobKey(action.payload)];
            state.completed[jobKey(completedJob)] = completedJob;

            delete state.pending[jobKey(action.payload)];

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
  const [isConnected, setIsConnected] = useState(false);

  const useInstance = useCallback(
    (instanceDetails: QuirrelInstanceDetails) => {
      let { baseUrl, token } = instanceDetails;

      function getClient(endpoint: string) {
        const url = new URL(endpoint);
        if (!["http:", "https:"].includes(url.protocol)) {
          const error = new Error("Not a valid endpoint: " + endpoint);
          alert(error);
          throw error;
        }

        return new QuirrelClient({
          async handler() {},
          route: withoutBeginningSlash(withoutTrailingSlash(url.pathname)),
          fetch: window.fetch.bind(window),
          config: {
            applicationBaseUrl: url.origin,
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
      setInstanceDetails(instanceDetails);
      setIsConnected(true);

      return getClient;
    },
    [setInstanceDetails, clientGetter, setIsConnected]
  );

  const connectionWasAborted = useCallback(() => {
    setIsConnected(false);
    clientGetter.current = undefined;
  }, [setIsConnected, clientGetter]);

  return {
    isConnected,
    instanceDetails,
    useInstance,
    getFor: clientGetter.current,
    connectionWasAborted,
  };
}

async function isHealthy(
  baseUrl: string
): Promise<{ isHealthy: boolean; stopPolling?: boolean }> {
  baseUrl = withoutTrailingSlash(baseUrl);
  const connectsToLocalhost = baseUrl.includes("localhost");
  try {
    const res = await fetch(baseUrl + "/health");
    const isHealthy = res.status === 200;
    if (connectsToLocalhost) {
      return { isHealthy, stopPolling: false };
    } else {
      if (isHealthy) {
        return { isHealthy: true };
      } else {
        window.alert("Connection failed, server is unhealthy.");
        return { isHealthy: false, stopPolling: true };
      }
    }
  } catch (error) {
    if (error.message === "Not allowed to request resource") {
      window.alert(
        "This browser does not support connecting to your local Quirrel instance. Please use a different browser."
      );
      return { isHealthy: false, stopPolling: true };
    }

    if (!connectsToLocalhost) {
      console.log(error);
      window.alert("Connection failed, server is unreachable.");
      return { isHealthy: false, stopPolling: true };
    } else {
      return { isHealthy: false, stopPolling: false };
    }
  }
}

async function getAllEndpoints(client: QuirrelClient<any>) {
  const endpointsRes = await client.makeRequest("/queues");

  if (endpointsRes.status !== 200) {
    return [[], "unauthorized"] as const;
  }

  const endpoints: string[] = await endpointsRes.json();
  return [endpoints] as const;
}

export function QuirrelProvider(props: PropsWithChildren<{}>) {
  const [jobsState, { dump, onActivity }] = useJobsReducer();
  const quirrelClient = useQuirrelClient();
  const connectedSocket = useRef<WebSocket>();
  const config = useContext(ConfigContext);

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
      const [endpoints, error] = await getAllEndpoints(
        getClient("https://this.is.not.read/")
      );
      if (error) {
        return error;
      }

      for (const endpoint of endpoints) {
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

      return "success";
    },
    [dump]
  );

  const connectActivityStream = useCallback(
    (instanceDetails: QuirrelInstanceDetails) => {
      function connect() {
        const { baseUrl, token } = instanceDetails;
        function activityUrl(baseUrl: string) {
          const url = new URL(baseUrl);
          url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
          url.pathname = ensureEndsWithSlash(url.pathname);
          return url.toString() + "activity";
        }

        const socket = new WebSocket(activityUrl(baseUrl), token || "ignored");

        const VOLUNTARILY_CLOSED = "voluntarily_closed";

        socket.onopen = () => {
          connectedSocket.current?.close(1000, VOLUNTARILY_CLOSED);
          connectedSocket.current = socket;

          console.log("Connected successfully.");
        };

        socket.onclose = (ev) => {
          console.log(`Socket to ${baseUrl} was closed.`);

          if (ev.reason === VOLUNTARILY_CLOSED) {
            return;
          }

          const isAbnormal = ev.code === 1006;
          if (isAbnormal) {
            console.log(`Reconnecting ...`);
            connect();
          } else {
            quirrelClient.connectionWasAborted();
          }
        };

        socket.onmessage = (evt) => {
          const data = JSON.parse(evt.data);
          onActivity({ type: data[0], payload: data[1], date: Date.now() });
        };
      }

      connect();
    },
    [dump, connectedSocket, quirrelClient.connectionWasAborted, onActivity]
  );

  const connect = useCallback(
    async (instanceDetails: QuirrelInstanceDetails) => {
      const { isHealthy: _isHealthy, stopPolling } = await isHealthy(
        instanceDetails.baseUrl
      );
      if (stopPolling) {
        return "stopPolling";
      }
      if (!_isHealthy) {
        return "unhealthy";
      }

      const getClient = quirrelClient.useInstance(instanceDetails);

      const result = await loadInitialJobs(getClient);
      if (result === "unauthorized") {
        window.alert(
          "Please authenticate with your QUIRREL_TOKEN via the top-left connection menu."
        );
        return "stopPolling";
      }
      connectActivityStream(instanceDetails);
      return "success";
    },
    [quirrelClient.useInstance, loadInitialJobs, connectActivityStream]
  );

  useEffect(() => {
    if (quirrelClient.isConnected) {
      return;
    }

    let intervalId: NodeJS.Timeout;

    getConnectionDetailsFromHash().then((connDetails) => {
      intervalId = setInterval(async () => {
        const result = await connect(
          connDetails ?? {
            baseUrl: config.fixedEndpoint ?? "http://localhost:9181",
          }
        );

        if (result === "stopPolling" || result === "success") {
          clearInterval(intervalId);
        }
      }, 500);
    });

    return () => clearInterval(intervalId);
  }, [quirrelClient.isConnected]);

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
            <p id="attaching-to-quirrel" className="inline text-black">
              Attaching to Quirrel ...
            </p>
          </span>
        </BaseLayout>
      )}
    </QuirrelCtx.Provider>
  );
}
