// View system types for the three-view architecture

export type ViewMode = 'office' | 'terminal' | 'dialogue';

export type TerminalApp =
  | 'desktop'
  | 'clarity-queue'
  | 'harmony'
  | 'duty-roster'
  | 'my-file'
  | 'inscription-pool';

export type TransitionType = 'enter-terminal' | 'exit-terminal' | 'none';
