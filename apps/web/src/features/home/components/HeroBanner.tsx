import React from 'react';
import { Button } from '../../../components/ui/Button';

export const HeroBanner: React.FC = () => {
  return (
    <section className="relative h-[75vh] flex items-center justify-start px-8 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80"
          alt="Featured Stream"
          className="w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-2xl space-y-6">
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-500 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Broadcast
        </span>

        <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
          STREAM WITHOUT <span className="text-red-600">BOUNDARIES</span>.
        </h1>

        <p className="text-slate-300 text-base lg:text-lg">
          High-bitrate low-latency video processing powered by distributed storage and real-time transcode pipelines.
        </p>

        <div className="flex items-center gap-4 pt-2 max-w-sm">
          <Button variant="primary">Start Watching</Button>
          <Button variant="outline">Browse Channels</Button>
        </div>
      </div>
    </section>
  );
};