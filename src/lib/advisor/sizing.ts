// Rule-of-thumb system sizing used by the Solar Advisor's estimate_system
// tool. Deterministic so the advisor's numbers are reproducible; the
// assumptions are returned with the result so the customer can see them.

export const SIZING_ASSUMPTIONS = {
  /** Headroom on top of the load that runs at the same time. */
  inverterHeadroom: 1.25,
  /** Most hybrid inverters handle about twice their rating for a few seconds. */
  inverterSurgeFactor: 2,
  /** Usable share of an LFP battery's rated capacity. */
  batteryDepthOfDischarge: 0.9,
  /** Average peak sun hours across South Africa. */
  peakSunHours: 5.5,
  /** Losses to heat, wiring, dust and conversion. */
  systemEfficiency: 0.8,
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
  const kwp = daily === null ? null : (daily * offset) / (a.peakSunHours * a.systemEfficiency);
  const panels = kwp === null ? null : Math.max(1, Math.ceil((kwp * 1000) / a.typicalPanelW));
  const actualKwp = panels === null ? null : (panels * a.typicalPanelW) / 1000;
  const savings =
    actualKwp === null ? null : actualKwp * a.peakSunHours * a.systemEfficiency * 30 * a.selfConsumption * tariff;

  const assumptions = [
    `Inverter: ${Math.round((a.inverterHeadroom - 1) * 100)}% headroom over what runs at once, surges up to ${a.inverterSurgeFactor}× its rating.`,
    `Battery: average outage load of ${Math.round(average)} W for ${input.backupHours} h, ${a.batteryDepthOfDischarge * 100}% usable (lithium LFP).`,
  ];
  if (daily !== null) {
    assumptions.push(
      `Solar: ${Math.round(offset * 100)}% of ${round(daily)} kWh a day, ${a.peakSunHours} peak sun hours, ${Math.round((1 - a.systemEfficiency) * 100)}% losses, ${a.typicalPanelW} W panels.`,
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
