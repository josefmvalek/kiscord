export const initialAuthState = {
    currentUser: { name: 'Klárka', email: '' },
    user_ids: { jose: null, klarka: null }
};

export class AuthStore {
    constructor() {
        this.currentUser = { ...initialAuthState.currentUser };
        this.user_ids = { ...initialAuthState.user_ids };
    }

    setCurrentUser(user) {
        this.currentUser = { ...this.currentUser, ...user };
    }

    setUserIds(ids) {
        this.user_ids = { ...this.user_ids, ...ids };
    }

    isJosef() {
        return this.currentUser?.name?.toLowerCase().includes('jose') ||
               this.currentUser?.email?.toLowerCase().includes('josef');
    }

    isKlarka() {
        return !this.isJosef();
    }
}
