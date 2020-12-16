import { PropsWithChildren } from "react";
import { Transition } from "@tailwindui/react";

interface ModalProps {
  show: boolean;
  onRequestClose: () => void;
}

export function Modal(props: PropsWithChildren<ModalProps>) {
  return (
    <div
      className={`fixed z-10 inset-0 overflow-y-auto ${
        props.show ? "" : "pointer-events-none"
      }`}
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <Transition
          show={props.show}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          onClick={props.onRequestClose}
        >
          <div className="fixed inset-0 transition-opacity">
            <div className="absolute inset-0 bg-gray-500 opacity-75" />
          </div>
        </Transition>
        {/*<!-- This element is to trick the browser into centering the modal contents. -->*/}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>
        &#8203;
        <Transition
          show={props.show}
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            className="fixed left-0 right-0 m-5 top-0 bg-white sm:mx-auto rounded-lg overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            {props.children}
          </div>
        </Transition>
      </div>
    </div>
  );
}
