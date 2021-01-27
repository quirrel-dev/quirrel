import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";

const GlobalSearchContext = createContext<
  [string, Dispatch<SetStateAction<string>>]
>(["", () => {}]);

export function useGlobalSearch() {
  return useContext(GlobalSearchContext);
}

export function GlobalSearchProvider(props: PropsWithChildren<{}>) {
  const searchTermState = useState("");

  return (
    <GlobalSearchContext.Provider value={searchTermState}>
      {props.children}
    </GlobalSearchContext.Provider>
  );
}
