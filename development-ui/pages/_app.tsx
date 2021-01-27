import { QuirrelProvider } from "../hooks/useQuirrel";
import "../styles/tailwind.css";
import Head from "next/head";
import { AppProps } from "next/app";
import { GlobalSearchProvider } from "../hooks/useGlobalSearch";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script
          async
          defer
          data-domain="ui.quirrel.dev"
          src="https://plausible.io/js/plausible.js"
        ></script>
      </Head>
      <GlobalSearchProvider>
        <QuirrelProvider>
          <Component {...pageProps} />
        </QuirrelProvider>
      </GlobalSearchProvider>
    </>
  );
}

export default MyApp;
