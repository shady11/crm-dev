import React from "react";
import ReactDOM from "react-dom/client";
import {RouterProvider} from "react-router-dom";
import {AppProviders} from "./app/providers";
import {router} from "./routes/router.tsx";
import "./index.css";
import {Toaster} from "@/components/ui/toast.tsx";
import {ErrorBoundary} from "@/components/shared/error-boundary.tsx";
import "@/lib/i18n"

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AppProviders>
                <RouterProvider router={router} />
                <Toaster />
            </AppProviders>
        </ErrorBoundary>
    </React.StrictMode>,
);