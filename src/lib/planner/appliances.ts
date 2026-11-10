import {
  Cctv,
  CookingPot,
  Droplets,
  Fan,
  Lightbulb,
  Microwave,
  MonitorSmartphone,
  Refrigerator,
  Smartphone,
  Tv,
  Warehouse,
  WashingMachine,
  Waves,
  Wifi,
} from "lucide-react";

/**
 * Typical South African household loads. `share` is the fraction of the
 * time it draws power during an outage (a fridge cycles, a kettle is brief).
 */
export const APPLIANCES = [
  { id: "lights", label: "Lights", detail: "8 LED bulbs", watts: 80, share: 1, icon: Lightbulb },
  { id: "wifi", label: "Wi-Fi", detail: "Router and fibre box", watts: 20, share: 1, icon: Wifi },
  { id: "tv", label: "TV and decoder", detail: "", watts: 150, share: 1, icon: Tv },
  { id: "fridge", label: "Fridge", detail: "", watts: 150, surge: 700, share: 0.5, icon: Refrigerator },
  { id: "chargers", label: "Phones", detail: "Chargers", watts: 30, share: 1, icon: Smartphone },
  { id: "computers", label: "Work from home", detail: "2 laptops and a screen", watts: 200, share: 1, icon: MonitorSmartphone },
  { id: "alarm", label: "Alarm and cameras", detail: "", watts: 40, share: 1, icon: Cctv },
  { id: "gate", label: "Gate and garage", detail: "Motors", watts: 300, surge: 800, share: 0.05, icon: Warehouse },
  { id: "microwave", label: "Microwave", detail: "", watts: 1200, share: 0.08, icon: Microwave },
  { id: "kettle", label: "Kettle", detail: "", watts: 2000, share: 0.05, icon: CookingPot },
  { id: "washing", label: "Washing machine", detail: "", watts: 500, surge: 1200, share: 0.3, icon: WashingMachine },
  { id: "borehole", label: "Borehole pump", detail: "", watts: 1100, surge: 3500, share: 0.25, icon: Droplets },
  { id: "pool", label: "Pool pump", detail: "", watts: 750, surge: 2000, share: 0.5, icon: Waves },
  { id: "aircon", label: "Aircon", detail: "One room", watts: 1200, surge: 2500, share: 0.6, icon: Fan },
] as const;

export type ApplianceId = (typeof APPLIANCES)[number]["id"];
/** What most homes want on during an outage. */
export const ESSENTIALS: ApplianceId[] = ["lights", "wifi", "tv", "fridge", "chargers"];

/** Everything running at once (W), the biggest start-up surge (W) and the average draw over time (W). */
export function loadOf(ids: Iterable<ApplianceId>) {
  const set = new Set(ids);
  const chosen = APPLIANCES.filter((a) => set.has(a.id));
  return {
    chosen,
    peak: chosen.reduce((n, a) => n + a.watts, 0),
    surge: Math.max(0, ...chosen.map((a) => ("surge" in a ? a.surge : 0))),
    average: chosen.reduce((n, a) => n + a.watts * a.share, 0),
  };
}
