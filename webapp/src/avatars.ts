export type AvatarOption = {
    id: string;
    label: string;
    src: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
    { id: 'elf', label: 'Elfo', src: '/avatars/avatar-elf.png' },
    { id: 'monk', label: 'Monje', src: '/avatars/avatar-monk.png' },
    { id: 'nurse', label: 'Sanadora', src: '/avatars/avatar-nurse.png' },
    { id: 'knight', label: 'Caballero', src: '/avatars/avatar-knight.png' },
    { id: 'ninja', label: 'Ninja', src: '/avatars/avatar-ninja.png' },
    { id: 'wizard', label: 'Mago', src: '/avatars/avatar-wizard.png' },
];

export const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0].id;

export function getAvatarById(avatarId: string): AvatarOption {
    return AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId) ?? AVATAR_OPTIONS[0];
}
