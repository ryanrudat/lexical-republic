import { useInscriptionStore } from '../../../../stores/inscriptionStore';
import InscriptionLobby from './InscriptionLobby';
import InscriptionDrill from './InscriptionDrill';
import InscriptionResults from './InscriptionResults';
import WaitingRoom from './WaitingRoom';

export default function InscriptionApp() {
  const screen = useInscriptionStore((s) => s.screen);
  const classId = useInscriptionStore((s) => s.classId);

  if (screen === 'queue') return <WaitingRoom />;
  if (screen === 'drill' || screen === 'paused') return <InscriptionDrill />;
  if (screen === 'results') return <InscriptionResults />;
  return <InscriptionLobby classId={classId} />;
}
