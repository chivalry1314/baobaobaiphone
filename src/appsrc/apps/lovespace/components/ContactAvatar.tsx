import React from 'react';

import type { Contact } from '../../contacts/types';
import { getAvatarGradient, getNameInitial } from '../utils';

interface ContactAvatarProps {
  contact: Contact;
  sizeClassName?: string;
}

export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  contact,
  sizeClassName = 'w-12 h-12',
}) => {
  if (contact.avatar) {
    return (
      <img
        src={contact.avatar}
        alt={contact.name}
        className={`${sizeClassName} rounded-full object-cover border-2 border-white shadow-[0_8px_16px_-12px_rgba(15,23,42,0.45)]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} rounded-full bg-gradient-to-br ${getAvatarGradient(contact.name)} text-white border-2 border-white shadow-[0_8px_16px_-12px_rgba(15,23,42,0.45)] flex items-center justify-center text-sm font-semibold`}
    >
      {getNameInitial(contact.name)}
    </div>
  );
};
