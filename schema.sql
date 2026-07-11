-- Faculty Appraisal complete PostgreSQL schema.
-- WARNING: This deletes everything in the public schema.
-- Run as a superuser (e.g. postgres). The app connects as 'app_user'.

drop schema if exists public cascade;
create schema public;

-- Create application role used by the FastAPI backend.
-- Change the password before deploying to production.
do $$ begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'app_user') then
    create role app_user login password 'CHANGE_ME_BEFORE_DEPLOY';
  end if;
end $$;

grant usage on schema public to app_user;
grant all   on schema public to app_user;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.faculty_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,                          -- bcrypt hash; set on registration
  employee_id text,
  full_name text not null,
  qualification text,
  designation text,
  department text,
  school text,
  teaching_experience text,
  phone text,
  academic_year text,
  appraisal_role text not null default 'faculty' check (
    appraisal_role in (
      'faculty',
      'hod',
      'center_head',
      'director',
      'dean',
      'vc',
      'non_teaching_staff',
      'reporting_officer',
      'section_head',
      'registrar',
      'staff',
      'admin'
    )
  ),
  is_verified boolean not null default false,
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_section_definitions (
  code text primary key,
  form_family text not null,
  part text not null,
  section_key text not null,
  title text not null,
  max_marks numeric not null,
  storage_table text,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_section_definitions_unique unique (form_family, title, max_marks)
);

create table public.declarations (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  part_a_total numeric not null default 0,
  part_b_total numeric not null default 0,
  grand_total numeric not null default 0,
  status text not null default 'Pending Review',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint declarations_faculty_year_key unique (faculty_email, academic_year)
);

create table public.teaching_process (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  semester text,
  course_code text,
  planned_classes numeric not null default 0,
  conducted_classes numeric not null default 0,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_files (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  course text,
  title text,
  details text check (details is null or details in ('1.Available', '2.Partially Available', '3.Not Available')),
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.innovative_teaching (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  details text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint innovative_teaching_faculty_year_key unique (faculty_email, academic_year)
);

create table public.projects_guided (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  label text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qualification_enhancement (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  label text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_feedback (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  course_code text,
  feedback_1 numeric not null default 0,
  feedback_2 numeric not null default 0,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.department_activities (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  activity text,
  nature text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.university_activities (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  activity text,
  nature text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_contributions (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  activity text,
  status text,
  details text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.industry_connect (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  name text,
  details text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.acr_scores (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  label text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_publications (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  journal text,
  issn text,
  indexing text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.popular_writings (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  media text,
  film text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_publications (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  book text,
  issn text,
  isbn text,
  publisher text,
  coauthor text,
  first_author text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ict_pedagogy (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  description text,
  type text,
  quadrant text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_guidance (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  degree text,
  student_name text,
  thesis text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility table used by the current frontend for the standard/internal
-- B4(b) project section.
create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  agency text,
  sanction_date date,
  amount numeric,
  role text,
  project_status text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.external_research_projects (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  agency text,
  sanction_date date,
  amount numeric,
  role text,
  project_status text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ipr_records (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  scope text,
  ipr_date date,
  ipr_status text,
  file_no text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patents (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  type text,
  scope text,
  patent_date date,
  patent_status text,
  file_no text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  award_date date,
  agency text,
  level text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conferences (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  type text,
  organization text,
  level text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_proposals (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  title text,
  duration text,
  agency text,
  amount numeric,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products_developed (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  details text,
  usage text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.self_development (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  program text,
  duration text,
  organization text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.industrial_training (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section_title text,
  max_marks numeric,
  row_no integer,
  company text,
  duration text,
  nature text,
  score numeric not null default 0,
  hod_score numeric,
  director_score numeric,
  dean_score numeric,
  vc_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appraisal_documents (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  form_family text,
  section text not null,
  section_title text,
  max_marks numeric,
  row_no integer,
  doc_key text,
  file_name text not null,
  file_type text,
  file_url text,
  storage_path text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appraisal_reviews (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  reviewer_email text,
  reviewer_role text not null check (reviewer_role in ('hod', 'center_head', 'director', 'dean', 'vc')),
  part_a_score numeric not null default 0,
  part_b_score numeric not null default 0,
  total_score numeric not null default 0,
  remarks text,
  section_scores jsonb not null default '{}'::jsonb,
  status text not null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appraisal_reviews_unique_reviewer unique (faculty_email, academic_year, reviewer_role)
);

create table public.appraisal_snapshots (
  id uuid primary key default gen_random_uuid(),
  faculty_email text not null,
  academic_year text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appraisal_snapshots_faculty_year_key unique (faculty_email, academic_year)
);

create table public.non_teaching_appraisals (
  id uuid primary key default gen_random_uuid(),
  staff_email text not null,
  academic_year text not null,
  payload jsonb not null,
  status text not null default 'Draft' check (
    status in (
      'Draft',
      'Submitted',
      'Reporting Officer Reviewed',
      'Registrar Reviewed',
      'VC Approved'
    )
  ),
  self_total numeric not null default 0,
  ro_total numeric not null default 0,
  registrar_total numeric not null default 0,
  vc_total numeric not null default 0,
  submitted_at timestamptz,
  ro_reviewed_at timestamptz,
  registrar_reviewed_at timestamptz,
  vc_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint non_teaching_appraisals_staff_year_key unique (staff_email, academic_year)
);

create table public.non_teaching_part_a_items (
  id uuid primary key default gen_random_uuid(),
  staff_email text not null,
  academic_year text not null,
  item_key text not null,
  title text not null,
  max_marks numeric not null,
  details text,
  self_marks numeric,
  ro_marks numeric,
  registrar_marks numeric,
  vc_marks numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint non_teaching_part_a_items_key unique (staff_email, academic_year, item_key)
);

create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(80),
  email       varchar(254) not null,
  category    varchar      not null check (category in ('query', 'feedback', 'bug', 'suggestion', 'other')),
  subject     varchar(120) not null,
  message     varchar(5000) not null,
  status      varchar      not null default 'new',
  ip_address  varchar,
  user_agent  varchar(512),
  submitted_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.non_teaching_part_b_ratings (
  id uuid primary key default gen_random_uuid(),
  staff_email text not null,
  academic_year text not null,
  section_key text not null,
  section_title text not null,
  max_marks numeric not null,
  parameter_no integer not null,
  parameter_label text not null,
  ro_rating numeric,
  registrar_rating numeric,
  vc_rating numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint non_teaching_part_b_ratings_key unique (staff_email, academic_year, section_key, parameter_no)
);

insert into public.form_section_definitions (code, form_family, part, section_key, title, max_marks, storage_table, fields)
values
  ('standard_lectures_50', 'standard', 'A', 'lectures', 'A1. Lectures / Tutorials / Practicals', 50, 'teaching_process', '["semester","course_code","planned_classes","conducted_classes"]'),
  ('design_lectures_40', 'design_arts', 'A', 'lectures', 'A(i). Lectures / Tutorials / Practicals', 40, 'teaching_process', '["semester","course_code","planned_classes","conducted_classes"]'),
  ('course_file_20', 'all_teaching', 'A', 'courseFile', 'A2. Course File', 20, 'course_files', '["course","title","details"]'),
  ('innovative_teaching_10', 'all_teaching', 'A', 'innovativeTeaching', 'A3. Innovative Teaching-Learning', 10, 'innovative_teaching', '["details"]'),
  ('standard_projects_10', 'standard', 'A', 'projects', 'A4. Projects', 10, 'projects_guided', '["label"]'),
  ('design_projects_20', 'design_arts', 'A', 'projects', 'A(iv). Project Guidance', 20, 'projects_guided', '["label"]'),
  ('qualification_10', 'all_teaching', 'A', 'quals', 'A5. Qualification Enhancement', 10, 'qualification_enhancement', '["label"]'),
  ('student_feedback_10', 'all_teaching', 'A', 'feedback', 'Student Feedback', 10, 'student_feedback', '["course_code","feedback_1","feedback_2"]'),
  ('department_activities_20', 'all_teaching', 'A', 'deptActs', 'Departmental / School Activities', 20, 'department_activities', '["activity","nature"]'),
  ('university_activities_30', 'all_teaching', 'A', 'uniActs', 'University Level Activities', 30, 'university_activities', '["activity","nature"]'),
  ('society_10', 'all_teaching', 'A', 'society', 'Contribution to Society', 10, 'social_contributions', '["activity","status","details"]'),
  ('industry_5', 'standard_design', 'A', 'industry', 'Industry Connect', 5, 'industry_connect', '["name","details"]'),
  ('acr_25', 'all_teaching', 'A', 'acr', 'Annual Confidential Report - School Level', 25, 'acr_scores', '["label"]'),
  ('standard_journals_120', 'standard', 'B', 'journals', 'B1. Research Papers / Journal Publications', 120, 'journal_publications', '["title","journal","issn","indexing"]'),
  ('media_design_journals_80', 'media_design', 'B', 'journals', 'B1(i). Published Papers in Journals', 80, 'journal_publications', '["title","journal","issn","indexing"]'),
  ('media_popular_writings_40', 'media', 'B', 'popularWritings', 'B1(ii). Popular Writings, Film & Documentary', 40, 'popular_writings', '["media","film"]'),
  ('standard_books_50', 'standard', 'B', 'books', 'B2. Books / Book Chapters', 50, 'book_publications', '["title","book","issn","publisher","coauthor","first_author"]'),
  ('media_design_books_60', 'media_design', 'B', 'books', 'B2. Articles / Chapters in Books', 60, 'book_publications', '["title","book","isbn","publisher","coauthor","first_author"]'),
  ('standard_ict_20', 'standard', 'B', 'ict', 'B3. ICT / E-Content / Pedagogy', 20, 'ict_pedagogy', '["title","description","type","quadrant"]'),
  ('media_ict_30', 'media', 'B', 'ict', 'B3. ICT Mediated Teaching-Learning Pedagogy / New Curricula', 30, 'ict_pedagogy', '["title","description","type","quadrant"]'),
  ('design_ict_50', 'design_arts', 'B', 'ict', 'B3. ICT Mediated Teaching-Learning Pedagogy / New Curricula', 50, 'ict_pedagogy', '["title","description","type","quadrant"]'),
  ('research_guidance_30', 'all_teaching', 'B', 'research', 'B4(a). Research Guidance - PhD / PG', 30, 'research_guidance', '["degree","student_name","thesis"]'),
  ('standard_internal_projects_45', 'standard', 'B', 'projects2', 'B4(b). Research / Consultancy Internal Projects', 45, 'research_projects', '["title","agency","sanction_date","amount","role","project_status"]'),
  ('standard_external_projects_45', 'standard', 'B', 'externalProjects', 'B4(c). Research / Consultancy External Projects', 45, 'external_research_projects', '["title","agency","sanction_date","amount","role","project_status"]'),
  ('media_design_internal_projects_15', 'media_design', 'B', 'internalProjects', 'B4(b). Internal Research Projects', 15, 'research_projects', '["title","agency","sanction_date","amount","role","project_status"]'),
  ('media_external_projects_30', 'media', 'B', 'externalProjects', 'B4(c). External Research Projects', 30, 'external_research_projects', '["title","agency","sanction_date","amount","role","project_status"]'),
  ('design_external_projects_30', 'design_arts', 'B', 'externalProjects', 'B4(c). External Research / Consultancy Projects', 30, 'external_research_projects', '["title","agency","sanction_date","amount","role","project_status"]'),
  ('standard_patents_40', 'standard', 'B', 'patents', 'B5(a). Patents (IPR)', 40, 'patents', '["title","type","scope","patent_date","patent_status","file_no"]'),
  ('design_ipr_40', 'design_arts', 'B', 'ipr', 'B5(a). IPR / Copyright / Patent', 40, 'ipr_records', '["title","scope","ipr_date","ipr_status","file_no"]'),
  ('standard_awards_10', 'standard', 'B', 'awards', 'B5(b). Awards', 10, 'awards', '["title","award_date","agency","level"]'),
  ('media_design_research_awards_10', 'media_design', 'B', 'awards', 'B5(b). Research Awards', 10, 'awards', '["title","award_date","agency","level"]'),
  ('standard_presentations_30', 'standard', 'B', 'confs', 'B6. Invited Lectures / Resource Person / Paper Presentations', 30, 'conferences', '["title","type","organization","level"]'),
  ('media_design_conferences_30', 'media_design', 'B', 'confs', 'B5. Conferences / Seminars / Workshops', 30, 'conferences', '["title","type","organization","level"]'),
  ('standard_proposals_10', 'standard', 'B', 'proposals', 'B7(a). Submitted Research Proposals', 10, 'research_proposals', '["title","duration","agency","amount"]'),
  ('media_proposals_10', 'media', 'B', 'proposals', 'B6(a). Research Proposals', 10, 'research_proposals', '["title","duration","agency","amount"]'),
  ('design_proposals_10', 'design_arts', 'B', 'proposals', 'B7. Research Proposals', 10, 'research_proposals', '["title","duration","agency","amount"]'),
  ('standard_products_10', 'standard', 'B', 'products', 'B7(b). Product Developed and Used by Students in Lab / Commercialized', 10, 'products_developed', '["details","usage"]'),
  ('media_products_20', 'media', 'B', 'products', 'B6(b). Products Developed / Used', 20, 'products_developed', '["details","usage"]'),
  ('standard_fdp_10', 'standard', 'B', 'fdps', 'B8(a). FDP / Workshops', 10, 'self_development', '["program","duration","organization"]'),
  ('media_fdp_20', 'media', 'B', 'fdps', 'B7. FDP / Workshops', 20, 'self_development', '["program","duration","organization"]'),
  ('design_fdp_10', 'design_arts', 'B', 'fdps', 'B8(a). FDP / Workshops', 10, 'self_development', '["program","duration","organization"]'),
  ('industrial_training_10', 'all_teaching', 'B', 'training', 'B8(b). Industrial Training', 10, 'industrial_training', '["company","duration","nature"]'),
  ('non_teaching_resp_10', 'non_teaching', 'A', 'selfResp', 'Current Responsibilities', 10, 'non_teaching_part_a_items', '["details"]'),
  ('non_teaching_contrib_10', 'non_teaching', 'A', 'selfContrib', 'Other Useful Contributions', 10, 'non_teaching_part_a_items', '["details"]'),
  ('non_teaching_achieve_5', 'non_teaching', 'A', 'selfAchieve', 'Achievements', 5, 'non_teaching_part_a_items', '["details"]'),
  ('non_teaching_prof_comp_25', 'non_teaching', 'B', 'profComp', 'Professional Competence', 25, 'non_teaching_part_b_ratings', '["rating"]'),
  ('non_teaching_quality_25', 'non_teaching', 'B', 'quality', 'Quality of Work', 25, 'non_teaching_part_b_ratings', '["rating"]'),
  ('non_teaching_personal_30', 'non_teaching', 'B', 'personal', 'Personal Characteristics', 30, 'non_teaching_part_b_ratings', '["rating"]'),
  ('non_teaching_regular_25', 'non_teaching', 'B', 'regular', 'Regularity', 25, 'non_teaching_part_b_ratings', '["rating"]')
on conflict (code) do nothing;

create index declarations_faculty_year_idx on public.declarations (faculty_email, academic_year);
create index faculty_profiles_role_idx on public.faculty_profiles (appraisal_role);
create index faculty_profiles_school_department_idx on public.faculty_profiles (school, department);
create index form_section_definitions_family_idx on public.form_section_definitions (form_family, part);
create index teaching_process_faculty_year_idx on public.teaching_process (faculty_email, academic_year);
create index course_files_faculty_year_idx on public.course_files (faculty_email, academic_year);
create index innovative_teaching_faculty_year_idx on public.innovative_teaching (faculty_email, academic_year);
create index projects_guided_faculty_year_idx on public.projects_guided (faculty_email, academic_year);
create index qualification_enhancement_faculty_year_idx on public.qualification_enhancement (faculty_email, academic_year);
create index student_feedback_faculty_year_idx on public.student_feedback (faculty_email, academic_year);
create index department_activities_faculty_year_idx on public.department_activities (faculty_email, academic_year);
create index university_activities_faculty_year_idx on public.university_activities (faculty_email, academic_year);
create index social_contributions_faculty_year_idx on public.social_contributions (faculty_email, academic_year);
create index industry_connect_faculty_year_idx on public.industry_connect (faculty_email, academic_year);
create index acr_scores_faculty_year_idx on public.acr_scores (faculty_email, academic_year);
create index journal_publications_faculty_year_idx on public.journal_publications (faculty_email, academic_year);
create index popular_writings_faculty_year_idx on public.popular_writings (faculty_email, academic_year);
create index book_publications_faculty_year_idx on public.book_publications (faculty_email, academic_year);
create index ict_pedagogy_faculty_year_idx on public.ict_pedagogy (faculty_email, academic_year);
create index research_guidance_faculty_year_idx on public.research_guidance (faculty_email, academic_year);
create index research_projects_faculty_year_idx on public.research_projects (faculty_email, academic_year);
create index external_research_projects_faculty_year_idx on public.external_research_projects (faculty_email, academic_year);
create index ipr_records_faculty_year_idx on public.ipr_records (faculty_email, academic_year);
create index patents_faculty_year_idx on public.patents (faculty_email, academic_year);
create index awards_faculty_year_idx on public.awards (faculty_email, academic_year);
create index conferences_faculty_year_idx on public.conferences (faculty_email, academic_year);
create index research_proposals_faculty_year_idx on public.research_proposals (faculty_email, academic_year);
create index products_developed_faculty_year_idx on public.products_developed (faculty_email, academic_year);
create index self_development_faculty_year_idx on public.self_development (faculty_email, academic_year);
create index industrial_training_faculty_year_idx on public.industrial_training (faculty_email, academic_year);
create index appraisal_documents_faculty_year_idx on public.appraisal_documents (faculty_email, academic_year);
create index appraisal_reviews_faculty_year_idx on public.appraisal_reviews (faculty_email, academic_year);
create index non_teaching_appraisals_staff_year_idx on public.non_teaching_appraisals (staff_email, academic_year);
create index non_teaching_appraisals_status_idx on public.non_teaching_appraisals (status, academic_year);
create index non_teaching_part_a_items_staff_year_idx on public.non_teaching_part_a_items (staff_email, academic_year);
create index non_teaching_part_b_ratings_staff_year_idx on public.non_teaching_part_b_ratings (staff_email, academic_year);
create index idx_faculty_profiles_school on public.faculty_profiles (school);
create index idx_declarations_academic_year on public.declarations (academic_year);
create index idx_declarations_status on public.declarations (status);
create index idx_appraisal_reviews_year on public.appraisal_reviews (academic_year);
create index idx_feedback_category on public.feedback (category);
create index idx_feedback_status on public.feedback (status);
create index idx_feedback_submitted on public.feedback (submitted_at desc);

-- appraisal_config: one row per academic year, controls submission window open/close
create table if not exists public.appraisal_config (
    id               serial primary key,
    academic_year    varchar not null unique,
    is_open          boolean not null default false,
    submission_start timestamptz,
    submission_end   timestamptz,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists idx_appraisal_config_academic_year on public.appraisal_config (academic_year);

-- announcements: admin-managed notices shown to users; audience scopes who sees each notice
create table if not exists public.announcements (
    id          serial primary key,
    title       varchar(200) not null,
    body        varchar(5000) not null,
    audience    varchar(50)  not null default 'all' check (
                  audience in ('all', 'faculty', 'hod', 'dean', 'non_teaching_staff')
                ),
    is_active   boolean not null default true,
    created_by  varchar,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_announcements_is_active on public.announcements (is_active);

-- module_config: single-row table persisting the Section Controls toggles from the admin panel
create table if not exists public.module_config (
    id                       integer primary key default 1,
    appraisal_module_enabled boolean not null default true,
    self_appraisal_enabled   boolean not null default true,
    peer_review_enabled      boolean not null default false,
    updated_at               timestamptz not null default now()
);

insert into public.module_config (id, appraisal_module_enabled, self_appraisal_enabled, peer_review_enabled)
values (1, true, true, false)
on conflict (id) do nothing;

-- password_reset_tokens: stores hashed one-time tokens for the forgot-password flow.
-- The backend generates a random token, emails the raw value, and stores only its hash here.
-- On /auth/reset-password the backend verifies the hash, checks used=false and expires_at > now(),
-- then sets used=true and updates password_hash in faculty_profiles.
create table public.password_reset_tokens (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

create index password_reset_tokens_email_idx   on public.password_reset_tokens (email);
create index password_reset_tokens_expires_idx on public.password_reset_tokens (expires_at);

do $$
declare
  table_record record;
begin
  for table_record in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = tablename
          and column_name = 'updated_at'
      )
  loop
    execute format(
      'create trigger %I before update on %I.%I for each row execute function public.set_updated_at()',
      table_record.tablename || '_set_updated_at',
      table_record.schemaname,
      table_record.tablename
    );
    execute format('alter table %I.%I disable row level security', table_record.schemaname, table_record.tablename);
    execute format('alter table %I.%I no force row level security', table_record.schemaname, table_record.tablename);
  end loop;
end $$;

grant select, insert, update, delete on all tables  in schema public to app_user;
grant usage, select                  on all sequences in schema public to app_user;
alter default privileges in schema public grant select, insert, update, delete on tables    to app_user;
alter default privileges in schema public grant usage, select                  on sequences to app_user;