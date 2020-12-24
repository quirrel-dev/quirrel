import enqueueGreeting from "app/mutations/enqueueGreeting"

export default function Home() {
  return (
    <form
      onSubmit={async (evt) => {
        evt.preventDefault()

        const target = evt.currentTarget

        const form = new FormData(target)

        await enqueueGreeting(form.get("name") as string)

        target.reset()
      }}
    >
      <h1>Enqueue a Greeting!</h1>
      <label>
        Name
        <input name="name" />
      </label>

      <button type="submit">Enqueue</button>
    </form>
  )
}
