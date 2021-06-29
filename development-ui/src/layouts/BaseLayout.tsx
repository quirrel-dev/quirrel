import { PropsWithChildren } from "react";
import { Nav } from "../components/Nav";

export function BaseLayout(props: PropsWithChildren<{}>) {
  return (
    <>
      <Nav />

      <main className="max-w-6xl mx-auto">{props.children}</main>
    </>
  );
}
