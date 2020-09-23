import { useEffect } from "react";
import { useQuirrel } from "../hooks/useQuirrel";
import { BaseLayout } from "../layouts/BaseLayout";
import { useRouter } from "next/router";

export default function Home() {
  const { connect, isConnected } = useQuirrel();

  const router = useRouter();

  const baseUrl = "http://localhost:9181";
  const token = undefined;

  useEffect(() => {
    router.prefetch("/activity");
    connect(baseUrl, token);
  }, [baseUrl, token]);

  useEffect(() => {
    if (isConnected) {
      router.push("/activity");
    }
  }, [isConnected]);

  return (
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
  );
}
