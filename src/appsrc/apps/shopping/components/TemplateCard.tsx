import React from 'react';

interface TemplateCardProps {
  title: string;
  description: string;
  onClick?: () => void;
}

/**
 * 示例组件
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
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <h3 className="text-white font-medium text-[15px] mb-1">{title}</h3>
      <p className="text-white/60 text-[13px]">{description}</p>
    </div>
  );
};
