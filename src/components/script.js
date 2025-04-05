
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