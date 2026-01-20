'use client';

import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceInputButton({
  isListening,
  isSupported,
  onStart,
  onStop,
  className,
}: VoiceInputButtonProps) {
  if (!isSupported) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onStart();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    onStop();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    onStart();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    onStop();
  };

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={isListening ? handleMouseUp : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'transition-all select-none touch-none',
        isListening && 'animate-pulse',
        className
      )}
      title={isListening ? 'Relâchez pour envoyer' : 'Maintenez pour parler'}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span className="sr-only">
        {isListening ? 'Relâchez pour envoyer' : 'Maintenez pour parler'}
      </span>
    </Button>
  );
}

interface VoiceOutputToggleProps {
  voiceEnabled: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  onToggle: () => void;
  onStop: () => void;
  className?: string;
}

export function VoiceOutputToggle({
  voiceEnabled,
  isSpeaking,
  isSupported,
  onToggle,
  onStop,
  className,
}: VoiceOutputToggleProps) {
  if (!isSupported) {
    return null;
  }

  if (isSpeaking) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onStop}
        className={cn('gap-2', className)}
        title="Arrêter la lecture"
      >
        <Square className="h-3 w-3" />
        <span className="text-xs">Stop</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={voiceEnabled ? 'default' : 'ghost'}
      size="sm"
      onClick={onToggle}
      className={cn('gap-2', className)}
      title={voiceEnabled ? 'Désactiver la lecture vocale' : 'Activer la lecture vocale'}
    >
      {voiceEnabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
      <span className="text-xs hidden sm:inline">
        {voiceEnabled ? 'Voix ON' : 'Voix OFF'}
      </span>
    </Button>
  );
}
