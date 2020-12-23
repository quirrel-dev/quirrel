<template>
  <form v-on:submit.prevent="sendMessage">
    <h1>
      Send a greeting!
    </h1>

    <label>
      Name
      <input required name="name" v-model="name" />
    </label>

    <button type="submit">Enqueue</button>
  </form>
</template>

<script>
export default {
  data: () => ({
    name: ""
  }),
  methods: {
    sendMessage() {
      fetch("/api/enqueueGreeting", { method: "POST", body: this.name })
      this.name = ""
    }
  }
};
</script>
