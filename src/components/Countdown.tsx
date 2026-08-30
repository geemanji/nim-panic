import { useEffect, useState } from "react";
import { formatCountdown, msLeft } from "@/lib/nim";

export function Countdown({ target, className }: { target: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = msLeft(target, now);
  return (
    <span className={className}>{remaining <= 0 ? "Locked" : formatCountdown(remaining)}</span>
  );
}
