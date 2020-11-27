import { QuirrelProvider } from "../hooks/useQuirrel";
import "../styles/tailwind.css";
import Head from "next/head";

function MyApp({ Component, pageProps }) {
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
      <QuirrelProvider>
        <Component {...pageProps} />
      </QuirrelProvider>
    </>
  );
}

export default MyApp;
