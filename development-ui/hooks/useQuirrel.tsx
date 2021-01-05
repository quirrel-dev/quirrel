import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { BaseLayout } from "../layouts/BaseLayout";
import { QuirrelClient, Job } from "quirrel/client";
import _ from "lodash";

let alreadyAlerted = false;

type JobDTO = Omit<Job<any>, "invoke" | "delete" | "runAt"> & {
  runAt: string;
};

namespace Quirrel {
  export interface ContextValue {
    activity: Quirrel.Activity[];
    pending: Quirrel.JobDescriptor[];
    completed: Quirrel.JobDescriptor[];
    invoke(job: Quirrel.JobDescriptor): Promise<void>;
    delete(job: Quirrel.JobDescriptor): Promise<void>;
    credentials: { baseUrl: string; token?: string; encryptionSecret?: string };
    setCredentials: (cred: {
      baseUrl: string;
      token?: string;
      encryptionSecret?: string;
    }) => void;
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
  setCredentials: () => {},
  credentials: { baseUrl: "http://localhost:9181" },
};

const QuirrelCtx = React.createContext<Quirrel.ContextValue>(mockCtxValue);

export function useQuirrel() {
  return useContext(QuirrelCtx);
}

export function QuirrelProvider(props: PropsWithChildren<{}>) {
  const [isConnected, setIsConnected] = useState(false);
  const [credentials, setCredentials] = useState<{
    baseUrl: string;
    token?: string;
    encryptionSecret?: string;
  }>({
    baseUrl: "http://localhost:9181",
    token: undefined,
    encryptionSecret: undefined,
  });

  const clientGetter = useRef<(endpoint: string) => QuirrelClient<any>>();

  const [{ activity, pending, completed }, dispatchActivity] = useReducer(
    (
      prevState: Pick<
        Quirrel.ContextValue,
        "activity" | "pending" | "completed"
      >,
      action:
        | Quirrel.Activity
        | { type: "dump"; payload: JobDTO[]; date: number }
    ): Pick<Quirrel.ContextValue, "activity" | "pending" | "completed"> => {
      switch (action.type) {
        case "dump": {
          return {
            ...prevState,
            pending: [
              ...action.payload.map((job) => ({
                ...job,
                started: false,
              })),
              ...prevState.pending,
            ],
          };
        }
        case "started": {
          return {
            ...prevState,
            activity: [action, ...prevState.activity],
            pending: prevState.pending.map((pendingJob) => {
              if (
                pendingJob.id === action.payload.id &&
                pendingJob.endpoint === action.payload.endpoint
              ) {
                return {
                  ...pendingJob,
                  started: true,
                };
              }

              return pendingJob;
            }),
          };
        }
        case "scheduled": {
          return {
            ...prevState,
            activity: [action, ...prevState.activity],
            pending: [
              {
                ...action.payload,
                started: false,
              },
              ...prevState.pending,
            ],
          };
        }
        case "invoked": {
          return {
            ...prevState,
            activity: [action, ...prevState.activity],
            pending: prevState.pending.map((pendingJob) => {
              if (
                pendingJob.id === action.payload.id &&
                pendingJob.endpoint === action.payload.endpoint
              ) {
                return {
                  ...pendingJob,
                  runAt: new Date().toISOString(),
                };
              }

              return pendingJob;
            }),
          };
        }
        case "deleted": {
          return {
            ...prevState,
            activity: [action, ...prevState.activity],
            pending: prevState.pending.filter((pendingJob) => {
              if (
                pendingJob.id === action.payload.id &&
                pendingJob.endpoint === action.payload.endpoint
              ) {
                return false;
              }
              return true;
            }),
          };
        }
        case "rescheduled": {
          const rescheduledJob = prevState.completed.find(
            (job) =>
              job.id === action.payload.id &&
              job.endpoint === action.payload.endpoint
          );

          rescheduledJob.runAt = action.payload.runAt;
          return {
            completed: _.without(prevState.completed, rescheduledJob),
            activity: [action, ...prevState.activity],
            pending: [rescheduledJob, ...prevState.pending],
          };
        }
        case "completed": {
          const completedJob = prevState.pending.find(
            (job) =>
              job.id === action.payload.id &&
              job.endpoint === action.payload.endpoint
          );
          return {
            ...prevState,
            completed: [completedJob, ...prevState.completed],
            activity: [action, ...prevState.activity],
            pending: _.without(prevState.pending, completedJob),
          };
        }
        default:
          return prevState;
      }
    },
    {
      activity: [],
      pending: [],
      completed: [],
    }
  );

  const invoke = useCallback(
    async (job: Quirrel.JobDescriptor) => {
      const client = clientGetter.current?.(job.endpoint);
      await client.invoke(job.id);
    },
    [clientGetter]
  );

  const deleteCallback = useCallback(
    async (job: Quirrel.JobDescriptor) => {
      const client = clientGetter.current?.(job.endpoint);
      await client.delete(job.id);
    },
    [clientGetter]
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function doIt() {
      let { baseUrl, token } = credentials;
      if (!(baseUrl.startsWith("https://") || baseUrl.startsWith("http://"))) {
        baseUrl = "https://" + baseUrl;
      }

      const getClient = (endpoint: string) => {
        const result = /((?:https?:\/\/)?.*?(?::\d+)?)\/(.*)/.exec(endpoint);
        if (!result) {
          alert("Not a valid endpoint: " + endpoint);
          return;
        }
        const [, applicationBaseUrl, route] = result;

        return new QuirrelClient({
          async handler() {},
          route,
          config: {
            applicationBaseUrl,
            encryptionSecret: credentials.encryptionSecret,
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
      };

      await new Promise<void>((resolve) => {
        const intervalId = setInterval(async () => {
          try {
            await fetch(baseUrl + "/health");
            clearInterval(intervalId);
            resolve();
          } catch {}
        }, 1000);

        cleanup = () => clearInterval(intervalId);
      });

      clientGetter.current = getClient;

      const endpointsRes = await fetch(baseUrl + "/queues/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const endpoints: string[] = await endpointsRes.json();

      for (const endpoint of endpoints) {
        const client = getClient(endpoint);
        for await (const jobs of client.get()) {
          dispatchActivity({
            type: "dump",
            payload: jobs.map((j) => ({
              ...j,
              runAt: j.runAt.toISOString(),
            })),
            date: Date.now(),
          });
        }
      }

      const isSecure = baseUrl.startsWith("https://");
      const baseUrlWithoutProtocol = baseUrl.slice(isSecure ? 8 : 7);
      const socket = new WebSocket(
        `${isSecure ? "wss" : "ws"}://${baseUrlWithoutProtocol}/activity`,
        token || "ignored"
      );
      socket.onopen = () => {
        console.log("Connected successfully.");
        setIsConnected(true);
      };
      socket.onclose = (ev) => {
        setIsConnected(false);
      };

      socket.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        dispatchActivity({ type: data[0], payload: data[1], date: Date.now() });
      };

      cleanup = () => socket.close();
    }

    doIt();

    return () => cleanup?.();
  }, [credentials, setIsConnected, dispatchActivity]);

  return (
    <QuirrelCtx.Provider
      value={{
        activity,
        pending,
        completed,
        invoke,
        setCredentials,
        credentials,
        delete: deleteCallback,
      }}
    >
      {isConnected ? (
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
