import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalHash, canonicalJson, sha256Hex } from "../src/lib/hash.ts";

test("canonicalJson: sắp xếp key object bất kể thứ tự nhập", () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalJson({ amountVnd: 100, type: "income", categoryId: "5" }), '{"amountVnd":100,"categoryId":"5","type":"income"}');
});

test("canonicalJson: lồng nhau, array và null ổn định", () => {
  const value = { z: [{ y: null, x: "1" }], a: true };
  assert.equal(canonicalJson(value), '{"a":true,"z":[{"x":"1","y":null}]}');
});

test("canonicalJson: undefined bị loại, thứ tự không đổi hash", () => {
  const withUndefined = { a: 1, b: undefined };
  const without = { a: 1 };
  assert.equal(canonicalJson(withUndefined), canonicalJson(without));
});

test("sha256Hex: vector chuẩn", () => {
  assert.equal(
    sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  // Hash canonical: cùng object với thứ tự key khác nhau ra cùng hash.
  assert.equal(canonicalHash({ b: 2, a: 1 }), canonicalHash({ a: 1, b: 2 }));
});