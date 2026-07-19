

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  https_status BOOLEAN NOT NULL,
  ssl_valid BOOLEAN NOT NULL,
  ssl_expires_at TIMESTAMPTZ,
  ssl_issuer TEXT,
  security_score INT NOT NULL,
  response_time_ms INT NOT NULL,
  scan_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans select" ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own scans insert" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own scans delete" ON public.scans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX scans_user_date_idx ON public.scans(user_id, scan_date DESC);


CREATE TABLE public.scan_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  header_name TEXT NOT NULL,
  present BOOLEAN NOT NULL,
  value TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_headers TO authenticated;
GRANT ALL ON public.scan_headers TO service_role;
ALTER TABLE public.scan_headers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scan headers select" ON public.scan_headers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND s.user_id = auth.uid())
);
CREATE POLICY "own scan headers insert" ON public.scan_headers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND s.user_id = auth.uid())
);
CREATE INDEX scan_headers_scan_idx ON public.scan_headers(scan_id);
