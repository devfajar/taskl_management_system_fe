<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { apiRequest, type Project } from '$lib/api';
	import Header from '$lib/components/Header.svelte';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Create project form state
	let showCreateModal = $state(false);
	let newProjectName = $state('');
	let newProjectDesc = $state('');
	let creating = $state(false);
	let createError = $state<string | null>(null);

	onMount(() => {
		auth.init();
		if (!auth.isAuthenticated) {
			goto('/login');
			return;
		}
		fetchProjects();
	});

	async function fetchProjects() {
		loading = true;
		error = null;
		const res = await apiRequest<Project[]>('/projects');
		if (res.error) {
			error = res.error;
		} else if (res.data) {
			projects = res.data;
		}
		loading = false;
	}

	async function handleCreateProject(e: Event) {
		e.preventDefault();
		if (!newProjectName.trim()) return;

		creating = true;
		createError = null;

		const res = await apiRequest<Project>('/projects', {
			method: 'POST',
			body: JSON.stringify({
				name: newProjectName.trim(),
				description: newProjectDesc.trim() || undefined
			})
		});

		if (res.error) {
			createError = res.error;
		} else if (res.data) {
			newProjectName = '';
			newProjectDesc = '';
			showCreateModal = false;
			await fetchProjects();
		}
		creating = false;
	}
</script>

<svelte:head>
	<title>Projects | Task Management System</title>
</svelte:head>

{#if !auth.isInitialized}
	<div class="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
	</div>
{:else if auth.isAuthenticated}
	<div class="min-h-screen bg-[#FAFBFC] flex flex-col font-sans text-[#172B4D]">
		<Header />

		<!-- Main Content Area -->
		<main class="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
			<!-- Header Title & Action -->
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<div>
					<h1 class="text-2xl font-bold text-[#172B4D]">Select a Project</h1>
					<p class="text-xs text-[#5E6C84] mt-0.5">
						Choose a project to explore its Kanban boards, columns, and tasks.
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={fetchProjects}
						class="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#42526E] bg-white border border-[#DFE1E6] rounded hover:bg-[#FAFBFC] cursor-pointer shadow-2xs"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Refresh
					</button>
					<button
						onclick={() => (showCreateModal = true)}
						class="bg-[#0052CC] hover:bg-[#0065FF] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create Project
					</button>
				</div>
			</div>

			<!-- Project Flow Banner -->
			<div class="mb-6 p-4 bg-[#DEEBFF] border-l-4 border-[#0052CC] rounded text-xs text-[#0747A6] flex items-center justify-between">
				<div class="flex items-center gap-2">
					<svg class="w-4 h-4 text-[#0052CC] shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
					</svg>
					<span>
						<strong>Database Flow:</strong> Project ➔ Boards ➔ Columns ➔ Tasks
					</span>
				</div>
				<span class="text-[10px] bg-white text-[#0052CC] font-bold px-2 py-0.5 rounded shadow-2xs">
					STEP 1: SELECT PROJECT
				</span>
			</div>

			<!-- Content list -->
			{#if loading}
				<div class="p-12 text-center text-sm text-[#5E6C84]">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC] mx-auto mb-3"></div>
					Fetching projects from backend...
				</div>
			{:else if error}
				<div class="p-4 bg-[#FFEBE6] border-l-4 border-[#DE350B] rounded text-xs text-[#BF2600]">
					{error}
				</div>
			{:else if projects.length === 0}
				<div class="bg-white rounded border border-[#EBECF0] p-12 text-center">
					<svg class="w-12 h-12 text-[#A5B2C6] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<h3 class="text-base font-semibold text-[#172B4D] mb-1">No projects available</h3>
					<p class="text-xs text-[#5E6C84] mb-4">Get started by creating your first software project.</p>
					<button
						onclick={() => (showCreateModal = true)}
						class="bg-[#0052CC] hover:bg-[#0065FF] text-white px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
					>
						+ Create Project
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{#each projects as proj}
						<a
							href="/projects/{proj.id}"
							class="bg-white rounded border border-[#EBECF0] hover:border-[#0052CC] hover:shadow-md transition-all p-5 flex flex-col justify-between group cursor-pointer"
						>
							<div>
								<div class="flex items-start justify-between gap-2 mb-3">
									<div class="w-10 h-10 rounded bg-[#0052CC]/10 text-[#0052CC] flex items-center justify-center font-bold text-sm group-hover:bg-[#0052CC] group-hover:text-white transition-colors">
										{proj.name.charAt(0).toUpperCase()}
									</div>
									<span class="text-[10px] font-semibold text-[#5E6C84] bg-[#FAFBFC] px-2 py-0.5 rounded border border-[#EBECF0] uppercase tracking-wide">
										Software Project
									</span>
								</div>
								<h2 class="text-base font-bold text-[#172B4D] group-hover:text-[#0052CC] transition-colors mb-1.5 line-clamp-1">
									{proj.name}
								</h2>
								<p class="text-xs text-[#5E6C84] line-clamp-2 min-h-[32px] leading-relaxed">
									{proj.description || 'No description provided.'}
								</p>
							</div>

							<div class="pt-4 mt-4 border-t border-[#EBECF0] flex items-center justify-between text-xs text-[#7A869A]">
								<span>ID: {proj.id.slice(0, 8)}...</span>
								<span class="text-[#0052CC] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
									View Boards →
								</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</main>

		<!-- Create Project Modal -->
		{#if showCreateModal}
			<div class="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
				<div class="bg-white rounded-sm shadow-xl border border-[#EBECF0] max-w-md w-full p-6">
					<div class="flex justify-between items-center mb-4">
						<h2 class="text-lg font-bold text-[#172B4D]">Create Project</h2>
						<button
							onclick={() => (showCreateModal = false)}
							class="text-[#5E6C84] hover:text-[#172B4D] cursor-pointer"
						>
							✕
						</button>
					</div>

					{#if createError}
						<div class="mb-4 p-3 bg-[#FFEBE6] border-l-4 border-[#DE350B] rounded text-xs text-[#BF2600]">
							{createError}
						</div>
					{/if}

					<form onsubmit={handleCreateProject} class="space-y-4">
						<div>
							<label for="proj-name" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Project Name <span class="text-red-500">*</span>
							</label>
							<input
								id="proj-name"
								type="text"
								required
								bind:value={newProjectName}
								placeholder="e.g. Core Platform, Mobile App"
								class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-[#4C9AFF]/30"
							/>
						</div>

						<div>
							<label for="proj-desc" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Description
							</label>
							<textarea
								id="proj-desc"
								rows="3"
								bind:value={newProjectDesc}
								placeholder="Brief overview of what this project encompasses..."
								class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-[#4C9AFF]/30"
							></textarea>
						</div>

						<div class="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onclick={() => (showCreateModal = false)}
								class="px-3 py-1.5 text-xs font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={creating}
								class="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded disabled:opacity-50 cursor-pointer shadow-xs"
							>
								{creating ? 'Creating...' : 'Create'}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.98); }
		to { opacity: 1; transform: scale(1); }
	}
	.animate-fadeIn {
		animation: fadeIn 0.15s ease-out forwards;
	}
</style>
