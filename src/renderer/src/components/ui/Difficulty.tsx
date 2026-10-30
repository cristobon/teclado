const LABELS = ['', 'Muy fácil', 'Fácil', 'Intermedia', 'Difícil', 'Muy difícil']

export function Difficulty({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`Dificultad estimada: ${LABELS[value] ?? value}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-3 rounded-full ${i <= value ? 'bg-accent' : 'bg-line'}`}
        />
      ))}
    </span>
  )
}
