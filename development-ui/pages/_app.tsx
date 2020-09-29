import { QuirrelProvider } from "../hooks/useQuirrel";
import "../styles/tailwind.css";
import Head from "next/head"

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script
          async
          defer
          data-website-id="9a40fe6e-8d93-45f4-b660-451d0ab28921"
          src="https://umami.quirrel.dev/umami.js"
        ></script>
      </Head>
      <QuirrelProvider>
        <Component {...pageProps} />
      </QuirrelProvider>
    </>
  );
}

export default MyApp;
