import { ReactFlowProvider } from '@xyflow/react';
import { AppShell } from '@/components';
import { useThemeEffect } from '@/lib';

export default function App() {
  useThemeEffect();

  return (
    <ReactFlowProvider>
      <AppShell />
    </ReactFlowProvider>
  );
}
