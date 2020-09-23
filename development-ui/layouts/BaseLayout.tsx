import { PropsWithChildren } from "react";
import { Nav, NavProps } from "../components/Nav";

export function BaseLayout(props: PropsWithChildren<NavProps>) {
  return (
    <>
      <Nav {...props} />

      <main className="max-w-4xl mx-auto">{props.children}</main>
    </>
  );
}
