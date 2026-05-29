export type Brand =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'alibaba'
  | 'moonshot'
  | 'minimax'
  | 'xai'
  | 'tsinghua'
  | 'deepseek'
  | 'stepfun'
  | 'openrouter';

export interface ModelEntry {
  id: string;            // OpenRouter slug
  label: string;         // What we display
}

export interface ModelGroup {
  brand: Brand;
  name: string;          // Section header text
  models: ModelEntry[];
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    brand: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'openai/gpt-5.5', label: 'gpt-5.5' },
      { id: 'openai/gpt-5.4', label: 'gpt-5.4' },
    ],
  },
  {
    brand: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'anthropic/claude-opus-4.8', label: 'opus-4.8' },
      { id: 'anthropic/claude-opus-4.7', label: 'opus-4.7' },
      { id: 'anthropic/claude-sonnet-4.6', label: 'sonnet-4.6' },
    ],
  },
  {
    brand: 'google',
    name: 'Google',
    models: [
      { id: 'google/gemini-3.5-flash', label: 'gemini-3.5-flash' },
      { id: 'google/gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
      { id: 'google/gemini-3.1-pro-preview', label: 'gemini-3.1-pro' },
      { id: 'google/gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite' },
    ],
  },
  {
    brand: 'alibaba',
    name: 'Alibaba',
    models: [
      { id: 'qwen/qwen3.7-max', label: 'qwen-3.7-max' },
      { id: 'qwen/qwen3.6-plus', label: 'qwen-3.6-plus' },
    ],
  },
  {
    brand: 'moonshot',
    name: 'Moonshot',
    models: [
      { id: 'moonshotai/kimi-k2.6', label: 'kimi-k2.6' },
      { id: 'moonshotai/kimi-k2.5', label: 'kimi-k2.5' },
    ],
  },
  {
    brand: 'minimax',
    name: 'MiMo (Xiaomi)',
    models: [
      { id: 'xiaomi/mimo-v2.5-pro', label: 'mimo-v2.5-pro' },
      { id: 'xiaomi/mimo-v2.5', label: 'mimo-v2.5' },
    ],
  },
  {
    brand: 'xai',
    name: 'xAI',
    models: [
      { id: 'x-ai/grok-4.3', label: 'grok-4.3' },
      { id: 'x-ai/grok-build-0.1', label: 'grok-build-0.1' },
    ],
  },
  {
    brand: 'tsinghua',
    name: 'Z.ai (GLM)',
    models: [
      { id: 'z-ai/glm-5.1', label: 'glm-5.1' },
      { id: 'z-ai/glm-5-turbo', label: 'glm-5-turbo' },
    ],
  },
  {
    brand: 'deepseek',
    name: 'Deepseek',
    models: [
      { id: 'deepseek/deepseek-v4-pro', label: 'deepseek-v4-pro' },
      { id: 'deepseek/deepseek-v4-flash', label: 'deepseek-v4-flash' },
    ],
  },
  {
    brand: 'stepfun',
    name: 'StepFun',
    models: [
      { id: 'stepfun/step-3.5-flash', label: 'step-3.5-flash' },
      { id: 'stepfun/step-3.7-flash', label: 'step-3.7-flash' },
    ],
  },
  {
    brand: 'openrouter',
    name: 'OpenRouter',
    models: [{ id: 'openrouter/owl-alpha', label: 'owl-alpha' }],
  },
];

export function findModelById(id: string): { entry: ModelEntry; group: ModelGroup } | null {
  for (const group of MODEL_GROUPS) {
    const entry = group.models.find((m) => m.id === id);
    if (entry) return { entry, group };
  }
  return null;
}
