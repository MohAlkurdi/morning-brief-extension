const CODES = [
  [0, 'Clear', 'sun'], [1, 'Mostly clear', 'sun'], [2, 'Partly cloudy', 'cloud'], [3, 'Overcast', 'cloud'],
  [48, 'Fog', 'cloud'], [57, 'Drizzle', 'rain'], [67, 'Rain', 'rain'], [77, 'Snow', 'snow'],
  [82, 'Showers', 'rain'], [86, 'Snow showers', 'snow'], [99, 'Thunderstorms', 'storm'],
];
const describe = code => CODES.find(([max]) => code <= max) ?? CODES.at(-1);

export async function weather(city, lang = 'en') {
  if (!city) return null;
  const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=${lang}&name=${encodeURIComponent(city)}`).then(r => r.json());
  const place = geo.results?.[0];
  if (!place) return null;
  const f = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=2')
    .then(r => r.json());
  const day = i => ({ high: Math.round(f.daily.temperature_2m_max[i]), low: Math.round(f.daily.temperature_2m_min[i]), rain: f.daily.precipitation_probability_max[i], label: describe(f.daily.weather_code[i])[1] });
  const [, label, icon] = describe(f.current.weather_code);
  return { place: place.name, now: Math.round(f.current.temperature_2m), unit: f.current_units.temperature_2m, label, icon, today: day(0), tomorrow: day(1) };
}
