'use client';

import Image from 'next/image';
import { type VoiceState } from '@/lib/hooks/use-voice-interaction';
import { CapsuleGlow } from './capsule-glow';
import { ParticleSystem } from './particle-system';

interface VoiceCapsuleProps {
  voiceState: VoiceState;
  audioLevel?: number;
}

const capsuleAnimationClasses: Record<VoiceState, string> = {
  idle: 'capsule-idle',
  listening: 'capsule-listening',
  thinking: 'capsule-thinking',
  speaking: 'capsule-speaking',
};

export function VoiceCapsule({ voiceState, audioLevel = 0 }: VoiceCapsuleProps) {
  const animationClass = capsuleAnimationClasses[voiceState];

  // Audio-reactive transform for speaking
  const speakingTransform = voiceState === 'speaking'
    ? `scale(${1 + audioLevel * 0.08})`
    : undefined;

  return (
    <div className="relative" style={{ width: 280, height: 280 }}>
      {/* Background glow layer */}
      <CapsuleGlow voiceState={voiceState} audioLevel={audioLevel} />

      {/* Particle system */}
      <ParticleSystem voiceState={voiceState} />

      {/* Capsule image container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative rounded-full overflow-hidden ${animationClass}`}
          style={{
            transform: speakingTransform,
            transition: voiceState === 'speaking' ? 'transform 0.1s ease-out' : undefined,
          }}
        >
          <Image
            src="/capsuleSage.png"
            alt="Sage Voice Assistant"
            width={200}
            height={200}
            className="drop-shadow-2xl"
            priority
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
