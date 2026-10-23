import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoUploader } from './VideoUploader';
import { uploadCreatorVideo } from '../api/creator.api';

vi.mock('../api/creator.api', () => ({ uploadCreatorVideo: vi.fn() }));

describe('Day 3 VideoUploader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queues multiple files and displays a progress row for each', () => {
    render(<VideoUploader onSuccess={vi.fn()} />);
    const a = new File(['one'], 'a.mp4', { type: 'video/mp4' });
    const b = new File(['two'], 'b.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Select multiple videos'), {
      target: { files: [a, b] },
    });
    expect(screen.getByLabelText('Upload progress for a.mp4')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.getByLabelText('Upload progress for b.mp4')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(
      screen.getByRole('button', { name: /Upload 2 video/i }),
    ).toBeInTheDocument();
  });

  it('uploads each selected file with distinct titles and per-file progress', async () => {
    const onSuccess = vi.fn();
    vi.mocked(uploadCreatorVideo).mockImplementation(
      async (_data, onProgress) => {
        onProgress?.(75);
        return {
          success: true,
          data: { id: 'vid-' + Math.random().toString(36).slice(2) },
        };
      },
    );
    render(<VideoUploader onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText('Select multiple videos'), {
      target: {
        files: [
          new File(['a'], 'first.mp4', { type: 'video/mp4' }),
          new File(['b'], 'second.mp4', { type: 'video/mp4' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Upload 2 video/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));
    expect(uploadCreatorVideo).toHaveBeenCalledTimes(2);
    expect(
      screen.getByLabelText('Upload progress for first.mp4'),
    ).toHaveAttribute('aria-valuenow', '100');
  });
});
