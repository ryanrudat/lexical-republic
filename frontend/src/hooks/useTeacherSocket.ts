import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';
import { useTeacherStore } from '../stores/teacherStore';
import type { OnlineStudent } from '../stores/teacherStore';

export function useTeacherSocket() {
  const setClassSnapshot = useTeacherStore((s) => s.setClassSnapshot);
  const upsertStudent = useTeacherStore((s) => s.upsertStudent);
  const removeStudent = useTeacherStore((s) => s.removeStudent);

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

    sock.on('teacher:class-snapshot', onSnapshot);
    sock.on('student:connected', onConnected);
    sock.on('student:status-updated', onUpdated);
    sock.on('student:disconnected', onDisconnected);

    return () => {
      const s = getSocket();
      if (s) {
        s.off('teacher:class-snapshot', onSnapshot);
        s.off('student:connected', onConnected);
        s.off('student:status-updated', onUpdated);
        s.off('student:disconnected', onDisconnected);
      }
      disconnectSocket();
    };
  }, [setClassSnapshot, upsertStudent, removeStudent]);
}
