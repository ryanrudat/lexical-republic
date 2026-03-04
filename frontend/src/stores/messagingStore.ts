import { create } from 'zustand';
import type { CharacterMessage, CharacterMessageConfig, WeekConfig } from '../types/shiftQueue';
import { fetchMessages, createMessage, markRead, submitReply, getUnreadCount } from '../api/messages';

interface ActiveNotification {
  message: CharacterMessage;
  dismissTimer?: ReturnType<typeof setTimeout>;
}

interface MessagingState {
  messages: CharacterMessage[];
  unreadCount: number;
  isPanelOpen: boolean;
  activeNotification: ActiveNotification | null;
  loading: boolean;

  loadMessages: (weekNumber?: number) => Promise<void>;
  triggerMessage: (
    triggerType: string,
    context: { taskId?: string; weekNumber: number },
    weekConfig: WeekConfig
  ) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  sendReply: (id: string, reply: string) => Promise<void>;
  openPanel: () => void;
  closePanel: () => void;
  dismissNotification: () => void;
  refreshUnreadCount: () => Promise<void>;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  messages: [],
  unreadCount: 0,
  isPanelOpen: false,
  activeNotification: null,
  loading: false,

  loadMessages: async (weekNumber?: number) => {
    set({ loading: true });
    try {
      const { messages } = await fetchMessages(weekNumber);
      set({ messages, loading: false });
      // Also refresh unread count
      const { count } = await getUnreadCount();
      set({ unreadCount: count });
    } catch {
      set({ loading: false });
    }
  },

  triggerMessage: async (triggerType, context, weekConfig) => {
    const { messages } = get();

    // Find matching message configs
    const configs = weekConfig.characterMessages.filter(
      (mc: CharacterMessageConfig) =>
        mc.triggerType === triggerType &&
        (!mc.triggerConfig.taskId || mc.triggerConfig.taskId === context.taskId)
    );

    for (const config of configs) {
      // Dedup check: already created?
      const exists = messages.some(
        m =>
          m.characterName === config.characterName &&
          m.triggerType === triggerType &&
          m.weekNumber === context.weekNumber &&
          (m.triggerConfig as Record<string, unknown>)?.taskId === context.taskId
      );
      if (exists) continue;

      try {
        const newMsg = await createMessage({
          characterName: config.characterName,
          designation: config.designation,
          messageText: config.messageText,
          replyType: config.replyType,
          replyOptions: config.replyOptions,
          triggerType: config.triggerType,
          triggerConfig: { ...config.triggerConfig, taskId: context.taskId },
          weekNumber: context.weekNumber,
        });

        set(state => ({
          messages: [...state.messages, newMsg],
          unreadCount: state.unreadCount + 1,
        }));

        // Show notification toast
        const timer = setTimeout(() => {
          set(state => {
            if (state.activeNotification?.message.id === newMsg.id) {
              return { activeNotification: null };
            }
            return state;
          });
        }, 6000);

        set({ activeNotification: { message: newMsg, dismissTimer: timer } });
      } catch {
        // Silently fail — character messages are non-critical
      }
    }
  },

  markAsRead: async (id: string) => {
    try {
      const updated = await markRead(id);
      set(state => ({
        messages: state.messages.map(m => (m.id === id ? updated : m)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Silently fail
    }
  },

  sendReply: async (id: string, reply: string) => {
    try {
      const updated = await submitReply(id, reply);
      set(state => ({
        messages: state.messages.map(m => (m.id === id ? updated : m)),
      }));
    } catch {
      // Silently fail
    }
  },

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),

  dismissNotification: () => {
    const { activeNotification } = get();
    if (activeNotification?.dismissTimer) {
      clearTimeout(activeNotification.dismissTimer);
    }
    set({ activeNotification: null });
  },

  refreshUnreadCount: async () => {
    try {
      const { count } = await getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // Silently fail
    }
  },
}));
