import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoUploader } from './VideoUploader';
import { uploadResumableVideo } from '../api/multipart.api';

vi.mock('../api/multipart.api', () => ({
  MAX_FILE_BYTES: 2_147_483_647,
  uploadResumableVideo: vi.fn(),
}));

describe('Resumable VideoUploader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queues multiple files with independent progress', () => {
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
      screen.getByRole('button', { name: /Upload \/ Resume 2 video/i }),
    ).toBeInTheDocument();
  });

  it('clears successful files while preserving failed files', async () => {
    const onSuccess = vi.fn();
    vi.mocked(uploadResumableVideo).mockImplementation(
      async (file, _title, options) => {
        options.onProgress(75);
        if (file.name === 'second.mp4') throw new Error('Network interruption');
        options.onProgress(100);
        return { videoId: 'vid_first' };
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
    fireEvent.click(
      screen.getByRole('button', { name: /Upload \/ Resume 2 video/i }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('vid_first'));
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Upload progress for first.mp4'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByLabelText('Upload progress for second.mp4'),
    ).toBeInTheDocument();
    expect(screen.getByText('Network interruption')).toBeInTheDocument();
  });
});
