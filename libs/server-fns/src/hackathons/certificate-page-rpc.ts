import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appValidator, handleResult } from '@founders-coffee/core';

import { getDb } from '../db.js';
import { privateNoStore } from '../response-cache.js';
import { certificatePageResolver } from './certificate-page.js';

const CERTIFICATE_CODE_MAX = 64;

const certificatePageSchema = z.strictObject({
  code: z.string().min(1).max(CERTIFICATE_CODE_MAX),
});

/** A certificate's public page, for anyone with its code, signed in or not (B-CRT-02). */
export const getHackathonCertificatePage = createServerFn({ strict: false })
  .validator(appValidator(certificatePageSchema))
  .handler(({ data }) => {
    privateNoStore();
    return handleResult(certificatePageResolver(getDb(), data.code));
  });
