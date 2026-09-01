export default function Flame({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.9} viewBox="0 0 24 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 C 14 12, 22 16, 20 28 C 18 40, 12 44, 6 38 C 0 32, 3 22, 9 24 C 5 16, 9 8, 12 2 Z" fill={color} />
    </svg>
  );
}
