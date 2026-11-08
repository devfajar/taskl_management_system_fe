<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import {
		apiRequest,
		type Project,
		type Board,
		type Column,
		type Task
	} from '$lib/api';
	import Header from '$lib/components/Header.svelte';

	let projectId = $derived(page.params.projectId);
	let boardId = $derived(page.params.boardId);

	let project = $state<Project | null>(null);
	let board = $state<Board | null>(null);
	let columns = $state<Column[]>([]);
	let tasksByColumn = $state<Record<string, Task[]>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Drag & Drop tracking
	let draggedTask = $state<Task | null>(null);

	// Add Column modal
	let showAddColumnModal = $state(false);
	let newColumnName = $state('');
	let newColumnWIP = $state<number | undefined>(undefined);
	let addingColumn = $state(false);

	// Add Task modal
	let showAddTaskModal = $state(false);
	let targetColumnId = $state<string>('');
	let newTaskTitle = $state('');
	let newTaskDesc = $state('');
	let newTaskPriority = $state(1);
	let newTaskPoints = $state<number | undefined>(undefined);
	let newTaskOrigEst = $state<number | undefined>(undefined);
	let addingTask = $state(false);

	// Selected Task Detail Modal
	let selectedTask = $state<Task | null>(null);
	let editingTask = $state(false);
	let editTitle = $state('');
	let editDesc = $state('');
	let editStatus = $state('new');
	let editPriority = $state(1);
	let editPoints = $state<number | undefined>(undefined);
	let editRemEst = $state<number | undefined>(undefined);
	let savingTask = $state(false);

	onMount(() => {
		auth.init();
		if (!auth.isAuthenticated) {
			goto('/login');
			return;
		}
		loadBoardData();
	});

	async function loadBoardData() {
		loading = true;
		error = null;

		// 1. Fetch Project
		const pRes = await apiRequest<Project>(`/projects/${projectId}`);
		if (pRes.data) project = pRes.data;

		// 2. Fetch Board
		const bRes = await apiRequest<Board>(`/boards/${boardId}`);
		if (bRes.data) {
			board = bRes.data;
		} else {
			error = bRes.error || 'Board not found';
			loading = false;
			return;
		}

		// 3. Fetch Columns
		const colsRes = await apiRequest<Column[]>(`/boards/${boardId}/columns`);
		if (colsRes.error) {
			error = colsRes.error;
			loading = false;
			return;
		}

		columns = colsRes.data || [];

		// 4. Fetch Tasks for each column in parallel
		const tasksMap: Record<string, Task[]> = {};
		await Promise.all(
			columns.map(async (col) => {
				const res = await apiRequest<Task[]>(`/columns/${col.id}/tasks?limit=50`);
				tasksMap[col.id] = res.data || [];
			})
		);

		tasksByColumn = tasksMap;
		loading = false;
	}

	// Create Column
	async function handleCreateColumn(e: Event) {
		e.preventDefault();
		if (!newColumnName.trim()) return;

		addingColumn = true;
		const maxPos = columns.reduce((max, c) => Math.max(max, c.position || 0), 0);
		const nextPos = maxPos + 1024.0;

		const res = await apiRequest<Column>(`/boards/${boardId}/columns`, {
			method: 'POST',
			body: JSON.stringify({
				name: newColumnName.trim(),
				wip_limit: newColumnWIP && newColumnWIP > 0 ? Number(newColumnWIP) : undefined,
				position: nextPos
			})
		});

		if (res.data) {
			newColumnName = '';
			newColumnWIP = undefined;
			showAddColumnModal = false;
			await loadBoardData();
		}
		addingColumn = false;
	}

	// Create Task
	function openAddTask(colId: string) {
		targetColumnId = colId;
		newTaskTitle = '';
		newTaskDesc = '';
		newTaskPriority = 1;
		newTaskPoints = undefined;
		newTaskOrigEst = undefined;
		showAddTaskModal = true;
	}

	async function handleCreateTask(e: Event) {
		e.preventDefault();
		if (!newTaskTitle.trim() || !targetColumnId) return;

		addingTask = true;
		const res = await apiRequest<Task>('/tasks', {
			method: 'POST',
			body: JSON.stringify({
				project_id: projectId,
				board_id: boardId,
				column_id: targetColumnId,
				title: newTaskTitle.trim(),
				description: newTaskDesc.trim() || undefined,
				status: 'new',
				priority: Number(newTaskPriority),
				story_points: newTaskPoints ? Number(newTaskPoints) : undefined,
				original_estimate_seconds: newTaskOrigEst ? Number(newTaskOrigEst) * 3600 : undefined,
				remaining_estimate_seconds: newTaskOrigEst ? Number(newTaskOrigEst) * 3600 : undefined
			})
		});

		if (res.data) {
			showAddTaskModal = false;
			await loadBoardData();
		}
		addingTask = false;
	}

	// Drag and Drop
	function handleDragStart(task: Task) {
		draggedTask = task;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDrop(e: DragEvent, targetColId: string) {
		e.preventDefault();
		if (!draggedTask || draggedTask.column_id === targetColId) {
			draggedTask = null;
			return;
		}

		const taskToMove = draggedTask;
		draggedTask = null;

		// Optimistic UI update
		const oldColId = taskToMove.column_id || '';
		if (tasksByColumn[oldColId]) {
			tasksByColumn[oldColId] = tasksByColumn[oldColId].filter((t) => t.id !== taskToMove.id);
		}
		if (!tasksByColumn[targetColId]) {
			tasksByColumn[targetColId] = [];
		}
		tasksByColumn[targetColId] = [...tasksByColumn[targetColId], { ...taskToMove, column_id: targetColId }];

		// Backend update
		await apiRequest(`/tasks/${taskToMove.id}/move`, {
			method: 'PUT',
			body: JSON.stringify({
				to_column_id: targetColId
			})
		});

		await loadBoardData();
	}

	// Open Task Modal
	async function openTaskModal(taskId: string) {
		const res = await apiRequest<Task>(`/tasks/${taskId}`);
		if (res.data) {
			selectedTask = res.data;
			editTitle = res.data.title;
			editDesc = res.data.description || '';
			editStatus = res.data.status || 'new';
			editPriority = res.data.priority || 1;
			editPoints = res.data.story_points;
			editRemEst = res.data.remaining_estimate_seconds ? Math.round(res.data.remaining_estimate_seconds / 3600) : undefined;
		}
	}

	async function handleSaveTaskDetails(e: Event) {
		e.preventDefault();
		if (!selectedTask) return;

		savingTask = true;

		// 1. Update basic fields
		await apiRequest(`/tasks/${selectedTask.id}`, {
			method: 'PUT',
			body: JSON.stringify({
				title: editTitle.trim(),
				description: editDesc.trim(),
				status: editStatus,
				priority: Number(editPriority),
				story_points: editPoints ? Number(editPoints) : undefined
			})
		});

		// 2. Update estimates
		if (editRemEst !== undefined) {
			await apiRequest(`/tasks/${selectedTask.id}/estimates`, {
				method: 'PATCH',
				body: JSON.stringify({
					remaining_estimate_seconds: Number(editRemEst) * 3600
				})
			});
		}

		savingTask = false;
		selectedTask = null;
		await loadBoardData();
	}

	async function handleDeleteTask() {
		if (!selectedTask || !confirm('Are you sure you want to delete this task?')) return;
		await apiRequest(`/tasks/${selectedTask.id}`, { method: 'DELETE' });
		selectedTask = null;
		await loadBoardData();
	}

	function getPriorityBadge(p: number) {
		switch (p) {
			case 3: return { text: 'High', color: 'bg-red-100 text-red-700' };
			case 2: return { text: 'Medium', color: 'bg-amber-100 text-amber-700' };
			default: return { text: 'Low', color: 'bg-blue-100 text-blue-700' };
		}
	}
</script>

<svelte:head>
	<title>{board ? board.name : 'Kanban Board'} | Task Management System</title>
</svelte:head>

<div class="min-h-screen bg-[#F4F5F7] flex flex-col font-sans text-[#172B4D] overflow-x-hidden">
	<Header projectName={project?.name} {projectId} boardName={board?.name} />

	<!-- Board Subheader -->
	<div class="bg-white border-b border-[#EBECF0] px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
		<div class="flex items-center gap-3">
			<a
				href="/projects/{projectId}"
				class="text-xs font-semibold text-[#5E6C84] hover:text-[#0052CC] flex items-center gap-1"
			>
				← All Boards
			</a>
			<span class="text-[#DFE1E6]">|</span>
			<h1 class="text-lg font-bold text-[#172B4D] flex items-center gap-2">
				<span>{board?.name || 'Kanban Board'}</span>
				<span class="text-[10px] bg-[#DFE1E6] text-[#42526E] px-1.5 py-0.5 rounded font-mono">
					KANBAN
				</span>
			</h1>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={loadBoardData}
				class="px-3 py-1.5 text-xs font-semibold text-[#42526E] bg-white border border-[#DFE1E6] rounded hover:bg-[#FAFBFC] cursor-pointer shadow-2xs"
			>
				Refresh
			</button>
			<button
				onclick={() => (showAddColumnModal = true)}
				class="bg-[#0052CC] hover:bg-[#0065FF] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Column
			</button>
		</div>
	</div>

	<!-- Kanban Columns Horizontal Scroll Area -->
	<main class="flex-1 p-6 overflow-x-auto">
		{#if loading}
			<div class="flex items-center justify-center p-20 text-sm text-[#5E6C84]">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC] mr-3"></div>
				Loading Kanban board...
			</div>
		{:else if error}
			<div class="max-w-md mx-auto p-4 bg-[#FFEBE6] border-l-4 border-[#DE350B] rounded text-xs text-[#BF2600]">
				{error}
			</div>
		{:else if columns.length === 0}
			<div class="max-w-md mx-auto bg-white rounded border border-[#EBECF0] p-10 text-center shadow-xs">
				<h3 class="text-base font-bold text-[#172B4D] mb-1">No columns configured</h3>
				<p class="text-xs text-[#5E6C84] mb-4">Add columns such as "To Do", "In Progress", or "Done" to get started.</p>
				<button
					onclick={() => (showAddColumnModal = true)}
					class="bg-[#0052CC] hover:bg-[#0065FF] text-white px-4 py-2 rounded text-xs font-semibold cursor-pointer"
				>
					+ Add First Column
				</button>
			</div>
		{:else}
			<div class="flex items-start gap-4 pb-4 select-none min-h-[calc(100vh-160px)]">
				{#each columns as col}
					{@const taskList = tasksByColumn[col.id] || []}
					{@const isOverWIP = col.wip_limit && taskList.length > col.wip_limit}

					<div
						class="w-72 shrink-0 bg-[#EBECF0] rounded-sm flex flex-col max-h-[calc(100vh-170px)] border {isOverWIP ? 'border-[#DE350B] ring-1 ring-[#DE350B]' : 'border-transparent'}"
						ondragover={handleDragOver}
						ondrop={(e) => handleDrop(e, col.id)}
						role="region"
						aria-label={col.name}
					>
						<!-- Column Header -->
						<div class="p-3 pb-2 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<h2 class="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">
									{col.name}
								</h2>
								<span class="text-xs font-bold px-1.5 py-0.2 rounded-full {isOverWIP ? 'bg-[#FFEBE6] text-[#DE350B]' : 'bg-[#DFE1E6] text-[#42526E]'}">
									{taskList.length}{col.wip_limit ? ` / ${col.wip_limit}` : ''}
								</span>
							</div>

							<button
								onclick={() => openAddTask(col.id)}
								title="Add card"
								class="text-[#5E6C84] hover:text-[#0052CC] hover:bg-white/60 p-1 rounded transition-colors cursor-pointer"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
							</button>
						</div>

						<!-- Task Cards List -->
						<div class="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
							{#each taskList as task}
								{@const badge = getPriorityBadge(task.priority)}
								<div
									draggable="true"
									ondragstart={() => handleDragStart(task)}
									onclick={() => openTaskModal(task.id)}
									class="bg-white p-3 rounded-xs shadow-2xs border border-[#DFE1E6] hover:border-[#0052CC] hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group"
									role="button"
									tabindex="0"
									onkeydown={(e) => e.key === 'Enter' && openTaskModal(task.id)}
								>
									<h3 class="text-xs font-semibold text-[#172B4D] mb-1.5 group-hover:text-[#0052CC] transition-colors leading-snug">
										{task.title}
									</h3>

									<div class="flex items-center justify-between text-[11px] pt-1">
										<div class="flex items-center gap-1.5">
											<span class="px-1.5 py-0.5 rounded text-[10px] font-bold {badge.color}">
												{badge.text}
											</span>
											{#if task.story_points}
												<span class="bg-[#DFE1E6] text-[#42526E] px-1.5 py-0.2 rounded font-mono text-[10px] font-bold" title="Story Points">
													{task.story_points} pt
												</span>
											{/if}
										</div>

										<span class="text-[10px] text-[#8993A4] font-mono">
											#{task.id.slice(0, 5)}
										</span>
									</div>
								</div>
							{/each}

							{#if taskList.length === 0}
								<div class="py-6 text-center text-xs text-[#8993A4] border-2 border-dashed border-[#DFE1E6] rounded">
									Drop tasks here
								</div>
							{/if}
						</div>

						<!-- Column Bottom Button -->
						<div class="p-2 pt-0">
							<button
								onclick={() => openAddTask(col.id)}
								class="w-full py-1.5 px-2 text-left text-xs text-[#5E6C84] hover:bg-white/60 hover:text-[#172B4D] rounded flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<span class="font-bold text-sm leading-none">+</span> Create issue
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<!-- Add Column Modal -->
	{#if showAddColumnModal}
		<div class="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
			<div class="bg-white rounded-sm shadow-xl border border-[#EBECF0] max-w-sm w-full p-6">
				<h2 class="text-base font-bold text-[#172B4D] mb-4">Add Column to Board</h2>
				<form onsubmit={handleCreateColumn} class="space-y-4">
					<div>
						<label for="col-name" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Column Name <span class="text-red-500">*</span>
						</label>
						<input
							id="col-name"
							type="text"
							required
							bind:value={newColumnName}
							placeholder="e.g. In Review, QA, Deployed"
							class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC]"
						/>
					</div>

					<div>
						<label for="col-wip" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							WIP Limit (Work in Progress max tasks)
						</label>
						<input
							id="col-wip"
							type="number"
							min="0"
							bind:value={newColumnWIP}
							placeholder="Optional (e.g. 5)"
							class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC]"
						/>
					</div>

					<div class="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={() => (showAddColumnModal = false)}
							class="px-3 py-1.5 text-xs font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={addingColumn}
							class="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded disabled:opacity-50 cursor-pointer"
						>
							{addingColumn ? 'Adding...' : 'Add Column'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Add Task Modal -->
	{#if showAddTaskModal}
		<div class="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
			<div class="bg-white rounded-sm shadow-xl border border-[#EBECF0] max-w-md w-full p-6">
				<h2 class="text-base font-bold text-[#172B4D] mb-4">Create Issue / Task</h2>
				<form onsubmit={handleCreateTask} class="space-y-4">
					<div>
						<label for="task-title" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Summary / Title <span class="text-red-500">*</span>
						</label>
						<input
							id="task-title"
							type="text"
							required
							bind:value={newTaskTitle}
							placeholder="What needs to be done?"
							class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC]"
						/>
					</div>

					<div>
						<label for="task-desc" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Description
						</label>
						<textarea
							id="task-desc"
							rows="3"
							bind:value={newTaskDesc}
							placeholder="Add context, acceptance criteria, or notes..."
							class="w-full px-3 py-2 text-sm bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC]"
						></textarea>
					</div>

					<div class="grid grid-cols-3 gap-3">
						<div>
							<label for="task-priority" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Priority
							</label>
							<select
								id="task-priority"
								bind:value={newTaskPriority}
								class="w-full px-2 py-1.5 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D]"
							>
								<option value={1}>Low</option>
								<option value={2}>Medium</option>
								<option value={3}>High</option>
							</select>
						</div>

						<div>
							<label for="task-points" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Story Points
							</label>
							<input
								id="task-points"
								type="number"
								step="0.5"
								bind:value={newTaskPoints}
								placeholder="e.g. 3"
								class="w-full px-2 py-1.5 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D]"
							/>
						</div>

						<div>
							<label for="task-est" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Est. (Hours)
							</label>
							<input
								id="task-est"
								type="number"
								bind:value={newTaskOrigEst}
								placeholder="e.g. 4"
								class="w-full px-2 py-1.5 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D]"
							/>
						</div>
					</div>

					<div class="flex justify-end gap-2 pt-3">
						<button
							type="button"
							onclick={() => (showAddTaskModal = false)}
							class="px-3 py-1.5 text-xs font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={addingTask}
							class="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded disabled:opacity-50 cursor-pointer shadow-xs"
						>
							{addingTask ? 'Creating...' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Task Detail Modal -->
	{#if selectedTask}
		<div class="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
			<div class="bg-white rounded shadow-2xl border border-[#EBECF0] max-w-lg w-full p-6">
				<div class="flex justify-between items-start mb-4">
					<div>
						<span class="text-[11px] font-mono text-[#5E6C84] font-bold">
							TASK #{selectedTask.id.slice(0, 8)}
						</span>
						<h2 class="text-base font-bold text-[#172B4D] mt-0.5">{selectedTask.title}</h2>
					</div>
					<button
						onclick={() => (selectedTask = null)}
						class="text-[#5E6C84] hover:text-[#172B4D] cursor-pointer"
					>
						✕
					</button>
				</div>

				<form onsubmit={handleSaveTaskDetails} class="space-y-4">
					<div>
						<label for="edit-title" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Title
						</label>
						<input
							id="edit-title"
							type="text"
							required
							bind:value={editTitle}
							class="w-full px-3 py-1.5 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC]"
						/>
					</div>

					<div>
						<label for="edit-desc" class="block text-xs font-semibold text-[#5E6C84] mb-1">
							Description
						</label>
						<textarea
							id="edit-desc"
							rows="3"
							bind:value={editDesc}
							class="w-full px-3 py-1.5 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D] focus:outline-hidden focus:bg-white focus:border-[#0052CC]"
						></textarea>
					</div>

					<div class="grid grid-cols-3 gap-3">
						<div>
							<label for="edit-priority" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Priority
							</label>
							<select
								id="edit-priority"
								bind:value={editPriority}
								class="w-full px-2 py-1 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D]"
							>
								<option value={1}>Low</option>
								<option value={2}>Medium</option>
								<option value={3}>High</option>
							</select>
						</div>

						<div>
							<label for="edit-points" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Story Points
							</label>
							<input
								id="edit-points"
								type="number"
								step="0.5"
								bind:value={editPoints}
								class="w-full px-2 py-1 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D]"
							/>
						</div>

						<div>
							<label for="edit-rem-est" class="block text-xs font-semibold text-[#5E6C84] mb-1">
								Remaining (h)
							</label>
							<input
								id="edit-rem-est"
								type="number"
								bind:value={editRemEst}
								class="w-full px-2 py-1 text-xs bg-[#FAFBFC] border border-[#DFE1E6] rounded text-[#172B4D]"
							/>
						</div>
					</div>

					<div class="flex items-center justify-between pt-4 border-t border-[#EBECF0]">
						<button
							type="button"
							onclick={handleDeleteTask}
							class="px-3 py-1.5 text-xs font-semibold text-[#BF2600] hover:bg-[#FFEBE6] rounded cursor-pointer transition-colors"
						>
							Delete Task
						</button>

						<div class="flex gap-2">
							<button
								type="button"
								onclick={() => (selectedTask = null)}
								class="px-3 py-1.5 text-xs font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={savingTask}
								class="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded disabled:opacity-50 cursor-pointer shadow-xs"
							>
								{savingTask ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
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
