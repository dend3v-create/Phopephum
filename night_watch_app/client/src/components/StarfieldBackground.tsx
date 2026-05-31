/**
 * StarfieldBackground Component
 * 
 * Renders an animated starfield background effect
 */

import React from "react";

export default function StarfieldBackground() {
  // Generate random stars
  const stars = Array.from({ length: 100 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.7 + 0.3,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(212,175,55,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(107,91,149,0.05),transparent_50%)]" />

      {/* Stars */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        {stars.map((star, i) => (
          <circle
            key={i}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.size}
            fill="rgba(212, 175, 55, 0.6)"
            opacity={star.opacity}
            style={{
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
            }}
          />
        ))}
      </svg>

      {/* CSS for twinkling animation */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
