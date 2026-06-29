-- =============================================================================
-- Reference tables for APS FK targets NOT defined in APS_TBL.sql
-- Run ONLY when EX_RATE / WAREHOUSE_DETAILS are missing from the ERP schema.
-- Review column names against your live Oracle dictionary before executing.
-- =============================================================================

-- EX_RATE (currencies)
-- CREATE TABLE EX_RATE (
--   CUR_CODE   VARCHAR2(7)   NOT NULL,
--   CUR_A_NAME VARCHAR2(100) NOT NULL,
--   CUR_E_NAME VARCHAR2(100),
--   CUR_RATE   NUMBER        DEFAULT 1 NOT NULL,
--   INACTIVE   NUMBER(1)     DEFAULT 0 NOT NULL,
--   AD_DATE    DATE,
--   CONSTRAINT EX_RATE_PK PRIMARY KEY (CUR_CODE)
-- );

-- WAREHOUSE_DETAILS
-- CREATE TABLE WAREHOUSE_DETAILS (
--   W_CODE    NUMBER(10)    NOT NULL,
--   W_A_NAME  VARCHAR2(100) NOT NULL,
--   W_E_NAME  VARCHAR2(100),
--   INACTIVE  NUMBER(1)     DEFAULT 0 NOT NULL,
--   AD_DATE   DATE,
--   CONSTRAINT WAREHOUSE_DETAILS_PK PRIMARY KEY (W_CODE)
-- );

-- COMMIT;
