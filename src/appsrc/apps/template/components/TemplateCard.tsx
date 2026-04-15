import React from 'react';

interface TemplateCardProps {
  title: string;
  description: string;
  onClick?: () => void;
  className?: string;
}

/**
 * 示例子组件
 *
 * 组件内样式规范：
 * - 使用 Tailwind 原子类
 * - 避免在此组件目录创建额外的 CSS 文件
 * - 如需复杂样式，使用 props.className 传入或 CSS Modules
 */
export const TemplateCard: React.FC<TemplateCardProps> = ({
  title,
  description,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white/80 backdrop-blur-sm rounded-2xl border border-white/80 p-4 cursor-pointer active:scale-[0.98] transition-transform shadow-sm ${className ?? ''}`}
    >
      <h3 className="text-slate-800 font-medium text-[15px] mb-1">{title}</h3>
      <p className="text-slate-500 text-[13px]">{description}</p>
    </div>
  );
};
