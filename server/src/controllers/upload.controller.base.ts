import type { UploadedFileResponse } from './upload.responses';

export abstract class BaseUploadController {
  protected success(response: UploadedFileResponse) {
    return {
      success: true,
      data: response,
    };
  }

  protected failure(error: string, message: string) {
    return {
      success: false,
      error,
      message,
    };
  }
}
