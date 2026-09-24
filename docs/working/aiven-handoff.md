# Handoff kết nối Aiven — thông tin làm việc

## Mục đích

Ghi hướng dẫn truy cập/query an toàn để xác minh kết nối. File này không giữ Service URI, host, username, password, CA certificate hoặc giá trị `.env`; thông tin kết nối cá nhân chỉ nhập trực tiếp trong DBeaver.

## Trạng thái đã biết

- Người dùng có endpoint MySQL Aiven và thông tin database mặc định `defaultdb`; username/password do người dùng tự nhập trong client.
- Chưa xác minh kết nối, owner/service, nội dung database hoặc việc database đó là Campus Coin.
- `defaultdb` không đồng nghĩa với database/schema ứng dụng `campus_coin`.
- Schema auth hiện yêu cầu migration `0004` và rate-limit state yêu cầu `0005`; không có bằng chứng hai migration này đã được apply trên endpoint hiện tại.
- Handoff trước ghi nhận `0001`–`0003` đã apply trên một môi trường khác, nhưng trạng thái đó chưa được xác minh lại và không áp dụng suy rộng cho endpoint hiện tại.
- Chưa có evidence backup/restore cho endpoint hiện tại. Không chạy migration, seed, test harness hoặc statement ghi trên endpoint này.

## Kết nối bằng DBeaver

1. Mở **Database → New Database Connection → MySQL** và chọn kết nối theo Host.
2. Điền Host, Port, Database (`defaultdb`), username và password vào từng ô. Không dán URI `mysql://...` vào JDBC URL; URI được Aiven sinh trong console có dạng/credential khác với trường host.
3. Ở tab SSL, bật SSL và đặt mode `REQUIRED` để khớp `ssl-mode=REQUIRED` đã được cung cấp. Mode này bắt buộc mã hóa TLS nhưng không tự xác minh CA/hostname.
4. Khi có CA tải trực tiếp từ Overview Aiven, cấu hình CA; chuyển sang `VERIFY_IDENTITY` nếu client hỗ trợ. Với MySQL Aiven, CA dự án là cần thiết cho `VERIFY_CA`/`VERIFY_IDENTITY`; `VERIFY_IDENTITY` còn kiểm tra hostname. Không lấy CA từ nguồn khác, không commit CA vào Git và không coi file `ca.pem` local chưa kiểm tra là đúng.
5. Chọn Test Connection. Nếu kết nối thành công, mở SQL Editor và chạy lần lượt:

```sql
SELECT 1 AS connection_ok;
SELECT DATABASE() AS selected_database, CURRENT_USER() AS db_account;
SELECT VERSION() AS mysql_version;
SHOW TABLES;
```

Các truy vấn này chỉ xác nhận kết nối/schema nhìn thấy được. Không chạy `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, seed hoặc migration trên `defaultdb`. Tùy chọn read-only của DBeaver chỉ là lớp nhắc; quyền chỉ đọc cần được enforce bằng database account.

Aiven ghi rõ user mặc định `avnadmin` có toàn quyền. Nếu owner cấp user riêng để kiểm tra, nên cấp `SELECT` tối thiểu; việc tạo user và privilege do owner thực hiện. Username/password được người dùng nhập trực tiếp vào DBeaver, không đưa vào source/docs/command history.

## Điều kiện trước khi dùng cho Campus Coin

DB owner/Team Leader cần xác nhận rõ database thuộc Campus Coin và môi trường có thể dùng. Sau đó dùng `npm run db:preflight`/`db:status` từ cấu hình đã được kiểm tra, xác nhận backup có thể restore, CA và role đúng, và chỉ chạy migration được phép. `npm run db:datatest`/MySQL integration tạo rồi xóa database tạm; chỉ dùng service/instance cô lập.

Runtime role phải least-privilege; `avnadmin` có quyền rộng, không dùng làm runtime. Phân phối CA qua secret/runtime file an toàn và giữ `.env`/CA local ngoài Git.

## Khi không kết nối được

Kiểm tra service đang running, username/password, host/port, TLS mode, driver, Aiven service IP filter và quyền truy cập mạng của máy. Nếu driver báo SSL CA, lấy CA từ Aiven Overview. Không tắt TLS hoặc đưa credential vào command/history để né lỗi.

## Tài liệu chính thức đã đối chiếu

- [Aiven: DBeaver connection](https://aiven.io/docs/products/mysql/howto/connect-with-dbeaver)
- [Aiven: TLS/SSL certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates)
- [Aiven: MySQL service users and grants](https://aiven.io/docs/products/mysql/howto/manage-service-users)
- [DBeaver: MySQL connection settings](https://dbeaver.com/docs/dbeaver/Database-driver-MySQL/) and [SSL configuration](https://dbeaver.com/docs/dbeaver/SSL-Configuration/)
- [MySQL Connector/J: SSL modes](https://dev.mysql.com/doc/connectors/en/connector-j-connp-props-security.html)
