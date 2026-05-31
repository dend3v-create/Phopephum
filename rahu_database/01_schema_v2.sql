-- ============================================================
-- ยามราหูค้นทรัพย์ — Complete Database Schema v2.0
-- เพิ่ม: meaning_short, meaning_detail, use_for ใน sub_blocks
-- ============================================================

CREATE TABLE time_blocks (
    id          INTEGER PRIMARY KEY,
    period_type VARCHAR(20)  NOT NULL,
    slot_number INTEGER      NOT NULL,
    start_time  VARCHAR(8)   NOT NULL,
    end_time    VARCHAR(8)   NOT NULL
);

CREATE TABLE sub_blocks (
    id              INTEGER PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL,
    minute_start    INTEGER      NOT NULL,
    minute_end      INTEGER      NOT NULL,
    is_good         BOOLEAN      NOT NULL,
    phase_indicator VARCHAR(20),
    meaning_short   VARCHAR(100),   -- ✨ NEW: กลุ่มบุคคลที่ตรงกับยามนี้
    meaning_detail  TEXT,           -- ✨ NEW: คำอธิบายเต็มจากตำรา
    use_for         VARCHAR(255)    -- ✨ NEW: แนะนำใช้ทำอะไร
);

CREATE TABLE yam_matrix (
    id            INTEGER PRIMARY KEY,
    day_of_week   INTEGER NOT NULL,
    time_block_id INTEGER NOT NULL,
    yam_number    INTEGER NOT NULL,
    FOREIGN KEY (time_block_id) REFERENCES time_blocks(id)
);

CREATE TABLE yam_rules (
    yam_number       INTEGER PRIMARY KEY,
    yam_name         VARCHAR(50)  NOT NULL,
    traibhum_result  VARCHAR(50)  NOT NULL,
    huajai_truth     VARCHAR(100) NOT NULL,
    huajai_lost_item VARCHAR(100) NOT NULL,
    huajai_health    VARCHAR(100) NOT NULL,
    good_phase_desc  VARCHAR(100) NOT NULL
);

