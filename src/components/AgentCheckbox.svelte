<script>
  import { onDestroy } from 'svelte';
  import { tick } from 'svelte';

  export let agent;
  export let checkedAgents;
  export let mustHaveAgents;
  export let context;

  let checked = false;
  let checked2 = false;

  // Subscribe to `checkedAgents` store
  const unsubscribe = checkedAgents.subscribe(agentsSet => {
    checked = agentsSet.has(agent);
  });

  const unsubscribe2 = mustHaveAgents.subscribe(mustHaveSet => {
    checked2 = mustHaveSet.has(agent);
  });

  onDestroy(() => {
    unsubscribe(); // Clean up subscription when the component is destroyed
    unsubscribe2(); // Clean up subscription when the component is destroyed
  });

  function toggleImage(usedSet) {
    let checkBox = context === 'owned' ? checked : checked2;
    checkBox = !checkBox; // Toggle the checkbox state
    usedSet.update(usedSet => {
      const updatedSet = new Set(usedSet); // Create a copy to avoid direct mutation
      if (checkBox) {
        if (context === 'owned') {updatedSet.add(agent);}
        else {
          if (usedSet.size < 3) {
            updatedSet.add(agent); // Add the agent to the set if not already present
          } else {
            // Remove the first added agent if the set is full
            const firstAgent = Array.from(usedSet)[0]; // Get the first agent in the set
            updatedSet.delete(firstAgent); // Remove the first agent
            updatedSet.add(agent); // Add the new agent
          }
        }
      } else {
        updatedSet.delete(agent);
      }
      return updatedSet; // Return the updated set
    });
    // Force update the UI
    tick().then(() => {
      // Any additional logic after the UI update
    });
  }
</script>

<div>
  {#if context === 'owned'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img
    src={`Agents/${agent}.png`}
    alt={agent}
    class="agent-image {checked ? 'selected' : ''}"
    on:click={() => toggleImage(checkedAgents)}
  />
  {:else if context === 'mustHave'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img
    src={`Agents/${agent}.png`}
    alt={agent}
    class="agent-image {checked2 ? 'selected' : ''}"
    on:click={() => toggleImage(mustHaveAgents)}
  />
  {/if}
  <p>{agent}</p>
</div>
