import { describe, expect, it } from 'vitest';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID, getAvatarById } from '../avatars';

describe('avatars', () => {
    it('expone un avatar por defecto valido', () => {
        expect(DEFAULT_AVATAR_ID).toBe(AVATAR_OPTIONS[0].id);
        expect(getAvatarById(DEFAULT_AVATAR_ID)).toEqual(AVATAR_OPTIONS[0]);
    });

    it('devuelve el avatar correcto cuando el id existe', () => {
        expect(getAvatarById('wizard')).toEqual(
            expect.objectContaining({
                id: 'wizard',
                label: 'Mago',
                src: '/avatars/avatar-wizard.png',
            }),
        );
    });

    it('hace fallback al avatar por defecto cuando el id no existe', () => {
        expect(getAvatarById('unknown-avatar')).toEqual(AVATAR_OPTIONS[0]);
    });
});
