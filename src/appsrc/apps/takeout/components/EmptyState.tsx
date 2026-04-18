import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 px-4 py-10 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold text-gray-800">{title}</h3>
      {description && <p className="mt-2 max-w-xs text-xs text-gray-500">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white active:scale-95"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
