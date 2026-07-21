import { WifiOff } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const OfflineBanner = () => {
  const isOffline = useUIStore(state => state.isOffline);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center text-sm font-medium z-50 shrink-0">
      <WifiOff className="w-4 h-4 mr-2" />
      You are offline. The app is in read-only mode.
    </div>
  );
};

export default OfflineBanner;
