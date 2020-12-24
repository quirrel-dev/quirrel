export default function Home() {
  return (
    <form
      onSubmit={async (evt) => {
        evt.preventDefault();

        const target = evt.currentTarget;

        const form = new FormData(target);
        await fetch("/api/enqueueGreeting", {
          method: "POST",
          body: JSON.stringify({
            name: form.get("name"),
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        target.reset();
      }}
    >
      <h1>Enqueue a Greeting!</h1>
      <label>
        Name
        <input name="name" />
      </label>

      <button type="submit">Enqueue</button>
    </form>
  );
}
