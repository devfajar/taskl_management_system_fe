<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { apiRequest, type Project, type Board } from '$lib/api';
	import Header from '$lib/components/Header.svelte';

	let projectId = $derived(page.params.projectId);

	let project = $state<Project | null>(null);
	let boards = $state<Board[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Create board modal state
	let showCreateBoardModal = $state(false);
	let newBoardName = $state('');
	let newBoardDesc = $state('');
	let creatingBoard = $state(false);
	let createError = $state<string | null>(null);

	onMount(() => {
		auth.init();
		if (!auth.isAuthenticated) {
			goto('/login');
			return;
		}
		loadProjectAndBoards();
	});

	async function loadProjectAndBoards() {
		loading = true;
		error = null;

		// 1. Fetch Project Details
		const projRes = await apiRequest<Project>(`/projects/${projectId}`);
		if (projRes.error) {
			error = projRes.error;
			loading = false;
			return;
		}
		project = projRes.data;

		// 2. Fetch Boards for this Project
		const boardsRes = await apiRequest<Board[]>(`/boards?project_id=${projectId}`);
		if (boardsRes.error) {
			error = boardsRes.error;
		} else if (boardsRes.data) {
			boards = boardsRes.data;
		}
		loading = false;
	}

	async function handleCreateBoard(e: Event) {
		e.preventDefault();
		if (!newBoardName.trim()) return;

		creatingBoard = true;
		createError = null;

		const res = await apiRequest<Board>('/boards', {
			method: 'POST',
			body: JSON.stringify({
				project_id: projectId,
				name: newBoardName.trim(),
				description: newBoardDesc.trim() || undefined
			})
		});

		if (res.error) {
			createError = res.error;
		} else if (res.data) {
			newBoardName = '';
			newBoardDesc = '';
			showCreateBoardModal = false;
			await loadProjectAndBoards();
		}
		creatingBoard = false;
	}
</script>

<svelte:head>
	<title>{project ? project.name + ' - Boards' : 'Boards'} | Task Management System</title>
</svelte:head>

<div class="min-h-screen bg-[#FAFBFC] flex flex-col font-sans text-[#172B4D]">
	<Header projectName={project?.name} {projectId} />

	<main class="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
		<!-- Top Navigation / Actions -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
			<div>
				<div class="flex items-center gap-2 text-xs text-[#5E6C84] mb-1">
					<a href="/" class="hover:text-[#0052CC] hover:underline">Projects</a>
					<span>/</span>
					<span class="font-medium text-[#172B4D]">{project?.name || 'Project'}</span>
				</div>
				<h1 class="text-2xl font-bold text-[#172B4D]">Select or Create a Board</h1>
				<p class="text-xs text-[#5E6C84] mt-0.5">
					Each board contains customizable Kanban workflow columns and task cards.
				</p>
			</div>

			<div class="flex items-center gap-2">
				<a
					href="/"
					class="px-3 py-1.5 text-xs font-semibold text-[#42526E] bg-white border border-[#DFE1E6] rounded hover:bg-[#FAFBFC] cursor-pointer shadow-2xs"
				>
					← Back to Projects
				</a>
				<button
					onclick={() => (showCreateBoardModal = true)}
					class="bg-[#0052CC] hover:bg-[#0065FF] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Create Board
				</button>
			</div>
		</div>

		<!-- Step Notice -->
		<div class="mb-6 p-4 bg-[#EAE6FF] border-l-4 border-[#403294] rounded text-xs text-[#403294] flex items-center justify-between">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-[#403294] shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
				</svg>
				<span>
					<strong>Database Flow:</strong> Project (<em>{project?.name || '...'}</em>) ➔ <strong>Boards</strong> ➔ Columns ➔ Tasks
				</span>
			</div>
			<span class="text-[10px] bg-white text-[#403294] font-bold px-2 py-0.5 rounded shadow-2xs">
				STEP 2: SELECT BOARD
			</span>
		</div>

		{#if loading}
			<div class="p-12 text-center text-sm text-[#5E6C84]">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC] mx-auto mb-3"></div>
				Loading boards for project...
			</div>
		{:else if error}
			<div class="p-4 bg-[#FFEBE6] border-l-4 border-[#DE350B] rounded text-xs text-[#BF2600]">
				{error}
			</div>
		{:else if boards.length === 0}
			<div class="bg-white rounded border border-[#EBECF0] p-12 text-center">
				<svg class="w-12 h-12 text-[#A5B2C6] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
				</svg>
				<h3 class="text-base font-semibold text-[#172B4D] mb-1">No boards in this project yet</h3>
				<p class="text-xs text-[#5E6C84] mb-4">Create a Kanban or Scrum board to start tracking tasks.</p>
				<button
					onclick={() => (showCreateBoardModal = true)}
					class="bg-[#0052CC] hover:bg-[#0065FF] text-white px-4 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
				>
					+ Create Board
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{#each boards as b}
					<a
						href="/projects/{projectId}/boards/{b.id}"
						class="bg-white rounded border border-[#EBECF0] hover:border-[#0052CC] hover:shadow-md transition-all p-5 flex flex-col justify-between group cursor-pointer"
					>
						<div>
							<div class="flex items-start justify-between gap-2 mb-3">
								<div class="w-10 h-10 rounded bg-[#403294]/10 text-[#403294] flex items-center justify-center font-bold text-sm group-hover:bg-[#403294] group-hover:text-white transition-colors">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
									</svg>
								</div>
								<span class="text-[10px] font-semibold text-[#403294] bg-[#EAE6FF] px-2 py-0.5 rounded uppercase tracking-wide">
									Kanban Board
								</span>
							</div>
							<h2 class="text-base font-bold text-[#172B4D] group-hover:text-[#0052CC] transition-colors mb-1.5 line-clamp-1">
								{b.name}
							</h2>
							<p class="text-xs text-[#5E6C84] line-clamp-2 min-h-[32px] leading-relaxed">
								{b.description || 'Sprint & Kanban board.'}
							</p>
						</div>

						<div class="pt-4 mt-4 border-t border-[#EBECF0] flex items-center justify-between text-xs text-[#7A869A]">
							<span>Board ID: {b.id.slice(0, 8)}...</span>
							<span class="text-[#0052CC] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
								Open Kanban Board →
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</main>

	<!-- Create Board Modal -->
	{#if showCreateBoardModal}
		<div class="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
			<div class="bg-white rounded-sm shadow-xl border border-[#EBECF0] max-w-md w-full p-6">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-lg font-bold text-[#172B4D]">Create New Board</h2>
					<button
						onclick={() => (showCreateBoardModal = false)}
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

				<form onsubmit={handleCreateBoard} class="space-y-4">
					<div>
						<label for="board-name" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Board Name <span class="text-red-500">*</span>
						</label>
						<input
							id="board-name"
							type="text"
							required
							bind:value={newBoardName}
							placeholder="e.g. Sprint 1, Bug Triage, Kanban"
							class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-[#4C9AFF]/30"
						/>
					</div>

					<div>
						<label for="board-desc" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Description
						</label>
						<textarea
							id="board-desc"
							rows="3"
							bind:value={newBoardDesc}
							placeholder="Details on what work is tracked on this board..."
							class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC] focus:ring-2 focus:ring-[#4C9AFF]/30"
						></textarea>
					</div>

					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={() => (showCreateBoardModal = false)}
							class="px-3 py-1.5 text-xs font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={creatingBoard}
							class="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded disabled:opacity-50 cursor-pointer shadow-xs"
						>
							{creatingBoard ? 'Creating...' : 'Create Board'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.98); }
		to { opacity: 1; transform: scale(1); }
	}
	.animate-fadeIn {
		animation: fadeIn 0.15s ease-out forwards;
	}
</style>
