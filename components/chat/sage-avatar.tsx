'use client';

import Image from 'next/image';

interface SageAvatarProps {
  isSpeaking: boolean;
}

export function SageAvatar({ isSpeaking }: SageAvatarProps) {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30) * (Math.PI / 180);
    return { id: i, angle };
  });

  return (
    <div className="flex items-center justify-center overflow-visible">
      <div className="relative overflow-visible" style={{ width: 200, height: 200 }}>
        {/* Glow ring effect - large oval to cover image background */}
        <div
          className={`absolute rounded-[120px] ${isSpeaking ? 'sage-glow' : ''}`}
          style={{
            top: -50,
            left: -60,
            right: -60,
            bottom: -50,
            backgroundColor: 'white',
          }}
        />

        {/* Sage image */}
        <div className={`relative z-10 overflow-visible ${isSpeaking ? 'sage-pulse' : ''}`}>
          <Image
            src="/sage.png"
            alt="Sage Assistant"
            width={200}
            height={200}
            className="mix-blend-multiply"
            priority
            unoptimized
          />
        </div>

        {/* Golden particles */}
        {isSpeaking && particles.map(({ id, angle }) => (
          <div
            key={id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'rgba(251, 191, 36, 1)',
              top: '50%',
              left: '50%',
              animation: `particle-float-${id} 2.5s ease-out infinite`,
              animationDelay: `${id * 0.15}s`,
            }}
          />
        ))}

        {/* Inline keyframes for particles */}
        {isSpeaking && (
          <style>{`
            ${particles.map(({ id, angle }) => `
              @keyframes particle-float-${id} {
                0% {
                  opacity: 1;
                  transform: translate(-50%, -50%) translate(0, 0);
                }
                100% {
                  opacity: 0;
                  transform: translate(-50%, -50%) translate(${Math.cos(angle) * 100}px, ${Math.sin(angle) * 100}px);
                }
              }
            `).join('')}
          `}</style>
        )}
      </div>
    </div>
  );
}
