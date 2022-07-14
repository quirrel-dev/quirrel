import { useContext, useEffect, useState } from "react";
import { ConfigContext } from "..";
import { useQuirrel } from "../hooks/useQuirrel";
import { connectionDetailsToHash } from "../lib/encrypted-connection-details";
import { Modal } from "./Modal";

function isHttpOrHttpsURL(s: string) {
  try {
    const url = new URL(s);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

function formatBaseUrl(urlString: string) {
  return new URL(urlString).hostname;
}

export function EndpointModal() {
  const [showModal, setShowModal] = useState(false);

  const { connectedTo, connectTo } = useQuirrel();
  const { fixedEndpoint } = useContext(ConfigContext);

  const [endpoint, setEndpoint] = useState(
    connectedTo?.baseUrl ?? fixedEndpoint ?? ""
  );
  const [token, setToken] = useState(connectedTo?.token ?? "");
  const [encryptionSecret, setEncryptionSecret] = useState(
    connectedTo?.encryptionSecret ?? ""
  );

  const [bookmarkUrl, setBookmarkUrl] = useState<string>();

  useEffect(() => {
    if (!connectedTo) {
      return;
    }
    setEndpoint(connectedTo.baseUrl);
    setToken(connectedTo.token ?? "");
    setEncryptionSecret(connectedTo.encryptionSecret ?? "");
  }, [connectedTo]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-gray-600 hover:text-gray-700"
        data-test-id="open-connection-modal"
      >
        {connectedTo?.baseUrl
          ? formatBaseUrl(connectedTo?.baseUrl)
          : "Connecting ..."}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="h-4 inline ml-1"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <Modal show={showModal} onRequestClose={() => setShowModal(false)}>
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="h-6 w-6 text-orange-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3
                className="text-lg leading-6 font-medium text-gray-900"
                id="modal-headline"
              >
                Connect to Quirrel Instance
              </h3>
              <div className="mt-2 space-y-2">
                {!fixedEndpoint && (
                  <span className="space-x-2 text-blue-400 text-xs">
                    <button
                      onClick={() => setEndpoint("http://localhost:9181")}
                      className="inline-flex items-center hover:text-blue-300 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="h-3 inline m-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        />
                      </svg>
                      localhost
                    </button>
                    <button
                      onClick={() => setEndpoint("https://api.quirrel.dev")}
                      className="inline-flex items-center hover:text-blue-300 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="h-3 inline m-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                        />
                      </svg>
                      quirrel.dev
                    </button>
                    <button
                      onClick={() => {
                        setEndpoint("");
                      }}
                      className="inline-flex items-center hover:text-blue-300 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3 inline m-1"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      On-Premise
                    </button>
                  </span>
                )}

                {!fixedEndpoint && (
                  <input
                    placeholder="Endpoint"
                    name="endpoint"
                    value={endpoint ?? connectedTo?.baseUrl}
                    onChange={(evt) => setEndpoint(evt.target.value)}
                    className="border-gray-300 placeholder-gray-500 appearance-none relative block w-full px-3 py-2 border text-gray-900 rounded-md focus:outline-none focus:shadow-outline-blue focus:border-blue-300 focus:z-10 sm:text-sm sm:leading-5"
                  />
                )}

                <input
                  placeholder="Token"
                  value={token}
                  onChange={(evt) => setToken(evt.target.value)}
                  className="border-gray-300 placeholder-gray-500 appearance-none relative block w-full px-3 py-2 border text-gray-900 rounded-md focus:outline-none focus:shadow-outline-blue focus:border-blue-300 focus:z-10 sm:text-sm sm:leading-5"
                />

                <input
                  placeholder="Encryption Secret"
                  value={encryptionSecret}
                  onChange={(evt) => setEncryptionSecret(evt.target.value)}
                  className="border-gray-300 placeholder-gray-500 appearance-none relative block w-full px-3 py-2 border text-gray-900 rounded-md focus:outline-none focus:shadow-outline-blue focus:border-blue-300 focus:z-10 sm:text-sm sm:leading-5"
                />
              </div>
              <button
                onClick={async () => {
                  const hash = await connectionDetailsToHash({
                    baseUrl: endpoint,
                    encryptionSecret,
                    token,
                  });

                  if (!hash) {
                    return;
                  }

                  setBookmarkUrl(location.origin + hash);
                }}
                className="text-gray-700 disabled:text-gray-400 transition text-s mt-3 inline-flex items-center"
                disabled={!endpoint}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-3 inline m-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                Add as Bookmark
              </button>

              {bookmarkUrl && (
                <p className="mt-2 max-w-sm text-green-600 items-center">
                  Add this to your bookmarks:
                  <a
                    className="mt-1 text-gray-800 block overflow-ellipsis overflow-hidden bg-gray-200 rounded border-2 border-gray-300 p-1"
                    href={bookmarkUrl}
                    target="_blank"
                  >
                    {bookmarkUrl}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 pt-0 pb-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <span className="flex w-full rounded-md shadow-sm sm:ml-3 sm:w-auto">
            <button
              type="submit"
              disabled={!isHttpOrHttpsURL(endpoint)}
              className="inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 bg-orange-500 text-base disabled:opacity-50 leading-6 font-medium text-white shadow-sm hover:bg-orange-400 focus:outline-none focus:border-red-700 focus:shadow-outline-red transition ease-in-out duration-150 sm:text-sm sm:leading-5"
              onClick={(evt) => {
                evt.preventDefault();

                connectTo({
                  baseUrl: endpoint,
                  token,
                  encryptionSecret: !!encryptionSecret
                    ? encryptionSecret
                    : undefined,
                });
                setShowModal(false);
              }}
            >
              Connect
            </button>
          </span>
          <span className="mt-3 flex w-full rounded-md shadow-sm sm:mt-0 sm:w-auto">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 px-4 py-2 bg-white text-base leading-6 font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue transition ease-in-out duration-150 sm:text-sm sm:leading-5"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </span>
        </div>
      </Modal>
    </>
  );
}
