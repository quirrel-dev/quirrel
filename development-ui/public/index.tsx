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

function onChange(newRoute: string) {
  window.history.pushState(null, newRoute, "/" + newRoute);
}

ReactDom.render(
  <QuirrelDevelopmentUI
    router={{
      initial: getInitialRoute(),
      onChange,
    }}
  />,
  document.getElementById("app")
);
