"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function AppToastContainer() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
}
