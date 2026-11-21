import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    server: {
        // Inside Docker (see docker-compose.yml) file-change events from a
        // bind mount don't always reach the container — notably Docker
        // Desktop on Windows with the code on a Windows drive — so poll.
        watch: process.env.VITE_USE_POLLING === "true"
            ? {usePolling: true, interval: 300}
            : undefined,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
