import type { Metadata } from 'next';
import { CognitionMirrorWorkspace } from '@/components/valhalla-mirror/CognitionMirrorWorkspace';

export const metadata: Metadata = {
  title: 'Cognition Mirror — Valhalla Swarm of Devins',
  description:
    'A Devin-parity Valhalla workspace with planner, agent switcher, terminal, editor, browser, and PR/CI panes.',
};

export default function CognitionMirrorPage() {
  return <CognitionMirrorWorkspace />;
}
