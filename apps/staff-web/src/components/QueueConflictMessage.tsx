interface QueueConflictMessageProps {
  message: string;
}

export function QueueConflictMessage({ message }: QueueConflictMessageProps) {
  return (
    <div className="queue-conflict" role="status">
      <strong>Claim conflict</strong>
      <p>{message}</p>
    </div>
  );
}
