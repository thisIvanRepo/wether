import './global.css';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CloudMapCard } from './src/components/CloudMapCard';
import { CurrentHero } from './src/components/CurrentHero';
import { DailyCard } from './src/components/DailyCard';
import { HourlyStrip } from './src/components/HourlyStrip';
import { PrecipitationCard } from './src/components/PrecipitationCard';
import { WindProfileCard } from './src/components/WindProfileCard';
import { useWeather } from './src/hooks/useWeather';
import { gradientFor } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <WeatherScreen />
    </SafeAreaProvider>
  );
}

const DEFAULT_GRADIENT = gradientFor(0, true);

function WeatherScreen() {
  const { state, refreshing, reload, retry } = useWeather();

  const gradient =
    state.status === 'ready'
      ? gradientFor(state.forecast.current.weatherCode, state.forecast.current.isDay)
      : DEFAULT_GRADIENT;

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {state.status === 'loading' && (
          <View className="flex-1 items-center justify-center gap-3 p-6">
            <ActivityIndicator size="large" color="#fff" />
            <Text className="text-center text-[15px] text-ink-muted">Завантаження погоди…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <View className="flex-1 items-center justify-center gap-3 p-6">
            <Text className="text-[22px] font-semibold text-ink">Щось пішло не так</Text>
            <Text className="text-center text-[15px] text-ink-muted">{state.message}</Text>
            <Pressable onPress={retry} className="mt-2 rounded-2xl bg-white px-5 py-3 active:opacity-80">
              <Text className="text-base font-bold text-ink-dark">Спробувати ще раз</Text>
            </Pressable>
          </View>
        )}

        {state.status === 'ready' && (
          <ScrollView
            contentContainerClassName="w-full max-w-[640px] self-center gap-4 p-4 pb-10"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor="#fff" />}
          >
            <CurrentHero
              current={state.forecast.current}
              today={state.forecast.daily[0]}
              place={state.place}
              usingFallback={state.usingFallback}
            />
            <HourlyStrip hourly={state.forecast.hourly} />
            <PrecipitationCard hourly={state.forecast.hourly} />
            <WindProfileCard hourly={state.forecast.hourly} />
            <CloudMapCard
              latitude={state.coords.latitude}
              longitude={state.coords.longitude}
              startTime={state.forecast.current.time}
            />
            <DailyCard daily={state.forecast.daily} />
            <Text className="text-center text-xs text-ink-faint">Дані: Open-Meteo.com</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
