-- Promote shane.stephens@peritusdigital.com.au to super admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = '172e0770-c397-4bb6-943b-34bacea9a2b8';