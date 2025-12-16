-- ============================================
-- CORRIGIR FOREIGN KEY DO PROFESSIONAL_ID
-- ============================================

-- Remover a foreign key incorreta se existir
DO $$ 
BEGIN
  -- Verificar se a coluna existe e tem constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%professional_id%' 
    AND table_name = 'appointments'
  ) THEN
    -- Remover constraint antiga
    ALTER TABLE public.appointments 
    DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey;
  END IF;
END $$;

-- Adicionar a foreign key correta apontando para professionals
DO $$ 
BEGIN
  -- Verificar se a coluna existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'professional_id'
  ) THEN
    -- Verificar se a tabela professionals existe
    IF EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'professionals'
    ) THEN
      -- Adicionar constraint correta
      ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_professional_id_fkey 
      FOREIGN KEY (professional_id) 
      REFERENCES public.professionals(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;


