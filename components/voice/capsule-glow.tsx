'use client';

import { type VoiceState } from '@/lib/hooks/use-voice-interaction';

interface CapsuleGlowProps {
  voiceState: VoiceState;
  audioLevel?: number;
}

const glowColors: Record<VoiceState, string> = {
  idle: 'rgba(16, 185, 129, 0.4)', // Soft emerald
  listening: 'rgba(6, 182, 212, 0.6)', // Bright cyan
  thinking: 'rgba(245, 158, 11, 0.5)', // Amber
  speaking: 'rgba(16, 185, 129, 0.6)', // Strong emerald
};

const glowClasses: Record<VoiceState, string> = {
  idle: 'glow-idle',
  listening: 'glow-listening',
  thinking: 'glow-thinking',
  speaking: 'glow-speaking',
};

export function CapsuleGlow({ voiceState, audioLevel = 0 }: CapsuleGlowProps) {
  const baseColor = glowColors[voiceState];
  const animationClass = glowClasses[voiceState];

  // Audio-reactive scale for speaking state
  const speakingScale = voiceState === 'speaking' ? 1 + audioLevel * 0.3 : 1;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`absolute rounded-full ${animationClass}`}
        style={{
          width: 280,
          height: 280,
          background: `radial-gradient(circle, ${baseColor} 0%, transparent 70%)`,
          transform: `scale(${speakingScale})`,
          transition: voiceState === 'speaking' ? 'transform 0.1s ease-out' : 'background 0.5s ease-in-out',
        }}
      />
      {/* Secondary glow layer for depth */}
      <div
        className="absolute rounded-full opacity-50"
        style={{
          width: 320,
          height: 320,
          background: `radial-gradient(circle, ${baseColor} 0%, transparent 60%)`,
          filter: 'blur(20px)',
        }}
      />
    </div>
  );
}
