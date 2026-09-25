// Contract validator: kiểm tra response của services khớp schema trong
// artifacts/openapi.json (bundle của docs/contracts/openapi.yaml) — schema mà
// frontend sẽ tiêu thụ. Không phải thư viện đầy đủ; đủ cho schema dự án hiện tại.

import { readFileSync } from "node:fs";
import path from "node:path";

interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
}

interface OpenApiDoc {
  components: { schemas: Record<string, JsonSchema> };
}

let doc: OpenApiDoc | null = null;

function loadDoc(): OpenApiDoc {
  if (doc === null) {
    const raw = readFileSync(
      path.resolve(import.meta.dirname, "..", "..", "artifacts", "openapi.json"),
      "utf8",
    );
    doc = JSON.parse(raw) as OpenApiDoc;
  }
  return doc;
}

export function schemaByName(name: string): JsonSchema {
  const schema = loadDoc().components.schemas[name];
  if (schema === undefined) throw new Error(`contract schema not found: ${name}`);
  return schema;
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

/**
 * Assert value khớp schema components.schemas.<name>.
 * Ném ContractError kèm path khi lệch.
 */
export function assertContract(name: string, value: unknown): void {
  validate(schemaByName(name), value, `$`);
}

function resolve(schema: JsonSchema): JsonSchema {
  if (schema.$ref === undefined) return schema;
  const name = schema.$ref.split("/").pop()!;
  const target = loadDoc().components.schemas[name];
  if (target === undefined) throw new ContractError(`unresolved $ref: ${schema.$ref}`);
  return target;
}

function fail(at: string, message: string): never {
  throw new ContractError(`${at}: ${message}`);
}

function checkType(value: unknown, type: string, at: string): void {
  switch (type) {
    case "string":
      if (typeof value !== "string") fail(at, `expected string, got ${typeof value}`);
      return;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) fail(at, `expected integer, got ${JSON.stringify(value)}`);
      return;
    case "number":
      if (typeof value !== "number") fail(at, `expected number, got ${typeof value}`);
      return;
    case "boolean":
      if (typeof value !== "boolean") fail(at, `expected boolean, got ${typeof value}`);
      return;
    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail(at, `expected object, got ${Array.isArray(value) ? "array" : typeof value}`);
      }
      return;
    case "array":
      if (!Array.isArray(value)) fail(at, `expected array, got ${typeof value}`);
      return;
    case "null":
      if (value !== null) fail(at, `expected null, got ${JSON.stringify(value)}`);
      return;
    default:
      throw new ContractError(`${at}: unsupported schema type '${type}'`);
  }
}

function validate(schema: JsonSchema, value: unknown, at: string): void {
  const resolved = resolve(schema);

  if (resolved.type !== undefined) {
    const types = Array.isArray(resolved.type) ? resolved.type : [resolved.type];
    if (value === null && types.includes("null")) {
      return;
    }
    if (value === null && !types.includes("null")) {
      fail(at, `expected ${types.join("|")}, got null`);
    }
    // Types còn lại là union 1 kiểu thực chất trong dự án hiện tại.
    const concrete = types.filter((t) => t !== "null");
    if (!types.some((t) => t !== "null" && matchesType(value, t))) {
      fail(at, `expected ${types.join("|")}, got ${JSON.stringify(value)}`);
    }
  } else {
    // Không khai báo type (example: enum/const-only) — fallback: enum/const kiểm tra bên dưới.
  }

  if (resolved.const !== undefined && value !== resolved.const) {
    fail(at, `expected const ${JSON.stringify(resolved.const)}, got ${JSON.stringify(value)}`);
  }

  if (resolved.enum !== undefined && !resolved.enum.includes(value)) {
    fail(at, `value ${JSON.stringify(value)} not in enum ${JSON.stringify(resolved.enum)}`);
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (resolved.required !== undefined) {
      for (const key of resolved.required) {
        if (!(key in value)) fail(at, `missing required property '${key}'`);
      }
    }
    if (resolved.properties !== undefined) {
      for (const [key, propSchema] of Object.entries(resolved.properties)) {
        if (key in (value as Record<string, unknown>)) {
          validate(propSchema, (value as Record<string, unknown>)[key], `${at}.${key}`);
        }
      }
    }
  }

  if (Array.isArray(value) && resolved.items !== undefined) {
    value.forEach((item, index) => validate(resolved.items!, item, `${at}[${index}]`));
  }

  if (typeof value === "number") {
    if (resolved.minimum !== undefined && value < resolved.minimum) {
      fail(at, `expected >= ${resolved.minimum}, got ${value}`);
    }
    if (resolved.maximum !== undefined && value > resolved.maximum) {
      fail(at, `expected <= ${resolved.maximum}, got ${value}`);
    }
  }

  if (typeof value === "string" && resolved.minLength !== undefined && value.length < resolved.minLength) {
    fail(at, `minLength ${resolved.minLength}: '${value}'`);
  }
  if (typeof value === "string" && resolved.maxLength !== undefined && value.length > resolved.maxLength) {
    fail(at, `maxLength ${resolved.maxLength}: '${value}'`);
  }
}

function matchesType(value: unknown, type: string): boolean {
  try {
    checkType(value, type, "$probe");
    return true;
  } catch {
    return false;
  }
}