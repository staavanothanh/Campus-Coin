import type { IncomingHttpHeaders } from 'node:http';
import { getPool } from '../infrastructure/db/pool.ts';
import { canonicalHash } from '../lib/hash.js';
import { initializeWallet, getWallet } from '../application/wallet.service.ts';
import { createTransaction, createCorrection, getTransaction, listTransactions } from '../application/ledger.service.ts';
import { createTransfer, getSavings, listTransfers } from '../application/savings.service.ts';
import { createCustomCategory, listUserCategories, updateUserCategory } from '../application/category.service.ts';
import { listMonthBudgets, monthBudgetSummary, upsertUserBudget } from '../application/budget.service.ts';
import { dashboard, monthlyReport } from '../application/report.service.ts';
import { isCorrectionRole, isTransactionType } from '../domain/money.ts';
import { AppError } from '../features/auth/auth.service.js';

interface AuthenticatedUser {
  id: string;
  role: string;
}

export interface RouteResult {
  status: number;
  body: unknown;
}

function invalid(message = 'Dữ liệu yêu cầu không hợp lệ') {
  return new AppError(422, 'VALIDATION_ERROR', message);
}

function requiredInteger(value: unknown, name: string, minimum = 1) {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < minimum) throw invalid(`${name} không hợp lệ`);
  return number;
}

function requiredString(value: unknown, name: string, maxLength = 4096) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) throw invalid(`${name} không hợp lệ`);
  return value;
}

function optionalString(value: unknown, name: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) throw invalid(`${name} không hợp lệ`);
  return value;
}

function idempotencyKey(headers: IncomingHttpHeaders) {
  const value = headers['idempotency-key'];
  if (typeof value !== 'string' || value.length < 1 || value.length > 128) {
    throw invalid('Thiếu hoặc sai Idempotency-Key');
  }
  return value;
}

function pagination(search: URLSearchParams) {
  const rawLimit = search.get('limit');
  const limit = rawLimit === null ? 20 : requiredInteger(rawLimit, 'limit');
  if (limit > 100) throw invalid('limit tối đa là 100');
  const rawCursor = search.get('cursor');
  const cursor = rawCursor === null ? undefined : rawCursor;
  if (cursor !== undefined && cursor.length > 512) throw invalid('cursor không hợp lệ');
  return cursor === undefined ? { limit } : { limit, cursor };
}

function ok(data: unknown, status = 200): RouteResult {
  return { status, body: { data } };
}

function page(data: unknown, meta: unknown): RouteResult {
  return { status: 200, body: { data, meta } };
}

export async function handleDomainRequest(
  method: string,
  path: string,
  search: URLSearchParams,
  body: Record<string, unknown>,
  headers: IncomingHttpHeaders,
  user: AuthenticatedUser,
): Promise<RouteResult | null> {
  const userId = requiredInteger(user.id, 'user id');
  const db = getPool();

  if (method === 'GET' && path === '/wallet') {
    const wallet = await getWallet(db, userId);
    if (!wallet) throw new AppError(404, 'NOT_FOUND', 'Wallet chưa được khởi tạo');
    return ok(wallet);
  }
  if (method === 'POST' && path === '/wallet/baseline') {
    const initialBalanceVnd = requiredInteger(body.initialBalanceVnd, 'initialBalanceVnd', 0);
    const wallet = await initializeWallet(db, {
      userId,
      initialBalanceVnd,
      idempotencyKey: idempotencyKey(headers),
      requestHash: canonicalHash(body),
    });
    return ok(wallet, 201);
  }

  if (method === 'GET' && path === '/ledger/transactions') {
    const paging = pagination(search);
    const rawType = search.get('type') ?? undefined;
    if (rawType !== undefined && !isTransactionType(rawType)) throw invalid('type không hợp lệ');
    const rawCategory = search.get('categoryId');
    const result = await listTransactions(db, userId, {
      ...paging,
      ...(rawType === undefined ? {} : { type: rawType }),
      ...(rawCategory === null ? {} : { categoryId: requiredInteger(rawCategory, 'categoryId') }),
      ...(search.has('from') ? { from: requiredString(search.get('from'), 'from') } : {}),
      ...(search.has('to') ? { to: requiredString(search.get('to'), 'to') } : {}),
    });
    return page(result.data, result.meta);
  }
  if (method === 'POST' && path === '/ledger/transactions') {
    if (!isTransactionType(body.type)) throw invalid('type không hợp lệ');
    const result = await createTransaction(db, {
      userId,
      type: body.type,
      amountVnd: requiredInteger(body.amountVnd, 'amountVnd'),
      categoryId: requiredInteger(body.categoryId, 'categoryId'),
      occurredAt: requiredString(body.occurredAt, 'occurredAt'),
      description: optionalString(body.description, 'description', 500),
      idempotencyKey: idempotencyKey(headers),
      requestHash: canonicalHash(body),
    });
    return ok(result, 201);
  }
  const correctionMatch = path.match(/^\/ledger\/transactions\/(\d+)\/corrections$/);
  if (method === 'POST' && correctionMatch) {
    if (!isCorrectionRole(body.correctionRole)) throw invalid('correctionRole không hợp lệ');
    const newAmountVnd = body.newAmountVnd === undefined ? null : requiredInteger(body.newAmountVnd, 'newAmountVnd');
    const newCategoryId = body.newCategoryId === undefined ? null : requiredInteger(body.newCategoryId, 'newCategoryId');
    const result = await createCorrection(db, {
      userId,
      targetId: requiredInteger(correctionMatch[1], 'transactionId'),
      role: body.correctionRole,
      reason: requiredString(body.reason, 'reason', 1000),
      newAmountVnd,
      newCategoryId,
      idempotencyKey: idempotencyKey(headers),
      requestHash: canonicalHash(body),
    });
    return ok(result, 201);
  }
  const transactionMatch = path.match(/^\/ledger\/transactions\/(\d+)$/);
  if (method === 'GET' && transactionMatch) {
    const transaction = await getTransaction(db, userId, requiredInteger(transactionMatch[1], 'transactionId'));
    if (!transaction) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy giao dịch');
    return ok({ transaction });
  }

  if (method === 'GET' && path === '/savings') {
    const savings = await getSavings(db, userId);
    if (!savings) throw new AppError(404, 'NOT_FOUND', 'Savings chưa được khởi tạo');
    return ok(savings);
  }
  if (method === 'GET' && path === '/savings/transfers') {
    const paging = pagination(search);
    const result = await listTransfers(db, userId, paging.cursor, paging.limit);
    return page(result.data, result.meta);
  }
  if (method === 'POST' && path === '/savings/transfers') {
    const direction = body.direction;
    if (direction !== 'deposit' && direction !== 'withdraw') throw invalid('direction không hợp lệ');
    const result = await createTransfer(db, {
      userId,
      direction,
      amountVnd: requiredInteger(body.amountVnd, 'amountVnd'),
      note: optionalString(body.note, 'note', 500),
      idempotencyKey: idempotencyKey(headers),
      requestHash: canonicalHash(body),
    });
    return ok(result, 201);
  }

  if (method === 'GET' && path === '/categories') {
    const appliesTo = search.get('appliesTo') ?? undefined;
    if (appliesTo !== undefined && !isTransactionType(appliesTo)) throw invalid('appliesTo không hợp lệ');
    const includeDisabledValue = search.get('includeDisabled');
    if (includeDisabledValue !== null && includeDisabledValue !== 'true' && includeDisabledValue !== 'false') {
      throw invalid('includeDisabled không hợp lệ');
    }
    const categories = await listUserCategories(db, userId, {
      ...(appliesTo === undefined ? {} : { appliesTo }),
      ...(includeDisabledValue === null ? {} : { includeDisabled: includeDisabledValue === 'true' }),
    });
    return ok(categories);
  }
  if (method === 'POST' && path === '/categories') {
    const appliesTo = body.appliesTo;
    if (!isTransactionType(appliesTo)) throw invalid('appliesTo không hợp lệ');
    const category = await createCustomCategory(db, {
      userId,
      nameEn: requiredString(body.nameEn, 'nameEn', 80),
      nameVi: optionalString(body.nameVi, 'nameVi', 80) ?? '',
      appliesTo,
      idempotencyKey: idempotencyKey(headers),
      requestHash: canonicalHash(body),
    });
    if (!category) throw new AppError(409, 'CONFLICT', 'Category trùng tên');
    return ok(category, 201);
  }
  const categoryMatch = path.match(/^\/categories\/(\d+)$/);
  if (method === 'PATCH' && categoryMatch) {
    const patch: { nameEn?: string; nameVi?: string; status?: 'active' | 'disabled' | 'retired' } = {};
    if (body.nameEn !== undefined) patch.nameEn = requiredString(body.nameEn, 'nameEn', 80);
    if (body.nameVi !== undefined) patch.nameVi = optionalString(body.nameVi, 'nameVi', 80) ?? '';
    if (body.status !== undefined) {
      const status = requiredString(body.status, 'status', 16);
      if (status !== 'active' && status !== 'disabled' && status !== 'retired') throw invalid('status không hợp lệ');
      patch.status = status;
    }
    if (Object.keys(patch).length === 0) throw invalid('Cần ít nhất một trường cập nhật');
    return ok(await updateUserCategory(db, { userId, categoryId: requiredInteger(categoryMatch[1], 'categoryId'), ...patch }));
  }

  if (method === 'GET' && path === '/budgets') {
    const month = requiredString(search.get('month'), 'month', 7);
    return ok(await listMonthBudgets(db, userId, month));
  }
  if (method === 'GET' && path === '/budgets/summary') {
    const month = requiredString(search.get('month'), 'month', 7);
    return ok(await monthBudgetSummary(db, userId, month));
  }
  const budgetMatch = path.match(/^\/budgets\/(\d+)$/);
  if (method === 'PUT' && budgetMatch) {
    const categoryId = requiredInteger(budgetMatch[1], 'categoryId');
    const month = requiredString(body.month, 'month', 7);
    const budget = await upsertUserBudget(db, {
      userId,
      categoryId,
      month,
      limitVnd: requiredInteger(body.limitVnd, 'limitVnd', 0),
      idempotencyKey: idempotencyKey(headers),
      requestHash: canonicalHash(body),
    });
    return ok(budget);
  }

  if (method === 'GET' && path === '/reports/monthly') {
    const month = requiredString(search.get('month'), 'month', 7);
    return ok(await monthlyReport(db, userId, month));
  }
  if (method === 'GET' && path === '/reports/dashboard') return ok(await dashboard(db, userId));

  return null;
}
