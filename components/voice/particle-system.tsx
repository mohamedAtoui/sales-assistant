'use client';

import { useMemo } from 'react';
import { type VoiceState } from '@/lib/hooks/use-voice-interaction';

interface ParticleSystemProps {
  voiceState: VoiceState;
}

const particleCounts: Record<VoiceState, number> = {
  idle: 4,
  listening: 10,
  thinking: 8,
  speaking: 14,
};

const particleColors: Record<VoiceState, string> = {
  idle: 'rgba(16, 185, 129, 0.6)', // Emerald
  listening: 'rgba(6, 182, 212, 0.8)', // Cyan
  thinking: 'rgba(245, 158, 11, 0.7)', // Amber
  speaking: 'rgba(52, 211, 153, 0.8)', // Light emerald
};

export function ParticleSystem({ voiceState }: ParticleSystemProps) {
  const particles = useMemo(() => {
    const count = particleCounts[voiceState];
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 360;
      const radius = 80 + Math.random() * 40;
      return {
        id: `${voiceState}-${i}`,
        angle,
        radius,
        delay: i * (2 / count),
        size: 4 + Math.random() * 4,
        // Random positions for different states
        startX: (Math.random() - 0.5) * 200,
        startY: (Math.random() - 0.5) * 200,
        endX: (Math.random() - 0.5) * 300,
        endY: (Math.random() - 0.5) * 300,
        driftX: (Math.random() - 0.5) * 30,
        driftY: (Math.random() - 0.5) * 30,
      };
    });
  }, [voiceState]);

  const color = particleColors[voiceState];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => {
        let style: React.CSSProperties = {
          position: 'absolute',
          width: particle.size,
          height: particle.size,
          borderRadius: '50%',
          backgroundColor: color,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };

        let animationClass = '';

        switch (voiceState) {
          case 'idle':
            style = {
              ...style,
              transform: `translate(-50%, -50%) translate(${Math.cos(particle.angle * Math.PI / 180) * 60}px, ${Math.sin(particle.angle * Math.PI / 180) * 60}px)`,
              ['--drift-x' as string]: `${particle.driftX}px`,
              ['--drift-y' as string]: `${particle.driftY}px`,
              animation: `particle-drift 3s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            };
            break;

          case 'listening':
            style = {
              ...style,
              ['--start-x' as string]: `${particle.startX}px`,
              ['--start-y' as string]: `${particle.startY}px`,
              animation: `particle-inward 1.5s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            };
            break;

          case 'thinking':
            style = {
              ...style,
              ['--start-angle' as string]: `${particle.angle}deg`,
              ['--orbit-radius' as string]: `${particle.radius}px`,
              animation: `particle-orbit 3s linear infinite`,
              animationDelay: `${-particle.delay}s`,
            };
            break;

          case 'speaking':
            style = {
              ...style,
              ['--end-x' as string]: `${particle.endX}px`,
              ['--end-y' as string]: `${particle.endY}px`,
              animation: `particle-burst 1.2s ease-out infinite`,
              animationDelay: `${particle.delay * 0.5}s`,
            };
            break;
        }

        return (
          <div
            key={particle.id}
            style={style}
            className={animationClass}
          />
        );
      })}
    </div>
  );
}
