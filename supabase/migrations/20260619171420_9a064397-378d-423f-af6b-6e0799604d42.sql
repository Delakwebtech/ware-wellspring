
REVOKE ALL ON FUNCTION public.write_audit(uuid, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_sale(jsonb, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_sale_return(uuid, int, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_damage(uuid, int, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_credit_sale(uuid, text, text, int, numeric, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_credit_payment(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_stock_receipt(uuid, uuid, int, numeric, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_sale(jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_return(uuid, int, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_damage(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_sale(uuid, text, text, int, numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_credit_payment(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_receipt(uuid, uuid, int, numeric, text, text) TO authenticated;
