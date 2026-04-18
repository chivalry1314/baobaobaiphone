import React from 'react';

export interface LoadingProps {
  fullScreen?: boolean;
  overlay?: boolean;
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Loading: React.FC<LoadingProps> = ({
  fullScreen = false,
  overlay = false,
  text = '加载中...',
  size = 'medium',
}) => {
  const sizeClass = `loading-${size}`;

  const content = (
    <div className={`loading-content ${sizeClass}`}>
      <div className="loading-spinner"></div>
      {text && <div className="loading-text">{text}</div>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  if (overlay) {
    return (
      <div className="loading-overlay">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;
