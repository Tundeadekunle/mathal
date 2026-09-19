import Image from "next/image";
import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  variant?: "light" | "dark" | "full";
}

export default function Logo({
  size = 56,
  showText = true,
  className = "",
  variant = "full",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative flex-shrink-0 transition-transform duration-200 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <Image
          src="/mathal-logo.svg"
          alt="Mathal International Schools Crest"
          width={size}
          height={size}
          priority
          className="h-full w-full object-contain drop-shadow-md"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-serif font-black tracking-tight leading-tight ${
              variant === "light"
                ? "text-white"
                : "text-emerald-950 dark:text-emerald-50"
            } ${size >= 60 ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
          >
            MATHAL
          </span>
          <span
            className={`text-xs font-semibold tracking-wider uppercase ${
              variant === "light"
                ? "text-amber-300"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            International Schools
          </span>
          <span
            className={`text-[10px] tracking-widest uppercase font-medium ${
              variant === "light"
                ? "text-emerald-200/80"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Primary &bull; Secondary
          </span>
        </div>
      )}
    </div>
  );
}
