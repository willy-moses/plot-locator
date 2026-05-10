'use client';
import dynamic from 'next/dynamic';

const PlotLocator = dynamic(() => import('@/components/PlotLocator'), { ssr: false });

export default function Home() {
  return <PlotLocator />;
}
