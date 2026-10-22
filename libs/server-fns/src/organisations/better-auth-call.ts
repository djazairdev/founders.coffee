import { AppError, err, ok, type Result } from '@founders-coffee/core';
import { isAuthRefusal } from '@founders-coffee/auth';
import { reportError } from '@founders-coffee/observability';

/**
 * Run one Better Auth organisation call, turning a refusal it still makes into our own `failure`.
 *
 * The resolvers refuse every case they can foresee before Better Auth runs, from the rows it would
 * read, so a refusal here is one nobody planned for: it is reported, and the caller learns only that
 * the action could not be taken. A failure that is not a refusal is thrown on.
 */
export const throughBetterAuth = async <T>(
  operation: string,
  failure: AppError,
  call: () => Promise<T>,
): Promise<Result<T>> => {
  try {
    return ok(await call());
  } catch (error) {
    if (!isAuthRefusal(error)) throw error;
    reportError(error, { operation });
    return err(failure);
  }
};
