import Image from 'next/image';

interface FlowIconProps {
  size?: number;
  className?: string;
}

export default function FlowIcon({ size = 24, className = '' }: FlowIconProps) {
  return (
    <Image
      src="/icon.svg"
      alt="Shotty Icon"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
