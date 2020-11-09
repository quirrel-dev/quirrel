import { useState } from "react";

interface InvokeButtonProps {
  invoke(): Promise<void>;
}

export function InvokeButton(props: InvokeButtonProps) {
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