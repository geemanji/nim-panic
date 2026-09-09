import { useEffect, useState } from "react";
import { formatCountdown, msLeft } from "@/lib/nim";
import { panicTier } from "@/lib/panic";

export function Countdown({
  target,
  className,
  urgent = false,
}: {
  target: string;
  className?: string;
  /** When true, the countdown colours and blinks itself as the lock closes in. */
  urgent?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = msLeft(target, now);
  const tier = panicTier(remaining);

  return (
    <span className={`${urgent ? tier.text : ""} ${className ?? ""}`.trim()}>
      {remaining <= 0 ? "Locked" : formatCountdown(remaining)}
    </span>
  );
}
