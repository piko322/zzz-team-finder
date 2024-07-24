<script>
  import { onDestroy } from 'svelte';
  import { tick } from 'svelte';
  import { get } from 'svelte/store';

  export let agent;
  export let checkedAgents;
  export let onImageClick;

  let checked = false;

  // Subscribe to `checkedAgents` store
  const unsubscribe = checkedAgents.subscribe(agentsSet => {
    checked = agentsSet.has(agent);
  });

  onDestroy(() => {
    unsubscribe(); // Clean up subscription when the component is destroyed
  });

  function toggleImage() {
    checked = !checked;
    checkedAgents.update(agentsSet => {
      const updatedSet = new Set(agentsSet); // Create a copy to avoid direct mutation
      if (checked) {
        updatedSet.add(agent);
      } else {
        updatedSet.delete(agent);
      }
      onImageClick(agent, checked);
      return updatedSet; // Return the updated set
    });
    // Force update the UI
    tick().then(() => {
      // Any additional logic after the UI update
    });
  }
</script>

<div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <img
    src={`/Agents/${agent}.png`}
    alt={agent}
    class="agent-image {checked ? 'selected' : ''}"
    on:click={toggleImage}
  />
  <p style='text-align: center; '>{agent}</p>
</div>

<style>
  .agent-image {
    width: 100px; /* Adjust size as needed */
    cursor: pointer;
    border: 3px solid transparent; /* Default border */
    border-radius: 8px; /* Rounded corners */
    transition: border-color 0.3s; /* Smooth border color transition */
  }

  .agent-image.selected {
    border-color: #007bff; /* Border color when selected */
  }

  

</style>