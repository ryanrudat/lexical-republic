import client from './client';

export async function uploadRecording(blob: Blob, duration: number, missionId?: string) {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  formData.append('duration', duration.toString());
  if (missionId) formData.append('missionId', missionId);

  const { data } = await client.post('/recordings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.recording;
}
