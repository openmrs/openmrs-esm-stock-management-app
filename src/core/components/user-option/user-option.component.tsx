import React from 'react';
import { getUserOptionLabel } from '../../utils/user-display';

interface UserOptionProps {
  username?: string;
  display?: string;
  person?: { display?: string };
}

const UserOption: React.FC<UserOptionProps> = (user) => <span>{getUserOptionLabel(user)}</span>;

export default UserOption;
