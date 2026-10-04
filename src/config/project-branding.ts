/** Optional, project-owned accents used only where a case study opts into them. */
export const projectBranding: Record<string, {
  primary: string;
  hover: string;
  contrast: string;
  hoverContrast: string;
  support: string;
  darkSupport?: string;
}> = {
  'italy-pizza': {
    primary: '#FFA401',
    hover: '#BE292B',
    contrast: '#2B1810',
    hoverContrast: '#FFFAF0',
    support: '#2B1810',
  },
  'alojamiento-la-rueca': {
    primary: '#607753',
    hover: '#4F6844',
    contrast: '#FFFAF0',
    hoverContrast: '#FFFAF0',
    support: '#526A49',
    darkSupport: '#AFC49F',
  },
  'el-tiburon-de-la-costa': {
    primary: '#4C89EC',
    hover: '#2F68C4',
    contrast: '#171917',
    hoverContrast: '#FFFAF0',
    support: '#2D65B9',
    darkSupport: '#8EB8FA',
  },
};
