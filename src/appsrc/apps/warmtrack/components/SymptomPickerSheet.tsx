import React, { useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { AddSymptomDialog } from './AddSymptomDialog';
import { SymptomGridItem } from './SymptomGridItem';
import {
  buildCustomSymptomOption,
  DEFAULT_SYMPTOM_SECTIONS,
  normalizeCustomSymptomIconMap,
  normalizeSymptomIds,
  normalizeSymptomList,
  remapSymptomIdsForCustomChange,
} from '../symptoms';

interface SymptomPickerSheetProps {
  selectedSymptomIds: string[];
  customSymptoms: string[];
  customSymptomIcons: Record<string, string>;
  onCancel: () => void;
  onConfirm: (payload: {
    selectedSymptomIds: string[];
    customSymptoms: string[];
    customSymptomIcons: Record<string, string>;
  }) => void;
}

export const SymptomPickerSheet: React.FC<SymptomPickerSheetProps> = ({
  selectedSymptomIds,
  customSymptoms,
  customSymptomIcons,
  onCancel,
  onConfirm,
}) => {
  const [draftSelectedSymptomIds, setDraftSelectedSymptomIds] = useState<string[]>(() => normalizeSymptomIds(selectedSymptomIds));
  const [draftCustomSymptoms, setDraftCustomSymptoms] = useState<string[]>(() => normalizeSymptomList(customSymptoms));
  const [draftCustomSymptomIcons, setDraftCustomSymptomIcons] = useState<Record<string, string>>(() =>
    normalizeCustomSymptomIconMap(customSymptoms, customSymptomIcons)
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCustomEditMode, setIsCustomEditMode] = useState(false);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [customSymptomError, setCustomSymptomError] = useState('');
  const [customSymptomIconDataUrl, setCustomSymptomIconDataUrl] = useState('');
  const [customSymptomIconError, setCustomSymptomIconError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customSymptomOptions = useMemo(
    () => draftCustomSymptoms.map((item, index) => buildCustomSymptomOption(item, index, draftCustomSymptomIcons[item])),
    [draftCustomSymptoms, draftCustomSymptomIcons]
  );

  const sections = useMemo(
    () => [
      ...DEFAULT_SYMPTOM_SECTIONS,
      {
        id: 'more',
        title: '更多症状',
        symptoms: customSymptomOptions,
      },
    ],
    [customSymptomOptions]
  );

  const toggleSymptom = (symptomId: string) => {
    setDraftSelectedSymptomIds((current) => {
      if (current.includes(symptomId)) {
        return current.filter((item) => item !== symptomId);
      }
      return [...current, symptomId];
    });
  };

  const appendCustomSymptom = (normalized: string, iconDataUrl: string) => {
    setDraftCustomSymptoms((current) => {
      if (current.includes(normalized)) return current;
      const next = [...current, normalized];
      const nextId = buildCustomSymptomOption(normalized, next.length - 1).id;
      setDraftSelectedSymptomIds((selected) => {
        const remapped = remapSymptomIdsForCustomChange(selected, current, next);
        return remapped.includes(nextId) ? remapped : [...remapped, nextId];
      });
      if (iconDataUrl) {
        setDraftCustomSymptomIcons((currentIcons) => ({
          ...currentIcons,
          [normalized]: iconDataUrl,
        }));
      }
      return next;
    });
  };

  const removeCustomSymptom = (label: string) => {
    setDraftCustomSymptoms((current) => {
      const next = current.filter((item) => item !== label);
      if (next.length === current.length) return current;

      setDraftSelectedSymptomIds((selected) => remapSymptomIdsForCustomChange(selected, current, next));
      setDraftCustomSymptomIcons((currentIcons) => {
        const nextIcons = { ...currentIcons };
        delete nextIcons[label];
        return nextIcons;
      });
      if (next.length === 0) {
        setIsCustomEditMode(false);
      }
      return next;
    });
  };

  const openAddDialog = () => {
    setCustomSymptomInput('');
    setCustomSymptomError('');
    setCustomSymptomIconDataUrl('');
    setCustomSymptomIconError('');
    setIsAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    setCustomSymptomError('');
    setCustomSymptomIconError('');
    setCustomSymptomIconDataUrl('');
  };

  const handlePickCustomSymptomIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCustomSymptomIconError('请上传图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCustomSymptomIconError('图标图片请小于 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:image/')) {
        setCustomSymptomIconError('图片读取失败，请重试');
        return;
      }
      setCustomSymptomIconDataUrl(result);
      setCustomSymptomIconError('');
    };
    reader.onerror = () => {
      setCustomSymptomIconError('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  };

  const handleResetCustomSymptomIcon = () => {
    setCustomSymptomIconDataUrl('');
    setCustomSymptomIconError('');
  };

  const handleAddCustomSymptom = () => {
    const normalized = customSymptomInput.trim();
    if (!normalized) {
      setCustomSymptomError('请输入症状名称');
      return;
    }

    if (normalized.length > 8) {
      setCustomSymptomError('症状名称最多 8 个字');
      return;
    }

    if (draftCustomSymptoms.includes(normalized)) {
      setCustomSymptomError('该症状已存在');
      return;
    }

    appendCustomSymptom(normalized, customSymptomIconDataUrl);
    setIsAddDialogOpen(false);
    setCustomSymptomInput('');
    setCustomSymptomError('');
    setCustomSymptomIconDataUrl('');
    setCustomSymptomIconError('');
  };

  const handleConfirm = () => {
    const normalizedCustomSymptoms = normalizeSymptomList(draftCustomSymptoms);
    onConfirm({
      selectedSymptomIds: normalizeSymptomIds(draftSelectedSymptomIds),
      customSymptoms: normalizedCustomSymptoms,
      customSymptomIcons: normalizeCustomSymptomIconMap(normalizedCustomSymptoms, draftCustomSymptomIcons),
    });
  };

  return (
    <div className="absolute inset-0 z-[70] bg-[#efeff2]">
      <header className="h-14 mt-9 rounded-t-3xl bg-white px-4 flex items-center">
        <button type="button" onClick={onCancel} className="text-[16px] text-slate-700 active:opacity-70">
          取消
        </button>
        <h2 className="flex-1 text-center text-[20px] font-semibold text-slate-900">症状</h2>
        <button type="button" onClick={handleConfirm} className="text-[16px] font-semibold text-[#f24f8f] active:opacity-70">
          确定
        </button>
      </header>

      <div className="h-[calc(100%-92px)] overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <section key={section.id} className="mt-3 rounded-3xl bg-white px-3 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[19px] font-semibold text-slate-900">{section.title}</h3>
              {section.id === 'more' && draftCustomSymptoms.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsCustomEditMode((current) => !current)}
                  className={`h-8 min-w-14 px-3 rounded-full text-[13px] font-semibold transition-colors ${
                    isCustomEditMode ? 'bg-[#f24f8f] text-white' : 'border border-rose-200 text-[#f24f8f] bg-white'
                  }`}
                >
                  {isCustomEditMode ? '确定' : '编辑'}
                </button>
              ) : null}
            </div>
            {section.symptoms.length > 0 || section.id === 'more' ? (
              <div className="mt-3 grid grid-cols-4 gap-y-4">
                {section.symptoms.map((symptom) => {
                  const selected = draftSelectedSymptomIds.includes(symptom.id);
                  const isDeletingCustom = section.id === 'more' && isCustomEditMode;
                  return (
                    <SymptomGridItem
                      key={symptom.id}
                      symptom={symptom}
                      selected={selected}
                      isDeleteMode={isDeletingCustom}
                      onPress={() => {
                        if (isDeletingCustom) {
                          removeCustomSymptom(symptom.label);
                          return;
                        }
                        toggleSymptom(symptom.id);
                      }}
                    />
                  );
                })}

                {section.id === 'more' && !isCustomEditMode ? (
                  <button
                    type="button"
                    onClick={openAddDialog}
                    className="flex flex-col items-center active:scale-95 transition-transform"
                  >
                    <span className="w-[72px] h-[72px] rounded-full bg-slate-100 text-slate-400 grid place-items-center">
                      <Plus size={34} />
                    </span>
                    <span className="mt-2 text-[14px] text-slate-700">添加症状</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ))}
      </div>
      <AddSymptomDialog
        isOpen={isAddDialogOpen}
        fileInputRef={fileInputRef}
        iconDataUrl={customSymptomIconDataUrl}
        iconError={customSymptomIconError}
        inputValue={customSymptomInput}
        inputError={customSymptomError}
        onClose={closeAddDialog}
        onPickIcon={handlePickCustomSymptomIcon}
        onResetIcon={handleResetCustomSymptomIcon}
        onInputChange={(value) => {
          setCustomSymptomInput(value);
          if (customSymptomError) setCustomSymptomError('');
        }}
        onSubmit={handleAddCustomSymptom}
      />
    </div>
  );
};
