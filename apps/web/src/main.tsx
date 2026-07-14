import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import "./index.css";
import {Toaster} from "@/components/ui/toast.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AppProviders>
            <RouterProvider router={router} />
            <Toaster />
        </AppProviders>
    </React.StrictMode>,
);