import { apiRequest, parseJWT, type JWTPayload } from './api';

class AuthState {
	token = $state<string | null>(null);
	refreshToken = $state<string | null>(null);
	user = $state<JWTPayload | null>(null);
	isInitialized = $state<boolean>(false);

	get isAuthenticated() {
		return !!this.token && !!this.user;
	}

	init() {
		if (typeof window === 'undefined') return;
		const storedToken = localStorage.getItem('tms_access_token');
		const storedRefresh = localStorage.getItem('tms_refresh_token');

		if (storedToken) {
			const payload = parseJWT(storedToken);
			// Check expiration
			if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
				this.token = storedToken;
				this.refreshToken = storedRefresh;
				this.user = payload;
			} else {
				this.clear();
			}
		}
		this.isInitialized = true;
	}

	async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
		const res = await apiRequest<{ access_token: string; refresh_token: string }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		});

		if (res.error || !res.data) {
			return { success: false, error: res.error || 'Failed to login' };
		}

		const { access_token, refresh_token } = res.data;
		this.token = access_token;
		this.refreshToken = refresh_token;
		this.user = parseJWT(access_token);

		if (typeof window !== 'undefined') {
			localStorage.setItem('tms_access_token', access_token);
			localStorage.setItem('tms_refresh_token', refresh_token);
		}

		return { success: true };
	}

	async logout(): Promise<void> {
		if (this.refreshToken) {
			try {
				await apiRequest('/auth/logout', {
					method: 'POST',
					body: JSON.stringify({ refresh_token: this.refreshToken })
				});
			} catch (e) {
				console.warn('Logout request failed', e);
			}
		}
		this.clear();
	}

	private clear() {
		this.token = null;
		this.refreshToken = null;
		this.user = null;
		if (typeof window !== 'undefined') {
			localStorage.removeItem('tms_access_token');
			localStorage.removeItem('tms_refresh_token');
		}
	}
}

export const auth = new AuthState();
