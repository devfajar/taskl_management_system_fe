export const API_BASE_URL = 'http://localhost:8080/api/v1';

export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
}

export interface JWTPayload {
	uid: string;
	roles?: string[];
	perms?: string[];
	tokenVersion?: number;
	iss?: string;
	sub?: string;
	exp?: number;
	iat?: number;
}

export interface Project {
	id: string;
	name: string;
	description: string;
	owner_id?: string;
	created_at: string;
	updated_at: string;
}

export interface Board {
	id: string;
	project_id: string;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
}

export interface Column {
	id: string;
	board_id: string;
	name: string;
	wip_limit?: number;
	position: number;
	created_at: string;
	updated_at: string;
}

export interface Task {
	id: string;
	project_id: string;
	board_id?: string;
	column_id?: string;
	title: string;
	description: string;
	status: string;
	priority: number;
	position?: number;
	story_points?: number;
	original_estimate_seconds: number;
	remaining_estimate_seconds: number;
	assignee_id?: string;
	due_date?: string;
	created_at: string;
	updated_at: string;
}

// Decode standard JWT without external dependencies
export function parseJWT(token: string): JWTPayload | null {
	try {
		const base64Url = token.split('.')[1];
		if (!base64Url) return null;
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		return JSON.parse(jsonPayload);
	} catch (e) {
		console.error('Failed to parse JWT token', e);
		return null;
	}
}

// Helper to make authenticated fetch requests
export async function apiRequest<T = any>(
	endpoint: string,
	options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
	const token = typeof window !== 'undefined' ? localStorage.getItem('tms_access_token') : null;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>)
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	try {
		const res = await fetch(`${API_BASE_URL}${endpoint}`, {
			...options,
			headers
		});

		let data: any = null;
		const contentType = res.headers.get('content-type');
		if (contentType && contentType.includes('application/json')) {
			data = await res.json();
		}

		if (!res.ok) {
			const errorMessage = data?.error || res.statusText || 'An unexpected error occurred';
			return { data: null, error: errorMessage, status: res.status };
		}

		return { data, error: null, status: res.status };
	} catch (err: any) {
		return { data: null, error: err.message || 'Network error connecting to backend', status: 0 };
	}
}
