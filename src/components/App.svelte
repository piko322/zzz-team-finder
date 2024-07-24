<script>
	import { onMount } from "svelte";
	import { writable } from 'svelte/store';
	import AgentCheckbox from "./AgentCheckbox.svelte";
	import Papa from 'papaparse';
	import { append } from "svelte/internal";
	import { filter } from "d3";

	let agents = new Set();
	let checkedAgents = writable(new Set());
	let dataLoaded = false;

	let teams = []
	let filteredTeams = [];

	let searchQuery = '';
	let filteredAgents = writable(new Set());
	let teamRestrictions = writable(new Set());

	let searchInput;

	onMount(() => {
        console.log('Fetching data');
        fetch('/possible_teams.csv')
            .then(response => response.text())
            .then(data => {
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
                        console.log('Agents:', Array.from(agents));
                        agents = new Set(Array.from(agents).sort());
						filteredAgents.set(Array.from(agents));
						dataLoaded = true;

						checkedAgents.set(new Set(agents));
                    }
                });
            });
    });

	console.log('test');


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

		}
	}

	function refocus() {
		searchInput.focus();
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

	// Reactive statement to keep the search input in focus
	$: {
		if (searchInput) {
			searchInput.focus();
		}
	}

	
	</script>
	<title>ZZZ Team Finder v1.0</title>
	<main>
		<div class='container'>
			<div class='agent-selector'>
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
			</div>
		
			<div class='possible-teams'>
				<h2>Possible Teams:</h2>
				<table>
					<thead>
						<tr>
							<th class='table-header'>Agent 1</th>
							<th class='table-header'>Agent 2</th>
							<th class='table-header'>Agent 3</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTeams as team}
							<tr>
								{#each team.agents as agent}
									<td class='agent-card'>
										<img src={`/Agents/${agent}.png`}/>
										<br>
										<p>{agent}</p>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class='agent-filter'>
				<h2>Only Show Teams Containing:</h2>
				<div class='filter-agents'>
					<input type="text" class='search-input' placeholder="Search agents..." 
							on:input={handleSearchInput} 
							on:keypress={handleKeyPress}
							on:blur={refocus}
							bind:this={searchInput}/>
					<ul>
						{#each $filteredAgents as agent (agent)}
							<li>
								<input type="checkbox" id={agent}
									checked={$teamRestrictions.has(agent)}
									on:change="{event => handleFilterChange(agent, event.target.checked)}" />
						 <label for={agent}>{agent}</label>
							</li>
						{/each}
					</ul>
				</div>
				<div class="filter-buttons">
					<button on:click={resetFilters}>Reset Filters</button> <!-- New button -->
				</div>
			</div>
			
		</div>
	</main>
	  

	<style>
		main {
			display: flex; /* Use Flexbox for centering */
			justify-content: center; /* Center items horizontally */
			align-items: center; /* Center items vertically */
			width: 100%;
			height: 100%; /* Ensure it takes the full viewport height */
			padding: 1em;
			margin: 0 auto;
		}

		.container {
			width: 90%; /* Set container to take up 80% of the viewport width */
			display: grid;
			grid-template-columns: 1fr 2fr 1fr; /* Adjust to make possible-teams wider */
			max-width: 100%;
		}

		.agent-selector, .possible-teams, .agent-filter {
			padding: 1em;
			margin: 1em;
			border: 1px solid #ddd; /* Optional: Add a border for visual separation */
			border-radius: 4px; /* Optional: Add rounded corners */
		}

		.agent-selector {
			background: #f9f9f9; /* Optional: Add background color */
		}

		.possible-teams {
			background: #fff; /* Optional: Add background color */
		}

		.filter-agents {
			border-left: 1px solid #ccc;
			padding-left: 1em;
		}

		.agent-grid {
			display: grid;
			grid-template-columns: repeat(5, 1fr); /* 5 columns layout */
			gap: 0.5em; /* Space between images */
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

		.search-input {
			width: 80%;
			padding: 10px 20px;
			font-size: 16px;
			border: 1px solid #ddd;
			border-radius: 25px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			transition: border-color 0.3s, box-shadow 0.3s;
		}

		.search-input:focus {
			outline: none;
			border-color: #007bff;
			box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
		}

		.filter-buttons {
			margin-top: 1em;
		}

		.filter-buttons button {
			margin-right: 0.5em;
			padding: 0.5em 1em;
			border: none;
			border-radius: 4px;
			background-color: #007bff;
			color: white;
			cursor: pointer;
		}

		.filter-buttons button:hover {
			background-color: #0056b3;
		}


		.table-header {
			font-weight: bold;
			text-align: center;
		}

		.button-group {
			margin-top: 1em;
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

		table {
		width: 100%;
			border-collapse: collapse;
		}

		th, td {
			border: 1px solid #ddd;
			padding: 0.5em;
			text-align: left;
		}

		th {
			background-color: #f4f4f4;
		}

	</style>