import { ConnectionStatus } from '@/lib/api';

interface ConnectButtonProps {
  status: ConnectionStatus;
  onClick: () => void;
}

export function ConnectButton({ status, onClick }: ConnectButtonProps) {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      {isConnected && (
        <>
          <div className="absolute w-72 h-72 rounded-full border border-green-500/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute w-60 h-60 rounded-full border border-green-500/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
        </>
      )}
      {isConnecting && (
        <div className="absolute w-64 h-64 rounded-full border-2 border-primary/40 animate-spin" style={{ animationDuration: '2s' }} />
      )}

      {/* Button */}
      <button
        onClick={onClick}
        disabled={isConnecting}
        className={`
          relative w-52 h-52 rounded-full font-display font-bold text-xl
          transition-all duration-500 select-none
          flex flex-col items-center justify-center gap-2
          ${isConnected
            ? 'bg-green-500/20 border-4 border-green-500 text-green-400 shadow-[0_0_60px_rgba(34,197,94,0.4)]'
            : isConnecting
            ? 'bg-primary/10 border-4 border-primary/50 text-primary/70 cursor-not-allowed'
            : 'bg-primary/10 border-4 border-primary text-primary shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_70px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95'
          }
        `}
      >
        <div className={`w-16 h-16 flex items-center justify-center ${isConnecting ? 'animate-spin' : ''}`}>
          {isConnected ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-14 h-14" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : isConnecting ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-14 h-14" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-14 h-14" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
            </svg>
          )}
        </div>
        <span className="text-base tracking-wider">
          {isConnected ? 'DISCONNECT' : isConnecting ? 'CONNECTING' : 'CONNECT'}
        </span>
      </button>
    </div>
  );
}
