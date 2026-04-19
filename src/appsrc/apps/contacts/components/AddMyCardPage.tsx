import React, { useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useMobileViewportPageStyle } from '../../../../core/mobileViewport';
import { TEXT } from '../constants';
import type { AddMyCardPayload, MyCard } from '../types';

interface AddMyCardPageProps {
  onBack: () => void;
  onSubmit: (payload: AddMyCardPayload) => void;
  initialCard?: MyCard;
  title?: string;
  submitLabel?: string;
}

export const AddMyCardPage: React.FC<AddMyCardPageProps> = ({
  onBack,
  onSubmit,
  initialCard,
  title = TEXT.addMyCard,
  submitLabel = TEXT.save,
}) => {
  const [avatar, setAvatar] = useState(initialCard?.avatar ?? '');
  const [name, setName] = useState(initialCard?.name ?? '');
  const [gender, setGender] = useState(initialCard?.gender ?? '');
  const [age, setAge] = useState(initialCard?.age ?? '');
  const [height, setHeight] = useState(initialCard?.height ?? '');
  const [weight, setWeight] = useState(initialCard?.weight ?? '');
  const [wechatId, setWechatId] = useState(initialCard?.wechatId ?? '');
  const [phone, setPhone] = useState(initialCard?.phone ?? '');
  const [introduction, setIntroduction] = useState(initialCard?.introduction ?? '');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageStyle = useMobileViewportPageStyle(false);
  const isFormValid = name.trim().length > 0;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = image.width;
        let height = image.height;

        if (width > height && width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else if (height >= width && height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return;

        context.drawImage(image, 0, 0, width, height);
        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.src = String(loadEvent.target?.result ?? '');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!isFormValid) return;

    onSubmit({
      avatar: avatar.trim(),
      name: name.trim(),
      gender: gender.trim(),
      age: age.trim(),
      height: height.trim(),
      weight: weight.trim(),
      wechatId: wechatId.trim(),
      phone: phone.trim(),
      introduction: introduction.trim(),
    });
  };

  return (
    <div
      className="absolute left-0 right-0 z-[91] bg-white flex min-h-0 flex-col overflow-hidden"
      style={pageStyle}
    >
      <div className="sticky top-0 z-20 px-5 pt-11 pb-3 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
        <button onClick={onBack} className="text-[15px] font-medium text-slate-600">
          {TEXT.cancel}
        </button>
        <h3 className="text-[18px] font-semibold text-slate-900">{title}</h3>
        <button
          onClick={handleSave}
          disabled={!isFormValid}
          className={`text-[15px] font-semibold ${isFormValid ? 'text-[#1E64D8]' : 'text-slate-300'}`}
        >
          {submitLabel}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 pb-8 pt-4 space-y-3">
        <div className="flex flex-col items-center mb-1">
          <button
            onClick={handleAvatarClick}
            className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400"
          >
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={34} />
            )}
          </button>
          <span className="text-[12px] text-slate-500 mt-2">{TEXT.setAvatar}</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={`${TEXT.name} *`}
          className="w-full h-12 rounded-xl bg-slate-100 px-4 text-[16px] outline-none"
        />

        <input
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          placeholder={TEXT.gender}
          className="w-full h-12 rounded-xl bg-slate-100 px-4 text-[16px] outline-none"
        />

        <div className="grid grid-cols-3 gap-3">
          <input
            value={age}
            onChange={(event) => setAge(event.target.value)}
            placeholder={TEXT.age}
            className="w-full h-12 rounded-xl bg-slate-100 px-3 text-[16px] outline-none"
          />
          <input
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder={TEXT.height}
            className="w-full h-12 rounded-xl bg-slate-100 px-3 text-[16px] outline-none"
          />
          <input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder={TEXT.weight}
            className="w-full h-12 rounded-xl bg-slate-100 px-3 text-[16px] outline-none"
          />
        </div>

        <input
          value={wechatId}
          onChange={(event) => setWechatId(event.target.value)}
          placeholder={TEXT.wechatId}
          className="w-full h-12 rounded-xl bg-slate-100 px-4 text-[16px] outline-none"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={TEXT.phoneNumber}
          className="w-full h-12 rounded-xl bg-slate-100 px-4 text-[16px] outline-none"
        />
        <textarea
          value={introduction}
          onChange={(event) => setIntroduction(event.target.value)}
          placeholder={TEXT.introduction}
          className="w-full min-h-[140px] rounded-xl bg-slate-100 px-4 py-3 text-[16px] outline-none resize-none"
        />
      </div>
    </div>
  );
};
