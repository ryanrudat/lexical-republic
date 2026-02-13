import client from './client';

export interface PearlMessage {
  id: string;
  text: string;
  category: string;
}

export async function fetchPearlMessages() {
  const { data } = await client.get('/pearl/messages');
  return data.messages as PearlMessage[];
}
