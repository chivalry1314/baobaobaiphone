import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  image?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title,
  description,
  action,
  image,
}) => {
  return (
    <div className="empty-state">
      {image ? (
        <img src={image} alt="empty" className="empty-image" />
      ) : (
        <div className="empty-icon">{icon}</div>
      )}
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
