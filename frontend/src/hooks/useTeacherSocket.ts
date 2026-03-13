import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket, onSocketStatus } from '../utils/socket';
import { useTeacherStore } from '../stores/teacherStore';
import type { OnlineStudent } from '../stores/teacherStore';
import type { ThreadEntry } from '../types/shiftQueue';

export function useTeacherSocket() {
  const setClassSnapshot = useTeacherStore((s) => s.setClassSnapshot);
  const upsertStudent = useTeacherStore((s) => s.upsertStudent);
  const removeStudent = useTeacherStore((s) => s.removeStudent);
  const setSocketStatus = useTeacherStore((s) => s.setSocketStatus);
  const bumpRegistrationTick = useTeacherStore((s) => s.bumpRegistrationTick);
  const setClassPaused = useTeacherStore((s) => s.setClassPaused);
  const appendClarityEntry = useTeacherStore((s) => s.appendClarityEntry);
  const bumpClarityReplyTick = useTeacherStore((s) => s.bumpClarityReplyTick);

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

    sock.on('teacher:class-snapshot', onSnapshot);
    sock.on('student:connected', onConnected);
    sock.on('student:status-updated', onUpdated);
    sock.on('student:disconnected', onDisconnected);
    sock.on('student:registered', onRegistered);
    sock.on('teacher:pause-state', onPauseState);
    sock.on('teacher:clarity-reply', onClarityReply);

    // Track connection status
    const unsubStatus = onSocketStatus((status, error) => {
      setSocketStatus(status, error);
    });

    return () => {
      const s = getSocket();
      if (s) {
        s.off('teacher:class-snapshot', onSnapshot);
        s.off('student:connected', onConnected);
        s.off('student:status-updated', onUpdated);
        s.off('student:disconnected', onDisconnected);
        s.off('student:registered', onRegistered);
        s.off('teacher:pause-state', onPauseState);
        s.off('teacher:clarity-reply', onClarityReply);
      }
      unsubStatus();
      disconnectSocket();
    };
  }, [setClassSnapshot, upsertStudent, removeStudent, setSocketStatus, bumpRegistrationTick, setClassPaused, appendClarityEntry, bumpClarityReplyTick]);
}
