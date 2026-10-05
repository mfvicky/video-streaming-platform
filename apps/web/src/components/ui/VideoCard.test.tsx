import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { VideoCard } from './VideoCard';

const mockVideo = {
  id: 'v-1',
  title: 'Sample Video',
  description: 'Test description',
  thumbnail: 'https://example.com/thumb.jpg',
  duration: '2:00',
  views: '100 views', // Updated from number to string
  createdAt: '2026-09-01T00:00:00.000Z',
  creator: 'creator1',
};

describe('VideoCard Component', () => {
  it('renders video details correctly', () => {
    render(
      <MemoryRouter>
        <VideoCard {...mockVideo} />
      </MemoryRouter>
    );

    expect(screen.getByText('Sample Video')).toBeInTheDocument();
    expect(screen.getByText('creator1')).toBeInTheDocument();
  });
});