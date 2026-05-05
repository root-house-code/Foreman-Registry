const UNCOMPUTABLE = [
  "every load",
  "as needed",
  "weekly during use",
  "monthly during use",
];

const SEASONS = {
  spring: [2, 3, 4],   // March, April, May
  summer: [5, 6, 7],   // June, July, August
  fall:   [8, 9, 10],  // September, October, November
  winter: [11, 0, 1],  // December, January, February
};

export function isComputable(schedule) {
  if (!schedule) return false;
  const s = schedule.toLowerCase();
  return !UNCOMPUTABLE.some(u => s.includes(u));
}

export function computeNextDate(baseDate, schedule, season = null) {
  const months = parseMonths(schedule);
  if (months === null) return null;
  const result = new Date(baseDate);
  result.setMonth(result.getMonth() + months);
  return season ? snapToSeason(result, season) : result;
}

// After computing the raw next date, shift to the nearest in-season month.
// Measures distance in both directions; ties go to the earlier month index.
function snapToSeason(date, season) {
  const seasonMonths = SEASONS[season.toLowerCase()];
  if (!seasonMonths) return date;

  const m = date.getMonth();
  if (seasonMonths.includes(m)) return date;

  let best = null;
  let bestDist = Infinity;

  for (const sm of seasonMonths) {
    const fwd = (sm - m + 12) % 12;
    const bwd = (m - sm + 12) % 12;
    const dist = Math.min(fwd, bwd);
    if (best === null || dist < bestDist || (dist === bestDist && sm < best)) {
      bestDist = dist;
      best = sm;
    }
  }

  const fwd = (best - m + 12) % 12;
  const bwd = (m - best + 12) % 12;
  const originalDay = date.getDate();

  const result = new Date(date);
  result.setDate(1); // prevent day-overflow while changing month
  result.setMonth(fwd <= bwd ? m + fwd : m - bwd);

  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));

  return result;
}

export function parseMonths(schedule) {
  if (!isComputable(schedule)) return null;
  const s = schedule.toLowerCase();

  // "N–M times/year" → shortest interval = most frequent = M times/year → 12/M months
  const timesPerYear = s.match(/(\d+)[–\-](\d+)\s*times?\/year/);
  if (timesPerYear) return Math.round(12 / parseInt(timesPerYear[2]));

  // "twice a year" → 6 months
  if (s.includes("twice a year")) return 6;

  // "monthly" or "monthly–quarterly" → 1 month (monthly is the shortest)
  if (s.startsWith("monthly")) return 1;

  // "annually" → 12 months
  if (s.includes("annual")) return 12;

  // "every N–M months" → N months
  const rangeMonths = s.match(/every\s+(\d+)[–\-](\d+)\s*months?/);
  if (rangeMonths) return parseInt(rangeMonths[1]);

  // "per manufacturer (N–M months)" → N months
  const mfr = s.match(/\((\d+)[–\-](\d+)\s*months?\)/);
  if (mfr) return parseInt(mfr[1]);

  // "every N months" → N months
  const fixedMonths = s.match(/every\s+(\d+)\s*months?/);
  if (fixedMonths) return parseInt(fixedMonths[1]);

  // "every N–M years" → N years
  const rangeYears = s.match(/every\s+(\d+)[–\-](\d+)\s*years?/);
  if (rangeYears) return parseInt(rangeYears[1]) * 12;

  // "every N years" → N years
  const fixedYears = s.match(/every\s+(\d+)\s*years?/);
  if (fixedYears) return parseInt(fixedYears[1]) * 12;

  // "every N days" → approximate months (min 1)
  const fixedDays = s.match(/every\s+(\d+)\s*days?/);
  if (fixedDays) return Math.max(1, Math.round(parseInt(fixedDays[1]) / 30));

  // "every N weeks" → approximate months (min 1)
  const fixedWeeks = s.match(/every\s+(\d+)\s*weeks?/);
  if (fixedWeeks) return Math.max(1, Math.round(parseInt(fixedWeeks[1]) * 7 / 30));

  return null;
}
