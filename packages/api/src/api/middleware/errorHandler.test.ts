// Stability: 1 - Experimental (node:test)
//
// The global error handler is the last boundary before a response leaves the
// gateway, and AGENTS.md makes one promise about it explicitly: never leak
// `syscall` / `path` from native system errors into the HTTP response. That
// promise had no test.
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler, notFoundHandler } from './errorHandler.js';
import { ApiError } from '../../core/ApiError.js';

function makeCtx() {
  const statusCalls: number[] = [];
  const jsonBodies: Array<{ error: Record<string, unknown> }> = [];
  const req = {
    url: '/api/models/x/invoke',
    path: '/api/models/x/invoke',
    originalUrl: '/api/models/x/invoke',
    method: 'POST',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    get: () => 'itest-agent',
  } as unknown as Request;
  const res = {
    status(code: number) {
      statusCalls.push(code);
      return this;
    },
    json(payload: { error: Record<string, unknown> }) {
      jsonBodies.push(payload);
      return this;
    },
  } as unknown as Response;
  const next = mock.fn<NextFunction>();
  return { req, res, next, statusCalls, jsonBodies };
}

describe('errorHandler — status mapping', () => {
  it('maps an ApiError to its own status and name', () => {
    const { req, res, next, statusCalls, jsonBodies } = makeCtx();

    errorHandler(ApiError.notFound('Model x is not available'), req, res, next);

    assert.deepEqual(statusCalls, [404]);
    assert.equal(jsonBodies[0]?.error['statusCode'], 404);
    assert.equal(jsonBodies[0]?.error['message'], 'Model x is not available');
  });

  it('maps a ValidationError to 422', () => {
    const { req, res, next, statusCalls, jsonBodies } = makeCtx();
    const err = new Error('bad field');
    err.name = 'ValidationError';

    errorHandler(err, req, res, next);

    assert.deepEqual(statusCalls, [422]);
    assert.equal(jsonBodies[0]?.error['name'], 'ValidationError');
  });

  it('maps a body-parser SyntaxError to 400 with a generic message', () => {
    const { req, res, next, statusCalls, jsonBodies } = makeCtx();
    const err = Object.assign(new SyntaxError('Unexpected token }'), { body: '{bad' });

    errorHandler(err, req, res, next);

    assert.deepEqual(statusCalls, [400]);
    assert.equal(jsonBodies[0]?.error['message'], 'Invalid JSON in request body');
  });

  it('maps a MulterError to 400', () => {
    const { req, res, next, statusCalls, jsonBodies } = makeCtx();
    const err = new Error('File too large');
    err.name = 'MulterError';

    errorHandler(err, req, res, next);

    assert.deepEqual(statusCalls, [400]);
    assert.equal(jsonBodies[0]?.error['name'], 'MulterError');
  });

  it('maps an unknown error to a 500 that reveals nothing', () => {
    const { req, res, next, statusCalls, jsonBodies } = makeCtx();

    errorHandler(new Error('connection string user:pass@db'), req, res, next);

    assert.deepEqual(statusCalls, [500]);
    assert.equal(jsonBodies[0]?.error['name'], 'InternalServerError');
    // NODE_ENV is `test` in this suite, i.e. not development: the raw message
    // and stack must not travel to the caller.
    assert.equal(jsonBodies[0]?.error['message'], 'Internal Server Error');
    assert.equal(jsonBodies[0]?.error['stack'], undefined);
  });
});

describe('errorHandler — native system errors never leak syscall or path', () => {
  it('returns the code but not syscall/path/address (AGENTS.md invariant)', () => {
    const { req, res, next, statusCalls, jsonBodies } = makeCtx();
    const sysErr = Object.assign(new Error('ENOENT: no such file or directory'), {
      code: 'ENOENT',
      syscall: 'open',
      path: 'C:/secrets/gateway.db',
      address: '10.0.0.4',
      port: 5432,
    });

    errorHandler(sysErr, req, res, next);

    assert.deepEqual(statusCalls, [500]);
    const payload = jsonBodies[0]!.error;
    assert.equal(payload['name'], 'SystemError');
    assert.equal(payload['code'], 'ENOENT');

    const serialized = JSON.stringify(payload);
    assert.ok(!serialized.includes('C:/secrets'), 'the filesystem path must not be exposed');
    assert.ok(!serialized.includes('open'), 'the syscall must not be exposed');
    assert.ok(!serialized.includes('10.0.0.4'), 'the internal address must not be exposed');
  });

  it('resolves a numeric errno through getSystemErrorName without throwing', () => {
    const { req, res, next, statusCalls } = makeCtx();
    const sysErr = Object.assign(new Error('system failure'), { code: -4058, syscall: 'stat' });

    errorHandler(sysErr, req, res, next);

    assert.deepEqual(statusCalls, [500]);
  });
});

describe('asyncHandler / notFoundHandler', () => {
  it('forwards a rejected async handler to next()', async () => {
    const { req, res, next } = makeCtx();
    const boom = new Error('handler exploded');

    asyncHandler(async () => {
      throw boom;
    })(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(next.mock.calls[0]?.arguments[0], boom);
  });

  it('does not call next() when the handler resolves', async () => {
    const { req, res, next } = makeCtx();

    asyncHandler(async () => 'ok')(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(next.mock.callCount(), 0);
  });

  it('notFoundHandler forwards a 404 ApiError naming the route', () => {
    const { req, res, next } = makeCtx();

    notFoundHandler(req, res, next);

    const forwarded = next.mock.calls[0]?.arguments[0] as ApiError;
    assert.equal(forwarded.statusCode, 404);
    assert.match(forwarded.message, /POST \/api\/models\/x\/invoke/);
  });
});
