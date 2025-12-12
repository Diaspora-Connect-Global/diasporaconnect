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

export default function SettingsPage() {
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
                Notifications
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Email Notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
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
                    SMS Notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via SMS
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
                    Push Notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
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
                Security
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security
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
                    Change Password
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Data Sharing</p>
                  <p className="text-sm text-muted-foreground">
                    Share usage data to improve services
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
                    Ad Personalization
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Personalize ads based on your activity
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
                Language
              </h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">App Language</p>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred language
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
              <h2 className="text-lg font-semibold text-foreground">Theme</h2>
            </div>

            {mounted && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Use dark theme across the app
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={() => setTheme("dark")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Light Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Use light theme across the app
                    </p>
                  </div>
                  <Switch
                    checked={theme === "light"}
                    onCheckedChange={() => setTheme("light")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">System Default</p>
                    <p className="text-sm text-muted-foreground">
                      Follow system theme settings
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
