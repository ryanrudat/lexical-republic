import { create } from 'zustand';
import type { CharacterMessage, CharacterMessageConfig, ThreadEntry, WeekConfig } from '../types/shiftQueue';
import { fetchMessages, createMessage, markRead, submitReply, getUnreadCount, appendToThread as apiAppendToThread } from '../api/messages';

interface ActiveNotification {
  message: CharacterMessage;
  dismissTimer?: ReturnType<typeof setTimeout>;
}

interface MessagingState {
  messages: CharacterMessage[];
  unreadCount: number;
  isPanelOpen: boolean;
  selectedMessageId: string | null;
  /** When set, shows all messages from this character as a grouped conversation */
  selectedConversation: string | null;
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
  appendToThread: (messageId: string, text: string) => Promise<void>;
  addIncomingMessage: (message: CharacterMessage) => void;
  addIncomingThreadEntry: (messageId: string, entry: ThreadEntry) => void;
  openPanel: () => void;
  closePanel: () => void;
  selectMessage: (id: string) => void;
  selectConversation: (characterName: string) => void;
  backToInbox: () => void;
  dismissNotification: () => void;
  refreshUnreadCount: () => Promise<void>;
}

// Track in-flight message creation keys to prevent race-condition duplicates
const inFlightKeys = new Set<string>();

export const useMessagingStore = create<MessagingState>((set, get) => ({
  messages: [],
  unreadCount: 0,
  isPanelOpen: false,
  selectedMessageId: null,
  selectedConversation: null,
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
      // Show notification for most recent unread thread message (teacher direct message)
      // so students see a toast even if the message arrived while offline
      if (!get().activeNotification) {
        const unreadThread = [...messages]
          .filter(m => !m.isRead && m.replyType === 'thread')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (unreadThread) {
          set({ activeNotification: { message: unreadThread } });
        }
      }
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
      // Build dedup key
      const dedupKey = `${config.characterName}:${triggerType}:${context.weekNumber}:${context.taskId ?? ''}`;

      // Dedup check: already created or in-flight?
      if (inFlightKeys.has(dedupKey)) continue;
      const exists = messages.some(
        m =>
          m.characterName === config.characterName &&
          m.triggerType === triggerType &&
          m.weekNumber === context.weekNumber &&
          (m.triggerConfig as Record<string, unknown>)?.taskId === context.taskId
      );
      if (exists) continue;

      inFlightKeys.add(dedupKey);
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

        set(state => {
          // Guard: don't append if already present (loadMessages may have added it)
          if (state.messages.some(m => m.id === newMsg.id)) {
            return state;
          }
          return {
            messages: [...state.messages, newMsg],
            unreadCount: state.unreadCount + 1,
          };
        });

        // Show notification toast — stays until student clicks it
        set({ activeNotification: { message: newMsg } });
      } catch {
        // Silently fail — character messages are non-critical
        inFlightKeys.delete(dedupKey);
      }
    }
  },

  markAsRead: async (id: string) => {
    try {
      // Only decrement if the message is currently unread in our store
      const wasUnread = get().messages.find(m => m.id === id)?.isRead === false;
      const updated = await markRead(id);
      set(state => ({
        messages: state.messages.map(m => (m.id === id ? updated : m)),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
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

  appendToThread: async (messageId: string, text: string) => {
    try {
      const updated = await apiAppendToThread(messageId, text);
      set(state => ({
        messages: state.messages.map(m => (m.id === messageId ? updated : m)),
      }));
    } catch {
      // Silently fail
    }
  },

  addIncomingMessage: (message: CharacterMessage) => {
    set(state => {
      // Guard: don't append if already present
      if (state.messages.some(m => m.id === message.id)) return state;
      return {
        messages: [...state.messages, message],
        unreadCount: state.unreadCount + 1,
        activeNotification: { message },
      };
    });
  },

  addIncomingThreadEntry: (messageId: string, entry: ThreadEntry) => {
    set(state => {
      const msg = state.messages.find(m => m.id === messageId);
      if (!msg) return state;

      const currentThread = msg.thread ?? [];
      // Dedup: check if entry already exists
      if (currentThread.some(e => e.timestamp === entry.timestamp && e.text === entry.text)) {
        return state;
      }

      const updatedMsg: CharacterMessage = {
        ...msg,
        thread: [...currentThread, entry],
        isRead: false,
      };

      return {
        messages: state.messages.map(m => (m.id === messageId ? updatedMsg : m)),
        unreadCount: entry.sender === 'teacher' ? state.unreadCount + 1 : state.unreadCount,
      };
    });
  },

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => {
    set({ isPanelOpen: false, selectedMessageId: null, selectedConversation: null });
    // Sync unread count from backend when panel closes
    getUnreadCount().then(({ count }) => set({ unreadCount: count })).catch(() => {});
  },
  selectMessage: (id: string) => set({ selectedMessageId: id, selectedConversation: null }),
  selectConversation: (characterName: string) => set({ selectedConversation: characterName, selectedMessageId: null }),
  backToInbox: () => set({ selectedMessageId: null, selectedConversation: null }),

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
