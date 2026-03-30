"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { MockupConfig } from "@/types/logo";

export type { MockupConfig };

interface DeviceOptionsProps {
  config: MockupConfig;
  onChange: (config: MockupConfig) => void;
}

const iosDevices = [
  { id: "iphone", label: "iPhone", icon: Smartphone },
  { id: "ipad", label: "iPad", icon: Tablet },
  { id: "mac", label: "Mac", icon: Monitor },
];

const androidDevices = [
  { id: "pixel", label: "Pixel", icon: Smartphone },
  { id: "samsung", label: "Samsung", icon: Smartphone },
  { id: "tablet-android", label: "Tablet", icon: Tablet },
];

const layouts = [
  { id: "single" as const, label: "Individual", desc: "Um aparelho por mockup" },
  { id: "panoramic" as const, label: "Panorâmica", desc: "Cena contínua em 2 telas" },
  { id: "before-after" as const, label: "Antes/Depois", desc: "Transição entre estados" },
];

const DeviceOptions = ({ config, onChange }: DeviceOptionsProps) => {
  const devices = config.platform === "ios" ? iosDevices : androidDevices;

  const toggleDevice = (deviceId: string) => {
    const current = config.devices;
    const updated = current.includes(deviceId)
      ? current.filter((d) => d !== deviceId)
      : [...current, deviceId];
    if (updated.length > 0) {
      onChange({ ...config, devices: updated });
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {/* Platform */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
          Plataforma
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange({ ...config, platform: "ios", devices: ["iphone"] })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              config.platform === "ios"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            🍎 App Store
          </button>
          <button
            onClick={() => onChange({ ...config, platform: "android", devices: ["pixel"] })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              config.platform === "android"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            🤖 Google Play
          </button>
        </div>
      </div>

      {/* Devices */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
          Aparelhos
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {devices.map((device) => {
            const Icon = device.icon;
            const isSelected = config.devices.includes(device.id);
            return (
              <button
                key={device.id}
                onClick={() => toggleDevice(device.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <Icon className="h-3 w-3" />
                {device.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 block">
          Layout
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => onChange({ ...config, layout: layout.id })}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-center transition-colors ${
                config.layout === layout.id
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <span className="text-xs font-medium">{layout.label}</span>
              <span className="text-[9px] opacity-70">{layout.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeviceOptions;
