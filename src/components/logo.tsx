import Image from "next/image";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Mirror"
      width={size}
      height={size}
      priority
      className={`rounded-[22%] shadow-sm ${className}`}
    />
  );
}
