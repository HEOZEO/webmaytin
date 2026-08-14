-- Migration: Huế Delivery Zone Locations
-- Giao hàng trong TP. Huế và ngoại vi 10km
-- Zone 1 (trung tâm): 0-3km - phí 15,000đ
-- Zone 2 (gần): 3-6km - phí 25,000đ
-- Zone 3 (ngoại vi): 6-10km - phí 35,000đ

BEGIN;

-- Bảng quận/huyện
CREATE TABLE IF NOT EXISTS districts (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    zone            SMALLINT NOT NULL CHECK (zone BETWEEN 1 AND 3),
    shipping_fee    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng phường/xã
CREATE TABLE IF NOT EXISTS wards (
    id              SERIAL PRIMARY KEY,
    district_id     INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    code            VARCHAR(20) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_wards_district ON wards(district_id);

COMMIT;
