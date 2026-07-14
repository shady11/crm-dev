import { useEffect, useState } from "react";

export function useTheme() {
    // Initialize theme state from localStorage, defaulting to 'light'
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("theme") as "light" | "dark") || "light";
        }
        return "light";
    });

    // Synchronize theme state with the DOM <html> element and localStorage
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
    };

    return { theme, setTheme, toggleTheme };
}