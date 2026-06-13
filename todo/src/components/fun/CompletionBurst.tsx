import { createPortal } from "react-dom";
import { useEffect, useMemo } from "react";
import type { BurstEvent } from "../../types/fun.types";

interface CompletionBurstProps {
  bursts: BurstEvent[];
  onDone: (id: string) => void;
}

const CompletionBurst = ({ bursts, onDone }: CompletionBurstProps) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {bursts.map((burst) => (
        <Burst key={burst.id} burst={burst} onDone={onDone} />
      ))}
    </>,
    document.body
  );
};

const Burst = ({
  burst,
  onDone,
}: {
  burst: BurstEvent;
  onDone: (id: string) => void;
}) => {
  const count = burst.intensity === "epic" ? 20 : 14;

  const particles = useMemo(() => {
    if (burst.intensity === "subtle") return [];
    return Array.from({ length: count }, (_, i) => ({
      angle: (360 / count) * i + ((i * 17) % 20),
      dist:
        burst.intensity === "epic"
          ? 48 + ((i * 13) % 32)
          : 32 + ((i * 11) % 24),
    }));
  }, [burst.intensity, count]);

  useEffect(() => {
    const duration =
      burst.intensity === "subtle" ? 400 : burst.intensity === "epic" ? 900 : 650;
    const t = setTimeout(() => onDone(burst.id), duration);
    return () => clearTimeout(t);
  }, [burst.id, burst.intensity, onDone]);

  if (burst.intensity === "subtle") {
    return (
      <div
        className="tf-burst-subtle pointer-events-none fixed z-[9999]"
        style={{ left: burst.x, top: burst.y, transform: "translate(-50%, -50%)" }}
      />
    );
  }

  return (
    <>
      {burst.intensity === "epic" && (
        <div className="tf-burst-vignette pointer-events-none fixed inset-0 z-[9998]" />
      )}
      {particles.map((p, i) => (
        <div
          key={i}
          className={`tf-burst-particle pointer-events-none fixed z-[9999] rounded-full ${
            burst.intensity === "epic" ? "h-2 w-2" : "h-1.5 w-1.5"
          }`}
          style={{
            left: burst.x,
            top: burst.y,
            ["--tf-burst-angle" as string]: `${p.angle}deg`,
            ["--tf-burst-dist" as string]: `${p.dist}px`,
            animationDelay: `${i * 12}ms`,
          }}
        />
      ))}
    </>
  );
};

export default CompletionBurst;
