import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HlsPlayer } from './HlsPlayer';
import Hls from 'hls.js';

// Shared mock instance tracking
const mockHlsInstance = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  currentLevel: -1,
};

// Define typed interface for Hls constructor statics
interface MockHlsConstructorType {
  new (): typeof mockHlsInstance;
  isSupported: ReturnType<typeof vi.fn>;
  Events: {
    MANIFEST_PARSED: string;
  };
}

// Mock hls.js using a typed constructor function declaration
vi.mock('hls.js', () => {
  const MockHlsConstructor = vi.fn(function (
    this: typeof mockHlsInstance
  ) {
    Object.assign(this, mockHlsInstance);
    return mockHlsInstance;
  }) as unknown as MockHlsConstructorType;

  MockHlsConstructor.isSupported = vi.fn().mockReturnValue(true);
  MockHlsConstructor.Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
  };

  return {
    default: MockHlsConstructor,
  };
});

// Type definition for Hls event callbacks
type HlsEventCallback = (
  event: string,
  data: { levels: Array<{ height: number; bitrate: number }> }
) => void;

describe('HlsPlayer Component', () => {
  const mockSrc = 'https://example.com/stream.m3u8';
  const mockPoster = 'https://example.com/poster.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  it('initializes Hls and attaches media when Hls is supported', () => {
    render(<HlsPlayer src={mockSrc} poster={mockPoster} />);

    expect(Hls.isSupported).toHaveBeenCalled();
    expect(Hls).toHaveBeenCalledWith({ enableWorker: true });

    expect(mockHlsInstance.loadSource).toHaveBeenCalledWith(mockSrc);
    expect(mockHlsInstance.attachMedia).toHaveBeenCalledWith(expect.any(HTMLVideoElement));
  });

  it('destroys Hls instance on unmount', () => {
    const { unmount } = render(<HlsPlayer src={mockSrc} />);

    unmount();

    expect(mockHlsInstance.destroy).toHaveBeenCalled();
  });

  it('renders custom poster overlay before playback starts and hides it on click', async () => {
    render(<HlsPlayer src={mockSrc} poster={mockPoster} />);

    const playButton = screen.getByRole('button', { name: /play video/i });
    expect(playButton).toBeInTheDocument();

    fireEvent.click(playButton);

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(playButton).not.toBeInTheDocument();
  });

  it('populates and switches quality levels when MANIFEST_PARSED event fires', async () => {
    render(<HlsPlayer src={mockSrc} />);

    const onCallback = mockHlsInstance.on.mock.calls.find(
      (call: [string, HlsEventCallback]) => call[0] === Hls.Events.MANIFEST_PARSED
    )?.[1] as HlsEventCallback | undefined;

    expect(onCallback).toBeDefined();

    // Wrap the event firing in act() so state updates commit synchronously
    await act(async () => {
      onCallback?.(Hls.Events.MANIFEST_PARSED, {
        levels: [
          { height: 720, bitrate: 2500000 },
          { height: 1080, bitrate: 5000000 },
        ],
      });
    });

    expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /720p/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1080p/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /1080p/i }));
    expect(mockHlsInstance.currentLevel).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /auto/i }));
    expect(mockHlsInstance.currentLevel).toBe(-1);
  });

  it('handles poster error and hides custom overlay', () => {
    const { container } = render(<HlsPlayer src={mockSrc} poster={mockPoster} />);

    // Target the hidden img element directly via container selector since alt="" sets role to "presentation"
    const hiddenImg = container.querySelector('img.hidden');
    expect(hiddenImg).not.toBeNull();

    act(() => {
      fireEvent.error(hiddenImg!);
    });

    expect(screen.queryByRole('button', { name: /play video/i })).not.toBeInTheDocument();
  });
});