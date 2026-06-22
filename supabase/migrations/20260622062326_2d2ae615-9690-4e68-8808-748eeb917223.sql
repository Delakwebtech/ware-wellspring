
ALTER TABLE public.stores        ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.branches      ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.inventories   ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.sales         ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.credit_sales  ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.damages       ADD COLUMN IF NOT EXISTS legacy_id int;
ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS legacy_id int;

DO $mk$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stores_legacy_id_key')        THEN ALTER TABLE public.stores        ADD CONSTRAINT stores_legacy_id_key        UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_legacy_id_key')      THEN ALTER TABLE public.branches      ADD CONSTRAINT branches_legacy_id_key      UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_legacy_id_key')      THEN ALTER TABLE public.profiles      ADD CONSTRAINT profiles_legacy_id_key      UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='inventories_legacy_id_key')   THEN ALTER TABLE public.inventories   ADD CONSTRAINT inventories_legacy_id_key   UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sales_legacy_id_key')         THEN ALTER TABLE public.sales         ADD CONSTRAINT sales_legacy_id_key         UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='credit_sales_legacy_id_key')  THEN ALTER TABLE public.credit_sales  ADD CONSTRAINT credit_sales_legacy_id_key  UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='damages_legacy_id_key')       THEN ALTER TABLE public.damages       ADD CONSTRAINT damages_legacy_id_key       UNIQUE (legacy_id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sales_returns_legacy_id_key') THEN ALTER TABLE public.sales_returns ADD CONSTRAINT sales_returns_legacy_id_key UNIQUE (legacy_id); END IF;
END $mk$;

INSERT INTO public.stores (id, legacy_id, name, subdomain, logo, currency, created_at, updated_at) VALUES
(gen_random_uuid(),  1, 'Demo',                                  'demo',           'http://api.imstore.net/public/store_1778060362293_WhatsApp_Image_2025-11-23_at_7.21.41_PM.jpeg', 'NGN', '2026-05-06 09:39:22+00','2026-05-06 09:39:22+00'),
(gen_random_uuid(),  2, 'Naastech Phones & Gadgets',             'naastech',       'http://api.imstore.net/public/store_1778061331694_computer-icons-online-shopping-png-favpng-QuiWDXbsc69EE92m3bZ2i0ybS.jpg', 'NGN', '2026-05-06 09:55:31+00','2026-05-06 09:55:31+00'),
(gen_random_uuid(),  3, 'More Goodness Fashion',                 'moregoodness',   'http://api.imstore.net/public/store_1778522029966_moregoodness.jpeg', 'NGN', '2026-05-11 17:53:49+00','2026-05-11 17:53:49+00'),
(gen_random_uuid(),  4, 'DBASS MICROPHONES',                     'dbass',          'http://api.imstore.net/public/store_1778597758497_dbass.jpeg',        'NGN', '2026-05-12 14:55:58+00','2026-05-12 14:55:58+00'),
(gen_random_uuid(),  5, 'Tara''s Global Nigeria Enterprise',     'taraglobal',     'http://api.imstore.net/public/store_1778598498553_taraglobal.jpeg',   'NGN', '2026-05-12 15:08:18+00','2026-05-12 15:08:18+00'),
(gen_random_uuid(),  6, 'RIOTECH OIL AND GAS GLOBAL LIMITED',    'riotech',        'http://api.imstore.net/public/store_1778617057078_riotech.jpeg',      'NGN', '2026-05-12 20:17:37+00','2026-05-12 20:17:37+00'),
(gen_random_uuid(),  7, 'BEAULAH IMANI MEDICO VENTURE',          'beaulahmedic',   'http://api.imstore.net/public/store_1778623209398_beulah.jpeg',       'NGN', '2026-05-12 22:00:09+00','2026-05-12 22:00:09+00'),
(gen_random_uuid(),  8, 'MASHALLAH AGRO VENTURE',                'mashallahagro',  'http://api.imstore.net/public/store_1778623617601_default.jpg',       'NGN', '2026-05-12 22:06:57+00','2026-05-12 22:06:57+00'),
(gen_random_uuid(),  9, 'Double A Medicine Stores',              'doublea',        'http://api.imstore.net/public/store_1779025794018_double-a.jpeg',     'NGN', '2026-05-17 13:49:54+00','2026-05-17 13:49:54+00'),
(gen_random_uuid(), 10, 'ROZLAN HUB',                            'rozlanhub',      'http://api.imstore.net/public/store_1780584371389_IMG-20260604-WA0006.jpg', 'NGN', '2026-06-04 14:46:11+00','2026-06-04 14:46:11+00'),
(gen_random_uuid(), 11, 'Akik Market',                           'akikmarket',     'http://api.imstore.net/public/store_1780985781258_IMG-20260609-WA0000.jpg', 'NGN', '2026-06-09 06:16:21+00','2026-06-09 06:16:21+00')
ON CONFLICT (legacy_id) DO NOTHING;

WITH s AS (SELECT id, legacy_id FROM public.stores WHERE legacy_id IS NOT NULL)
INSERT INTO public.branches (id, legacy_id, store_id, name, address, created_at, updated_at)
SELECT gen_random_uuid(), b.lid, s.id, b.bname, b.bname, b.ca, b.ca
FROM (VALUES
  ( 1, 1,  'No 52, Oke Ado',                                                                                    '2026-05-06 09:39:22+00'::timestamptz),
  ( 2, 1,  'No 5, Yaba',                                                                                        '2026-05-06 09:39:22+00'::timestamptz),
  ( 3, 2,  'Beside Chicken & Co., Mokola, Round About, Ibadan.',                                                '2026-05-06 09:55:31+00'::timestamptz),
  ( 4, 3,  'Eric More, Surulere, Lagos',                                                                        '2026-05-11 17:53:50+00'::timestamptz),
  ( 5, 4,  'Pacesetter Mega Mall, SWEDEN C40, Beside UBA Bank in Electronics Section, Ojo Alaba, Lagos.',       '2026-05-12 14:55:58+00'::timestamptz),
  ( 6, 4,  'Shop No. B209b, Electronic Section, Ojo Alaba International Market, Ojo, Lagos.',                   '2026-05-12 14:55:58+00'::timestamptz),
  ( 7, 5,  'Opposite Mrs Filling Station Ayegun Area, Along Olomi-Olojuoro Road, Ibadan, Oyo State',            '2026-05-12 15:08:18+00'::timestamptz),
  ( 8, 6,  'Klm 129, Kaykay Bus Stop, Opp. OTM Central Mosque, Boluwaji, Lagos-Ibadan Express Road, Ibadan',    '2026-05-12 20:17:37+00'::timestamptz),
  ( 9, 7,  'Daura da tashar Nata''ala',                                                                         '2026-05-12 22:00:09+00'::timestamptz),
  (10, 8,  'In Front of Oke Koto Mosque, Idiape, Ilorin.',                                                      '2026-05-12 22:06:57+00'::timestamptz),
  (11, 9,  'Foko Street, Agbeni Market, Ibadan, Oyo State.',                                                    '2026-05-17 13:49:54+00'::timestamptz),
  (12, 10, '1, Ojasope House, Osajin -Apete, Ibadan.',                                                          '2026-06-04 14:46:11+00'::timestamptz),
  (13, 11, 'Shop 34, Iwo Road Shopping Complex, Ibadan, Oyo State.',                                            '2026-06-09 06:16:21+00'::timestamptz)
) AS b(lid, store_lid, bname, ca)
JOIN s ON s.legacy_id = b.store_lid
ON CONFLICT (legacy_id) DO NOTHING;

DO $u$
DECLARE
  rec record;
  u_id uuid;
  s_uuid uuid;
  b_uuid uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ( 1, NULL::int, NULL::int, 'Super Admin',                    'delakwebtech20@gmail.com',         '$2b$10$veaT4TwdKPQKXW9SUDY7yew5sUOhNTR/CsQhqBYiwFXxnIUQon8cC', 'superadmin', '2026-05-06 08:40:24+00'::timestamptz),
      ( 2,  1,         NULL,     'Abdullah Abbas',                 'ceo@abbas.com',                    '$2b$10$zmASzAvPTAnZ9a5CxxNFmOBo6tIGOzdXlY97kieF2JoFkU/uQ3Rm.', 'ceo',        '2026-05-06 09:39:22+00'),
      ( 3,  2,         NULL,     'Nurudeen Atilola',               'atilolanurudeen6@gmail.com',       '$2b$10$XFnmQq1OERh6gAwRj2a72uy65tjNJ2DqI2WY8S.5rsU.IgNcemruy', 'ceo',        '2026-05-06 09:55:31+00'),
      ( 4,  3,         NULL,     'Titilayo Muhammad',              'm.rashidat@yahoo.com',             '$2b$10$iwp8kJWEJ8iREYBGml2XqO2yshdqT8lqBlgdGiJOwhBxHrHJB7BkG', 'ceo',        '2026-05-11 17:53:49+00'),
      ( 5,  4,         NULL,     'Anthony Ikechukwu Nnoruka',      'ik.audio@yahoo.com',               '$2b$10$nrrycaEWj16KHCF7.naAOuPkvRDAogjBBI9w4Eae0bxEmi2kDjNu2', 'ceo',        '2026-05-12 14:55:58+00'),
      ( 6,  5,         NULL,     'Olalekan Olabisi Mujeedat',      'olalekanolabisi08@gmail.com',      '$2b$10$IQ3.sC3D/bM6naJWciHMm.h2j1vh1EzEg7wB7Gr9EMky/pgnCbbBC', 'ceo',        '2026-05-12 15:08:18+00'),
      ( 7,  6,         NULL,     'Abdulqudus Akorede Abdulrahman', 'bimson.korede@gmail.com',          '$2b$10$HSTUuFhvJnFa87mqgFi0C.WNzi682s1n5WFChgjY1LJwA3tPEzkuy', 'ceo',        '2026-05-12 20:17:37+00'),
      ( 8,  7,         NULL,     'Saminu Sa''idu',                 'ssmglobalresources@gmail.com',     '$2b$10$bhQkvMG350RZ6iqsl5IkxOFPWpV/z61gi2D9gc3CE.21H9QIansgG', 'ceo',        '2026-05-12 22:00:09+00'),
      ( 9,  8,         NULL,     'Kareem Raji Waliyat',            'eyitayokreatives@gmail.com',       '$2b$10$v8b8tsEeMRc2mvctn6Y9ouDFH7GmT2ZnEFdi6Z3baiJevOBOcCiLm', 'ceo',        '2026-05-12 22:06:57+00'),
      (10,  9,         NULL,     'Bidmus Fatimah',                 'fatbidmus@gmail.com',              '$2b$10$ltRn43VCEIkMbFynGcOGaOK2eE4TKcPhXmgyQd/KffEGqBOYk1CTm', 'ceo',        '2026-05-17 13:49:54+00'),
      (11,  1,         1,        'Ola Ade',                        'staff@gmail.com',                  '$2b$10$vB61NwYg6gMs4rRs/EhyO.ZVSnWCL4Kl9.DIG.gvlhGa2H5L1.ssa', 'staff',      '2026-05-17 19:32:50+00'),
      (12,  1,         1,        'Tony Ola',                       'manager@gmail.com',                '$2b$10$HGb1vq9lRO3BaJx1LVRApO/JQNW8jkvH.VVjbwxYxnwhE4aTZwHOG', 'manager',    '2026-05-17 20:56:44+00'),
      (13, 10,         NULL,     'Abdulrasaq Hassan Olanrewaju',   'rhozlhan081@gmail.com',            '$2b$10$X98TrJQGg/DPipLyHZDwkOdrbc5dZsTogSnYhkKY374N36v/sVBAK', 'ceo',        '2026-06-04 14:46:11+00'),
      (14, 11,         NULL,     'Adetunji Sodiq Ademola',         'okanlawonsodiq4all20@yahoo.com',   '$2b$10$Ubozl0xx9Y9y0S0s7O6MQ.cmn5UlzQ8VD4dgLESr6yquZI6ysvNym', 'ceo',        '2026-06-09 06:16:21+00')
    ) AS t(lid, store_lid, branch_lid, fullname, email, pw, role_txt, ca)
  LOOP
    SELECT id INTO u_id FROM auth.users WHERE email = rec.email;
    IF u_id IS NULL THEN
      u_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', u_id, 'authenticated', 'authenticated',
        rec.email, rec.pw, rec.ca,
        jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', rec.fullname),
        rec.ca, rec.ca, '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), u_id, jsonb_build_object('sub', u_id::text, 'email', rec.email), 'email', u_id::text, rec.ca, rec.ca, rec.ca);
    END IF;

    SELECT id INTO s_uuid FROM public.stores   WHERE legacy_id = rec.store_lid;
    SELECT id INTO b_uuid FROM public.branches WHERE legacy_id = rec.branch_lid;

    INSERT INTO public.profiles (id, legacy_id, full_name, email, store_id, branch_id, created_at, updated_at)
    VALUES (u_id, rec.lid, rec.fullname, rec.email, s_uuid, b_uuid, rec.ca, rec.ca)
    ON CONFLICT (id) DO UPDATE SET
      legacy_id = COALESCE(public.profiles.legacy_id, EXCLUDED.legacy_id),
      full_name = EXCLUDED.full_name,
      store_id  = EXCLUDED.store_id,
      branch_id = EXCLUDED.branch_id;

    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u_id AND role = rec.role_txt::app_role) THEN
      INSERT INTO public.user_roles (user_id, role, store_id) VALUES (u_id, rec.role_txt::app_role, s_uuid);
    END IF;
  END LOOP;
END $u$;

WITH s AS (SELECT id, legacy_id FROM public.stores WHERE legacy_id IS NOT NULL),
     b AS (SELECT id, legacy_id FROM public.branches WHERE legacy_id IS NOT NULL),
     u AS (SELECT id, legacy_id FROM public.profiles WHERE legacy_id IS NOT NULL)
INSERT INTO public.inventories (id, legacy_id, store_id, branch_id, name, category, quantity, purchase_price, selling_price, status, added_by, reorder_level, created_at, updated_at)
SELECT gen_random_uuid(), i.lid, s.id, b.id, i.iname, i.cat, i.qty, i.pp, i.sp, i.st::inventory_status, u.id, 5, i.ca, i.ua
FROM (VALUES
  (1, 1, 1,  2, 'iPhone 17',     'Phones',       25, 1500000, 2300000, 'available',   '2026-05-12 14:48:04+00'::timestamptz, '2026-06-08 14:36:57+00'::timestamptz),
  (2, 1, 1,  2, 'Astimin Syrup', 'Haematinic',   11,    4000,    7000, 'available',   '2026-05-17 19:17:15+00',              '2026-06-08 14:36:57+00'),
  (3, 1, 1,  2, 'SR 185',        'Microphone',   14,  580000,  800000, 'available',   '2026-05-17 20:40:48+00',              '2026-05-17 20:53:35+00'),
  (4, 4, 5,  5, 'SR-185',        'Microphone',    8,  580000,  700000, 'available',   '2026-05-17 20:40:51+00',              '2026-05-17 20:40:51+00'),
  (5,10,12, 13, 'JAMAX',         'EARPOD',        4,    2500,    5000, 'low',         '2026-06-08 12:05:13+00',              '2026-06-08 12:05:13+00'),
  (7,10,12, 13, 'SHPLUS',        'USB - TYPE C', 12,     700,    2000, 'available',   '2026-06-08 13:01:49+00',              '2026-06-08 13:01:49+00'),
  (8, 2, 3,  3, 'X650',          'Screen',        0,    7500,    8500, 'out_of_stock','2026-06-11 06:10:14+00',              '2026-06-11 06:10:14+00'),
  (9, 2, 3,  3, 'X6517',         'Screen',        0,    7800,    9000, 'out_of_stock','2026-06-11 06:22:17+00',              '2026-06-11 06:22:17+00')
) AS i(lid, store_lid, branch_lid, user_lid, iname, cat, qty, pp, sp, st, ca, ua)
JOIN s ON s.legacy_id = i.store_lid
JOIN b ON b.legacy_id = i.branch_lid
LEFT JOIN u ON u.legacy_id = i.user_lid
ON CONFLICT (legacy_id) DO NOTHING;

WITH s AS (SELECT id, legacy_id FROM public.stores WHERE legacy_id IS NOT NULL),
     b AS (SELECT id, legacy_id FROM public.branches WHERE legacy_id IS NOT NULL),
     u AS (SELECT id, legacy_id FROM public.profiles WHERE legacy_id IS NOT NULL)
INSERT INTO public.sales (id, legacy_id, sale_ref, items, total_amount, cost_amount, payment_method, store_id, branch_id, added_by, created_at)
SELECT gen_random_uuid(), sa.lid, sa.ref, sa.items::jsonb, sa.total, 0, sa.pm, s.id, b.id, u.id, sa.ca
FROM (VALUES
  (1, 1, 1, 2, 'SAL-1-1-2-20260517142459799-529',
   '[{"name":"Astimin Syrup","category":"Haematinic","quantity":1,"price":7000,"cost":4000}]',
   7000, 'Cash',    '2026-05-17 19:24:59+00'::timestamptz),
  (2, 1, 1, 2, 'SAL-1-1-2-20260517154942394-318',
   '[{"name":"SR 185","category":"Microphone","quantity":1,"price":800000,"cost":580000},{"name":"iPhone 17","category":"Phones","quantity":1,"price":2300000,"cost":1500000}]',
   3100000, 'Transfer','2026-05-17 20:49:42+00'),
  (3, 1, 1, 2, 'SAL-1-1-2-20260608044504281-516',
   '[{"name":"iPhone 17","category":"Phones","quantity":2,"price":2300000,"cost":1500000}]',
   4600000, 'Transfer','2026-06-08 09:45:04+00'),
  (4, 1, 1, 2, 'SAL-1-1-2-20260608093657306-334',
   '[{"name":"Astimin Syrup","category":"Haematinic","quantity":2,"price":7000,"cost":4000},{"name":"iPhone 17","category":"Phones","quantity":1,"price":2300000,"cost":1500000}]',
   2314000, 'Transfer','2026-06-08 14:36:57+00')
) AS sa(lid, store_lid, branch_lid, user_lid, ref, items, total, pm, ca)
JOIN s ON s.legacy_id = sa.store_lid
JOIN b ON b.legacy_id = sa.branch_lid
LEFT JOIN u ON u.legacy_id = sa.user_lid
ON CONFLICT (legacy_id) DO NOTHING;

WITH s AS (SELECT id, legacy_id FROM public.stores WHERE legacy_id IS NOT NULL),
     b AS (SELECT id, legacy_id FROM public.branches WHERE legacy_id IS NOT NULL),
     u AS (SELECT id, legacy_id FROM public.profiles WHERE legacy_id IS NOT NULL),
     i AS (SELECT id, legacy_id FROM public.inventories WHERE legacy_id IS NOT NULL)
INSERT INTO public.credit_sales (id, legacy_id, store_id, branch_id, inventory_id, buyer_name, quantity, price, total, amount_paid, balance, status, added_by, created_at, updated_at)
SELECT gen_random_uuid(), c.lid, s.id, b.id, i.id, c.buyer, c.qty, c.price, c.total, c.paid, c.bal,
       (CASE WHEN c.bal <= 0 THEN 'PAID' WHEN c.paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END)::credit_status,
       u.id, c.ca, c.ua
FROM (VALUES
  (1, 2, 1, 1, 2, 'Abdul', 1,   7000,    7000,   4000,   3000, '2026-05-17 19:29:17+00'::timestamptz, '2026-05-17 19:29:41+00'::timestamptz),
  (2, 3, 1, 1, 2, 'Tony',  1, 800000,  800000, 750000,  50000, '2026-05-17 20:53:35+00',              '2026-06-08 10:20:39+00')
) AS c(lid, inv_lid, store_lid, branch_lid, user_lid, buyer, qty, price, total, paid, bal, ca, ua)
JOIN s ON s.legacy_id = c.store_lid
JOIN b ON b.legacy_id = c.branch_lid
JOIN i ON i.legacy_id = c.inv_lid
LEFT JOIN u ON u.legacy_id = c.user_lid
ON CONFLICT (legacy_id) DO NOTHING;

WITH s AS (SELECT id, legacy_id FROM public.stores WHERE legacy_id IS NOT NULL),
     i AS (SELECT id, legacy_id, branch_id, purchase_price FROM public.inventories WHERE legacy_id IS NOT NULL)
INSERT INTO public.damages (id, legacy_id, store_id, branch_id, inventory_id, name, category, quantity, reason, cost_loss, created_at)
SELECT gen_random_uuid(), d.lid, s.id, i.branch_id, i.id, d.iname, d.cat, d.qty, d.reason, (i.purchase_price * d.qty), d.ca
FROM (VALUES
  (1, 2, 1, 'Astimin Syrup', 'Haematinic', 1, 'Broken', '2026-05-17 19:21:30+00'::timestamptz),
  (2, 3, 1, 'SR 185',        'Microphone', 1, 'Broken', '2026-05-17 20:46:06+00'::timestamptz),
  (3, 1, 1, 'iPhone 17',     'Phones',     1, 'Faulty', '2026-06-08 09:41:36+00'::timestamptz)
) AS d(lid, inv_lid, store_lid, iname, cat, qty, reason, ca)
JOIN s ON s.legacy_id = d.store_lid
JOIN i ON i.legacy_id = d.inv_lid
ON CONFLICT (legacy_id) DO NOTHING;

WITH s AS (SELECT id, legacy_id FROM public.stores WHERE legacy_id IS NOT NULL),
     b AS (SELECT id, legacy_id FROM public.branches WHERE legacy_id IS NOT NULL),
     u AS (SELECT id, legacy_id FROM public.profiles WHERE legacy_id IS NOT NULL),
     i AS (SELECT id, legacy_id FROM public.inventories WHERE legacy_id IS NOT NULL)
INSERT INTO public.sales_returns (id, legacy_id, store_id, branch_id, inventory_id, quantity, reason, refund_amount, processed_by, created_at)
SELECT gen_random_uuid(), r.lid, s.id, b.id, i.id, r.qty, r.reason, r.refund, u.id, r.ca
FROM (VALUES
  (1, 2, 1, 1, 2, 1, 'Expired', 7000.00,   '2026-05-17 19:27:59+00'::timestamptz),
  (2, 3, 1, 1, 2, 1, 'expired', 800000.00, '2026-05-17 20:52:01+00'::timestamptz)
) AS r(lid, inv_lid, store_lid, branch_lid, user_lid, qty, reason, refund, ca)
JOIN s ON s.legacy_id = r.store_lid
JOIN b ON b.legacy_id = r.branch_lid
JOIN i ON i.legacy_id = r.inv_lid
LEFT JOIN u ON u.legacy_id = r.user_lid
ON CONFLICT (legacy_id) DO NOTHING;
