/** Chặn test tạo/xóa database nếu chưa bật test và chọn tên DB thử nghiệm rõ ràng. */
export function assertIsolatedTestDatabase(env: NodeJS.ProcessEnv = process.env): void {
  if (env.CAMPUS_COIN_TEST_DB !== "1") {
    throw new Error("Test MySQL cần CAMPUS_COIN_TEST_DB=1.");
  }

  const databaseName = env.CAMPUS_COIN_DB_NAME?.trim() ?? "";
  if (!/^campus_coin_test_[a-z0-9_]+$/i.test(databaseName)) {
    throw new Error("Test MySQL chỉ chạy khi CAMPUS_COIN_DB_NAME bắt đầu bằng campus_coin_test_. Không dùng defaultdb.");
  }
}
