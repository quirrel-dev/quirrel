<script lang="ts">
  let name = "";

  async function submit(evt) {
    evt.preventDefault();

    await window.fetch("/enqueueGreeting", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    window.alert("Greeting was enqueued successfully!");

    evt.target.reset();
  }
</script>

<main>
  <form on:submit={submit}>
    <h1>Enqueue a Greeting!</h1>
    <label>
      Name
      <input bind:value={name} />
    </label>

    <button type="submit">Enqueue</button>
  </form>
</main>
