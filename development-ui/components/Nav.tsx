import { PropsWithChildren, useContext, useState } from "react";
import clsx from "clsx";
import React from "react";
import { EndpointModal } from "./EndpointModal";
import { SearchBar } from "./SearchBar";
import { RouterContext, Route } from "../index";
import horn from "url:../public/img/horn_transparent.png"

const PillButton = React.forwardRef(
  (
    {
      selected,
      title,
      ...rest
    }: React.HTMLProps<HTMLAnchorElement> & {
      selected: boolean;
      title: string;
    },
    ref
  ) => {
    return (
      <a
        {...rest}
        ref={ref as any}
        className={clsx(
          selected
            ? "text-white bg-orange-500"
            : "text-gray-800 hover:text-white hover:bg-orange-300",
          "px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:text-white focus:bg-orange-300 cursor-pointer"
        )}
      >
        {title}
      </a>
    );
  }
);

const MenuButton = React.forwardRef(
  (
    {
      selected,
      title,
      ...rest
    }: React.HTMLProps<HTMLAnchorElement> & {
      selected: boolean;
      title: string;
    },
    ref
  ) => {
    return (
      <a
        {...rest}
        ref={ref as any}
        className={clsx(
          selected
            ? "text-white bg-orange-500"
            : "text-gray-800 hover:text-white hover:bg-orange-300",
          "block px-3 py-2 rounded-md text-base font-medium focus:outline-none focus:text-white focus:bg-orange-300 cursor-pointer"
        )}
      >
        {title}
      </a>
    );
  }
);

function RouterLink({ to, children }: PropsWithChildren<{ to: Route }>) {
  const router = useContext(RouterContext);
  return (
    <a
      href={"/" + to}
      onClick={(evt) => {
        evt.preventDefault();
        router.navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function Nav() {
  const router = useContext(RouterContext);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-orange-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex-shrink-0 flex items-center justify-start space-x-8"
            style={{ width: "300px" }}
          >
            <img
              className="h-10 w-auto"
              src={horn}
              alt="Quirrel Logo"
            />

            <EndpointModal />
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                <RouterLink to="activity">
                  <PillButton
                    title="Activity"
                    selected={router.current === "activity"}
                  />
                </RouterLink>
                <RouterLink to="pending">
                  <PillButton
                    title="Pending"
                    selected={router.current === "pending"}
                  />
                </RouterLink>

                <RouterLink to="cron">
                  <PillButton
                    title="Cron"
                    selected={router.current === "cron"}
                  />
                </RouterLink>
              </div>
            </div>
          </div>

          <div
            className="-mr-2 hidden md:flex justify-end space-x-8 items-center"
            style={{ width: "300px" }}
          >
            <SearchBar />
            <a
              href="https://github.com/quirrel-dev/quirrel/issues/new/choose"
              target="_blank"
              className="text-center text-gray-600 hover:text-gray-400 px-3 block text-base font-medium cursor-pointer"
            >
              Feedback
            </a>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-orange-500 hover:text-white hover:bg-orange-300 focus:outline-none focus:bg-orange-700 focus:text-white"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <svg
                className={clsx("h-6 w-6", isMenuOpen ? "hidden" : "block")}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={clsx("h-6 w-6", isMenuOpen ? "block" : "hidden")}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={clsx(isMenuOpen ? "block" : "hidden", "md:hidden")}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <RouterLink to="activity">
            <MenuButton
              title="Activity"
              selected={router.current === "activity"}
            />
          </RouterLink>

          <RouterLink to="pending">
            <MenuButton
              title="Pending"
              selected={router.current === "pending"}
            />
          </RouterLink>

          <RouterLink to="cron">
            <MenuButton title="Cron" selected={router.current === "cron"} />
          </RouterLink>

          <a
            href="https://github.com/quirrel-dev/quirrel/issues/new/choose"
            target="_blank"
            className="text-gray-600 hover:text-gray-400 px-3 mt-2 block text-base font-medium cursor-pointer"
          >
            Feedback
          </a>
        </div>
      </div>
    </nav>
  );
}
