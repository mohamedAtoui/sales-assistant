'use client';

import { Circle, Mic, Loader2, Volume2 } from 'lucide-react';
import { type VoiceState } from '@/lib/hooks/use-voice-interaction';

interface StatusIndicatorProps {
  voiceState: VoiceState;
}

const statusConfig: Record<VoiceState, {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  iconClass: string;
  textClass: string;
}> = {
  idle: {
    icon: Circle,
    text: 'Prêt',
    iconClass: 'text-gray-400',
    textClass: 'text-gray-500',
  },
  listening: {
    icon: Mic,
    text: 'Je vous écoute...',
    iconClass: 'text-cyan-500 mic-animated',
    textClass: 'text-cyan-600',
  },
  thinking: {
    icon: Loader2,
    text: 'Réflexion...',
    iconClass: 'text-amber-500 status-spinning',
    textClass: 'text-amber-600',
  },
  speaking: {
    icon: Volume2,
    text: 'Sage parle...',
    iconClass: 'text-emerald-500 animate-pulse',
    textClass: 'text-emerald-600',
  },
};

export function StatusIndicator({ voiceState }: StatusIndicatorProps) {
  const config = statusConfig[voiceState];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-2">
      <Icon className={`h-5 w-5 ${config.iconClass}`} />
      <p className={`text-sm font-medium ${config.textClass}`}>
        {config.text}
      </p>
    </div>
  );
}
