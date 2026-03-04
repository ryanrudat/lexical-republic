import { useMessagingStore } from '../../stores/messagingStore';

export default function MessageBadge() {
  const unreadCount = useMessagingStore((s) => s.unreadCount);

  if (unreadCount <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-neon-pink text-white text-[9px] font-ibm-mono flex items-center justify-center px-1 leading-none">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}
