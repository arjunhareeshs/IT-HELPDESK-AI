import { User, LoginCredentials } from '../../types/auth';
import { INITIAL_USERS } from '../../services/mockData';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    // Artificial latency for authentic response feel
    await new Promise((res) => setTimeout(res, 300));

    // Match by selected role or email
    const matchedUser =
      INITIAL_USERS.find((u) => u.email.toLowerCase() === credentials.email.toLowerCase()) ||
      INITIAL_USERS.find((u) => u.role === credentials.role) ||
      INITIAL_USERS[0];

    const token = `fake-jwt-token-${matchedUser.role}-${Date.now()}`;
    localStorage.setItem('it_helpdesk_token', token);
    localStorage.setItem('it_helpdesk_user', JSON.stringify(matchedUser));

    return { user: matchedUser, token };
  },

  async logout(): Promise<void> {
    localStorage.removeItem('it_helpdesk_token');
    localStorage.removeItem('it_helpdesk_user');
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem('it_helpdesk_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
