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
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: aneesh
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense',
    'transfer'
);


ALTER TYPE public.transaction_type OWNER TO aneesh;

--
-- Name: check_expense_category(); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.check_expense_category() OWNER TO aneesh;

--
-- Name: check_income_category(); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.check_income_category() OWNER TO aneesh;

--
-- Name: check_transfer_category(); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.check_transfer_category() OWNER TO aneesh;

--
-- Name: create_account_with_income(integer, text, text, numeric); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.create_account_with_income(p_user_id integer, p_account_name text, p_balance_source text, p_amount numeric) OWNER TO aneesh;

--
-- Name: create_default_accounts(); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.create_default_accounts() OWNER TO aneesh;

--
-- Name: get_user_balances(integer); Type: FUNCTION; Schema: public; Owner: aneesh
--

CREATE FUNCTION public.get_user_balances(p_user_id integer) RETURNS TABLE(balance_id integer, user_id integer, balance_source character varying, balance_amount numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE NOTICE 'Getting balances for user_id = %', p_user_id;

  RETURN QUERY
  SELECT
    a.account_id AS balance_id,
    a.user_id,
    a.balance_source,
    COALESCE(SUM(t.amount), 0) AS balance_amount
  FROM accounts a
  LEFT JOIN transactions t ON a.account_id = t.account_id
  WHERE a.user_id = p_user_id
  GROUP BY a.account_id, a.user_id, a.balance_source;

  RAISE NOTICE 'Completed balance query for user_id = %', p_user_id;
END;
$$;


ALTER FUNCTION public.get_user_balances(p_user_id integer) OWNER TO aneesh;

--
-- Name: get_user_incomes(integer); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.get_user_incomes(p_user_id integer) OWNER TO aneesh;

--
-- Name: get_user_transfers(integer); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.get_user_transfers(p_user_id integer) OWNER TO aneesh;

--
-- Name: trigger_manage_income_transaction(); Type: FUNCTION; Schema: public; Owner: aneesh
--

CREATE FUNCTION public.trigger_manage_income_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO transactions (user_id, account_id, income_id, amount, description, date_added)
        VALUES (NEW.user_id, NEW.account_id, NEW.income_id, NEW.amount, NEW.description, CURRENT_TIMESTAMP);

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE transactions
        SET amount = NEW.amount,
            description = NEW.description,
            user_id = NEW.user_id,
            account_id = NEW.account_id
        WHERE income_id = NEW.income_id;

        IF NOT FOUND THEN
            INSERT INTO transactions (user_id, account_id, income_id, amount, description, date_added)
            VALUES (NEW.user_id, NEW.account_id, NEW.income_id, NEW.amount, NEW.description, CURRENT_TIMESTAMP);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_manage_income_transaction() OWNER TO aneesh;

--
-- Name: trigger_manage_product_transaction(); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.trigger_manage_product_transaction() OWNER TO aneesh;

--
-- Name: trigger_manage_transfer_transaction(); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.trigger_manage_transfer_transaction() OWNER TO aneesh;

--
-- Name: update_account_balance(integer, integer, numeric); Type: FUNCTION; Schema: public; Owner: aneesh
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


ALTER FUNCTION public.update_account_balance(p_account_id integer, p_user_id integer, p_amount numeric) OWNER TO aneesh;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: aneesh
--

CREATE TABLE public.accounts (
    account_id integer NOT NULL,
    user_id integer NOT NULL,
    account_name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    balance_source character varying(255) DEFAULT 'bank_account'::character varying NOT NULL
);


ALTER TABLE public.accounts OWNER TO aneesh;

--
-- Name: accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.accounts_account_id_seq OWNER TO aneesh;

--
-- Name: accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.accounts_account_id_seq OWNED BY public.accounts.account_id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: aneesh
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    name character varying(255) NOT NULL,
    type public.transaction_type DEFAULT 'expense'::public.transaction_type NOT NULL
);


ALTER TABLE public.categories OWNER TO aneesh;

--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_category_id_seq OWNER TO aneesh;

--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: aneesh
--

CREATE TABLE public.expenses (
    expense_id integer NOT NULL,
    user_id integer,
    product_id integer,
    quantity integer DEFAULT 1,
    expense_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total numeric(10,2) NOT NULL
);


ALTER TABLE public.expenses OWNER TO aneesh;

--
-- Name: expenses_expense_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.expenses_expense_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expenses_expense_id_seq OWNER TO aneesh;

--
-- Name: expenses_expense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.expenses_expense_id_seq OWNED BY public.expenses.expense_id;


--
-- Name: file_metadata; Type: TABLE; Schema: public; Owner: aneesh
--

CREATE TABLE public.file_metadata (
    file_id integer NOT NULL,
    user_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    upload_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.file_metadata OWNER TO aneesh;

--
-- Name: file_metadata_file_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.file_metadata_file_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.file_metadata_file_id_seq OWNER TO aneesh;

--
-- Name: file_metadata_file_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.file_metadata_file_id_seq OWNED BY public.file_metadata.file_id;


--
-- Name: incomes; Type: TABLE; Schema: public; Owner: aneesh
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


ALTER TABLE public.incomes OWNER TO aneesh;

--
-- Name: incomes_income_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.incomes_income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.incomes_income_id_seq OWNER TO aneesh;

--
-- Name: incomes_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.incomes_income_id_seq OWNED BY public.incomes.income_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: aneesh
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


ALTER TABLE public.products OWNER TO aneesh;

--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.products_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_product_id_seq OWNER TO aneesh;

--
-- Name: products_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.products_product_id_seq OWNED BY public.products.product_id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: aneesh
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
    CONSTRAINT one_type_only CHECK ((((product_id IS NOT NULL) AND (income_id IS NULL) AND (transfer_id IS NULL)) OR ((product_id IS NULL) AND (income_id IS NOT NULL) AND (transfer_id IS NULL)) OR ((product_id IS NULL) AND (income_id IS NULL) AND (transfer_id IS NOT NULL))))
);


ALTER TABLE public.transactions OWNER TO aneesh;

--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transactions_transaction_id_seq OWNER TO aneesh;

--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id;


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: aneesh
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


ALTER TABLE public.transfers OWNER TO aneesh;

--
-- Name: transfers_transfer_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.transfers_transfer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transfers_transfer_id_seq OWNER TO aneesh;

--
-- Name: transfers_transfer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.transfers_transfer_id_seq OWNED BY public.transfers.transfer_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: aneesh
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO aneesh;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: aneesh
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_user_id_seq OWNER TO aneesh;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: aneesh
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: accounts account_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.accounts ALTER COLUMN account_id SET DEFAULT nextval('public.accounts_account_id_seq'::regclass);


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: expenses expense_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.expenses ALTER COLUMN expense_id SET DEFAULT nextval('public.expenses_expense_id_seq'::regclass);


--
-- Name: file_metadata file_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.file_metadata ALTER COLUMN file_id SET DEFAULT nextval('public.file_metadata_file_id_seq'::regclass);


--
-- Name: incomes income_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.incomes ALTER COLUMN income_id SET DEFAULT nextval('public.incomes_income_id_seq'::regclass);


--
-- Name: products product_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.products ALTER COLUMN product_id SET DEFAULT nextval('public.products_product_id_seq'::regclass);


--
-- Name: transactions transaction_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass);


--
-- Name: transfers transfer_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transfers ALTER COLUMN transfer_id SET DEFAULT nextval('public.transfers_transfer_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (account_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: file_metadata file_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_pkey PRIMARY KEY (file_id);


--
-- Name: incomes incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_pkey PRIMARY KEY (income_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (transfer_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: incomes trg_income_transaction; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trg_income_transaction AFTER INSERT OR UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.trigger_manage_income_transaction();


--
-- Name: products trigger_after_product_insert_update; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trigger_after_product_insert_update AFTER INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_manage_product_transaction();


--
-- Name: products trigger_check_expense_category; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trigger_check_expense_category BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_expense_category();


--
-- Name: incomes trigger_check_income_category; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trigger_check_income_category BEFORE INSERT OR UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.check_income_category();


--
-- Name: transfers trigger_check_transfer_category; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trigger_check_transfer_category BEFORE INSERT OR UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.check_transfer_category();


--
-- Name: users trigger_create_default_accounts; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trigger_create_default_accounts AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_default_accounts();


--
-- Name: transfers trigger_transfer_transaction; Type: TRIGGER; Schema: public; Owner: aneesh
--

CREATE TRIGGER trigger_transfer_transaction AFTER INSERT ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.trigger_manage_transfer_transaction();


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: expenses expenses_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: expenses expenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: file_metadata file_metadata_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: incomes fk_account_id; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT fk_account_id FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;


--
-- Name: incomes incomes_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: incomes incomes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: products products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id);


--
-- Name: transactions transactions_income_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_income_id_fkey FOREIGN KEY (income_id) REFERENCES public.incomes(income_id);


--
-- Name: transactions transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: transactions transactions_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.transfers(transfer_id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: transfers transfers_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: transfers transfers_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(account_id);


--
-- Name: transfers transfers_target_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_target_account_id_fkey FOREIGN KEY (target_account_id) REFERENCES public.accounts(account_id);


--
-- Name: transfers transfers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: aneesh
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

