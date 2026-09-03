"use client";
import {Button} from "@/components/ui/button";
import {useTheme} from "next-themes";
import {Sun, Moon} from "lucide-react";

export function ThemeToggle() {
  const {theme, setTheme} = useTheme(); // Access theme and setTheme from useTheme hook

  return (  
    <Button
      variant="ghost"
      size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")} // Toggle between light and dark themes
        className="w-6 h-6 rounded-full"
    >
      {theme === "light" ? <Moon /> : <Sun />} {/* Display Moon icon for light theme and Sun icon for dark theme */}
    </Button>
  );
}   