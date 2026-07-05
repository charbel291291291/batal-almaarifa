/** أنواع «بطل المعرفة» — نموذج البيانات الكامل */

export type QuestionType = 'direct' | 'mcq' | 'boolean' | 'complete' | 'clues' | 'audio' | 'image';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type CategoryId =
  | 'general'
  | 'history'
  | 'geography'
  | 'science'
  | 'arabic'
  | 'sports'
  | 'technology'
  | 'lebanon'
  | 'arab_world'
  | 'riddles'
  | 'literature'
  | 'movies'
  | 'music'
  | 'psychology'
  | 'medicine'
  | 'religion_culture'
  | 'capitals'
  | 'famous'
  | 'food'
  | 'business'
  | 'logic'
  | 'fast_math';

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  general: 'ثقافة عامة',
  history: 'تاريخ',
  geography: 'جغرافيا',
  science: 'علوم',
  arabic: 'لغة عربية',
  sports: 'رياضة',
  technology: 'تكنولوجيا',
  lebanon: 'لبنان',
  arab_world: 'العالم العربي',
  riddles: 'ألغاز',
  literature: 'أدب',
  movies: 'أفلام ومسلسلات',
  music: 'موسيقى',
  psychology: 'علم نفس',
  medicine: 'طب أساسي',
  religion_culture: 'دين وثقافة',
  capitals: 'عواصم العالم',
  famous: 'مشاهير',
  food: 'طعام',
  business: 'أعمال وعلامات',
  logic: 'منطق',
  fast_math: 'حساب سريع',
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryId[];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
  expert: 'خبير',
};

export interface Question {
  id: string;
  type: QuestionType;
  question_text: string;
  answer: string;
  /** صيغ إضافية مقبولة للإجابة المباشرة */
  accepted_answers: string[];
  /** خيارات خاطئة تُستخدم في نمط الاختيارات */
  wrong_answers: string[];
  category: CategoryId;
  difficulty: Difficulty;
  explanation?: string;
  source_note?: string;
  /** تلميحات متتالية لأسئلة «خمّن من التلميحات» */
  clues?: string[];
  /** رابط صورة أو مقطع صوتي للأسئلة المرئية/الصوتية */
  media_url?: string;
  time_limit_seconds: number;
  points: number;
  language: 'ar';
  tags: string[];
  created_by?: string;
  review_status?: 'approved' | 'pending' | 'rejected';
}

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  /** مفتاح لوحة المفاتيح لجرس هذا اللاعب (وضع الحفلة المحلية) */
  buzzKey: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  correctByDifficulty: Record<Difficulty, number>;
  bestStreak: number;
  currentStreak: number;
  fastestAnswerMs: number | null;
  eliminated: boolean;
}

export type ScoreReason =
  | 'correct'
  | 'speed_bonus'
  | 'wrong_penalty'
  | 'chain_banked'
  | 'chain_completed'
  | 'duel_win'
  | 'steal'
  | 'host_adjust';

export interface ScoreEvent {
  player_id: string;
  round_id: RoundId;
  question_id: string;
  old_score: number;
  score_delta: number;
  new_score: number;
  reason: ScoreReason;
  timestamp: number;
}

export type RoundId = 'r1' | 'r2' | 'r3' | 'r4' | 'r5';

export interface RoundMeta {
  id: RoundId;
  title: string;
  subtitle: string;
  rules: string[];
}

export const ROUNDS: RoundMeta[] = [
  {
    id: 'r1',
    title: 'الانطلاقة',
    subtitle: 'جولة الإحماء — أجب بسرعة واجمع النقاط',
    rules: [
      'كل لاعب يجيب على أسئلته بالدور.',
      'الإجابة الصحيحة = 10 نقاط.',
      'إجابة خلال 3 ثوانٍ = +5 نقاط سرعة.',
      'الإجابة الخاطئة = 0 (لا خصم).',
    ],
  },
  {
    id: 'r2',
    title: 'من يسبق؟',
    subtitle: 'سباق الجرس — السؤال يظهر كلمة كلمة',
    rules: [
      'السؤال يُكشف تدريجياً... اضغط الجرس متى عرفت الإجابة!',
      'أول من يضغط يحصل على 7 ثوانٍ للإجابة.',
      'إجابة صحيحة = 20 نقطة.',
      'إجابة خاطئة = -5 وينفتح الجرس للبقية.',
    ],
  },
  {
    id: 'r3',
    title: 'السلسلة الذهبية',
    subtitle: 'ابنِ سلسلتك — أو ثبّت نقاطك قبل فوات الأوان',
    rules: [
      'لكل لاعب سلسلة أسئلة خاصة: 10 ثم 20 ثم 30 ثم 40.',
      'الإجابة الخاطئة تكسر السلسلة وتخسر النقاط غير المثبّتة.',
      'يمكنك قول «ثبّت النقاط» مرة واحدة لحفظ رصيد السلسلة.',
      'أكمل السلسلة كاملة لتحصد كل النقاط.',
    ],
  },
  {
    id: 'r4',
    title: 'المواجهة',
    subtitle: 'مواجهة فاصلة — الخاسر يغادر المنافسة',
    rules: [
      'أدنى لاعبَين نقاطاً يتواجهان وجهاً لوجه.',
      '5 أسئلة: أسرع إجابة صحيحة تأخذ النقطة (+10).',
      'الخطأ يعطي الخصم فرصة السؤال.',
      'التعادل = سؤال موت مفاجئ. الخاسر يُقصى!',
    ],
  },
  {
    id: 'r5',
    title: 'النهائي',
    subtitle: 'قمة المعرفة — أول من يبلغ 100 نقطة نهائية يتوّج',
    rules: [
      'أفضل لاعبَين يتنافسان على اللقب.',
      'كل لاعب يختار فئة قوة لنفسه... وفئة صعبة لخصمه!',
      'إجابة صحيحة = 30. الخطأ يفتح «خطف» للخصم بـ 15.',
      'أول من يصل إلى 100 نقطة نهائية هو بطل المعرفة.',
    ],
  },
];

/** نبرة تعليقات المقدّم */
export type HostTone = 'fusha' | 'lebanese';

export interface GameSettings {
  players: { name: string; avatar: string }[];
  categories: CategoryId[];
  difficulties: Difficulty[];
  /** عدد أسئلة كل لاعب في جولة الانطلاقة */
  r1QuestionsPerPlayer: number;
  /** عدد أسئلة جولة الجرس */
  r2Questions: number;
  /** طول السلسلة الذهبية */
  r3ChainLength: number;
  /** مضاعف زمن السؤال: 0.7 سريع، 1 عادي، 1.4 هادئ */
  timerSpeed: number;
  /** auto = حسب نوع السؤال، options = خيارات دائماً */
  answerMode: 'auto' | 'options';
  tone: HostTone;
  soundOn: boolean;
}

export interface AnswerResult {
  playerId: string | null;
  correct: boolean;
  timedOut: boolean;
  correctAnswer: string;
  delta: number;
  explanation?: string;
  /** نص تشويقي يظهر للاعبين */
  hostLine: string;
}

/** حالة كل مرحلة داخل اللعبة — آلة حالات صريحة */
export type Phase =
  | { kind: 'intro'; round: RoundId }
  | {
      kind: 'r1';
      stage: 'question' | 'feedback';
      queue: { playerId: string; question: Question }[];
      index: number;
      lastResult: AnswerResult | null;
    }
  | {
      kind: 'r2';
      stage: 'reveal' | 'answering' | 'feedback';
      questions: Question[];
      index: number;
      wordsRevealed: number;
      lockedOut: string[];
      buzzedPlayerId: string | null;
      lastResult: AnswerResult | null;
    }
  | {
      kind: 'r3';
      stage: 'turn-intro' | 'question' | 'feedback' | 'turn-end';
      playerOrder: string[];
      turnIndex: number;
      chain: Question[];
      chainIndex: number;
      pot: number;
      banked: boolean;
      lastResult: AnswerResult | null;
      turnSummary: string | null;
    }
  | {
      kind: 'r4';
      stage: 'duel-intro' | 'buzz' | 'answering' | 'feedback' | 'duel-end';
      duelists: [string, string];
      questions: Question[];
      index: number;
      wins: Record<string, number>;
      lockedOut: string[];
      buzzedPlayerId: string | null;
      suddenDeath: boolean;
      lastResult: AnswerResult | null;
      duelSummary: string | null;
      eliminatedId: string | null;
    }
  | {
      kind: 'r5';
      stage: 'category-pick' | 'question' | 'steal' | 'feedback' | 'done';
      finalists: [string, string];
      offered: CategoryId[];
      /** ترتيب الاختيار: 0=الأول لنفسه، 1=الأول لخصمه، 2=الثاني لنفسه، 3=الثاني لخصمه */
      pickTurn: number;
      picks: Record<string, { self?: CategoryId; forOpponent?: CategoryId }>;
      finalScores: Record<string, number>;
      questionCount: number;
      question: Question | null;
      stealerId: string | null;
      lastResult: AnswerResult | null;
      doneSummary: string | null;
    }
  | { kind: 'results'; roundJustEnded: RoundId }
  | { kind: 'champion' };

export interface GameState {
  settings: GameSettings;
  players: PlayerState[];
  phase: Phase;
  scoreEvents: ScoreEvent[];
  usedQuestionIds: string[];
  /** فائز النهائي — يحسم اللقب بغضّ النظر عن مجموع النقاط */
  finalWinnerId: string | null;
  startedAt: number;
}

export type GameAction =
  | { type: 'ADVANCE' }
  | { type: 'ANSWER'; value: string; elapsedMs: number }
  | { type: 'TIMEOUT' }
  | { type: 'BUZZ'; playerId: string }
  | { type: 'REVEAL_WORD' }
  | { type: 'BANK' }
  | { type: 'PICK_CATEGORY'; category: CategoryId };

/* ---------- أنواع الأونلاين والحزم (v2 — للوحة الإدارة المستقبلية) ---------- */

export interface QuestionPack {
  id: string;
  title: string;
  description?: string;
  owner_id?: string;
  is_public: boolean;
  is_premium: boolean;
  questions: Question[];
  created_at: string;
}

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  mode: 'party' | 'host' | 'online' | 'creator';
  settings: GameSettings;
  status: 'lobby' | 'playing' | 'finished' | 'abandoned';
  created_at: string;
}

export interface AnswerSubmission {
  id: string;
  room_id: string;
  question_id: string;
  player_id: string;
  raw_answer: string;
  normalized_answer: string;
  is_correct: boolean | null;
  validated_by: 'auto' | 'host' | null;
  elapsed_ms: number;
  created_at: string;
}

export interface BuzzerEvent {
  id: string;
  room_id: string;
  question_id: string;
  player_id: string;
  server_ts: string;
  accepted: boolean;
}

export type HostAction =
  | { type: 'accept_answer'; player_id: string; question_id: string }
  | { type: 'reject_answer'; player_id: string; question_id: string }
  | { type: 'skip_question'; question_id: string }
  | { type: 'reveal_answer'; question_id: string }
  | { type: 'adjust_score'; player_id: string; delta: number; note?: string }
  | { type: 'mute_player'; player_id: string; muted: boolean }
  | { type: 'pause_game'; paused: boolean }
  | { type: 'end_round' };
