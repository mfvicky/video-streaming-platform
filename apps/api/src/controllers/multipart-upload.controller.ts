import type { Request, Response, NextFunction } from 'express';
import {
  cancelMultipart,
  completeMultipart,
  getMultipartStatus,
  initiateMultipart,
  putMultipartPart,
  UploadHttpError,
} from '../services/multipart-upload.service.js';

const wrap =
  (handler: (req: Request) => Promise<unknown>, code = 200) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id)
        return res
          .status(401)
          .json({ success: false, message: 'Login required' });
      return res.status(code).json({ success: true, data: await handler(req) });
    } catch (error) {
      if (error instanceof UploadHttpError)
        return res
          .status(error.code)
          .json({ success: false, message: error.message });
      return next(error);
    }
  };

export const startMultipartController = wrap(
  (req) =>
    initiateMultipart(
      req.user!.id,
      req.body?.title,
      req.body?.fileName,
      req.body?.contentType,
      req.body?.fileSize,
    ),
  201,
);
export const multipartStatusController = wrap((req) =>
  getMultipartStatus(String(req.params.sessionId), req.user!.id),
);
export const multipartPartController = wrap((req) =>
  putMultipartPart(
    String(req.params.sessionId),
    req.user!.id,
    Number(req.params.partNumber),
    req,
  ),
);
export const completeMultipartController = wrap((req) =>
  completeMultipart(String(req.params.sessionId), req.user!.id),
);
export const cancelMultipartController = wrap(async (req) => {
  await cancelMultipart(String(req.params.sessionId), req.user!.id);
  return { cancelled: true };
});
