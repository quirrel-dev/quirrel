import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useReducer,
  useState,
} from "react";

namespace Quirrel {
  export interface ContextValue {
    isConnected: boolean;
    connect(baseUrl: string, token?: string): Promise<void>;
    activity: Quirrel.Activity[];
    pending: Quirrel.JobDescriptor[];
    invoke(job: Quirrel.JobDescriptor): Promise<void>;
  }

  export namespace Activity {
    export type Enqueued = ["enqueued", JobDescriptor];
    export type Completed = ["completed", JobDescriptor];
  }

  export type Activity = Activity.Enqueued | Activity.Completed;

  export interface JobDescriptor {
    id: string;
    endpoint: string;
  }
}

const mockCtxValue: Quirrel.ContextValue = {
  isConnected: false,
  connect: async () => {},
  activity: [],
  pending: [],
  invoke: async () => {},
};

const QuirrelCtx = React.createContext<Quirrel.ContextValue>(mockCtxValue);

export function useQuirrel() {
  return useContext(QuirrelCtx);
}

export function QuirrelProvider(props: PropsWithChildren<{}>) {
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
        case "enqueued": {
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
                job.id === payload.id && job.endpoint === payload.endpoint
            ),
          };
        }
        default:
          return prevState;
      }
    },
    {
      activity: [],
      pending: [
        {
          endpoint: "https://localhost:1337/api/queues/email",
          id: "91231ndasd1231n",
        },
        {
          endpoint: "https://localhost:1337/api/queues/email",
          id: "dasbce",
        },
      ],
    }
  );

  const connect = useCallback(
    async (baseUrl: string, token?: string) => {
      setCredentials({ baseUrl, token });
    },
    [setCredentials]
  );

  const invoke = useCallback(
    async (job: Quirrel.JobDescriptor) => {
      alert("Hello World");
    },
    [credentials]
  );

  return (
    <QuirrelCtx.Provider
      value={{
        isConnected: !!credentials,
        connect,
        activity,
        pending,
        invoke,
      }}
    >
      {props.children}
    </QuirrelCtx.Provider>
  );
}
