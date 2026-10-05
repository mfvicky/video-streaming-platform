import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatorStudioPage } from './CreatorStudioPage';
import * as creatorApi from '../api/creator.api';

// Response types for API mocks
interface VideoStreamResponse {
  success: boolean;
  streamUrl?: string;
  message?: string;
}

interface VideoThumbnailResponse {
  success: boolean;
  thumbnailUrl?: string;
}

// Mock child layout components
vi.mock('../../../components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock('../../../components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

// Mock creator feature components
vi.mock('../components/VideoUploader', () => ({
  VideoUploader: ({ onSuccess }: { onSuccess: (id: string) => void }) => (
    <div>
      <button onClick={() => onSuccess('uploaded-vid-123')}>Mock Upload Success</button>
    </div>
  ),
}));

vi.mock('../components/HlsPlayer', () => ({
  HlsPlayer: ({ src, poster }: { src: string; poster?: string }) => (
    <div data-testid="hls-player">
      <span>Stream: {src}</span>
      <span>Poster: {poster}</span>
    </div>
  ),
}));

vi.mock('../components/VideoList', () => ({
  VideoList: ({ onSelectVideo }: { onSelectVideo: (id: string) => void }) => (
    <div>
      <button onClick={() => onSelectVideo('selected-vid-456')}>Select Video</button>
    </div>
  ),
}));

// Mock creator API calls
vi.mock('../api/creator.api', () => ({
  getVideoStreamUrl: vi.fn(),
  getVideoThumbnailUrl: vi.fn(),
}));

describe('CreatorStudioPage Component', () => {
  const mockUser = { id: 'user-789' };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.alert = vi.fn();
  });

  it('renders page layout and error state when user is not logged in', () => {
    render(<CreatorStudioPage />);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();

    // Targeted query for the header element specifically
    expect(
      screen.getByRole('heading', { name: /creator studio/i, level: 1 })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Unable to load creator profile from local storage/i)
    ).toBeInTheDocument();
  });

  it('renders VideoList when creator user exists in localStorage', () => {
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(<CreatorStudioPage />);

    expect(screen.getByText('Select Video')).toBeInTheDocument();
    expect(
      screen.queryByText(/Unable to load creator profile from local storage/i)
    ).not.toBeInTheDocument();
  });

  it('loads stream and thumbnail successfully when clicking Load Stream button', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));

    const mockStreamResponse: VideoStreamResponse = {
      success: true,
      streamUrl: 'https://example.com/stream.m3u8',
    };
    const mockThumbnailResponse: VideoThumbnailResponse = {
      success: true,
      thumbnailUrl: 'https://example.com/thumb.jpg',
    };

    vi.spyOn(creatorApi, 'getVideoStreamUrl').mockResolvedValueOnce(mockStreamResponse);
    vi.spyOn(creatorApi, 'getVideoThumbnailUrl').mockResolvedValueOnce(mockThumbnailResponse);

    render(<CreatorStudioPage />);

    const input = screen.getByPlaceholderText(/Enter Video ID.../i);
    fireEvent.change(input, { target: { value: 'vid-999' } });

    const loadButton = screen.getByRole('button', { name: /load stream/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByTestId('hls-player')).toBeInTheDocument();
    });

    expect(screen.getByText('Stream: https://example.com/stream.m3u8')).toBeInTheDocument();
    expect(screen.getByText('Poster: https://example.com/thumb.jpg')).toBeInTheDocument();
  });

  it('displays alert if video stream processing is not successful', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));

    const mockStreamResponse: VideoStreamResponse = {
      success: false,
    };
    const mockThumbnailResponse: VideoThumbnailResponse = {
      success: true,
      thumbnailUrl: '',
    };

    vi.spyOn(creatorApi, 'getVideoStreamUrl').mockResolvedValueOnce(mockStreamResponse);
    vi.spyOn(creatorApi, 'getVideoThumbnailUrl').mockResolvedValueOnce(mockThumbnailResponse);

    render(<CreatorStudioPage />);

    const input = screen.getByPlaceholderText(/Enter Video ID.../i);
    fireEvent.change(input, { target: { value: 'vid-processing' } });

    const loadButton = screen.getByRole('button', { name: /load stream/i });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Video is still processing. Please try again in a few seconds.'
      );
    });
  });

  it('handles video selection from VideoList component', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));

    const mockStreamResponse: VideoStreamResponse = {
      success: true,
      streamUrl: 'https://example.com/selected.m3u8',
    };
    const mockThumbnailResponse: VideoThumbnailResponse = {
      success: true,
      thumbnailUrl: 'https://example.com/selected-thumb.jpg',
    };

    vi.spyOn(creatorApi, 'getVideoStreamUrl').mockResolvedValueOnce(mockStreamResponse);
    vi.spyOn(creatorApi, 'getVideoThumbnailUrl').mockResolvedValueOnce(mockThumbnailResponse);

    render(<CreatorStudioPage />);

    const selectVideoButton = screen.getByText('Select Video');
    fireEvent.click(selectVideoButton);

    await waitFor(() => {
      expect(creatorApi.getVideoStreamUrl).toHaveBeenCalledWith('selected-vid-456');
    });

    const input = screen.getByPlaceholderText(/Enter Video ID.../i) as HTMLInputElement;
    expect(input.value).toBe('selected-vid-456');
  });

  it('updates activeVideoId on successful video upload from VideoUploader', () => {
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(<CreatorStudioPage />);

    const uploadSuccessButton = screen.getByText('Mock Upload Success');
    fireEvent.click(uploadSuccessButton);

    const input = screen.getByPlaceholderText(/Enter Video ID.../i) as HTMLInputElement;
    expect(input.value).toBe('uploaded-vid-123');
  });
});