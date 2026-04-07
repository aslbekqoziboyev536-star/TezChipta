import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, Wind, Thermometer, Calendar, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { apiFetch } from '../utils/api';

interface WeatherData {
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

const cities = [
  { name: 'Toshkent', lat: 41.31, lon: 69.24 },
  { name: 'Urganch', lat: 41.55, lon: 60.63 },
  { name: 'Samarqand', lat: 39.65, lon: 66.97 },
  { name: 'Buxoro', lat: 39.77, lon: 64.42 },
  { name: 'Nukus', lat: 42.46, lon: 59.61 },
];

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/weather?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}`;
        console.log(`[Frontend Debug] Fetching weather from: ${url}`);

        // Use direct fetch for better debugging if needed, or keep apiFetch
        const data = await apiFetch<WeatherData>(url);
        setWeather(data);
      } catch (err: any) {
        console.error('[Frontend Debug] Weather fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [selectedCity]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
    if (code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (code <= 48) return <Wind className="w-8 h-8 text-gray-500" />;
    if (code <= 67) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code <= 99) return <CloudLightning className="w-8 h-8 text-purple-500" />;
    return <Cloud className="w-8 h-8 text-gray-400" />;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Ochiq osmon';
    if (code <= 3) return 'Bulutli';
    if (code <= 48) return 'Tuman';
    if (code <= 67) return 'Yomg\'ir';
    if (code <= 99) return 'Momaqaldiroq';
    return 'Noma\'lum';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ob-havo ma'lumoti</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">7 kunlik ma'lumot</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0B1120] p-1 rounded-xl border border-gray-100 dark:border-white/5 overflow-x-auto scrollbar-hide max-w-full">
          {cities.map((city) => (
            <Button
              key={city.name}
              variant="ghost"
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all h-auto border-0 whitespace-nowrap ${selectedCity.name === city.name
                ? 'bg-white dark:bg-[#1F2937] text-emerald-500 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {city.name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
          <p className="text-sm text-gray-500">Yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm">{error}</p>
          <Button
            variant="ghost"
            onClick={() => setSelectedCity({ ...selectedCity })}
            className="mt-4 text-emerald-500 text-sm font-medium hover:underline h-auto border-0"
          >
            Qayta urinish
          </Button>
        </div>
      ) : weather ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {weather.daily.time.map((time, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={time}
              className={`p-4 rounded-2xl border transition-all ${index === 0
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-gray-50 dark:bg-[#0B1120]/50 border-gray-100 dark:border-white/5'
                }`}
            >
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                {index === 0 ? 'Bugun' : formatDate(time)}
              </div>

              <div className="flex flex-col items-center gap-3">
                {getWeatherIcon(weather.daily.weathercode[index])}

                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(weather.daily.temperature_2m_max[index])}°
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(weather.daily.temperature_2m_min[index])}°
                  </div>
                </div>

                <div className="text-[10px] font-medium text-gray-500 text-center line-clamp-1">
                  {getWeatherDescription(weather.daily.weathercode[index])}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

      <div className="mt-8 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-4">
        <div className="p-2 bg-emerald-500 text-white rounded-lg">
          <Wind className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Haydovchilar diqqatiga!</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">Sayohatni boshlashdan oldin ob-havo ma'lumotini tekshiring va xavfsizlik qoidalariga rioya qiling.</p>
        </div>
      </div>
    </div>
  );
};
