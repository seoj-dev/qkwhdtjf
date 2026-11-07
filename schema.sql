CREATE DATABASE IF NOT EXISTS sleep_test DEFAULT CHARACTER SET utf8mb4;
USE sleep_test;

CREATE TABLE IF NOT EXISTS results (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL UNIQUE,   -- 아이디로 다시 조회하는 키
  result_type VARCHAR(50) NOT NULL,         -- 예: "올빼미형"
  detail     JSON,                          -- 점수 등 상세 (선택)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);