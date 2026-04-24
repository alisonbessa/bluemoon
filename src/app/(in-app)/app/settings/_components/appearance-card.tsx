"use client";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Palette, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { track } from "@vercel/analytics";

type ThemeOption = "light" | "dark" | "system";

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (next: ThemeOption) => {
    setTheme(next);
    track("theme_changed", { theme: next, source: "settings" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Aparência</CardTitle>
        </div>
        <CardDescription>
          Personalize a interface do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="h-4 w-4" />
              <span className="hidden sm:inline">Claro</span>
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleThemeChange("dark")}
            >
              <Moon className="h-4 w-4" />
              <span className="hidden sm:inline">Escuro</span>
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleThemeChange("system")}
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
