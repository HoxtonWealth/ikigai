export type Phase =
  | 'welcome'
  | 'love'
  | 'good_at'
  | 'world_needs'
  | 'paid_for'
  | 'synthesizing'
  | 'results';

export type CoachingPhase = Exclude<Phase, 'welcome' | 'synthesizing' | 'results'>;

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type SessionState = {
  phase: Phase;
  messages: Message[];
  currentPhaseMessages: number;
  isCoachSpeaking: boolean;
  isUserSpeaking: boolean;
  isLoading: boolean;
  synthesis: IkigaiSynthesis | null;
  error: 'chat' | 'synthesis' | null;
};

export type IkigaiSynthesis = {
  love: string[];
  goodAt: string[];
  worldNeeds: string[];
  paidFor: string[];
  ikigaiStatement: string;
  fullSynthesis: string;
};
