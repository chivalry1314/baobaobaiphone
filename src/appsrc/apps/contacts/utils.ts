const AVATAR_BG_PALETTE = ['bg-slate-300', 'bg-blue-200', 'bg-emerald-200', 'bg-purple-200', 'bg-amber-200'];

export const getInitial = (name: string): string => {
  const first = name.trim().slice(0, 1).toUpperCase();
  return first || '#';
};

export const getGroupKey = (name: string): string => {
  const first = getInitial(name);
  return /^[A-Z]$/.test(first) ? first : '#';
};

export const getAvatarColor = (name: string): string => {
  const seed = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_BG_PALETTE[seed % AVATAR_BG_PALETTE.length];
};

export const formatMonthDay = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
