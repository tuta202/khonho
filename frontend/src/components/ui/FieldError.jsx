export function FieldError({ error }) {
  if (!error) return null
  return <p className="field-error mt-1 text-sm text-red-600">{error}</p>
}
