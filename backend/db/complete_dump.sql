--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense',
    'transfer'
);


--
-- Name: check_expense_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_expense_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (SELECT type FROM categories WHERE category_id = NEW.category_id) != 'expense' THEN
    RAISE EXCEPTION 'Category must be of type "expense" for products';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_income_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_income_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (SELECT type FROM categories WHERE category_id = NEW.category_id) != 'income' THEN
    RAISE EXCEPTION 'Category must be of type "income" for incomes';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_transfer_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_transfer_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (SELECT type FROM categories WHERE category_id = NEW.category_id) != 'transfer' THEN
    RAISE EXCEPTION 'Category must be of type "transfer" for transfers';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_account_with_income(integer, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_account_with_income(p_user_id integer, p_account_name text, p_balance_source text, p_amount numeric) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_account_id INT;
BEGIN
  INSERT INTO accounts (user_id, account_name, balance_source)
  VALUES (p_user_id, p_account_name, p_balance_source)
  RETURNING account_id INTO new_account_id;

  INSERT INTO incomes (user_id, amount, description, date_added, account_id)
  VALUES (p_user_id, p_amount, 'Default Cash Account', CURRENT_TIMESTAMP, new_account_id);

  RETURN new_account_id;
END;
$$;


--
-- Name: create_default_accounts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_accounts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Insert default accounts for the new user
  INSERT INTO accounts (user_id, account_name, balance_source, created_at)
  VALUES 
    (NEW.user_id, 'Default Cash', 'cash', CURRENT_TIMESTAMP),
    (NEW.user_id, 'Default Bank Account', 'bank_account', CURRENT_TIMESTAMP);
  RETURN NEW;
END;
$$;


--
-- Name: get_user_balances(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_balances(p_user_id integer) RETURNS TABLE(balance_id integer, user_id integer, balance_source character varying, balance_amount numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE NOTICE 'Getting balances for user_id = %', p_user_id;
  
  -- Get the most recent last_updated timestamp for income transactions
  CREATE TEMP TABLE temp_last_income AS
  SELECT MAX(last_updated) AS last_updated
  FROM transactions
  WHERE transactions.user_id = p_user_id AND income_id IS NOT NULL;
  
  RETURN QUERY
  SELECT
    a.account_id AS balance_id,
    a.user_id,
    a.balance_source,
    COALESCE(
      SUM(
        CASE
          WHEN t.income_id IS NOT NULL THEN
            t.amount
          WHEN t.product_id IS NOT NULL THEN 
            CASE 
              WHEN (SELECT last_updated FROM temp_last_income) IS NULL OR 
                   t.date_added > (SELECT last_updated FROM temp_last_income) THEN 
                CASE
                  -- For product expenses with NULL account_id, only include them in the Cash account
                  WHEN t.account_id IS NULL AND LOWER(a.balance_source) = 'cash' THEN
                    t.amount
                  -- For product expenses with an account_id, include them in their respective account
                  WHEN t.account_id IS NOT NULL AND t.account_id = a.account_id THEN
                    t.amount
                  ELSE
                    0
                END
              ELSE
                0
            END
          WHEN t.transfer_id IS NOT NULL THEN
            CASE
              WHEN (SELECT last_updated FROM temp_last_income) IS NULL OR 
                   t.date_added > (SELECT last_updated FROM temp_last_income) THEN
                CASE 
                  WHEN tr.source_account_id = a.account_id THEN
                    t.amount
                  WHEN tr.target_account_id = a.account_id THEN
                    t.amount
                  ELSE
                    0
                END
              ELSE
                0
            END
          ELSE
            0
        END
      ), 0
    ) AS balance_amount
  FROM accounts a
  LEFT JOIN transactions t ON 
    -- Regular join condition for transactions with account_id
    (t.account_id = a.account_id) OR 
    -- Special condition for expenses with NULL account_id that should go to the Cash account
    (t.account_id IS NULL AND t.product_id IS NOT NULL AND t.user_id = p_user_id AND LOWER(a.balance_source) = 'cash')
  LEFT JOIN transfers tr ON t.transfer_id = tr.transfer_id
  WHERE a.user_id = p_user_id
  GROUP BY a.account_id, a.user_id, a.balance_source;
  
  DROP TABLE IF EXISTS temp_last_income;
  RAISE NOTICE 'Completed balance query for user_id = %', p_user_id;
END;
$$;


--
-- Name: get_user_incomes(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_incomes(p_user_id integer) RETURNS TABLE(income_id integer, user_id integer, account_id integer, amount numeric, description character varying, date_added timestamp with time zone, last_updated timestamp with time zone, balance_source character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.income_id,
        i.user_id,
        i.account_id,
        i.amount,
        i.description,
        i.date_added,  -- No cast needed, keep as timestamp with time zone
        i.last_updated, -- No cast needed, keep as timestamp with time zone
        a.balance_source
    FROM incomes i
    JOIN accounts a ON i.account_id = a.account_id
    WHERE i.user_id = p_user_id;
END;
$$;


--
-- Name: get_user_transfers(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_transfers(p_user_id integer) RETURNS TABLE(transfer_id integer, user_id integer, from_source character varying, to_source character varying, amount numeric, date_added timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.transfer_id,
        t.user_id,
        sa.balance_source,
        ta.balance_source,
        t.amount,
        t.date_added
    FROM transfers t
    JOIN accounts sa ON t.source_account_id = sa.account_id
    JOIN accounts ta ON t.target_account_id = ta.account_id
    WHERE t.user_id = p_user_id;
END;
$$;


--
-- Name: trigger_manage_income_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_manage_income_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO transactions (
            user_id, account_id, income_id, amount, description, date_added, last_updated
        )
        VALUES (
            NEW.user_id, NEW.account_id, NEW.income_id, NEW.amount, NEW.description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE transactions
        SET amount = NEW.amount,
            description = NEW.description,
            user_id = NEW.user_id,
            account_id = NEW.account_id,
            last_updated = CURRENT_TIMESTAMP
        WHERE income_id = NEW.income_id;

        IF NOT FOUND THEN
            INSERT INTO transactions (
                user_id, account_id, income_id, amount, description, date_added, last_updated
            )
            VALUES (
                NEW.user_id, NEW.account_id, NEW.income_id, NEW.amount, NEW.description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: trigger_manage_product_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_manage_product_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO transactions (user_id, product_id, amount, description)
        VALUES (NEW.user_id, NEW.product_id, -(NEW.price * NEW.quantity), NEW.product_name);
        
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE transactions
        SET amount = -(NEW.price * NEW.quantity),
            description = NEW.product_name,
            user_id = NEW.user_id
        WHERE product_id = NEW.product_id;
        
        IF NOT FOUND THEN
            INSERT INTO transactions (user_id, product_id, amount, description)
            VALUES (NEW.user_id, NEW.product_id, -(NEW.price * NEW.quantity), NEW.product_name);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: trigger_manage_transfer_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_manage_transfer_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Debit source account
  INSERT INTO transactions (user_id, transfer_id, amount, description, account_id)
  VALUES (NEW.user_id, NEW.transfer_id, -NEW.amount, NEW.description, NEW.source_account_id);

  -- Credit target account
  INSERT INTO transactions (user_id, transfer_id, amount, description, account_id)
  VALUES (NEW.user_id, NEW.transfer_id, NEW.amount, NEW.description, NEW.target_account_id);

  RETURN NEW;
END;
$$;


--
-- Name: update_account_balance(integer, integer, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_account_balance(p_account_id integer, p_user_id integer, p_amount numeric) RETURNS TABLE(balance_id integer, returned_user_id integer, balance numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE incomes
    SET amount = p_amount
    WHERE account_id = p_account_id
      AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No matching income found for account_id % and user_id %', p_account_id, p_user_id;
    END IF;

    RETURN QUERY
    SELECT incomes.account_id, incomes.user_id, incomes.amount
    FROM incomes
    WHERE incomes.account_id = p_account_id
      AND incomes.user_id = p_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating income: %', SQLERRM;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    account_id integer NOT NULL,
    user_id integer NOT NULL,
    account_name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    balance_source character varying(255) DEFAULT 'bank_account'::character varying NOT NULL
);


--
-- Name: accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_account_id_seq OWNED BY public.accounts.account_id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    name character varying(255) NOT NULL,
    type public.transaction_type DEFAULT 'expense'::public.transaction_type NOT NULL
);


--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    expense_id integer NOT NULL,
    user_id integer,
    product_id integer,
    quantity integer DEFAULT 1,
    expense_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total numeric(10,2) NOT NULL
);


--
-- Name: expenses_expense_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_expense_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_expense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_expense_id_seq OWNED BY public.expenses.expense_id;


--
-- Name: file_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_metadata (
    file_id integer NOT NULL,
    user_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    upload_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: file_metadata_file_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_metadata_file_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_metadata_file_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_metadata_file_id_seq OWNED BY public.file_metadata.file_id;


--
-- Name: incomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incomes (
    income_id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255),
    date_added timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    category_id integer,
    account_id integer,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: incomes_income_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incomes_income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incomes_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incomes_income_id_seq OWNED BY public.incomes.income_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    product_id integer NOT NULL,
    user_id integer,
    category_id integer,
    file_name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    date_added timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    product_name character varying(255),
    quantity integer
);


--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_product_id_seq OWNED BY public.products.product_id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    transaction_id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer,
    income_id integer,
    transfer_id integer,
    amount numeric(10,2) NOT NULL,
    date_added timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description character varying(255),
    account_id integer,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_type_only CHECK ((((product_id IS NOT NULL) AND (income_id IS NULL) AND (transfer_id IS NULL)) OR ((product_id IS NULL) AND (income_id IS NOT NULL) AND (transfer_id IS NULL)) OR ((product_id IS NULL) AND (income_id IS NULL) AND (transfer_id IS NOT NULL))))
);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id;


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfers (
    transfer_id integer NOT NULL,
    user_id integer NOT NULL,
    category_id integer,
    amount numeric(10,2) NOT NULL,
    description character varying(255),
    date_added timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    source_account_id integer NOT NULL,
    target_account_id integer NOT NULL
);


--
-- Name: transfers_transfer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transfers_transfer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transfers_transfer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transfers_transfer_id_seq OWNED BY public.transfers.transfer_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: accounts account_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts ALTER COLUMN account_id SET DEFAULT nextval('public.accounts_account_id_seq'::regclass);


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: expenses expense_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN expense_id SET DEFAULT nextval('public.expenses_expense_id_seq'::regclass);


--
-- Name: file_metadata file_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_metadata ALTER COLUMN file_id SET DEFAULT nextval('public.file_metadata_file_id_seq'::regclass);


--
-- Name: incomes income_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomes ALTER COLUMN income_id SET DEFAULT nextval('public.incomes_income_id_seq'::regclass);


--
-- Name: products product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN product_id SET DEFAULT nextval('public.products_product_id_seq'::regclass);


--
-- Name: transactions transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass);


--
-- Name: transfers transfer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers ALTER COLUMN transfer_id SET DEFAULT nextval('public.transfers_transfer_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts (account_id, user_id, account_name, created_at, balance_source) FROM stdin;
1	6	Default Cash Account	2025-04-30 22:48:34.304685+05:30	cash
5	1	Default Cash Account	2025-05-15 20:18:28.692635+05:30	Cash
6	1	Default Cash Account	2025-05-15 21:53:13.083874+05:30	Crypto
7	1	Default Cash Account	2025-05-17 09:13:14.185595+05:30	Stocks
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (category_id, name, type) FROM stdin;
3	Food	expense
7	Clothing	expense
8	Household	expense
9	Personal Care	expense
10	Other	expense
11	3	expense
12	1	expense
13	4	expense
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (expense_id, user_id, product_id, quantity, expense_date, total) FROM stdin;
\.


--
-- Data for Name: file_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_metadata (file_id, user_id, file_name, upload_date) FROM stdin;
1	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 19:38:17.941091
2	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 19:39:09.429987
3	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 19:49:29.333148
4	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 21:47:21.156088
5	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 21:50:20.600472
6	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 21:53:01.465556
7	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-17 22:07:17.20114
8	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-18 00:16:27.756728
9	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-18 00:18:39.519742
10	1	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG	2025-01-18 00:21:56.239469
11	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-01-31 18:55:13.051244
12	1	WhatsApp Image 2025-02-20 at 05.17.01.jpeg	2025-04-26 12:19:45.224015
13	1	WhatsApp Image 2025-02-20 at 05.17.01.jpeg	2025-04-26 12:22:25.751247
14	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:38:33.092589
15	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:41:44.017463
16	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:42:35.285038
17	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:44:19.717223
18	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:47:14.703013
19	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:48:16.579358
20	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:57:27.739516
21	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:59:17.832292
22	1	7259AF4B-B1CF-45C1-8CEB-D7C31AC92E60.jpg	2025-04-27 11:59:42.222827
23	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-04-29 23:40:53.280791
24	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-04-30 00:03:43.03054
25	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-04-30 00:40:41.283651
26	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-04-30 00:52:25.963764
27	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-04-30 00:56:09.057756
28	1	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG	2025-04-30 01:04:15.346238
\.


--
-- Data for Name: incomes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incomes (income_id, user_id, amount, description, date_added, category_id, account_id, last_updated) FROM stdin;
1	6	30000.00	Salary	2025-05-01 00:24:26.681759+05:30	\N	1	2025-05-13 18:28:16.644243+05:30
6	1	30000.00	Default Cash Account	2025-05-15 21:53:13.083874+05:30	\N	6	2025-05-15 21:53:13.083874+05:30
7	1	20000.00	Default Cash Account	2025-05-17 09:13:14.185595+05:30	\N	7	2025-05-17 09:13:14.185595+05:30
5	1	20000.00	Default Cash Account	2025-05-15 20:18:28.692635+05:30	\N	5	2025-05-15 20:18:28.692635+05:30
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (product_id, user_id, category_id, file_name, description, price, date_added, product_name, quantity) FROM stdin;
13	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		25.00	2025-01-18 00:42:57.178054	MODERN BUN	1
14	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		15.00	2025-01-18 00:42:57.178054	BRT BI KREEMZ CHOC	3
15	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		20.00	2025-01-18 00:42:57.178054	SUNFEAST HIFI CC 40	4
16	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		140.00	2025-01-18 00:42:57.178054	BRT TIGER KRUNCH 7	14
17	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		10.00	2025-01-18 00:42:57.178054	BRITANNIA 5050 GOL	1
18	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		5.00	2025-01-18 00:42:57.178054	TIGER K2EEMZ ELC!	1
19	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		5.00	2025-01-18 00:42:57.178054	BRT TIGER 1776	1
20	1	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		5.00	2025-01-18 00:42:57.178054	TBITIGERKREEM	1
21	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		30.00	2025-01-18 00:43:04.226095	SOYASEEDS- 250G	1
22	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		28.00	2025-01-18 00:43:04.226095	BANGAL GRAM - 250G	1
23	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		40.00	2025-01-18 00:43:04.226095	JEERA - 50 GM	1
24	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		99.00	2025-01-18 00:43:04.226095	JOORDALSHIVLING	1
41	1	8	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		29.00	0001-01-01 00:00:00 BC	FACE TOWEL MERRY P	1
42	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		68.00	0001-01-01 00:00:00 BC	MILKY MIST TBL -10g	1
43	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		60.45	0001-01-01 00:00:00 BC	AMUL GARLI & H-100g	4
44	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		230.50	0001-01-01 00:00:00 BC	BADAM-200g	1
45	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		25.00	0001-01-01 00:00:00 BC	KURKURE MASALA -94g	1
46	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		40.00	0001-01-01 00:00:00 BC	BIKAJI SOYA ST-200g	2
47	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		30.00	0001-01-01 00:00:00 BC	BHUJTALALAJI K-150g	1
48	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		27.90	0001-01-01 00:00:00 BC	AMUL KOOL CAF-200ml	1
49	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		20.00	0001-01-01 00:00:00 BC	EPIGAMIA CHOC-180ml	1
50	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		28.00	0001-01-01 00:00:00 BC	MILKY MIST CH-220ml	2
51	1	10	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		48.75	0001-01-01 00:00:00 BC	FREEDOM LONGBODK	2
52	1	10	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		97.50	0001-01-01 00:00:00 BC	TRUNOTE LONGBOOK RU	3
53	1	10	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		80.00	0001-01-01 00:00:00 BC	SPIRAL 1 SUB NO	1
54	1	8	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		59.00	0001-01-01 00:00:00 BC	DOORMAT MICRO OVAL	1
55	1	8	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		149.00	0001-01-01 00:00:00 BC	DOORMAT MICR FRIZZY	1
56	1	8	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		19.00	0001-01-01 00:00:00 BC	CR COLOURED KULLAD	1
25	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		30.00	2024-11-09 00:00:00	SOYASEEDS- 250G	1
26	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		28.00	2024-11-09 00:00:00	BANGAL GRAM - 250	1
27	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		40.00	2024-11-09 00:00:00	JEERA - 50 GM	1
28	1	3	359e1e26-dba9-4aa9-8733-dad0db1dddf3.JPG		99.00	2024-11-09 00:00:00	JOORDALSHIVLING	1
29	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		122.00	0001-01-01 00:00:00 BC	BENGAL GRAM	0
30	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		45.00	0001-01-01 00:00:00 BC	SONA MASUR	0
31	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		45.00	0001-01-01 00:00:00 BC	SONA MASUR	0
32	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		40.00	0001-01-01 00:00:00 BC	AVALAKKI	0
33	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		27.00	0001-01-01 00:00:00 BC	NANDA SWEET BU-200g	1
34	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		22.50	0001-01-01 00:00:00 BC	MODERN DELICI0-200g	1
35	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		69.00	0001-01-01 00:00:00 BC	QUAKER QUIK CO-400g	1
36	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		47.00	0001-01-01 00:00:00 BC	PREMIA BESAN-500g	1
37	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		126.50	0001-01-01 00:00:00 BC	GROUNDNUT	0
38	1	3	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		95.00	0001-01-01 00:00:00 BC	RICE PAPAD	0
39	1	10	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		499.00	0001-01-01 00:00:00 BC	TRACK M MARVEL CARG	1
40	1	7	WhatsApp Image 2025-02-20 at 05.17.01.jpeg		149.00	0001-01-01 00:00:00 BC	SOCKS M NFCW SPORTA	1
94	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		25.00	2024-11-04 00:00:00	MODERN BUN	1
95	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		15.00	2024-11-04 00:00:00	BRT BI KREEMZ CHOC	3
96	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		20.00	2024-11-04 00:00:00	SUNFEAST HIFI CC 40	4
97	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		140.00	2024-11-04 00:00:00	BRT TIGER KRUNCH 7	14
98	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		10.00	2024-11-04 00:00:00	BRITANNIA 5050 GOL	1
99	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		5.00	2024-11-04 00:00:00	TIGER K2EEMZ ELAICI	1
100	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		5.00	2024-11-04 00:00:00	BRT TIGER 1776	1
101	6	3	3f6bf50b-f6ff-4aec-a4ff-9f472f5068fa.JPG		5.00	2024-11-04 00:00:00	TBITIGERKREEMZ	1
105	1	13	manual-entry		20.00	2025-05-15 00:00:00	Kitkat	1
106	1	13	manual-entry		19.97	2025-05-17 00:00:00	Kitkat	2
107	1	13	manual-entry		9.97	2025-05-17 00:00:00	Kitkat	1
108	1	13	manual-entry		10.00	2025-05-17 00:00:00	kitkat	1
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (transaction_id, user_id, product_id, income_id, transfer_id, amount, date_added, description, account_id, last_updated) FROM stdin;
21	1	\N	6	\N	30000.00	2025-05-15 21:53:13.083874+05:30	Default Cash Account	6	\N
29	1	\N	\N	4	-10000.00	2025-05-15 22:13:46.987596+05:30	\N	6	\N
3	6	\N	1	\N	30000.00	2025-05-01 00:39:56.19372+05:30	Salary	\N	\N
30	1	\N	\N	4	10000.00	2025-05-15 22:13:46.987596+05:30	\N	5	\N
19	1	105	\N	\N	-20.00	2025-05-15 20:20:32.092999+05:30	Kitkat	5	\N
31	1	\N	7	\N	20000.00	2025-05-17 09:13:14.185595+05:30	Default Cash Account	7	2025-05-17 09:13:14.185595+05:30
32	1	106	\N	\N	-39.94	2025-05-17 09:29:18.744786+05:30	Kitkat	\N	2025-05-17 09:29:18.744786+05:30
33	1	107	\N	\N	-9.97	2025-05-17 09:41:08.345926+05:30	Kitkat	\N	2025-05-17 09:41:08.345926+05:30
17	1	\N	5	\N	20000.00	2025-05-15 20:18:28.692635+05:30	Default Cash Account	5	2025-05-17 09:50:24.200647+05:30
34	1	108	\N	\N	-10.00	2025-05-17 09:50:48.635379+05:30	kitkat	\N	2025-05-17 09:50:48.635379+05:30
4	6	94	\N	\N	25.00	2025-05-01 00:44:00.867072+05:30	MODERN BUN	\N	\N
5	6	95	\N	\N	45.00	2025-05-01 00:44:00.867072+05:30	BRIT BI KREEMZ CHOC	\N	\N
6	6	96	\N	\N	80.00	2025-05-01 00:44:00.867072+05:30	SUNFEAST HIFI CC 40	\N	\N
7	6	97	\N	\N	1960.00	2025-05-01 00:44:00.867072+05:30	BRIT TIGER KRUNCH 7	\N	\N
8	6	98	\N	\N	10.00	2025-05-01 00:44:00.867072+05:30	BRITANNIA 5050 GOLD	\N	\N
9	6	99	\N	\N	5.00	2025-05-01 00:44:00.867072+05:30	TIGER KREEMZ ELAICI	\N	\N
10	6	100	\N	\N	5.00	2025-05-01 00:44:00.867072+05:30	TIGER 1776	\N	\N
11	6	101	\N	\N	5.00	2025-05-01 00:44:00.867072+05:30	TIGER KREEMZ	\N	\N
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transfers (transfer_id, user_id, category_id, amount, description, date_added, source_account_id, target_account_id) FROM stdin;
4	1	\N	10000.00	\N	2025-05-15 22:13:46.987596+05:30	6	5
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, username, email, password_hash, created_at) FROM stdin;
1	Aneesh Hegde	aneeshhegde7110@gmail.com	$2a$10$ZQZOqS7O08DiEKk74Aacnuo5X0POjOC0kOaofEQNkFFPT8sn..epW	2025-01-15 00:38:27.359792
2	testuser	test@gmail.com	$2a$10$HCoZJRuIcokkc6e5A8pK/u9C0BM3FfRAb87WQlPg2JyMKWZtA8YD2	2025-01-15 22:46:22.562698
6	Data Transfer	datatransfer7110@gmail.com	\N	2025-04-29 23:40:04.810455
\.


--
-- Name: accounts_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_account_id_seq', 7, true);


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 13, true);


--
-- Name: expenses_expense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_expense_id_seq', 1, false);


--
-- Name: file_metadata_file_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_metadata_file_id_seq', 28, true);


--
-- Name: incomes_income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.incomes_income_id_seq', 7, true);


--
-- Name: products_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_product_id_seq', 108, true);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_transaction_id_seq', 34, true);


--
-- Name: transfers_transfer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transfers_transfer_id_seq', 4, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 6, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (account_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: file_metadata file_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_pkey PRIMARY KEY (file_id);


--
-- Name: incomes incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_pkey PRIMARY KEY (income_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (transfer_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: incomes trg_income_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_income_transaction AFTER INSERT OR UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.trigger_manage_income_transaction();


--
-- Name: products trigger_after_product_insert_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_after_product_insert_update AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_manage_product_transaction();


--
-- Name: products trigger_check_expense_category; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_expense_category BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_expense_category();


--
-- Name: incomes trigger_check_income_category; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_income_category BEFORE INSERT OR UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.check_income_category();


--
-- Name: transfers trigger_check_transfer_category; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_transfer_category BEFORE INSERT OR UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.check_transfer_category();


--
-- Name: users trigger_create_default_accounts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_default_accounts AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_default_accounts();


--
-- Name: transfers trigger_transfer_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_transfer_transaction AFTER INSERT ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.trigger_manage_transfer_transaction();


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: expenses expenses_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: expenses expenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: file_metadata file_metadata_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: incomes fk_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT fk_account_id FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;


--
-- Name: incomes incomes_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: incomes incomes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: products products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: transactions transactions_income_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_income_id_fkey FOREIGN KEY (income_id) REFERENCES public.incomes(income_id);


--
-- Name: transactions transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: transactions transactions_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.transfers(transfer_id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: transfers transfers_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: transfers transfers_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(account_id);


--
-- Name: transfers transfers_target_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(account_id);


--
-- Name: transfers transfers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

