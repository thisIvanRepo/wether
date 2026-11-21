import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon3D, type Icon3DName } from './Icon3D';

type Props = {
  title: string;
  icon?: Icon3DName;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, icon, right, children, className = '' }: Props) {
  return (
    <View className={`gap-3 rounded-card border-[0.5px] border-glass-border bg-glass p-4 ${className}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {icon && <Icon3D name={icon} size={26} />}
          <Text className="text-[13px] font-bold uppercase tracking-wider text-ink-muted">{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Small rounded pill used for selectors. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${active ? 'bg-white/90' : 'bg-white/10'}`}
    >
      <Text className={`text-[13px] font-semibold ${active ? 'text-ink-dark' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
