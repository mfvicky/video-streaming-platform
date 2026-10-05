import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoCard } from './VideoCard';
import { type FeedVideo } from '../api/feed.api';

describe('VideoCard Component', () => {
  const mockOnSelect = vi.fn();

  const mockVideo: FeedVideo = {
    id: 'video-123',
    title: 'Test Video Title',
    description: 'This is a test video description.',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    createdAt: '2026-03-15T10:00:00Z',
    user: {
      id: 'user-1',
      name: 'JohnDoe',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders video details correctly including thumbnail, title, description, user, and date', () => {
    render(<VideoCard video={mockVideo} onSelect={mockOnSelect} />);

    const img = screen.getByRole('img', { name: 'Test Video Title' }) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/thumbnail.jpg');

    expect(screen.getByRole('heading', { level: 4, name: 'Test Video Title' })).toBeInTheDocument();
    expect(screen.getByText('This is a test video description.')).toBeInTheDocument();
    expect(screen.getByText('@JohnDoe')).toBeInTheDocument();
    expect(screen.getByText(new Date(mockVideo.createdAt).toLocaleDateString())).toBeInTheDocument();
  });

  it('renders "Untitled Video" fallback when video title is empty or missing', () => {
    const videoWithoutTitle = { ...mockVideo, title: '' };
    render(<VideoCard video={videoWithoutTitle} onSelect={mockOnSelect} />);

    expect(screen.getByRole('heading', { level: 4, name: 'Untitled Video' })).toBeInTheDocument();
  });

  it('renders fallback UI when thumbnailUrl is not provided', () => {
    const videoWithoutThumbnail = { ...mockVideo, thumbnailUrl: undefined };
    render(<VideoCard video={videoWithoutThumbnail} onSelect={mockOnSelect} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No Preview')).toBeInTheDocument();
  });

  it('renders fallback UI when thumbnail image triggers an onError event', () => {
    render(<VideoCard video={mockVideo} onSelect={mockOnSelect} />);

    const img = screen.getByRole('img', { name: 'Test Video Title' });
    
    // Trigger image loading failure
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No Preview')).toBeInTheDocument();
  });

  it('does not render description paragraph if description is absent', () => {
    const videoWithoutDesc = { ...mockVideo, description: undefined };
    render(<VideoCard video={videoWithoutDesc} onSelect={mockOnSelect} />);

    expect(screen.queryByText('This is a test video description.')).not.toBeInTheDocument();
  });

  it('triggers onSelect callback with video ID when clicked', () => {
    render(<VideoCard video={mockVideo} onSelect={mockOnSelect} />);

    const cardContainer = screen.getByRole('heading', { level: 4, name: 'Test Video Title' }).closest('div.cursor-pointer');
    expect(cardContainer).not.toBeNull();

    if (cardContainer) {
      fireEvent.click(cardContainer);
    }

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith('video-123');
  });
});