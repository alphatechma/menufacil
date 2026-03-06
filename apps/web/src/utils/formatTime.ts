export function formatDistanceToNow(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min atras`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atras`;
  return `${Math.floor(seconds / 86400)}d atras`;
}
