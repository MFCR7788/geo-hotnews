"use client";
import { useState } from "react";
import { cn } from "../../lib/utils";

function generateMeteorStyles(count: number) {
  return new Array(count).fill(true).map(() => ({
    left: Math.floor(Math.random() * 800 - 400) + "px",
    animationDelay: Math.random() * 0.6 + 0.2 + "s",
    animationDuration: Math.floor(Math.random() * 8 + 2) + "s",
  }));
}

export const Meteors = ({
  number = 12,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  const [styles] = useState(() => generateMeteorStyles(number));

  return (
    <>
      {styles.map((style, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect absolute h-0.5 w-0.5 rounded-full bg-slate-400 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent",
            className
          )}
          style={{ top: 0, ...style }}
        />
      ))}
    </>
  );
};
