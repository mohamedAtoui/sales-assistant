'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Sound effect utility using Web Audio API
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

function playBeep(frequency: number, duration: number, volume: number = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (required after user interaction)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playStartSound(): void {
  // Rising tone - two quick beeps
  playBeep(440, 0.1, 0.2); // A4
  setTimeout(() => playBeep(587, 0.1, 0.2), 100); // D5
}

function playStopSound(): void {
  // Falling tone - single lower beep
  playBeep(523, 0.15, 0.25); // C5
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  playSounds?: boolean;
}

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onSpeechEnd?: () => void;
}

export function useSpeechRecognition({
  lang = 'fr-FR',
  continuous = false,
  onResult,
  onEnd,
  playSounds = true,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Use ref to track actual listening state synchronously (avoids race conditions)
  const isListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.lang = lang;
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult?.(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        setError(event.error);
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        onEnd?.();
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, continuous, onResult, onEnd]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      setError(null);
      isListeningRef.current = true;
      setIsListening(true);
      if (playSounds) {
        playStartSound();
      }
      recognitionRef.current.start();
    }
  }, [playSounds]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      if (playSounds) {
        playStopSound();
      }
      recognitionRef.current.stop();
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [playSounds]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}

export function useSpeechSynthesis({
  lang = 'fr-FR',
  rate = 1,
  pitch = 1,
  onSpeechEnd,
}: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onSpeechEndRef = useRef(onSpeechEnd);

  // Keep the callback ref updated
  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !voiceEnabled) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Get available voices and select the best quality French voice
      const voices = window.speechSynthesis.getVoices();
      const frenchVoices = voices.filter((voice) => voice.lang.startsWith('fr'));

      // Prioritize cloud-based voices (better quality) over local voices
      // Cloud voices typically have localService = false
      const cloudVoice = frenchVoices.find((voice) => !voice.localService);
      const localVoice = frenchVoices.find((voice) => voice.localService);

      // Prefer cloud voice, fall back to local voice
      const selectedVoice = cloudVoice || localVoice;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onSpeechEndRef.current?.();
      };
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, voiceEnabled, lang, rate, pitch]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const toggleVoice = useCallback(() => {
    if (isSpeaking) {
      stop();
    }
    setVoiceEnabled((prev) => !prev);
  }, [isSpeaking, stop]);

  return {
    isSpeaking,
    isSupported,
    voiceEnabled,
    speak,
    stop,
    toggleVoice,
    setVoiceEnabled,
  };
}
