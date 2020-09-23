import { QuirrelProvider } from "../hooks/useQuirrel";
import "../styles/tailwind.css";

function MyApp({ Component, pageProps }) {
  return (
    <QuirrelProvider>
      <Component {...pageProps} />
    </QuirrelProvider>
  );
}

export default MyApp;
