<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';

	interface Props {
		projectName?: string;
		projectId?: string;
		boardName?: string;
	}

	let { projectName, projectId, boardName }: Props = $props();

	async function handleLogout() {
		await auth.logout();
		goto('/login');
	}
</script>

<header class="bg-white border-b border-[#EBECF0] h-14 px-4 flex items-center justify-between shadow-2xs select-none">
	<div class="flex items-center gap-6">
		<!-- Brand Logo -->
		<a href="/" class="flex items-center gap-2 hover:opacity-90 transition-opacity">
			<svg class="w-6 h-6 text-[#0052CC]" viewBox="0 0 24 24" fill="currentColor">
				<path d="M11.53 2C11.53 7.26 7.26 11.53 2 11.53C7.26 11.53 11.53 15.8 11.53 21.06C11.53 15.8 15.8 11.53 21.06 11.53C15.8 11.53 11.53 7.26 11.53 2Z" />
			</svg>
			<span class="font-bold text-base text-[#172B4D] tracking-tight">task_management_system</span>
		</a>

		<!-- Breadcrumbs Navigation -->
		<nav class="hidden md:flex items-center gap-2 text-sm text-[#42526E]">
			<a href="/" class="hover:text-[#0052CC] font-medium transition-colors flex items-center gap-1">
				Projects
			</a>

			{#if projectName}
				<span class="text-[#8993A4]">/</span>
				<a href="/projects/{projectId}" class="hover:text-[#0052CC] font-medium transition-colors">
					{projectName}
				</a>
			{/if}

			{#if boardName}
				<span class="text-[#8993A4]">/</span>
				<span class="font-semibold text-[#172B4D] bg-[#FAFBFC] px-2 py-0.5 rounded border border-[#EBECF0]">
					{boardName}
				</span>
			{/if}
		</nav>
	</div>

	<!-- Right User Controls -->
	<div class="flex items-center gap-3">
		<div class="text-right hidden sm:block">
			<div class="text-xs font-semibold text-[#172B4D]">
				{auth.user?.sub ? 'User ' + auth.user.sub.slice(0, 8) : 'Authenticated'}
			</div>
			<div class="flex gap-1 justify-end mt-0.5">
				{#each auth.user?.roles || ['member'] as role}
					<span class="text-[10px] bg-[#EAE6FF] text-[#403294] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
						{role}
					</span>
				{/each}
			</div>
		</div>

		<!-- Avatar -->
		<div class="w-8 h-8 rounded-full bg-[#0052CC] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#DEEBFF]">
			{(auth.user?.sub || 'U').charAt(0).toUpperCase()}
		</div>

		<!-- Logout Button -->
		<button
			onclick={handleLogout}
			title="Log out"
			class="p-1.5 text-[#5E6C84] hover:text-[#BF2600] hover:bg-[#FFEBE6] rounded-xs transition-colors cursor-pointer"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
			</svg>
		</button>
	</div>
</header>
