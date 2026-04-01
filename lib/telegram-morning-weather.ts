import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSouthAfricanPublicHolidayPlannerItems } from "@/lib/social-calendar";
import { dispatchTelegramNotification } from "@/lib/telegram";
import type { AppNotification, PlatformSettings } from "@/types/domain";

type WeatherSnapshot = {
  temperatureC: number | null;
  weatherLabel: string;
  windSpeedKmh: number | null;
  rainChanceToday: number | null;
  severeAlert: string | null;
  warnings: string[];
  tomorrowForecast?: {
    weatherLabel: string;
    maxC: number | null;
    minC: number | null;
  };
};

type MorningLog = {
  sentDates: string[];
};

const dataDir = path.join(process.cwd(), "data");
const sentLogFile = path.join(dataDir, "telegram-morning-weather-log.json");

function getSastNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Africa/Johannesburg"
    })
  );
}

function toDateKey(dateValue: Date) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(
    dateValue.getDate()
  ).padStart(2, "0")}`;
}

function isWeekday(dateValue: Date) {
  const day = dateValue.getDay();
  return day >= 1 && day <= 5;
}

function withinMorningWindow(dateValue: Date) {
  return dateValue.getHours() === 7 && dateValue.getMinutes() < 10;
}

async function readSentLog(): Promise<MorningLog> {
  await mkdir(dataDir, { recursive: true });
  try {
    const content = await readFile(sentLogFile, "utf8");
    const parsed = JSON.parse(content) as MorningLog;
    return {
      sentDates: parsed.sentDates ?? []
    };
  } catch {
    return { sentDates: [] };
  }
}

async function writeSentLog(log: MorningLog) {
  await mkdir(dataDir, { recursive: true });
  const unique = Array.from(new Set(log.sentDates)).sort();
  const recent = unique.slice(-60);
  await writeFile(
    sentLogFile,
    `${JSON.stringify(
      {
        sentDates: recent
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function fetchMorningWeatherSnapshot(): Promise<WeatherSnapshot> {
  const forecastUrl =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=-29.905" +
    "&longitude=30.953" +
    "&current=temperature_2m,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=Africa%2FJohannesburg";

  const response = await fetch(forecastUrl, { cache: "no-store", next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error("Weather source unavailable.");
  }

  const payload = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
    daily?: {
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };

  const weatherCode = payload.current?.weather_code;
  const weatherLabel =
    weatherCode === 0
      ? "Clear"
      : weatherCode === 1 || weatherCode === 2
      ? "Partly Cloudy"
      : weatherCode === 3
      ? "Cloudy"
      : weatherCode === 95 || weatherCode === 96 || weatherCode === 99
      ? "Thunderstorm"
      : weatherCode !== undefined && weatherCode >= 61 && weatherCode <= 82
      ? "Rain"
      : "Mixed Conditions";

  const warnings: string[] = [];
  if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
    warnings.push("Thunderstorm risk");
  }
  if ((payload.current?.wind_speed_10m ?? 0) >= 45) {
    warnings.push("Strong wind");
  }

  return {
    temperatureC: typeof payload.current?.temperature_2m === "number" ? Math.round(payload.current.temperature_2m) : null,
    weatherLabel,
    windSpeedKmh: typeof payload.current?.wind_speed_10m === "number" ? Math.round(payload.current.wind_speed_10m) : null,
    rainChanceToday:
      typeof payload.daily?.precipitation_probability_max?.[0] === "number"
        ? Math.round(payload.daily.precipitation_probability_max[0] as number)
        : null,
    severeAlert: warnings[0] ?? null,
    warnings,
    tomorrowForecast: {
      weatherLabel:
        payload.daily?.weather_code?.[1] === 0
          ? "Clear"
          : payload.daily?.weather_code?.[1] === 1 || payload.daily?.weather_code?.[1] === 2
          ? "Partly Cloudy"
          : payload.daily?.weather_code?.[1] === 3
          ? "Cloudy"
          : payload.daily?.weather_code?.[1] !== undefined
          ? "Mixed Conditions"
          : "Unknown",
      maxC:
        typeof payload.daily?.temperature_2m_max?.[1] === "number"
          ? Math.round(payload.daily.temperature_2m_max[1] as number)
          : null,
      minC:
        typeof payload.daily?.temperature_2m_min?.[1] === "number"
          ? Math.round(payload.daily.temperature_2m_min[1] as number)
          : null
    }
  };
}

function buildMessage(snapshot: WeatherSnapshot) {
  const tempEmoji =
    snapshot.temperatureC === null
      ? "🌡️"
      : snapshot.temperatureC >= 30
      ? "🔥"
      : snapshot.temperatureC >= 22
      ? "☀️"
      : snapshot.temperatureC <= 12
      ? "🥶"
      : "🌤️";
  const weatherLower = (snapshot.weatherLabel ?? "").toLowerCase();
  const weatherEmoji = weatherLower.includes("thunderstorm")
    ? "⛈️"
    : weatherLower.includes("rain")
    ? "🌧️"
    : weatherLower.includes("cloud")
    ? "☁️"
    : "🌤️";
  const warningEmoji = snapshot.severeAlert ? "⚠️" : "";

  const lines = [
    "😊 Good Morning Team, This is the Weather Outlook for Today.",
    `${weatherEmoji} Current: ${snapshot.weatherLabel}${snapshot.temperatureC !== null ? `, ${snapshot.temperatureC}°C ${tempEmoji}` : ""}`,
    `💨 Wind: ${snapshot.windSpeedKmh !== null ? `${snapshot.windSpeedKmh} km/h` : "N/A"}`,
    `🌦️ Rain Chance: ${snapshot.rainChanceToday !== null ? `${snapshot.rainChanceToday}%` : "N/A"}`
  ];

  if (snapshot.severeAlert) {
    lines.push(`${warningEmoji} Warning: ${snapshot.severeAlert}`);
  }
  if (snapshot.tomorrowForecast) {
    const tomorrowLower = (snapshot.tomorrowForecast.weatherLabel ?? "").toLowerCase();
    const tomorrowEmoji = tomorrowLower.includes("thunderstorm")
      ? "⛈️"
      : tomorrowLower.includes("rain")
      ? "🌧️"
      : tomorrowLower.includes("cloud")
      ? "☁️"
      : "🌤️";
    lines.push(
      `${tomorrowEmoji} Tomorrow: ${snapshot.tomorrowForecast.weatherLabel}${
        snapshot.tomorrowForecast.maxC !== null && snapshot.tomorrowForecast.minC !== null
          ? ` (${snapshot.tomorrowForecast.minC}°C - ${snapshot.tomorrowForecast.maxC}°C)`
          : ""
      }`
    );
  }
  return lines.join("\n");
}

export async function runTelegramMorningWeatherJob(settings: PlatformSettings) {
  const now = getSastNow();
  const todayKey = toDateKey(now);
  const log = await readSentLog();

  if (!isWeekday(now)) {
    return { sent: false, reason: "Weekend", todayKey };
  }

  if (!withinMorningWindow(now)) {
    return { sent: false, reason: "Outside 07:00 window", todayKey };
  }

  if (log.sentDates.includes(todayKey)) {
    return { sent: false, reason: "Already sent today", todayKey };
  }

  const holidays = await getSouthAfricanPublicHolidayPlannerItems().catch(() => []);
  const isHoliday = holidays.some((item) => item.date === todayKey);
  if (isHoliday) {
    return { sent: false, reason: "SA public holiday", todayKey };
  }

  let snapshot: WeatherSnapshot;
  try {
    snapshot = await fetchMorningWeatherSnapshot();
  } catch {
    snapshot = {
      temperatureC: null,
      weatherLabel: "Unavailable",
      windSpeedKmh: null,
      rainChanceToday: null,
      severeAlert: null,
      warnings: []
    };
  }

  const notification: AppNotification = {
    id: `telegram-weather-${todayKey}`,
    title: "Daily Weather Outlook",
    detail: buildMessage(snapshot),
    channel: "telegram",
    audience: "admins",
    createdAt: new Date().toISOString(),
    importance: snapshot.severeAlert ? "critical" : "informational",
    tone: snapshot.severeAlert ? "warning" : "default"
  };

  const outcome = await dispatchTelegramNotification(notification, settings, { force: true });
  if (!outcome.delivery.ok) {
    return {
      sent: false,
      reason: outcome.delivery.reason ?? "Telegram send failed",
      todayKey
    };
  }

  log.sentDates.push(todayKey);
  await writeSentLog(log);
  return { sent: true, reason: "Sent", todayKey };
}
