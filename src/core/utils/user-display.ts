interface UserLike {
  display?: string;
  username?: string;
  person?: { display?: string };
}

export function getUserName(user?: UserLike | null): string {
  return user?.person?.display ?? user?.display ?? '';
}

export function getUserOptionLabel(user?: UserLike | null): string {
  const name = getUserName(user);
  const username = user?.username;
  if (!username || username === name) {
    return name;
  }
  return name ? `${name} (${username})` : username;
}
