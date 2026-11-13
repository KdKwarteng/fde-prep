const styles = {
  easy: "text-accent border-accent",
  medium: "text-warn border-warn",
  hard: "text-danger border-danger",
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: keyof typeof styles }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[difficulty]}`}>
      {difficulty}
    </span>
  );
}
