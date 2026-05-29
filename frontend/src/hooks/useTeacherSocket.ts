import { useEffect } from 'react';
import { connectSocket, getSocket, onSocketStatus } from '../utils/socket';
import { useTeacherStore } from '../stores/teacherStore';
import type { OnlineStudent } from '../stores/teacherStore';
import type { ThreadEntry } from '../types/shiftQueue';

/** Payload shape emitted by `student:remediation-fired` (see backend/routes/remediation.ts). */
interface RemediationFiredPayload {
  pairId: string;
  designation: string | null;
  moduleId: string;
  weekNumber: number;
  triggerReason: string;
  concernAtTrigger: number;
  triggeredAt: string;
}

/** `student:remediation-completed` / `-clawback` both carry the post-event concern score. */
interface RemediationResolvePayload {
  pairId: string;
  newConcernScore?: number;
}

export function useTeacherSocket() {
  const setClassSnapshot = useTeacherStore((s) => s.setClassSnapshot);
  const upsertStudent = useTeacherStore((s) => s.upsertStudent);
  const removeStudent = useTeacherStore((s) => s.removeStudent);
  const purgeStudent = useTeacherStore((s) => s.purgeStudent);
  const setSocketStatus = useTeacherStore((s) => s.setSocketStatus);
  const bumpRegistrationTick = useTeacherStore((s) => s.bumpRegistrationTick);
  const setClassPaused = useTeacherStore((s) => s.setClassPaused);
  const appendClarityEntry = useTeacherStore((s) => s.appendClarityEntry);
  const bumpClarityReplyTick = useTeacherStore((s) => s.bumpClarityReplyTick);
  const incrementRemediation = useTeacherStore((s) => s.incrementRemediation);
  const flagRemediationClawback = useTeacherStore((s) => s.flagRemediationClawback);
  const setLiveConcern = useTeacherStore((s) => s.setLiveConcern);

  useEffect(() => {
    const sock = connectSocket();

    const onSnapshot = (students: OnlineStudent[]) => {
      setClassSnapshot(students);
    };
    const onConnected = (student: OnlineStudent) => {
      upsertStudent(student);
    };
    const onUpdated = (student: OnlineStudent) => {
      upsertStudent(student);
    };
    const onDisconnected = (data: { userId: string }) => {
      removeStudent(data.userId);
    };
    const onRegistered = () => {
      bumpRegistrationTick();
    };
    const onPauseState = (data: { paused: boolean }) => {
      setClassPaused(data.paused);
    };
    const onClarityReply = (data: { messageId: string; pairId: string; entry: ThreadEntry }) => {
      appendClarityEntry(data.pairId, data.messageId, data.entry);
      bumpClarityReplyTick();
    };
    const onDeleted = (data: { userId: string }) => {
      purgeStudent(data.userId);
    };
    const onRemediationFired = (data: RemediationFiredPayload) => {
      if (!data?.pairId || !data?.triggerReason) return;
      incrementRemediation(data.pairId, data.triggerReason);
    };
    const onRemediationCompleted = (data: RemediationResolvePayload) => {
      if (!data?.pairId) return;
      if (typeof data.newConcernScore === 'number') setLiveConcern(data.pairId, data.newConcernScore);
    };
    const onRemediationClawback = (data: RemediationResolvePayload) => {
      if (!data?.pairId) return;
      // The pedagogically interesting live signal: student resumed grinding.
      flagRemediationClawback(data.pairId);
      if (typeof data.newConcernScore === 'number') setLiveConcern(data.pairId, data.newConcernScore);
    };

    sock.on('teacher:class-snapshot', onSnapshot);
    sock.on('student:connected', onConnected);
    sock.on('student:status-updated', onUpdated);
    sock.on('student:disconnected', onDisconnected);
    sock.on('student:deleted', onDeleted);
    sock.on('student:registered', onRegistered);
    sock.on('teacher:pause-state', onPauseState);
    sock.on('teacher:clarity-reply', onClarityReply);
    sock.on('student:remediation-fired', onRemediationFired);
    sock.on('student:remediation-completed', onRemediationCompleted);
    sock.on('student:remediation-clawback', onRemediationClawback);

    // Track connection status
    const unsubStatus = onSocketStatus((status, error) => {
      setSocketStatus(status, error);
    });

    // Per-handler off() only — never call disconnectSocket() here. The socket is a shared singleton; destroying it wipes App.tsx listeners.
    return () => {
      const s = getSocket();
      if (s) {
        s.off('teacher:class-snapshot', onSnapshot);
        s.off('student:connected', onConnected);
        s.off('student:status-updated', onUpdated);
        s.off('student:disconnected', onDisconnected);
        s.off('student:deleted', onDeleted);
        s.off('student:registered', onRegistered);
        s.off('teacher:pause-state', onPauseState);
        s.off('teacher:clarity-reply', onClarityReply);
        s.off('student:remediation-fired', onRemediationFired);
        s.off('student:remediation-completed', onRemediationCompleted);
        s.off('student:remediation-clawback', onRemediationClawback);
      }
      unsubStatus();
    };
  }, [setClassSnapshot, upsertStudent, removeStudent, purgeStudent, setSocketStatus, bumpRegistrationTick, setClassPaused, appendClarityEntry, bumpClarityReplyTick, incrementRemediation, flagRemediationClawback, setLiveConcern]);
}
