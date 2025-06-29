<title>ZZZ Team Finder v2.0</title>
<header>
	<link rel="stylesheet" href="style.css">
</header>
<body>
	<div class='container'>
		<div class='agent-selector'>
			<div class="tabs">
				<button on:click={() => setActiveTab(0)} class:active={$activeTab === 0}>Agents Owned</button>
				<button on:click={() => setActiveTab(1)} class:active={$activeTab === 1}>Only Show Teams With...</button>
			</div>
			
			{#if $activeTab === 0}
				<!-- <h2>Select Owned Agents:</h2> -->
				{#if dataLoaded}
				<div class='agent-grid owned'>
					{#each Array.from(agents) as agent (agent)}
						<AgentCheckbox context='owned' {agent} {checkedAgents} {mustHaveAgents} />
					{/each}
				</div>
				<div class='button-group'>
					<button on:click={()=>selectAll(checkedAgents)}>Select All</button>
					<button on:click={()=>reset(checkedAgents)}>Deselect All</button>
				</div>
				{:else}

					<p>Loading agents...</p>

				{/if}
			{:else if $activeTab === 1}
				<!-- <h2>Select Agents You Want in the Team:</h2> -->
				<div class='agent-grid mustHave'>
					<!-- Show all agents in the checkedAgents list -->
					 {#each Array.from($filteredAgents).filter(agent=>$checkedAgents.has(agent)) as agent (agent)}
					 	<AgentCheckbox context="mustHave" {agent} {checkedAgents} {mustHaveAgents} />
					 {/each}
				</div>
				<div class='button-group'>
					<button on:click={()=>reset(mustHaveAgents)}>Deselect All</button>
				</div>
			{/if}
		</div>
	
		<div class='possible-teams'>
			<h2><span id="teamCount"></span> Team(s) Found</h2>
			<table>
				<thead>
					<!-- <tr>
						<th class='table-header'>Agent 1</th>
						<th class='table-header'>Agent 2</th>
						<th class='table-header'>Agent 3</th>
					</tr> -->
				</thead>
				<tbody class="team-table-body">
					{#if filteredTeams.length > 0}
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
					{:else}
							<div>
								<h2 style='color:#d29797'>No teams found with the selected agents.</h2>
							</div>
					{/if}
						
					
				</tbody>
			</table>
		</div>


		
	</div>
</body>
	  

<script>
	import { onMount } from "svelte";
	import { writable } from 'svelte/store';
	import AgentCheckbox from "./AgentCheckbox.svelte";
	import Papa from 'papaparse';

	let loaded = false;
	let agents = new Set();
	let checkedAgents = writable(new Set());
	let agentAttributes = writable(new Map());
	let dataLoaded = false;

	let teams = []
	let filteredTeams = [];

	let searchQuery = '';
	let filteredAgents = writable(new Set());
	let mustHaveAgents = writable(new Set());

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

					checkedAgents.set(new Set(["Anby", "Nicole", "Billy"]));
				}
			});
			const attributeResponse = await fetch('agent_attributes.csv');
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
		const height = window.innerHeight;
		const width = window.innerWidth;
		if (width < 500 || height < 750) {
			alert("Sorry, but this app is not optimized for smaller screens.")
		} else{
			console.log('Fetching data');
			fetchData();
			loaded = true;
		}
	});

	// Function to handle "Select All" button click
	function selectAll(applyToSet) {
		console.log(applyToSet)
		applyToSet.set(new Set(agents));
	}

	// Function to handle "reset" button click of the "Agents Owned" tab
	function reset(applyToSet) {
		applyToSet.set(new Set());
	}



	function resetMustHave() {
		mustHave.set(new Set()); // Clear team restrictions
	}

	// For the "Agents Owned" tab
	$: {
		const agentsSet = $checkedAgents;
		const mustHaveSet = $mustHaveAgents;
		// console.log("Checked Agents:", agentsSet);
		
		// Have mustHave always be a subset of checkedAgents
		const intersection = new Set([...mustHaveSet].filter(agent => agentsSet.has(agent)));
		// mustHaveSet.set(intersection);
		// console.log("Team Restrictions Set:", mustHaveSet);
		// console.log("Intersection:", intersection);
		mustHaveAgents.set(intersection);

		filteredTeams = teams
			.filter(team =>
				[...mustHaveSet].every(agent => team.agents.includes(agent))
			)
			.filter(team =>
				team.agents.every(agent => agentsSet.has(agent))
			);
		if (loaded) {
			const teamCount = document.getElementById("teamCount");
			teamCount.innerText = filteredTeams.length;
		}
	}

</script>

