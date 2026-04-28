const SB_URL = 'https://vpeqbsctlysjkuceejxp.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwZXFic2N0bHlzamt1Y2VlanhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzIwNDgsImV4cCI6MjA5MDcwODA0OH0.3Hhszztxhhl_X55rWIBGNoAIfxxu31N16-rv1wrruuc';
const sb = supabase.createClient(SB_URL, SB_KEY);
const ADMIN_EMAILS = ['maratyarkov@gmail.com', 'admin@app2.cash'];
const LEVEL_NAMES = ['Start', 'Basic', 'Pro', 'VIP', 'Elite'];
let allPartners = [], allLeads = [], allComms = [];
