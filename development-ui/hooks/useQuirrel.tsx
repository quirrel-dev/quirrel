import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { BaseLayout } from "../layouts/BaseLayout";

namespace Quirrel {
  export interface ContextValue {
    activity: Quirrel.Activity[];
    pending: Quirrel.JobDescriptor[];
    invoke(job: Quirrel.JobDescriptor): Promise<void>;
  }

  export namespace Activity {
    export type Delayed = ["delayed", JobDescriptor];
    export type Waiting = ["waiting", JobDescriptor];
    export type Completed = ["completed", JobDescriptor];
  }

  export type Activity = Activity.Delayed | Activity.Completed;

  export interface JobDescriptor {
    id: string;
    endpoint: string;
  }
}

const mockCtxValue: Quirrel.ContextValue = {
  activity: [],
  pending: [],
  invoke: async () => {},
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
  }>();

  const [{ activity, pending }, dispatchActivity] = useReducer(
    (
      prevState: Pick<Quirrel.ContextValue, "activity" | "pending">,
      action: Quirrel.Activity
    ) => {
      const [type, payload] = action;
      switch (type) {
        case "delayed": {
          return {
            activity: [action, ...prevState.activity],
            pending: [payload, ...prevState.pending],
          };
        }
        case "completed": {
          return {
            activity: [action, ...prevState.activity],
            pending: prevState.pending.filter(
              (job) =>
                !(job.id === payload.id && job.endpoint === payload.endpoint)
            ),
          };
        }
        default:
          return prevState;
      }
    },
    {
      activity: [],
      pending: [],
    }
  );

  useEffect(() => {
    setCredentials({ baseUrl: "localhost:9181", token: undefined });
  }, [setCredentials]);

  const invoke = useCallback(
    async (job: Quirrel.JobDescriptor) => {
      alert("Hello World");
    },
    [credentials]
  );

  useEffect(() => {
    if (!credentials) {
      return;
    }

    const socket = new WebSocket(`ws://${credentials.baseUrl}/activity`);
    socket.onopen = () => {
      console.log("Connected successfully.");
      setIsConnected(true);
    };
    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      dispatchActivity(data);
    };

    return () => {
      socket.close();
    };
  }, [credentials, setIsConnected, dispatchActivity]);

  return (
    <QuirrelCtx.Provider
      value={{
        activity,
        pending,
        invoke,
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
                stroke-width="4"
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
