import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoList } from './VideoList';
import * as creatorApi from '../api/creator.api';
import { toast } from 'react-toastify';

// Mock creator API module
vi.mock('../api/creator.api', () => ({
  getMyVideos: vi.fn(),
  retryVideoProcessingApi: vi.fn(),
  deleteVideoApi: vi.fn(),
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe('VideoList Component', () => {
  const mockOnSelectVideo = vi.fn();
  const mockCreatorId = 'creator-123';

  const mockVideos: creatorApi.CreatorVideo[] = [
    {
      id: 'vid-1',
      title: 'Ready Stream',
      status: 'READY',
      rawPath: '/raw/vid-1.mp4',
      thumbnailPath: '/thumbs/vid-1.jpg',
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-01T10:00:00Z',
    },
    {
      id: 'vid-2',
      title: 'Failed Stream',
      status: 'FAILED',
      rawPath: '/raw/vid-2.mp4',
      thumbnailPath: null,
      createdAt: '2026-03-02T12:00:00Z',
      updatedAt: '2026-03-02T12:00:00Z',
    },
    {
      id: 'vid-3',
      title: 'Processing Stream',
      status: 'PROCESSING',
      rawPath: '/raw/vid-3.mp4',
      thumbnailPath: null,
      createdAt: '2026-03-03T14:00:00Z',
      updatedAt: '2026-03-03T14:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure window.confirm is defined as a mock function in JSDOM environment
    window.confirm = vi.fn();
  });

  it('renders loading state initially and then displays fetched videos', async () => {
    vi.spyOn(creatorApi, 'getMyVideos').mockResolvedValueOnce(mockVideos);

    render(<VideoList creatorId={mockCreatorId} onSelectVideo={mockOnSelectVideo} />);

    expect(screen.getByText(/loading videos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ready Stream')).toBeInTheDocument();
      expect(screen.getByText('Failed Stream')).toBeInTheDocument();
      expect(screen.getByText('Processing Stream')).toBeInTheDocument();
    });

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders empty state when no videos are returned', async () => {
    vi.spyOn(creatorApi, 'getMyVideos').mockResolvedValueOnce([]);

    render(<VideoList creatorId={mockCreatorId} onSelectVideo={mockOnSelectVideo} />);

    await waitFor(() => {
      expect(screen.getByText(/no uploaded videos found/i)).toBeInTheDocument();
    });
  });

  it('triggers onSelectVideo when clicking the Preview button on a READY video', async () => {
    vi.spyOn(creatorApi, 'getMyVideos').mockResolvedValueOnce(mockVideos);

    render(<VideoList creatorId={mockCreatorId} onSelectVideo={mockOnSelectVideo} />);

    await waitFor(() => {
      expect(screen.getByText('Ready Stream')).toBeInTheDocument();
    });

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(mockOnSelectVideo).toHaveBeenCalledWith('vid-1');
  });

  it('handles retry video processing action', async () => {
    vi.spyOn(creatorApi, 'getMyVideos').mockResolvedValue(mockVideos);
    vi.spyOn(creatorApi, 'retryVideoProcessingApi').mockResolvedValueOnce(undefined);

    render(<VideoList creatorId={mockCreatorId} onSelectVideo={mockOnSelectVideo} />);

    await waitFor(() => {
      expect(screen.getByText('Failed Stream')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(creatorApi.retryVideoProcessingApi).toHaveBeenCalledWith('vid-2');
      expect(toast.info).toHaveBeenCalledWith('Video re-queued for processing');
    });
  });

  it('handles video deletion after confirmation', async () => {
    vi.spyOn(creatorApi, 'getMyVideos').mockResolvedValueOnce(mockVideos);
    vi.spyOn(creatorApi, 'deleteVideoApi').mockResolvedValueOnce(undefined);
    vi.mocked(window.confirm).mockReturnValueOnce(true);

    render(<VideoList creatorId={mockCreatorId} onSelectVideo={mockOnSelectVideo} />);

    await waitFor(() => {
      expect(screen.getByText('Ready Stream')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete video');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this video? This cannot be undone.'
    );

    await waitFor(() => {
      expect(creatorApi.deleteVideoApi).toHaveBeenCalledWith('vid-1');
      expect(screen.queryByText('Ready Stream')).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Video deleted successfully');
    });
  });

  it('cancels video deletion when prompt is dismissed', async () => {
    vi.spyOn(creatorApi, 'getMyVideos').mockResolvedValueOnce(mockVideos);
    vi.mocked(window.confirm).mockReturnValueOnce(false);

    render(<VideoList creatorId={mockCreatorId} onSelectVideo={mockOnSelectVideo} />);

    await waitFor(() => {
      expect(screen.getByText('Ready Stream')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete video');
    fireEvent.click(deleteButtons[0]);

    expect(creatorApi.deleteVideoApi).not.toHaveBeenCalled();
    expect(screen.getByText('Ready Stream')).toBeInTheDocument();
  });
});