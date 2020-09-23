import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";

export interface NavProps {
  selectedPage?: "activity" | "pending" | "cron";
}

export function Nav(props: NavProps) {
  const { selectedPage } = props;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <img
              className="h-8 w-8"
              src="https://tailwindui.com/img/logos/workflow-mark-on-dark.svg"
              alt="Workflow logo"
            />
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                <Link href="/activity">
                  <a
                    className={clsx(
                      selectedPage === "activity"
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:text-white hover:bg-gray-700",
                      "px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:text-white focus:bg-gray-700"
                    )}
                  >
                    Activity
                  </a>
                </Link>
                <Link href="/pending">
                  <a
                    className={clsx(
                      selectedPage === "pending"
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:text-white hover:bg-gray-700",
                      "px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:text-white focus:bg-gray-700"
                    )}
                  >
                    Pending
                  </a>
                </Link>

                <Link href="/cron">
                  <a
                    className={clsx(
                      selectedPage === "cron"
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:text-white hover:bg-gray-700",
                      "px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:text-white focus:bg-gray-700"
                    )}
                  >
                    Cron
                  </a>
                </Link>
              </div>
            </div>
          </div>
          <div className="h-8 w-8">
            {/* This is a phantom object to make justify-between work*/}
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:bg-gray-700 focus:text-white"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <svg
                className={clsx("h-6 w-6", isMenuOpen ? "hidden" : "block")}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
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
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={clsx(isMenuOpen ? "block" : "hidden", "md:hidden")}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/activity">
            <a
              className={clsx(
                selectedPage === "activity"
                  ? "text-white bg-gray-900"
                  : "text-gray-300 hover:text-white hover:bg-gray-700",
                "block px-3 py-2 rounded-md text-base font-medium focus:outline-none focus:text-white focus:bg-gray-700"
              )}
            >
              Activity
            </a>
          </Link>

          <Link href="/pending">
            <a
              className={clsx(
                selectedPage === "pending"
                  ? "text-white bg-gray-900"
                  : "text-gray-300 hover:text-white hover:bg-gray-700",
                "block px-3 py-2 rounded-md text-base font-medium focus:outline-none focus:text-white focus:bg-gray-700"
              )}
            >
              Pending
            </a>
          </Link>

          <Link href="/cron">
            <a
              className={clsx(
                selectedPage === "cron"
                  ? "text-white bg-gray-900"
                  : "text-gray-300 hover:text-white hover:bg-gray-700",
                "block px-3 py-2 rounded-md text-base font-medium focus:outline-none focus:text-white focus:bg-gray-700"
              )}
            >
              Cron
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
