import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { BaseLayout } from "../layouts/BaseLayout";
import { QuirrelClient, JobDTO, Job } from "@quirrel/client";
import _ from "lodash";

namespace Quirrel {
  export interface ContextValue {
    activity: Quirrel.Activity[];
    pending: Quirrel.JobDescriptor[];
    completed: Quirrel.JobDescriptor[];
    invoke(job: Quirrel.JobDescriptor): Promise<void>;
    client: QuirrelClient;
    setCredentials: (cred: { baseUrl: string; token?: string }) => void;
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
  client: null as any,
  setCredentials: () => {},
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
  }>({
    baseUrl: "http://localhost:9181",
    token: undefined,
  });

  const [client, setClient] = useState<QuirrelClient>();

  const [{ activity, pending, completed }, dispatchActivity] = useReducer(
    (
      prevState: Pick<
        Quirrel.ContextValue,
        "activity" | "pending" | "completed"
      >,
      action: Quirrel.Activity | { type: "dump"; payload: Job[]; date: number }
    ): Pick<Quirrel.ContextValue, "activity" | "pending" | "completed"> => {
      switch (action.type) {
        case "dump": {
          return {
            ...prevState,
            pending: [
              ...action.payload.map((j) => ({
                ...j,
                body: j.body as string,
                runAt: j.runAt.toISOString(),
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
                body: action.payload.body as string,
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
        case "rescheduled": {
          const rescheduledJob = prevState.completed.find(
            (job) =>
              job.id === action.payload.id &&
              job.endpoint === action.payload.endpoint
          );
          return {
            completed: _.without(prevState.completed, rescheduledJob),
            activity: [action, ...prevState.activity],
            pending: [
              {
                ...rescheduledJob,
                runAt: action.payload.runAt,
              },
              ...prevState.pending,
            ],
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
      await client.invoke(job.endpoint, job.id);
    },
    [client]
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function doIt() {
      let { baseUrl, token } = credentials;
      if (!(baseUrl.startsWith("https://") || baseUrl.startsWith("http://"))) {
        baseUrl = "https://" + baseUrl;
      }

      const client = new QuirrelClient({
        baseUrl,
        token,
      });

      await new Promise<void>((resolve) => {
        const intervalId = setInterval(async () => {
          try {
            await fetch(baseUrl + "/health");
            clearInterval(intervalId);
            resolve();
          } catch {}
        }, 500);

        cleanup = () => clearInterval(intervalId);
      });

      setClient(client);

      for await (const jobs of client.get()) {
        dispatchActivity({ type: "dump", payload: jobs, date: Date.now() });
      }

      const isSecure = baseUrl.startsWith("https://");
      const baseUrlWithoutProtocol = baseUrl.slice(isSecure ? 8 : 7);
      const socket = new WebSocket(
        `${isSecure ? "wss" : "ws"}://${baseUrlWithoutProtocol}/activity`
      );
      socket.onopen = () => {
        console.log("Connected successfully.");
        setIsConnected(true);
      };
      socket.onclose = () => {
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
        client,
        setCredentials,
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
