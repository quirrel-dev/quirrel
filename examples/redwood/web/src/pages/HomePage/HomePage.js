import { Form, Submit, TextField } from '@redwoodjs/forms'
import { useForm } from 'react-hook-form'
import { useMutation } from '@redwoodjs/web'

const ENQUEUE_GREETING = gql`
  mutation EnqueueGreetingMutation($name: String!) {
    enqueueGreeting(name: $name)
  }
`

export default () => {
  const form = useForm()
  const [enqueueGreeting] = useMutation(ENQUEUE_GREETING)

  const onSubmit = async () => {
    const name = form.getValues('name')

    await enqueueGreeting({
      variables: {
        name,
      },
    })

    form.reset()
  }

  return (
    <main>
      <h1>Enqueue a greeting!</h1>
      <Form onSubmit={onSubmit} formMethods={form}>
        <label>
          Name
          <TextField name="name" />
        </label>

        <Submit>Enqueue</Submit>
      </Form>
    </main>
  )
}
