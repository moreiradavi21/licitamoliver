ALTER TABLE public.opportunities
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_opportunities_user_archived
ON public.opportunities(user_id, archived_at);