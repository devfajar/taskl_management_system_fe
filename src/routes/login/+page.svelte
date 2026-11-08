<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	onMount(() => {
		auth.init();
		if (auth.isAuthenticated) {
			goto('/');
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email || !password) {
			errorMessage = 'Please enter your email and password.';
			return;
		}

		loading = true;
		errorMessage = null;

		try {
			const res = await auth.login(email.trim(), password);
			if (res.success) {
				goto('/');
			} else {
				errorMessage = res.error || 'Invalid email or password. Please check your credentials.';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Unable to connect to server. Please try again.';
		} finally {
			loading = false;
		}
	}

	function fillDemo(e: Event) {
		e.preventDefault();
		email = 'admin@example.com';
		password = 'password123';
		errorMessage = null;
	}
</script>

<svelte:head>
	<title>Log in | Task Management System</title>
</svelte:head>

<div class="min-h-screen bg-[#F4F5F7] flex flex-col justify-between items-center py-10 px-4 select-none font-sans">
	<!-- Top Spacer -->
	<div class="w-full max-w-[420px]"></div>

	<!-- Main Login Card -->
	<main class="w-full max-w-[420px]">
		<!-- Branding -->
		<div class="flex flex-col items-center mb-6">
			<div class="flex items-center gap-2 mb-2">
				<!-- Logo SVG -->
				<svg class="w-8 h-8 text-[#0052CC]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M11.53 2C11.53 7.26 7.26 11.53 2 11.53C7.26 11.53 11.53 15.8 11.53 21.06C11.53 15.8 15.8 11.53 21.06 11.53C15.8 11.53 11.53 7.26 11.53 2Z"
						fill="currentColor"
					/>
				</svg>
				<span class="text-xl font-bold tracking-tight text-[#172B4D]">task_management_system</span>
			</div>
			<div class="flex items-center gap-1.5 text-xs tracking-widest text-[#5E6C84] uppercase font-semibold">
				<span>TMS WORKSPACE</span>
			</div>
		</div>

		<!-- Card -->
		<div class="bg-white rounded-sm shadow-md border border-[#EBECF0] p-8">
			<h1 class="text-[#172B4D] text-base font-semibold text-center mb-6">
				Log in to your account
			</h1>

			<!-- Quick Demo Helper Pill -->
			<div class="mb-5 bg-[#DEEBFF] border border-[#B3D4FF] rounded p-2.5 flex items-center justify-between text-xs text-[#0747A6]">
				<div class="flex items-center gap-1.5">
					<svg class="w-4 h-4 shrink-0 text-[#0052CC]" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
					</svg>
					<span>Demo: <strong>admin@example.com</strong></span>
				</div>
				<button
					type="button"
					onclick={fillDemo}
					class="font-semibold text-[#0052CC] hover:underline cursor-pointer bg-white px-2 py-0.5 rounded shadow-xs"
				>
					Auto-fill
				</button>
			</div>

			<!-- Error Alert Banner -->
			{#if errorMessage}
				<div class="mb-5 p-3 bg-[#FFEBE6] border-l-4 border-[#DE350B] rounded text-xs text-[#BF2600] flex items-start gap-2 animate-fadeIn">
					<svg class="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
					</svg>
					<span class="flex-1 leading-snug">{errorMessage}</span>
				</div>
			{/if}

			<!-- Form -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-xs font-semibold text-[#5E6C84] mb-1">
						Enter your email
					</label>
					<input
						id="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						placeholder="name@company.com"
						class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded-xs text-[#172B4D] placeholder-[#8993A4] focus:outline-hidden focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-[#4C9AFF]/30 transition-all"
					/>
				</div>

				<div>
					<div class="flex justify-between items-center mb-1">
						<label for="password" class="block text-xs font-semibold text-[#5E6C84]">
							Password
						</label>
						<a href="#forgot" class="text-xs text-[#0052CC] hover:underline">
							Forgot password?
						</a>
					</div>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							required
							bind:value={password}
							placeholder="Enter password"
							class="w-full pl-3 pr-10 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded-xs text-[#172B4D] placeholder-[#8993A4] focus:outline-hidden focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-[#4C9AFF]/30 transition-all"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B778C] hover:text-[#172B4D] cursor-pointer"
							tabindex="-1"
							aria-label="Toggle password visibility"
						>
							{#if showPassword}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full flex justify-center items-center py-2.5 px-4 mt-2 border border-transparent rounded-xs shadow-xs text-sm font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#0052CC] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
				>
					{#if loading}
						<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Logging in...
					{:else}
						Log in
					{/if}
				</button>
			</form>



			<!-- Card Footer Links -->
			<div class="mt-6 pt-4 border-t border-[#EBECF0] text-center text-xs text-[#5E6C84]">
				<a href="#help" class="text-[#0052CC] hover:underline">Can't log in?</a>
				<span class="mx-1.5">•</span>
				<a href="#signup" class="text-[#0052CC] hover:underline">Create an account</a>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="w-full max-w-[400px] text-center text-xs text-[#7A869A] mt-8 flex flex-col items-center gap-2">
		<div class="flex items-center gap-1.5 opacity-80 mb-1">
			<svg class="w-4 h-4 text-[#0052CC]" viewBox="0 0 24 24" fill="currentColor">
				<path d="M11.53 2C11.53 7.26 7.26 11.53 2 11.53C7.26 11.53 11.53 15.8 11.53 21.06C11.53 15.8 15.8 11.53 21.06 11.53C15.8 11.53 11.53 7.26 11.53 2Z" />
			</svg>
			<span class="font-bold tracking-wider text-[11px] text-[#5E6C84]">TASK MANAGEMENT SYSTEM</span>
		</div>
		<div class="flex flex-wrap justify-center gap-x-3 gap-y-1">
			<a href="#privacy" class="hover:underline">Privacy Policy</a>
			<span>•</span>
			<a href="#terms" class="hover:underline">User Notice</a>
		</div>
		<p class="text-[11px] text-[#A5B2C6] mt-1">
			One account for task_management_system.
		</p>
	</footer>
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fadeIn {
		animation: fadeIn 0.2s ease-out forwards;
	}
</style>
