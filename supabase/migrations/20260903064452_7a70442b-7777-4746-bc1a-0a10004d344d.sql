UPDATE public.predictions p
SET status = 'OPEN',
    lock_time = now() + (interval '8 hours' * ranked.rn),
    resolution_time = now() + (interval '8 hours' * ranked.rn) + interval '2 hours',
    winning_outcome = NULL
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.predictions
) AS ranked
WHERE p.id = ranked.id;