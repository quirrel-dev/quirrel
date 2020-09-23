import { useEffect } from "react";
import { BaseLayout } from "../layouts/BaseLayout";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/activity");
  }, []);

  return (
    <BaseLayout>
      <span className="mx-auto items-center flex justify-center">
        Redirecting ...
      </span>
    </BaseLayout>
  );
}
