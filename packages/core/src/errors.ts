export type MobileErrorCode =
  'PERMISSION_DENIED' | 'UNAVAILABLE' | 'UNSUPPORTED' | 'INVALID_PARAMS' | 'CANCELLED' | 'INTERNAL';

export interface MobileErrorDetails {
  code: MobileErrorCode;
  message: string;
  recoveryHint?: string;
  details?: Record<string, unknown>;
}

export class ReactNativeMcpError extends Error {
  readonly code: MobileErrorCode;
  readonly recoveryHint?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: MobileErrorCode,
    message: string,
    recoveryHint?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReactNativeMcpError';
    this.code = code;
    this.recoveryHint = recoveryHint;
    this.details = details;
  }

  static permissionDenied(message: string, recoveryHint?: string): ReactNativeMcpError {
    return new ReactNativeMcpError(
      'PERMISSION_DENIED',
      message,
      recoveryHint ??
        'Ask the user to grant permission, or open the system Settings app for this application.',
    );
  }

  static unavailable(feature: string, reason?: string): ReactNativeMcpError {
    const suffix = reason ? `: ${reason}` : '';
    return new ReactNativeMcpError(
      'UNAVAILABLE',
      `${feature} is not available on this device or runtime${suffix}.`,
      'Verify the native module is linked, the platform supports the feature and the host application has the required capabilities.',
    );
  }

  static unsupported(feature: string): ReactNativeMcpError {
    return new ReactNativeMcpError(
      'UNSUPPORTED',
      `${feature} is not supported on this platform.`,
      'Check platform support before calling this tool, or provide a fallback interaction.',
    );
  }

  static invalidParams(message: string): ReactNativeMcpError {
    return new ReactNativeMcpError(
      'INVALID_PARAMS',
      message,
      'Inspect the tool input schema and retry with valid arguments.',
    );
  }

  static cancelled(what: string): ReactNativeMcpError {
    return new ReactNativeMcpError('CANCELLED', `${what} was cancelled by the user.`);
  }

  toErrorPayload(): MobileErrorDetails {
    return {
      code: this.code,
      message: this.message,
      ...(this.recoveryHint ? { recoveryHint: this.recoveryHint } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export function normalizeError(error: unknown): MobileErrorDetails {
  if (error instanceof ReactNativeMcpError) {
    return error.toErrorPayload();
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL',
      message: error.message || 'Unexpected tool execution error.',
      recoveryHint: 'Retry the operation; if the problem persists, report it with device logs.',
    };
  }

  return {
    code: 'INTERNAL',
    message: 'Unknown tool execution error.',
    recoveryHint: 'Retry the operation; if the problem persists, report it with device logs.',
  };
}
