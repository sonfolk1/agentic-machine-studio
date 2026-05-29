import React from 'react';
import type { Brand } from '@/lib/models';

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
});

// Anthropic — splat-like asterisk
export const AnthropicIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M7.4 4.5h2.8l3.6 9.4 3.7-9.4h2.4L15.1 19.5h-2.6L8.7 9.6 4.9 19.5H2.4L7.4 4.5z"
      fill="currentColor"
    />
  </svg>
);

// OpenAI — knot mark approximation
export const OpenAIIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M21.5 10.2a5.4 5.4 0 0 0-.5-4.5 5.5 5.5 0 0 0-5.9-2.6 5.5 5.5 0 0 0-4.2-1.9 5.5 5.5 0 0 0-5.2 3.8 5.5 5.5 0 0 0-3.7 2.6 5.5 5.5 0 0 0 .7 6.5 5.5 5.5 0 0 0 .5 4.5 5.5 5.5 0 0 0 5.9 2.6 5.5 5.5 0 0 0 4.2 1.9 5.5 5.5 0 0 0 5.2-3.8 5.5 5.5 0 0 0 3.7-2.6 5.5 5.5 0 0 0-.7-6.5zM13 20.2a4.1 4.1 0 0 1-2.6-1l.1-.1 4.4-2.6c.2-.1.4-.4.4-.6V9.5l1.9 1.1v5.3c0 2.4-1.9 4.3-4.2 4.3zM4 16.4a4.1 4.1 0 0 1-.5-2.9l.1.1 4.4 2.6c.2.1.5.1.7 0l5.4-3.1v2.2L9.6 18a4.1 4.1 0 0 1-5.6-1.6zM2.9 8.5a4.1 4.1 0 0 1 2.1-1.8V12c0 .2.1.5.4.6l5.4 3.1-1.9 1.1L4.5 14a4.1 4.1 0 0 1-1.6-5.5zm15.7 3.7-5.4-3.1 1.9-1.1 4.4 2.6a4.1 4.1 0 0 1-.6 7.4V12.8a.7.7 0 0 0-.3-.6zm1.9-2.8-.1-.1-4.4-2.6c-.2-.1-.5-.1-.7 0L9.8 9.8V7.6L14.4 5a4.1 4.1 0 0 1 6.1 5.4zM8.8 13.5l-1.9-1.1V7.1A4.1 4.1 0 0 1 14 4l-.1.1-4.4 2.6c-.2.1-.4.4-.4.6l-.3 6.2zm1-2.2L12 9.9l2.2 1.3v2.6L12 15.1l-2.2-1.3v-2.5z"
      fill="currentColor"
    />
  </svg>
);

// Google Gemini — 4-point spark
export const GeminiIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M12 2c.4 4.7 3.3 7.6 8 8-4.7.4-7.6 3.3-8 8-.4-4.7-3.3-7.6-8-8 4.7-.4 7.6-3.3 8-8z"
      fill="currentColor"
    />
  </svg>
);

// xAI Grok — angular X
export const XAIIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M3 4h3.6l4 5.2L14.6 4H18l-5.7 7.4L18.4 20h-3.6l-4.4-5.8L5.6 20H2.2L8.5 11.4 3 4z"
      fill="currentColor"
    />
  </svg>
);

// Deepseek — whale/wave silhouette stylized as 'D'
export const DeepseekIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M4 6c2-2 5-3 8-3 5 0 9 4 9 9s-4 9-9 9c-3 0-6-1-8-3 3 0 5-1 7-3-3 0-5-2-5-5s2-5 5-5c-2-1-4-1-7-1z"
      fill="currentColor"
    />
    <circle cx="14" cy="11" r="1.2" fill="currentColor" />
  </svg>
);

// Alibaba Qwen — Q
export const QwenIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

// Moonshot — crescent moon
export const MoonshotIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"
      fill="currentColor"
    />
  </svg>
);

// MiniMax — bracketed M
export const MiniMaxIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M3 5h2.2v14H3V5zm15.8 0H21v14h-2.2V5zM6.6 5h2.4l3 5.6L15 5h2.4v14H15V9.5l-2.6 4.8h-.8L9 9.5V19H6.6V5z"
      fill="currentColor"
    />
  </svg>
);

// Tsinghua GLM — hex glyph
export const GLMIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// OpenRouter Owl — stylised owl face with two big eyes
export const OwlIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <path
      d="M5 4l2.6 3.4a7 7 0 0 1 8.8 0L19 4l-.7 4.2A7.6 7.6 0 1 1 5.7 8.2L5 4z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="9.2" cy="13" r="2.4" stroke="currentColor" strokeWidth="1.6" fill="none" />
    <circle cx="14.8" cy="13" r="2.4" stroke="currentColor" strokeWidth="1.6" fill="none" />
    <circle cx="9.2" cy="13" r="0.9" fill="currentColor" />
    <circle cx="14.8" cy="13" r="0.9" fill="currentColor" />
    <path d="M11.2 16.4 12 17.8l.8-1.4z" fill="currentColor" />
  </svg>
);

// StepFun — three ascending steps
export const StepFunIcon: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest}>
    <rect x="3" y="14.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
    <rect x="9.25" y="9.25" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
    <rect x="15.5" y="4" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
  </svg>
);

export const BrandIcon: React.FC<Props & { brand: Brand }> = ({ brand, ...rest }) => {
  switch (brand) {
    case 'anthropic': return <AnthropicIcon {...rest} />;
    case 'openai': return <OpenAIIcon {...rest} />;
    case 'google': return <GeminiIcon {...rest} />;
    case 'xai': return <XAIIcon {...rest} />;
    case 'deepseek': return <DeepseekIcon {...rest} />;
    case 'alibaba': return <QwenIcon {...rest} />;
    case 'moonshot': return <MoonshotIcon {...rest} />;
    case 'minimax': return <MiniMaxIcon {...rest} />;
    case 'tsinghua': return <GLMIcon {...rest} />;
    case 'stepfun': return <StepFunIcon {...rest} />;
    case 'openrouter': return <OwlIcon {...rest} />;
  }
};

// Generic UI icons used elsewhere
export const IconChat: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
  </svg>
);

export const IconCowork: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M3 20c0-2.8 2.2-5 5-5M21 20c0-2.8-2.2-5-5-5" />
  </svg>
);

export const IconCode: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6 2 12l6 6M16 6l6 6-6 6M14 4l-4 16" />
  </svg>
);

export const IconCog: React.FC<Props> = ({ size = 16, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const IconSend: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const IconCheck: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

export const IconX: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconFolder: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5z" />
  </svg>
);

export const IconSpark: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} fill="currentColor">
    <path d="M12 2l1.6 5.8L19 9.4l-5.4 1.6L12 16l-1.6-5L5 9.4l5.4-1.6L12 2z" />
  </svg>
);

export const IconTerminal: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4" width="19" height="16" rx="2" />
    <path d="M6 9l3 3-3 3M12 15h5" />
  </svg>
);

export const IconFile: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
    <path d="M14 3v6h6" />
  </svg>
);

export const IconChevronDown: React.FC<Props> = ({ size = 12, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Sliders — used for the "Other" (bring-your-own model) section
export const IconSliders: React.FC<Props> = ({ size = 14, ...rest }) => (
  <svg {...base(size)} {...rest} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h16M4 16h16" />
    <circle cx="10" cy="8" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="15" cy="16" r="2.4" fill="currentColor" stroke="none" />
  </svg>
);
