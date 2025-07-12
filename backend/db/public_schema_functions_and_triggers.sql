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

SET default_tablespace = '';

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

