export interface TemplateAppProps {
  onClose: () => void;
}

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
}

export interface TemplateState {
  items: TemplateItem[];
  isLoading: boolean;
  error: string | null;
}
