-- file path: backend/db/init.sql
DROP TABLE IF EXISTS ticker_metrics;

CREATE TABLE ticker_metrics (
    ticker              VARCHAR(10)     NOT NULL,
    observation_date    DATE            NOT NULL,
    avg_alpha_5y        NUMERIC(12,6)   NOT NULL,
    rolling_alpha_1y    NUMERIC(12,6)   NOT NULL,
    avg_beta_5y         NUMERIC(12,6)   NOT NULL,
    rolling_beta_1y     NUMERIC(12,6)   NOT NULL,
    hist_pct_alpha_1y   NUMERIC(12,6), -- NEW: Historical Alpha Percentile
    hist_pct_beta_1y    NUMERIC(12,6), -- NEW: Historical Beta Percentile
    run_id              UUID            NOT NULL,
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    
    PRIMARY KEY (ticker, observation_date)
);

-- Index for fast daily querying
CREATE INDEX idx_observation_date ON ticker_metrics (observation_date);