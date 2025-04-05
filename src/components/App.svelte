<script context="module">
	import Device from 'svelte-device-info'
</script>


	<title>ZZZ Team Finder v1.1</title>
	<main>
		<div class='container'>
			<div class='agent-selector'>
				<div class="tabs">
					<button on:click={() => setActiveTab(0)} class:active={$activeTab === 0}>Agents Owned</button>
					<button on:click={() => setActiveTab(1)} class:active={$activeTab === 1}>Only Show Teams Containing</button>
				</div>
				{#if $activeTab === 0}
					<h2>Select Owned Agents:</h2>
					{#if dataLoaded}
					<div class='agent-grid'>
						{#each Array.from(agents) as agent (agent)}
							<AgentCheckbox {agent} {checkedAgents} onImageClick={handleImageClick} />
						{/each}
					</div>
						<div class='button-group'>
							<button on:click={selectAll}>Select All</button>
							<button on:click={reset}>Reset</button>
						</div>
					{:else}
						<p>Loading agents...</p>
					{/if}
				{:else if $activeTab === 1}
					<div>
						<h2>Under development...</h2>
					</div>
				{/if}
			</div>
		
			<div class='possible-teams'>
				<h2>Possible Teams:</h2>
				<table>
					<thead>
						<!-- <tr>
							<th class='table-header'>Agent 1</th>
							<th class='table-header'>Agent 2</th>
							<th class='table-header'>Agent 3</th>
						</tr> -->
					</thead>
					<tbody class="team-table-body">
						{#each filteredTeams as team}
							<tr>
								{#each team.agents as agent}
									<td class='agent-card'>
										<img src={`Agents/${agent}.png`} alt={`${agent}`}/>
										<br>
										<p>{agent}</p>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>


			
		</div>
	</main>
	  

<script>
	import { onMount } from "svelte";
	import { writable } from 'svelte/store';
	import AgentCheckbox from "./AgentCheckbox.svelte";
	import Papa from 'papaparse';
	import { append } from "svelte/internal";
	import { filter } from "d3";

	let agents = new Set();
	let checkedAgents = writable(new Set());
	let agentAttributes = writable(new Map());
	let dataLoaded = false;

	let teams = []
	let filteredTeams = [];

	let searchQuery = '';
	let filteredAgents = writable(new Set());
	let teamRestrictions = writable(new Set());

	let searchInput;
		// Active tab index: 0 for "Agents Owned", 1 for "Exclude Agents"
		let activeTab = writable(0);

	// Function to set active tab
	function setActiveTab(index) {
		activeTab.set(index);
	}

	async function fetchData() {
		try {
			const response = await fetch('possible_teams.csv');
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const data = await response.text();
			Papa.parse(data, {
				header: true,
				complete: function (results) {
					teams = results.data.map(row => {
						let agentsList = [row['Agent 1'], row['Agent 2'], row['Agent 3']];
						agentsList.forEach(agent => agents.add(agent));
						return {
							agents: agentsList,
							notes: row['Notes']
						};
					});
					console.log('Data loaded.');
					console.log('Parsed teams:', teams);
					// Remove all empty strings strings and undefined values
					agents = new Set(Array.from(agents).filter(agent => agent).sort());
					console.log('Agents:', Array.from(agents));
					filteredAgents.set(Array.from(agents));
					dataLoaded = true;

					checkedAgents.set(new Set(agents));
				}
			});
			const attributeResponse = await fetch('agentAttributes.csv');
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			const attributeData = await attributeResponse.text();
			Papa.parse(attributeData, {
				header: true,
				complete: function (results) {
					const attributesMap = new Map();
					results.data.forEach(row => {
						const agent = row['Agent'];
						const element = row['Element'];
						const faction = row['Faction'];
						const fs = row['FS'];
						attributesMap.set(agent, { element, faction, fs });
					});
					agentAttributes.set(attributesMap);
				}
			});
		} catch (error) {
			console.error('Error fetching data:', error);
		}
	}

	onMount(() => {
		console.log('Fetching data');
		fetchData();
	});


	function handleImageClick(agent) {
		checkedAgents.update(checkedSet => {
			const updatedSet = new Set(checkedSet);
			if (updatedSet.has(agent)) {
				updatedSet.delete(agent);
			} else {
				updatedSet.add(agent);
			}
			return updatedSet;
		});
	}
	// Function to handle "Select All" button click
	function selectAll() {
		checkedAgents.set(new Set(agents));
	}

	// Function to handle "Reset" button click
	function reset() {
		checkedAgents.set(new Set());
	}

	function resetFilters() {
		teamRestrictions.set(new Set()); // Clear team restrictions
	}

	// Function to handle search input
	function handleSearchInput(event) {
		searchQuery = event.target.value.toLowerCase();
		filterAgents();
	}

	// Function to filter agents based on search query
	function filterAgents() {
		const searchQueryLower = searchQuery.toLowerCase();
		const filtered = Array.from(agents).filter(agent =>
			agent.toLowerCase().startsWith(searchQueryLower)
		);
		filteredAgents.set(new Set(filtered));
		console.log(filteredAgents);
	}

	function handleFilterChange(agent, isChecked) {
		teamRestrictions.update(currentSet => {
			const updatedSet = new Set(currentSet);
			if (isChecked) {
				updatedSet.add(agent);
			} else {
				updatedSet.delete(agent);
			}
			// Log the updated set
			console.log(Array.from(updatedSet));
			return updatedSet;
		});
	}

	function handleKeyPress(event) {
		console.log('Key pressed:', event.key);
		if (event.key === 'Enter') {
			console.log('Enter key pressed');
			let topmostAgent = Array.from($filteredAgents)[0];
			if (topmostAgent) {
				teamRestrictions.update(currentSet => {
					const updatedSet = new Set(currentSet);
					if (updatedSet.has(topmostAgent)) {
						updatedSet.delete(topmostAgent);
					} else {
						updatedSet.add(topmostAgent);
					}
					console.log(Array.from(updatedSet));
					searchQuery = ''; // Clear search query
					document.querySelector('.filter-agents input[type="text"]').value = ''; // Clear search input field
					// Reset filtered agents to all agents
					filteredAgents.set(Array.from(agents));
					return updatedSet;
				});
			}

		} else if (event.key === '`') {
			console.log('` key pressed');
			event.preventDefault(); // Prevent the backtick from being entered
			resetFilters();
		}
	}

	// Reactive statement to filter teams when `checkedAgents` changes
	$: {
		let agentsSet = new Set();
		
		checkedAgents.subscribe(set => {
			agentsSet = set;
			console.log("Checked Agents:", agentsSet);
			// Filter teams based on checkedAgents
			filteredTeams = teams.filter(team =>
				team.agents.every(agent => agentsSet.has(agent))
			);
		});

		let mustHaveSet = new Set();

		teamRestrictions.subscribe(set => {
			mustHaveSet = set;
			console.log("Must Have Agents:", mustHaveSet);
			
			if (mustHaveSet.size > 0) {
				// Further filter the previously filteredTeams based on mustHaveSet
				filteredTeams = filteredTeams.filter(team =>
					[...mustHaveSet].every(agent => team.agents.includes(agent))
				);
			} else {
				// If mustHaveSet is empty, use the result from the previous filter
				filteredTeams = teams.filter(team =>
					team.agents.every(agent => agentsSet.has(agent))
				);
			}
		});
	}

	// Reactive statement to keep the search input in focus for PC users
	$: {
		if (searchInput && !Device.isMobile) {
			searchInput.focus();
		}
	}


</script>

<style>
	main {
		display: flex; /* Use Flexbox for centering */
		justify-content: center; /* Center items horizontally */
		align-items: center; /* Center items vertically */
		width: 100%;
		height: 100%; /* Ensure it takes the full viewport height */
		margin: 0 auto;
		overflow-x: hidden;
		overflow-y: hidden; /* Hide vertical scrollbar */
	}

	body {
		background: #1e1e1e;
	}

	.container {
		width: 90%; /* Set container to take up 80% of the viewport width */
		display: grid;
		justify-items: center; /* Center items horizontally */
		grid-template-columns: 1fr 1fr; /* Adjust to make possible-teams wider */
		max-width: 100%;
		padding: 1em;
		max-height: 900px;
	}

	.agent-selector, .possible-teams {
		padding: 1em;
		margin: 1em;
		border: 5px solid #222; /* Optional: Add a border for visual separation */
		border-radius: 40px; /* Optional: Add rounded corners */
		box-shadow: 0px 0px 15px #111;
		color:white;
		min-width:500px;
		max-width:600px;
	}

	.agent-selector {
		background: #333; /* Optional: Add background color */
		overflow-y: auto;
		max-height: 750px;
		min-height: 750px;
		max-width: 100%;
	}

	.possible-teams {
		background: #444; /* Optional: Add background color */

	}

	.button-group {
		display: flex; /* Use Flexbox for button alignment */
		justify-content: center; /* Center buttons horizontally */
		margin-top: 1em;
	}

	.possible-teams h2, .possible-teams th {
		position:sticky;
		top: 0px;
		
	}

	.possible-teams table {
		justify-items: center;
		overflow-y: scroll;
		max-height: 650px;
		display: block;
		padding-left: 1em;
		padding-right: 1em;
		margin: 0 auto; /* Center the table */
		width: 100%;
		border-collapse: collapse;
	}


	.agent-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr); /* 5 columns layout */
		justify-items: center; /* Center images in their grid cells */
		gap:1em;
		row-gap: 0em;
		margin-right: 0em; /* Space above the grid */

		max-height: 600px;
		overflow-y: auto; /* Allow scrolling if text is too long */
	}

	.agent-card {
		text-align: center;
	}

	.agent-card img {
		width: 100px; /* Adjust size as needed */
		height: auto;
		border-radius: 8px; /* Optional: Add rounded corners to images */
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Optional: Add a shadow for better visuals */
		margin-bottom: 5px; /* Space between image and text */
	}

	.agent-card p {
		margin: 0;
		font-size: 14px; /* Adjust font size as needed */
	}



	.table-header {
		font-weight: bold;
		text-align: center;
	}

	.button-group {
		margin-top: 1em;
	}

	.tabs {
		display: flex;
		justify-content: center;
		margin-bottom: 1em;
		width: 100%;
	}

	button {
		margin-right: 0.5em;
		padding: 0.5em 1em;
		border: none;
		border-radius: 4px;
		background-color: #007bff;
		color: white;
		cursor: pointer;
	}

	button:hover {
		background-color: #0056b3;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
		text-align: center;
	}

	h2 {
		text-align: center;
	}

	th, td {
		border: 1px solid #ddd;
		text-align: left;
	}

	th {
		background-color: #f4f4f4;
		padding: 0.5em;
		font-size: 1.2em;
	}

	td {
		padding:1em;
	}

	.possible-teams table::-webkit-scrollbar {
		display:none;
	}
	.agent-grid::-webkit-scrollbar {
		display:none;
	}
</style>