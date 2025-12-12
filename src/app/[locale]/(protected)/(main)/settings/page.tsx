"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Shield, Eye, Globe, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocaleSwitcher from "@/components/LocalSwitcher";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering theme-dependent UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // State for notifications
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });

  // State for security
  const [security, setSecurity] = useState({
    twoFactor: true,
  });

  // State for privacy
  const [privacy, setPrivacy] = useState({
    dataSharing: false,
    adPersonalization: true,
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Notifications Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("notifications.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("notifications.email.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("notifications.email.description")}
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("notifications.sms.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("notifications.sms.description")}
                  </p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sms: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("notifications.push.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("notifications.push.description")}
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("security.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("security.twoFactor.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("security.twoFactor.description")}
                  </p>
                </div>
                <Switch
                  checked={security.twoFactor}
                  onCheckedChange={(checked) =>
                    setSecurity({ ...security, twoFactor: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("security.changePassword.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("security.changePassword.description")}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  {t("security.changePassword.button")}
                </Button>
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("privacy.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("privacy.dataSharing.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("privacy.dataSharing.description")}
                  </p>
                </div>
                <Switch
                  checked={privacy.dataSharing}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, dataSharing: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {t("privacy.adPersonalization.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("privacy.adPersonalization.description")}
                  </p>
                </div>
                <Switch
                  checked={privacy.adPersonalization}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, adPersonalization: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("language.title")}
              </h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {t("language.appLanguage.title")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("language.appLanguage.description")}
                </p>
              </div>
              <LocaleSwitcher 
                selectClassName="w-[180px]"
              />
            </div>
          </div>

          {/* Theme Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("theme.title")}
              </h2>
            </div>

            {mounted && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {t("theme.dark.title")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("theme.dark.description")}
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={() => setTheme("dark")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {t("theme.light.title")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("theme.light.description")}
                    </p>
                  </div>
                  <Switch
                    checked={theme === "light"}
                    onCheckedChange={() => setTheme("light")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {t("theme.system.title")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("theme.system.description")}
                    </p>
                  </div>
                  <Switch
                    checked={theme === "system"}
                    onCheckedChange={() => setTheme("system")}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
