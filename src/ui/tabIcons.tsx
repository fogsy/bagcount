import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  color?: string;
  size?: number;
};

export function HomeTabIcon({ color = '#ffffff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DrillsTabIcon({ color = '#ffffff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9v6M18 9v6M8 12h8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M4 8.5v7a1.5 1.5 0 0 0 1.5 1.5H7V7H5.5A1.5 1.5 0 0 0 4 8.5zM17 7h1.5A1.5 1.5 0 0 1 20 8.5v7a1.5 1.5 0 0 1-1.5 1.5H17V7z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LeagueTabIcon({ color = '#EAB308', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4h10v3a5 5 0 0 1-4 4.9V14h3v2H8v-2h3v-2.1A5 5 0 0 1 7 7V4z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M9 20h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileTabIcon({ color = '#ffffff', size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9" r="3.2" stroke={color} strokeWidth={1.8} />
      <Path
        d="M5.5 19c1.4-3 3.6-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GloveFabIcon({ color = '#ffffff', size = 28 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 7.2c0-2.4 1.9-4.2 4.3-4.2 2.1 0 3.8 1.3 4.3 3.1.9.2 1.6.9 1.6 1.9v2.6c0 .7-.2 1.3-.6 1.8l-1.4 1.7c-.3.4-.5.9-.5 1.4V16H9.2v-.8c0-.7-.2-1.3-.6-1.8L7.4 12c-.5-.6-.8-1.4-.8-2.2V8.8c0-.9.7-1.6 1.5-1.7.1-.3.3-.6.4-.9z"
        fill={color}
      />
      <Rect x="8.5" y="16" width="8.2" height="4.2" rx="1.2" fill={color} />
      <Path
        d="M10.8 17.5h3.6"
        stroke="#E11D2E"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function FlameIcon({ color = '#E11D2E', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c2 4-1 5 1 9 1.2 2.2 3 3.2 3 6a4 4 0 0 1-8 0c0-2.5 1.5-4 2.5-5.5C12 9.5 10 6.5 12 2z"
        fill={color}
      />
    </Svg>
  );
}

export function BoltIcon({ color = '#EAB308', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" fill={color} />
    </Svg>
  );
}
