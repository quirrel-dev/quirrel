import React from "react";
import ReactDom from "react-dom";
import { QuirrelDevelopmentUI, Route, QuirrelDevelopmentUIProps } from "../src";

export function initialize(config: QuirrelDevelopmentUIProps["config"]) {
  function getCurrentRoute(): Route {
    const { pathname } = window.location;
    switch (pathname) {
      case "/activity":
      case "/activity-log":
        return "activity-log";
      case "/pending":
        return "pending";
      case "/cron":
        return "cron";
      default:
        return "pending";
    }
  }

  ReactDom.render(
    <QuirrelDevelopmentUI
      config={config}
      router={{
        initial: getCurrentRoute(),
        onChange(newRoute) {
          window.history.pushState(null, newRoute, "/" + newRoute);
        },
        listenToNavigationChanges(onChange) {
          function listener() {
            onChange(getCurrentRoute());
          }
          window.addEventListener("popstate", listener);
          return () => window.removeEventListener("popstate", listener);
        },
      }}
    />,
    document.getElementById("app")
  );
}
