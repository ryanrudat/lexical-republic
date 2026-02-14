import { useRef, useCallback, useEffect } from 'react';
import { useAudioStore } from '../stores/audioStore';

export function useMediaRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const totalPausedRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { setState, setDuration, setBlob, setError } = useAudioStore();

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio analyser
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setBlob(blob);
        setState('stopped');
        stopTimer();

        // Clean up stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(100); // collect data every 100ms
      startTimeRef.current = Date.now();
      totalPausedRef.current = 0;
      pausedAtRef.current = 0;
      setState('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current - totalPausedRef.current) / 1000);
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Microphone access denied';
      setError(message);
    }
  }, [setState, setDuration, setBlob, setError, stopTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      pausedAtRef.current = Date.now();
      stopTimer();
      setState('paused_violation');
    }
  }, [setState, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      // Accumulate pause duration
      if (pausedAtRef.current > 0) {
        totalPausedRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = 0;
      }
      mediaRecorderRef.current.resume();
      setState('recording');
      // Resume timer (subtracts total paused time)
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current - totalPausedRef.current) / 1000);
      }, 100);
    }
  }, [setState, setDuration]);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const getAnalyserData = useCallback(() => {
    if (!analyserRef.current) return null;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);
    return dataArray;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopTimer]);

  return { startRecording, stopRecording, pauseRecording, resumeRecording, getAnalyser, getAnalyserData };
}
