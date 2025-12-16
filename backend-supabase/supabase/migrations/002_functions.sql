-- Funções para incrementar contadores de disparos

CREATE OR REPLACE FUNCTION increment_disparo_sent(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    sent_count = sent_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_disparo_failed(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    failed_count = failed_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_disparo_delivered(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    delivered_count = delivered_count + 1,
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;






