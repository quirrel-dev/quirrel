import React from "react";
import ReactDom from "react-dom";
import { QuirrelDevelopmentUI, Route } from "..";

function getInitialRoute(): Route {
  const { pathname } = window.location;
  switch (pathname) {
    case "/activity":
      return "activity";
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
    router={{
      initial: getInitialRoute(),
      onChange(newRoute) {
        window.history.pushState(null, newRoute, "/" + newRoute);
      },
      listenToNavigationChanges(onChange) {
        function listener(event: any) {
          console.log(event);
        }
        window.addEventListener("onpopstate", listener);
        return () => window.removeEventListener("onpopstate", listener);
      },
    }}
  />,
  document.getElementById("app")
);
