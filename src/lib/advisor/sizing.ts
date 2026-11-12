// Rule-of-thumb system sizing used by the Solar Advisor's estimate_system
// tool. Deterministic so the advisor's numbers are reproducible; the
// assumptions are returned with the result so the customer can see them.
// Solar is sized for the weakest month of the year in the customer's
// province (see src/lib/solar/seasons.ts), not for the yearly average.
import { BATTERY, BATTERY_FLOOR_PCT, BATTERY_USABLE_PCT } from "@/lib/battery";
import { isProvince, solarYear, TYPICAL_YIELD } from "@/lib/solar/seasons";

export const SIZING_ASSUMPTIONS = {
  /** Headroom on top of the load that runs at the same time. */
  inverterHeadroom: 1.25,
  /** Most hybrid inverters handle about twice their rating for a few seconds. */
  inverterSurgeFactor: 2,
  /** Share of a lithium battery's rated capacity that is used: it is only run down to 30%, to protect its cycle life (see lib/battery.ts). */
  batteryDepthOfDischarge: BATTERY.usable,
  /** Typical residential tariff when the customer doesn't give theirs (R/kWh incl. VAT). */
  defaultTariff: 3.5,
  /** Share of solar output a home with a battery typically uses itself. */
  selfConsumption: 0.85,
  typicalPanelW: 550,
} as const;

const INVERTER_SIZES_KW = [1, 1.5, 2, 3, 3.6, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25, 30, 40, 50, 60];

export type SizingInput = {
  /** Watts of everything that runs at the same time during an outage. */
  simultaneousLoadW: number;
  /** Largest single start-up surge (pumps, compressors), if known. */
  surgeLoadW?: number;
  /** Average load during an outage; defaults to half the simultaneous load. */
  averageBackupLoadW?: number;
  backupHours: number;
  /** Daily consumption, if known. Otherwise derived from the bill. */
  dailyUsageKwh?: number;
  monthlyBillRand?: number;
  tariffRandPerKwh?: number;
  /** Share of daily use to cover with solar (0 to 1). Defaults to 0.7. */
  solarOffset?: number;
  /** The customer's province, to size solar for the weakest month there. */
  province?: string;
};

export type SizingResult = {
  inverterKw: number;
  batteryUsableKwh: number;
  batteryNominalKwh: number;
  dailyUsageKwh: number | null;
  solarKwp: number | null;
  panelCount: number | null;
  estimatedMonthlySavingsRand: number | null;
  assumptions: string[];
};

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function estimateSystem(input: SizingInput): SizingResult {
  const a = SIZING_ASSUMPTIONS;
  const load = Math.max(0, input.simultaneousLoadW);
  const neededKw = Math.max((load * a.inverterHeadroom) / 1000, (input.surgeLoadW ?? 0) / a.inverterSurgeFactor / 1000);
  const inverterKw = INVERTER_SIZES_KW.find((s) => s >= neededKw) ?? Math.ceil(neededKw);

  const average = input.averageBackupLoadW ?? load / 2;
  const usable = (average * Math.max(0, input.backupHours)) / 1000;
  const nominal = usable / a.batteryDepthOfDischarge;

  const tariff = input.tariffRandPerKwh ?? a.defaultTariff;
  const daily = input.dailyUsageKwh ?? (input.monthlyBillRand ? input.monthlyBillRand / tariff / 30 : null);
  const offset = Math.min(1, Math.max(0, input.solarOffset ?? 0.7));
  // kWh a day from each kW of panels: the weakest month sizes the array, the yearly average prices the savings.
  const year = isProvince(input.province) ? solarYear(input.province) : null;
  const weakYield = year?.weakest.yield ?? TYPICAL_YIELD.weakest;
  const averageYield = year?.average ?? TYPICAL_YIELD.average;
  const kwp = daily === null ? null : (daily * offset) / weakYield;
  const panels = kwp === null ? null : Math.max(1, Math.ceil((kwp * 1000) / a.typicalPanelW - 1e-9));
  const actualKwp = panels === null ? null : (panels * a.typicalPanelW) / 1000;
  // An array sized for the weakest month makes more than the home can use in the good ones: don't count the surplus.
  const savings = actualKwp === null || daily === null ? null : Math.min(actualKwp * averageYield * a.selfConsumption, daily * offset) * 30 * tariff;

  const assumptions = [
    `Inverter: ${Math.round((a.inverterHeadroom - 1) * 100)}% headroom over what runs at once, surges up to ${a.inverterSurgeFactor}× its rating.`,
    `Battery: average outage load of ${Math.round(average)} W for ${input.backupHours} h. A lithium battery is only run down to ${BATTERY_FLOOR_PCT}% to protect its cycle life, so ${BATTERY_USABLE_PCT}% of its rated capacity is counted.`,
  ];
  if (daily !== null) {
    assumptions.push(
      year
        ? `Solar: ${Math.round(offset * 100)}% of ${round(daily)} kWh a day, sized for ${year.weakest.name}, the weakest month for sun in ${input.province} (${year.weakest.yield} kWh a day per kW of panels; ${year.best.yield} in ${year.best.name}), ${a.typicalPanelW} W panels on a north-facing roof.`
        : `Solar: ${Math.round(offset * 100)}% of ${round(daily)} kWh a day, sized for a weak month (${round(weakYield, 2)} kWh a day per kW of panels, typical across provinces; the customer's province gives their own figure), ${a.typicalPanelW} W panels.`,
      `Savings: R${tariff.toFixed(2)}/kWh${input.tariffRandPerKwh ? "" : " (typical tariff; your municipality's may differ)"}, about ${a.selfConsumption * 100}% of solar used at home.`,
    );
  }

  return {
    inverterKw,
    batteryUsableKwh: round(usable),
    batteryNominalKwh: round(nominal),
    dailyUsageKwh: daily === null ? null : round(daily),
    solarKwp: actualKwp === null ? null : round(actualKwp, 2),
    panelCount: panels,
    estimatedMonthlySavingsRand: savings === null ? null : Math.round(savings / 10) * 10,
    assumptions,
  };
}
