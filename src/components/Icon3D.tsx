// 3D icons from Microsoft Fluent Emoji (MIT), see assets/icons3d/LICENSE-fluentui-emoji.txt
import { Image, View } from 'react-native';
import { weatherIcon } from '../utils/weatherCodes';

const SOURCES = {
  sun: require('../../assets/icons3d/sun.png'),
  sun_behind_small_cloud: require('../../assets/icons3d/sun_behind_small_cloud.png'),
  sun_behind_cloud: require('../../assets/icons3d/sun_behind_cloud.png'),
  sun_behind_large_cloud: require('../../assets/icons3d/sun_behind_large_cloud.png'),
  sun_behind_rain_cloud: require('../../assets/icons3d/sun_behind_rain_cloud.png'),
  cloud: require('../../assets/icons3d/cloud.png'),
  cloud_with_rain: require('../../assets/icons3d/cloud_with_rain.png'),
  cloud_with_snow: require('../../assets/icons3d/cloud_with_snow.png'),
  cloud_with_lightning: require('../../assets/icons3d/cloud_with_lightning.png'),
  cloud_with_lightning_and_rain: require('../../assets/icons3d/cloud_with_lightning_and_rain.png'),
  fog: require('../../assets/icons3d/fog.png'),
  crescent_moon: require('../../assets/icons3d/crescent_moon.png'),
  snowflake: require('../../assets/icons3d/snowflake.png'),
  droplet: require('../../assets/icons3d/droplet.png'),
  umbrella_with_rain_drops: require('../../assets/icons3d/umbrella_with_rain_drops.png'),
  wind_face: require('../../assets/icons3d/wind_face.png'),
  dashing_away: require('../../assets/icons3d/dashing_away.png'),
  sunrise: require('../../assets/icons3d/sunrise.png'),
  sunset: require('../../assets/icons3d/sunset.png'),
  thermometer: require('../../assets/icons3d/thermometer.png'),
  round_pushpin: require('../../assets/icons3d/round_pushpin.png'),
  spiral_calendar: require('../../assets/icons3d/spiral_calendar.png'),
  mantelpiece_clock: require('../../assets/icons3d/mantelpiece_clock.png'),
  compass: require('../../assets/icons3d/compass.png'),
  balance_scale: require('../../assets/icons3d/balance_scale.png'),
} as const;

export type Icon3DName = keyof typeof SOURCES;

export function Icon3D({ name, size }: { name: Icon3DName; size: number }) {
  return <Image source={SOURCES[name]} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Weather condition icon; night partly-cloudy is a moon with a small cloud on top. */
export function WeatherIcon({ code, isDay = true, size }: { code: number; isDay?: boolean; size: number }) {
  const { icon, overlay } = weatherIcon(code, isDay);
  if (!overlay) return <Icon3D name={icon} size={size} />;
  return (
    <View style={{ width: size, height: size }}>
      <Icon3D name={icon} size={size * 0.85} />
      <View style={{ position: 'absolute', right: 0, bottom: 0 }}>
        <Icon3D name={overlay} size={size * 0.62} />
      </View>
    </View>
  );
}
