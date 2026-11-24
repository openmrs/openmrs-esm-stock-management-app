import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWorkspaceMaximized } from './use-workspace-maximized.hook';

const Probe = ({ element }: { element: HTMLElement | null }) => {
  const maximized = useWorkspaceMaximized(element);
  return <div>{maximized ? 'expanded' : 'collapsed'}</div>;
};

const ProbeHost = ({ ancestorPosition }: { ancestorPosition: React.CSSProperties['position'] }) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  return (
    <div style={{ position: ancestorPosition }}>
      <div ref={setElement} />
      <Probe element={element} />
    </div>
  );
};

describe('useWorkspaceMaximized', () => {
  it('reports collapsed when no ancestor is fixed-positioned', () => {
    render(<ProbeHost ancestorPosition="absolute" />);

    expect(screen.getByText('collapsed')).toBeInTheDocument();
  });

  it('reports expanded when an ancestor is fixed-positioned, as a maximized workspace window is', () => {
    render(<ProbeHost ancestorPosition="fixed" />);

    expect(screen.getByText('expanded')).toBeInTheDocument();
  });

  it('handles a null element', () => {
    render(<Probe element={null} />);

    expect(screen.getByText('collapsed')).toBeInTheDocument();
  });
});
