import { FC, useContext, useState } from "react";
import clsx from "clsx";
import React from "react";
import { EndpointModal } from "./EndpointModal";
import { SearchBar } from "./SearchBar";
import { RouterContext, Route, ConfigContext } from "../index";
import horn from "url:../img/horn_transparent.png";

interface RouterAnchorProps extends React.HTMLProps<HTMLAnchorElement> {
  to: Route;
  getClassName(selected: boolean): string;
}

const RouterAnchor: FC<RouterAnchorProps> = ({ to, getClassName, ...rest }) => {
  const router = useContext(RouterContext);
  const selected = router.current === to;
  return (
    <a
      {...rest}
      href={"/" + to}
      onClick={(evt) => {
        evt.preventDefault();
        router.navigate(to);
      }}
      className={getClassName(selected)}
    />
  );
};

const buttonBaseClassName =
  "px-3 py-2 rounded-md font-medium focus:outline-none focus:text-white focus:bg-orange-300 cursor-pointer";

const PillButton: FC<Omit<RouterAnchorProps, "getClassName">> = (props) => (
  <RouterAnchor
    {...props}
    getClassName={(selected) =>
      clsx(
        selected
          ? "text-white bg-orange-500"
          : "text-gray-800 hover:text-white hover:bg-orange-300",
        "text-sm",
        buttonBaseClassName
      )
    }
  />
);

const MenuButton: FC<Omit<RouterAnchorProps, "getClassName">> = (props) => (
  <RouterAnchor
    {...props}
    getClassName={(selected) =>
      clsx(
        selected
          ? "text-white bg-orange-500"
          : "text-gray-800 hover:text-white hover:bg-orange-300",
        "block text-base",
        buttonBaseClassName
      )
    }
  />
);

export function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const config = useContext(ConfigContext);
  const showEndpointModal =
    !config.fixedEndpoint || config.authentication.enabled;

  return (
    <nav className="bg-orange-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex-shrink-0 flex items-center justify-start space-x-8"
            style={{ width: "300px" }}
          >
            <img className="h-10 w-auto" src={horn} alt="Quirrel Logo" />

            {showEndpointModal && <EndpointModal />}
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                <PillButton to="activity-log">Activity</PillButton>
                <PillButton to="pending">Pending</PillButton>
                <PillButton to="cron">Cron</PillButton>
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
          <MenuButton to="activity-log">Activity</MenuButton>
          <MenuButton to="pending">Pending</MenuButton>
          <MenuButton to="cron">Cron</MenuButton>

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
