import { NextResponse } from "next/server";

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
  };
  daily?: {
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    uv_index_max?: number[];
    sunrise?: string[];
    sunset?: string[];
    time?: string[];
  };
};

type OpenMeteoAirQualityResponse = {
  current?: {
    us_aqi?: number;
  };
};

function labelForWeatherCode(code?: number) {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 56 || code === 57) return "Freezing Drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing Rain";
  if (code === 71 || code === 73 || code === 75 || code === 77) return "Snow";
  if (code === 80 || code === 81 || code === 82) return "Rain Showers";
  if (code === 85 || code === 86) return "Snow Showers";
  if (code === 95 || code === 96 || code === 99) return "Thunderstorm";
  return "Unknown";
}

function buildWarnings(currentTemp?: number, weatherCode?: number, windGustKmh?: number) {
  const warnings: string[] = [];
  const thunderstormCodes = new Set([95, 96, 99]);
  const hailCodes = new Set([96, 99]);

  if (weatherCode !== undefined && thunderstormCodes.has(weatherCode)) {
    warnings.push("Thunderstorm warning");
  }

  if (weatherCode !== undefined && hailCodes.has(weatherCode)) {
    warnings.push("Possible hail warning");
  }

  if (windGustKmh !== undefined && windGustKmh >= 55) {
    warnings.push("Strong wind gust warning");
  }

  if (currentTemp !== undefined && currentTemp >= 34) {
    warnings.push("Heat warning");
  }

  if (currentTemp !== undefined && currentTemp <= 7) {
    warnings.push("Cold weather warning");
  }

  return warnings;
}

function getAqiLabel(aqi?: number) {
  if (aqi === undefined) return "Unknown";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function toTwoDigits(value?: number) {
  return typeof value === "number" ? Math.round(value) : null;
}

function formatClock(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export async function GET() {
  try {
    const forecastUrl =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=-29.905" +
      "&longitude=30.953" +
      "&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,wind_gusts_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset" +
      "&timezone=Africa%2FJohannesburg";

    const airQualityUrl =
      "https://air-quality-api.open-meteo.com/v1/air-quality" +
      "?latitude=-29.905" +
      "&longitude=30.953" +
      "&current=us_aqi" +
      "&timezone=Africa%2FJohannesburg";

    const [forecastResponse, airResponse] = await Promise.all([
      fetch(forecastUrl, {
        cache: "no-store",
        next: { revalidate: 0 }
      }),
      fetch(airQualityUrl, {
        cache: "no-store",
        next: { revalidate: 0 }
      }).catch(() => null)
    ]);

    if (!forecastResponse.ok) {
      throw new Error("Weather source unavailable.");
    }

    const payload = (await forecastResponse.json()) as OpenMeteoResponse;
    const airPayload = airResponse && airResponse.ok ? ((await airResponse.json()) as OpenMeteoAirQualityResponse) : null;
    const temperatureC = payload.current?.temperature_2m;
    const apparentTempC = payload.current?.apparent_temperature;
    const weatherCode = payload.current?.weather_code;
    const humidity = payload.current?.relative_humidity_2m;
    const windSpeed = payload.current?.wind_speed_10m;
    const windGustKmh = payload.current?.wind_gusts_10m;
    const weatherLabel = labelForWeatherCode(weatherCode);
    const tomorrowCode = payload.daily?.weather_code?.[1];
    const tomorrowMax = payload.daily?.temperature_2m_max?.[1];
    const tomorrowMin = payload.daily?.temperature_2m_min?.[1];
    const tomorrowDate = payload.daily?.time?.[1];
    const rainChanceToday = payload.daily?.precipitation_probability_max?.[0];
    const rainfallToday = payload.daily?.precipitation_sum?.[0];
    const uvIndexMaxToday = payload.daily?.uv_index_max?.[0];
    const sunriseToday = payload.daily?.sunrise?.[0];
    const sunsetToday = payload.daily?.sunset?.[0];
    const aqi = airPayload?.current?.us_aqi;
    const warnings = buildWarnings(temperatureC, weatherCode, windGustKmh);
    const severeAlert =
      warnings.find((item) => item.toLowerCase().includes("thunderstorm")) ||
      warnings.find((item) => item.toLowerCase().includes("hail")) ||
      (typeof windGustKmh === "number" && windGustKmh >= 70 ? "Severe wind warning" : null);

    return NextResponse.json({
      location: "Mount Vernon, Durban",
      temperatureC: toTwoDigits(temperatureC),
      apparentTempC: toTwoDigits(apparentTempC),
      weatherLabel,
      humidity: toTwoDigits(humidity),
      windSpeedKmh: toTwoDigits(windSpeed),
      windGustKmh: toTwoDigits(windGustKmh),
      rainChanceToday: toTwoDigits(rainChanceToday),
      rainfallTodayMm: typeof rainfallToday === "number" ? Number(rainfallToday.toFixed(1)) : null,
      uvIndexMaxToday: typeof uvIndexMaxToday === "number" ? Number(uvIndexMaxToday.toFixed(1)) : null,
      sunriseToday: formatClock(sunriseToday),
      sunsetToday: formatClock(sunsetToday),
      airQuality: {
        usAqi: toTwoDigits(aqi),
        label: getAqiLabel(aqi)
      },
      tomorrowForecast: {
        date: tomorrowDate ?? null,
        weatherLabel: labelForWeatherCode(tomorrowCode),
        maxC: toTwoDigits(tomorrowMax),
        minC: toTwoDigits(tomorrowMin)
      },
      severeAlert: severeAlert ?? null,
      warnings,
      source: "Open-Meteo",
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch weather.",
        location: "Mount Vernon, Durban",
        warnings: [] as string[]
      },
      { status: 502 }
    );
  }
}
