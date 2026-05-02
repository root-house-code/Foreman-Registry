import { defaultData } from "./data.js";
import { parseMonths } from "./scheduleInterval.js";

const allSchedules = [...new Set(defaultData.map(r => r.schedule).filter(Boolean))];

export const SCHEDULE_OPTIONS = allSchedules.sort((a, b) => {
  const ma = parseMonths(a);
  const mb = parseMonths(b);
  if (ma === null && mb === null) return 0;
  if (ma === null) return 1;
  if (mb === null) return -1;
  return ma - mb;
});

export const SEASON_OPTIONS = [
  { value: null, label: "None" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
];
