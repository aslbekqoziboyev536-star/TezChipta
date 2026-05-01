import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Terminal } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function SiteConsole() {
  const [speed, setSpeed] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // In production, io() connects to the same host that serves the page.
    // In dev (Vite), it needs to point to the server port (5174).
    const socketUrl = import.meta.env.DEV ? 'http://localhost:5174' : '/';
    socketRef.current = io(socketUrl);

    socketRef.current.on('server_speed_update', (data: { speed: number, history: number[] }) => {
      setSpeed(data.speed);
      setHistory(data.history);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const renderChart = () => {
    const height = 10;
    const width = 60;
    let lines = [];

    for (let y = height; y > 0; y--) {
      let row = <span className="text-gray-500 mr-2">|</span>;
      let chars = [];
      for (let x = 0; x < width; x++) {
        // Find the history value at this x-position. 
        // history is 60 elements long.
        const val = (history[x] / 100) * height;
        if (val >= y) {
          chars.push(<span key={x} className="text-emerald-500">█</span>);
        } else if (val >= y - 0.5) {
          chars.push(<span key={x} className="text-emerald-500">▄</span>);
        } else {
          chars.push(<span key={x} className="inline-block w-[1ch]">&nbsp;</span>);
        }
      }
      lines.push(<div key={y} className="flex whitespace-pre">{row}{chars}</div>);
    }
    
    lines.push(<div key="bottom" className="text-gray-500 flex items-center"><span className="mr-2">+</span>{'-'.repeat(width)}</div>);
    lines.push(
      <div key="labels" className="text-gray-500 flex justify-between w-full max-w-[62ch] pl-4">
        <span>60 seconds</span>
        <span>0</span>
      </div>
    );

    return lines;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-4 md:p-8 font-mono">
      <header className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors border-0 h-auto"
            leftIcon={<ArrowLeft className="w-6 h-6 text-emerald-500" />}
          />
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight">Server Console</h1>
          </div>
        </div>
      </header>

      <div className="bg-black/60 border border-white/10 rounded-2xl p-4 md:p-8 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto overflow-x-auto">
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="text-xs text-white/30 ml-2">bash — stats_monitor.sh — 80x24</span>
        </div>

        <div className="space-y-4">
          <div className="text-cyan-400 font-bold text-lg">
            speed of server: {speed}%
          </div>
          
          <div className="leading-none text-[0.7rem] sm:text-base select-none overflow-hidden">
            {history.length > 0 ? (
              <div className="space-y-0">
                {renderChart()}
              </div>
            ) : (
              <div className="text-white/20 animate-pulse italic py-10">
                Awaiting connection to server telemetry stream...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 max-w-4xl mx-auto text-white/10 text-[10px] text-center uppercase tracking-widest">
        &copy; 2024 TezChipta System Monitor v1.0.4
      </div>
    </div>
  );
}
