import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SocialCalendarItem } from "@/types/domain";

type HolidaySeedItem = {
  date: string;
  holidayName: string;
};

type StoredHolidaySync = {
  year: number;
  lastSyncedAt: string;
  source: "openholidays" | "seeded-fallback" | "statutory-fallback";
  publicHolidayItems: HolidaySeedItem[];
  internationalObservanceItems: HolidaySeedItem[];
};

const SOCIAL_CALENDAR_SYNC_PATH = path.join(process.cwd(), "data", "social-calendar-sync.json");
const OPEN_HOLIDAYS_API_URL = "https://openholidaysapi.org/PublicHolidays";

const SOUTH_AFRICAN_PUBLIC_HOLIDAYS_2026_TO_2030: HolidaySeedItem[] = [
  { date: "2026-01-01", holidayName: "New Year's Day" },
  { date: "2026-03-21", holidayName: "Human Rights Day" },
  { date: "2026-04-03", holidayName: "Good Friday" },
  { date: "2026-04-06", holidayName: "Family Day" },
  { date: "2026-04-27", holidayName: "Freedom Day" },
  { date: "2026-05-01", holidayName: "Workers' Day" },
  { date: "2026-06-16", holidayName: "Youth Day" },
  { date: "2026-08-09", holidayName: "National Women's Day" },
  { date: "2026-08-10", holidayName: "Public Holiday: National Women's Day Observed" },
  { date: "2026-09-24", holidayName: "Heritage Day" },
  { date: "2026-12-16", holidayName: "Day of Reconciliation" },
  { date: "2026-12-25", holidayName: "Christmas Day" },
  { date: "2026-12-26", holidayName: "Day of Goodwill" },
  { date: "2027-01-01", holidayName: "New Year's Day" },
  { date: "2027-03-21", holidayName: "Human Rights Day" },
  { date: "2027-03-22", holidayName: "Public Holiday: Human Rights Day Observed" },
  { date: "2027-03-26", holidayName: "Good Friday" },
  { date: "2027-03-29", holidayName: "Family Day" },
  { date: "2027-04-27", holidayName: "Freedom Day" },
  { date: "2027-05-01", holidayName: "Workers' Day" },
  { date: "2027-06-16", holidayName: "Youth Day" },
  { date: "2027-08-09", holidayName: "National Women's Day" },
  { date: "2027-09-24", holidayName: "Heritage Day" },
  { date: "2027-12-16", holidayName: "Day of Reconciliation" },
  { date: "2027-12-25", holidayName: "Christmas Day" },
  { date: "2027-12-26", holidayName: "Day of Goodwill" },
  { date: "2027-12-27", holidayName: "Public Holiday: Day of Goodwill Observed" },
  { date: "2028-01-01", holidayName: "New Year's Day" },
  { date: "2028-03-21", holidayName: "Human Rights Day" },
  { date: "2028-04-14", holidayName: "Good Friday" },
  { date: "2028-04-17", holidayName: "Family Day" },
  { date: "2028-04-27", holidayName: "Freedom Day" },
  { date: "2028-05-01", holidayName: "Workers' Day" },
  { date: "2028-06-16", holidayName: "Youth Day" },
  { date: "2028-08-09", holidayName: "National Women's Day" },
  { date: "2028-09-24", holidayName: "Heritage Day" },
  { date: "2028-09-25", holidayName: "Public Holiday: Heritage Day Observed" },
  { date: "2028-12-16", holidayName: "Day of Reconciliation" },
  { date: "2028-12-25", holidayName: "Christmas Day" },
  { date: "2028-12-26", holidayName: "Day of Goodwill" },
  { date: "2029-01-01", holidayName: "New Year's Day" },
  { date: "2029-03-21", holidayName: "Human Rights Day" },
  { date: "2029-03-30", holidayName: "Good Friday" },
  { date: "2029-04-02", holidayName: "Family Day" },
  { date: "2029-04-27", holidayName: "Freedom Day" },
  { date: "2029-05-01", holidayName: "Workers' Day" },
  { date: "2029-06-16", holidayName: "Youth Day" },
  { date: "2029-08-09", holidayName: "National Women's Day" },
  { date: "2029-09-24", holidayName: "Heritage Day" },
  { date: "2029-12-16", holidayName: "Day of Reconciliation" },
  { date: "2029-12-17", holidayName: "Public Holiday: Day of Reconciliation Observed" },
  { date: "2029-12-25", holidayName: "Christmas Day" },
  { date: "2029-12-26", holidayName: "Day of Goodwill" },
  { date: "2030-01-01", holidayName: "New Year's Day" },
  { date: "2030-03-21", holidayName: "Human Rights Day" },
  { date: "2030-04-19", holidayName: "Good Friday" },
  { date: "2030-04-22", holidayName: "Family Day" },
  { date: "2030-04-27", holidayName: "Freedom Day" },
  { date: "2030-05-01", holidayName: "Workers' Day" },
  { date: "2030-06-16", holidayName: "Youth Day" },
  { date: "2030-06-17", holidayName: "Public Holiday: Youth Day Observed" },
  { date: "2030-08-09", holidayName: "National Women's Day" },
  { date: "2030-09-24", holidayName: "Heritage Day" },
  { date: "2030-12-16", holidayName: "Day of Reconciliation" },
  { date: "2030-12-25", holidayName: "Christmas Day" },
  { date: "2030-12-26", holidayName: "Day of Goodwill" }
];

const INTERNATIONAL_OBSERVANCE_RULES: Array<{ monthDay: string; holidayName: string }> = [
  { monthDay: "04-22", holidayName: "Earth Day" },
  { monthDay: "06-05", holidayName: "World Environment Day" },
  { monthDay: "07-18", holidayName: "Nelson Mandela International Day" },
  { monthDay: "07-30", holidayName: "International Day of Friendship" },
  { monthDay: "09-20", holidayName: "World Cleanup Day" },
  { monthDay: "09-21", holidayName: "International Day of Peace" },
  { monthDay: "12-05", holidayName: "International Volunteer Day" }
];

function getHolidayDayLabel(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-ZA", { weekday: "long" });
}

function getHolidayMeaning(holidayName: string) {
  if (holidayName.startsWith("Public Holiday:")) {
    return "This observed public holiday applies when the main holiday falls on a Sunday, so the following Monday becomes the public holiday.";
  }

  switch (holidayName) {
    case "New Year's Day":
      return "Marks the beginning of the new year and is widely used for reflection, reset, and planning across the country.";
    case "Human Rights Day":
      return "Commemorates the struggle for human rights in South Africa and highlights the rights protected by the Constitution.";
    case "Good Friday":
      return "A Christian holy day that commemorates the crucifixion of Jesus Christ and is observed nationally as a public holiday.";
    case "Family Day":
      return "Observed on Easter Monday and commonly used for family gatherings, reflection, and community time.";
    case "Freedom Day":
      return "Commemorates South Africa's first democratic elections on 27 April 1994 and celebrates the country's freedom and democracy.";
    case "Workers' Day":
      return "Recognises the contribution of workers and the labour movement in South Africa.";
    case "Youth Day":
      return "Honours the youth of 1976 and recognises the role young people played in the struggle against apartheid.";
    case "National Women's Day":
      return "Commemorates the 1956 women's march against pass laws and recognises the contribution of women in South Africa.";
    case "Heritage Day":
      return "Celebrates South Africa's diverse cultural heritage, traditions, languages, and shared identity.";
    case "Day of Reconciliation":
      return "Encourages national unity and reconciliation by recognising the country's complex history and shared future.";
    case "Christmas Day":
      return "A Christian holiday celebrating the birth of Jesus Christ and a major family holiday across the country.";
    case "Day of Goodwill":
      return "Traditionally focused on generosity, rest, and time with family and community after Christmas Day.";
    default:
      return "South African public holiday recognised nationally.";
  }
}

function getInternationalObservanceMeaning(holidayName: string) {
  switch (holidayName) {
    case "Earth Day":
      return "A global day focused on environmental awareness, practical action, and protecting the planet.";
    case "World Environment Day":
      return "The United Nations' flagship environmental day, used to spotlight sustainability and collective action.";
    case "Nelson Mandela International Day":
      return "Honours Nelson Mandela's legacy by encouraging service, dignity, and action that improves communities.";
    case "International Day of Friendship":
      return "Promotes friendship, social connection, and mutual understanding between people and communities.";
    case "World Cleanup Day":
      return "A global day of action focused on reducing litter, cleaning shared spaces, and encouraging environmental responsibility.";
    case "International Day of Peace":
      return "Encourages peace, non-violence, and unity across communities and nations.";
    case "International Volunteer Day":
      return "Recognises the contribution of volunteers and encourages service to community and society.";
    default:
      return "International observance recognised for community, environmental, or positive public engagement.";
  }
}

function getTodayKey(dateValue: Date) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
}

function getAnnualSyncThreshold(year: number) {
  return new Date(year, 0, 1, 0, 1, 0, 0);
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(dateValue: Date) {
  return `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, "0")}-${String(dateValue.getUTCDate()).padStart(2, "0")}`;
}

function createStatutoryFallbackForYear(year: number): HolidaySeedItem[] {
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(easter.getUTCDate() - 2);
  const familyDay = new Date(easter);
  familyDay.setUTCDate(easter.getUTCDate() + 1);

  const base: HolidaySeedItem[] = [
    { date: `${year}-01-01`, holidayName: "New Year's Day" },
    { date: `${year}-03-21`, holidayName: "Human Rights Day" },
    { date: formatDateKey(goodFriday), holidayName: "Good Friday" },
    { date: formatDateKey(familyDay), holidayName: "Family Day" },
    { date: `${year}-04-27`, holidayName: "Freedom Day" },
    { date: `${year}-05-01`, holidayName: "Workers' Day" },
    { date: `${year}-06-16`, holidayName: "Youth Day" },
    { date: `${year}-08-09`, holidayName: "National Women's Day" },
    { date: `${year}-09-24`, holidayName: "Heritage Day" },
    { date: `${year}-12-16`, holidayName: "Day of Reconciliation" },
    { date: `${year}-12-25`, holidayName: "Christmas Day" },
    { date: `${year}-12-26`, holidayName: "Day of Goodwill" }
  ];

  const observed = base.flatMap((item) => {
    const day = new Date(`${item.date}T00:00:00`).getDay();
    if (day !== 0) {
      return [];
    }

    const observedDate = new Date(`${item.date}T00:00:00`);
    observedDate.setDate(observedDate.getDate() + 1);

    return [
      {
        date: getTodayKey(observedDate),
        holidayName: `Public Holiday: ${item.holidayName} Observed`
      }
    ];
  });

  return [...base, ...observed].sort((left, right) => left.date.localeCompare(right.date));
}

function createInternationalObservancesForYear(year: number): HolidaySeedItem[] {
  return INTERNATIONAL_OBSERVANCE_RULES.map((item) => ({
    date: `${year}-${item.monthDay}`,
    holidayName: item.holidayName
  })).sort((left, right) => left.date.localeCompare(right.date));
}

async function readStoredHolidaySync(): Promise<StoredHolidaySync | null> {
  try {
    const raw = await readFile(SOCIAL_CALENDAR_SYNC_PATH, "utf8");
    const parsed = JSON.parse(raw) as
      | StoredHolidaySync
      | { year: number; lastSyncedAt: string; source: StoredHolidaySync["source"]; items: HolidaySeedItem[] };

    if ("publicHolidayItems" in parsed) {
      return parsed;
    }

    return {
      year: parsed.year,
      lastSyncedAt: parsed.lastSyncedAt,
      source: parsed.source,
      publicHolidayItems: parsed.items,
      internationalObservanceItems: createInternationalObservancesForYear(parsed.year)
    };
  } catch {
    return null;
  }
}

async function writeStoredHolidaySync(payload: StoredHolidaySync) {
  await mkdir(path.dirname(SOCIAL_CALENDAR_SYNC_PATH), { recursive: true });
  await writeFile(SOCIAL_CALENDAR_SYNC_PATH, JSON.stringify(payload, null, 2), "utf8");
}

async function fetchOpenHolidaysForYear(year: number): Promise<HolidaySeedItem[]> {
  const params = new URLSearchParams({
    countryIsoCode: "ZA",
    languageIsoCode: "EN",
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`
  });

  const response = await fetch(`${OPEN_HOLIDAYS_API_URL}?${params.toString()}`, {
    headers: { accept: "text/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch public holidays from OpenHolidays.");
  }

  const payload = (await response.json()) as Array<{
    startDate?: string;
    name?: Array<{ language?: string; text?: string }>;
  }>;

  return payload
    .map((item) => ({
      date: item.startDate ?? "",
      holidayName: item.name?.find((entry) => entry.language === "EN")?.text ?? item.name?.[0]?.text ?? ""
    }))
    .filter((item) => item.date && item.holidayName)
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((item) => ({
      date: item.date,
      holidayName: item.holidayName.replace(" observed", " Observed")
    }));
}

async function syncCurrentYearHolidaySource(currentYear: number): Promise<StoredHolidaySync> {
  try {
    const items = await fetchOpenHolidaysForYear(currentYear);
    const payload: StoredHolidaySync = {
      year: currentYear,
      lastSyncedAt: new Date().toISOString(),
      source: "openholidays",
      publicHolidayItems: items,
      internationalObservanceItems: createInternationalObservancesForYear(currentYear)
    };
    await writeStoredHolidaySync(payload);
    return payload;
  } catch {
    const fallbackSeed = SOUTH_AFRICAN_PUBLIC_HOLIDAYS_2026_TO_2030.filter((item) => item.date.startsWith(`${currentYear}-`));
    const items = fallbackSeed.length > 0 ? fallbackSeed : createStatutoryFallbackForYear(currentYear);
    const payload: StoredHolidaySync = {
      year: currentYear,
      lastSyncedAt: new Date().toISOString(),
      source: fallbackSeed.length > 0 ? "seeded-fallback" : "statutory-fallback",
      publicHolidayItems: items,
      internationalObservanceItems: createInternationalObservancesForYear(currentYear)
    };
    await writeStoredHolidaySync(payload);
    return payload;
  }
}

async function getCurrentYearHolidaySync(now: Date) {
  const currentYear = now.getFullYear();
  if (currentYear < 2026) {
    return null;
  }

  const threshold = getAnnualSyncThreshold(currentYear);
  const stored = await readStoredHolidaySync();
  const needsYearlySync =
    now >= threshold &&
    (!stored || stored.year !== currentYear || new Date(stored.lastSyncedAt).getTime() < threshold.getTime());

  if (needsYearlySync) {
    return syncCurrentYearHolidaySource(currentYear);
  }

  if (stored?.year === currentYear) {
    return stored;
  }

  return syncCurrentYearHolidaySource(currentYear);
}

export async function getSouthAfricanPublicHolidayPlannerItems(): Promise<SocialCalendarItem[]> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentYearSync = await getCurrentYearHolidaySync(today);

  if (!currentYearSync || (currentYear > 2030 && currentYearSync.publicHolidayItems.length === 0)) {
    return [];
  }

  const todayKey = getTodayKey(today);

  return currentYearSync.publicHolidayItems
    .filter((item) => item.date.startsWith(`${currentYear}-`) && item.date >= todayKey)
    .map((item, index) => ({
      id: `sa-public-holiday-${currentYear}-${index + 1}`,
      holidayName: item.holidayName,
      date: item.date,
      category: "South African Public Holiday",
      postPlan: `${getHolidayDayLabel(item.date)} · ${new Date(`${item.date}T00:00:00`).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })}|||${getHolidayMeaning(item.holidayName)}`
    }));
}

export async function getInternationalObservancePlannerItems(): Promise<SocialCalendarItem[]> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentYearSync = await getCurrentYearHolidaySync(today);

  if (!currentYearSync) {
    return [];
  }

  const todayKey = getTodayKey(today);

  return currentYearSync.internationalObservanceItems
    .filter((item) => item.date.startsWith(`${currentYear}-`) && item.date >= todayKey)
    .map((item, index) => ({
      id: `international-observance-${currentYear}-${index + 1}`,
      holidayName: item.holidayName,
      date: item.date,
      category: "International Observance",
      postPlan: `${getHolidayDayLabel(item.date)} · ${new Date(`${item.date}T00:00:00`).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })}|||${getInternationalObservanceMeaning(item.holidayName)}`
    }));
}
