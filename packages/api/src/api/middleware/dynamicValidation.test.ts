// Stability: 1 - Experimental (node:test)
//
// dynamicValidation is the Ajv gate every model invoke passes through, and it
// had zero tests: a regression here silently widens the input surface of the
// whole gateway. Driven with the same lightweight req/res doubles the other
// middleware suites use, against a REAL SchemaRegistry.
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { SchemaRegistry } from '../../infrastructure/ai/registry.js';
import {
  createDynamicValidationMiddleware,
  validateField,
  validateQuery,
} from './dynamicValidation.js';

const SCHEMA = {
  type: 'object',
  properties: {
    prompt: { type: 'string', minLength: 1 },
    temperature: { type: 'number', minimum: 0, maximum: 2 },
    mode: { type: 'string', enum: ['fast', 'quality'] },
  },
  required: ['prompt'],
};

function makeRegistry(): SchemaRegistry {
  const registry = new SchemaRegistry();
  registry.register('known-model', SCHEMA);
  return registry;
}

function makeCtx(modelId: string | undefined, body: unknown) {
  const statusCalls: number[] = [];
  const jsonBodies: unknown[] = [];
  const req = {
    params: modelId === undefined ? {} : { modelId },
    body,
    path: '/models/x/invoke',
    method: 'POST',
  } as unknown as Request;
  const res = {
    status(code: number) {
      statusCalls.push(code);
      return this;
    },
    json(payload: unknown) {
      jsonBodies.push(payload);
      return this;
    },
  } as unknown as Response;
  const next = mock.fn<NextFunction>();
  return { req, res, next, statusCalls, jsonBodies };
}

describe('createDynamicValidationMiddleware', () => {
  it('calls next() exactly once for a body that satisfies the schema', () => {
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next, statusCalls } = makeCtx('known-model', {
      prompt: 'hi',
      temperature: 0.5,
    });

    middleware(req, res, next);

    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(statusCalls, [], 'a valid body never gets a status written');
    assert.equal(next.mock.calls[0]?.arguments.length, 0, 'next() is called without an error');
  });

  it('rejects a wrong-typed field with 400 and non-empty details', () => {
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next, statusCalls, jsonBodies } = makeCtx('known-model', {
      prompt: 'hi',
      temperature: 'hot',
    });

    middleware(req, res, next);

    assert.equal(next.mock.callCount(), 0, 'an invalid body must not reach the controller');
    assert.deepEqual(statusCalls, [400]);
    const payload = jsonBodies[0] as { error: { details: unknown[]; name: string } };
    assert.equal(payload.error.name, 'ValidationError');
    assert.ok(payload.error.details.length > 0, 'the caller is told which field failed');
  });

  it('reports a missing required field by name', () => {
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next, jsonBodies } = makeCtx('known-model', { temperature: 1 });

    middleware(req, res, next);

    assert.equal(next.mock.callCount(), 0);
    const payload = jsonBodies[0] as { error: { details: Array<{ message: string }> } };
    assert.ok(
      payload.error.details.some((d) => d.message.includes("Field 'prompt' is required")),
      'the missing field is named in the message',
    );
  });

  it('lists the allowed values when an enum is violated', () => {
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next, jsonBodies } = makeCtx('known-model', {
      prompt: 'hi',
      mode: 'turbo',
    });

    middleware(req, res, next);

    const payload = jsonBodies[0] as {
      error: { details: Array<{ allowedValues?: unknown[] }> };
    };
    assert.deepEqual(payload.error.details.find((d) => d.allowedValues)?.allowedValues, [
      'fast',
      'quality',
    ]);
  });

  it('forwards a 404 to the error handler for a model without a schema', () => {
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next, statusCalls } = makeCtx('unknown-model', { prompt: 'hi' });

    middleware(req, res, next);

    assert.equal(next.mock.callCount(), 1, 'the error travels through next(err)');
    const forwarded = next.mock.calls[0]?.arguments[0] as { statusCode?: number } | undefined;
    assert.equal(forwarded?.statusCode, 404);
    assert.deepEqual(statusCalls, [], 'the middleware itself writes no response');
  });

  it('forwards a 400 when the route carries no modelId at all', () => {
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next } = makeCtx(undefined, { prompt: 'hi' });

    middleware(req, res, next);

    const forwarded = next.mock.calls[0]?.arguments[0] as { statusCode?: number } | undefined;
    assert.equal(forwarded?.statusCode, 400);
  });

  it('pins the additional-properties decision: unknown keys are ACCEPTED', () => {
    // The schemas do not set `additionalProperties: false`, so extra model
    // params (a provider-specific knob) pass through by design. Pinned here so
    // tightening it is a deliberate change, not an accident.
    const middleware = createDynamicValidationMiddleware(makeRegistry());
    const { req, res, next } = makeCtx('known-model', { prompt: 'hi', someProviderKnob: 42 });

    middleware(req, res, next);

    assert.equal(next.mock.callCount(), 1);
  });
});

describe('validateField / validateQuery', () => {
  it('validateField passes a valid nested value through', () => {
    const middleware = validateField('config.retries', { type: 'number', maximum: 5 });
    const { req, res, next } = makeCtx('known-model', { config: { retries: 3 } });

    middleware(req, res, next);

    assert.equal(next.mock.calls[0]?.arguments.length, 0);
  });

  it('validateField forwards a validation error for an out-of-range value', () => {
    const middleware = validateField('config.retries', { type: 'number', maximum: 5 });
    const { req, res, next } = makeCtx('known-model', { config: { retries: 99 } });

    middleware(req, res, next);

    const forwarded = next.mock.calls[0]?.arguments[0] as { statusCode?: number } | undefined;
    assert.ok(forwarded, 'an invalid field must produce an error');
    assert.equal(
      forwarded?.statusCode,
      422,
      'ApiError.validation maps to 422 Unprocessable Entity',
    );
  });

  it('validateQuery rejects a query that violates the schema', () => {
    const middleware = validateQuery({
      type: 'object',
      properties: { limit: { type: 'string', pattern: '^[0-9]+$' } },
      required: ['limit'],
    });
    const req = { query: { limit: 'abc' } } as unknown as Request;
    const res = {} as Response;
    const next = mock.fn<NextFunction>();

    middleware(req, res, next);

    const forwarded = next.mock.calls[0]?.arguments[0] as { statusCode?: number } | undefined;
    assert.equal(forwarded?.statusCode, 422);
  });

  it('validateQuery passes a conforming query', () => {
    const middleware = validateQuery({
      type: 'object',
      properties: { limit: { type: 'string' } },
    });
    const req = { query: { limit: '10' } } as unknown as Request;
    const res = {} as Response;
    const next = mock.fn<NextFunction>();

    middleware(req, res, next);

    assert.equal(next.mock.calls[0]?.arguments.length, 0);
  });
});
