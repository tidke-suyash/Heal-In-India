-- ============================================================
-- HEAL IN INDIA — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (as postgres / service_role)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('patient', 'clinic', 'practitioner', 'admin', 'guest');
CREATE TYPE clinic_type AS ENUM ('ayurveda', 'panchakarma', 'modern_medicine', 'wellness_retreat', 'diagnostics', 'integrated');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'more_docs_required');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'refund_requested');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('razorpay', 'pay_at_clinic', 'bank_transfer');
CREATE TYPE record_type AS ENUM ('lab_report', 'prescription', 'imaging', 'treatment_history', 'consultation_note', 'other');
CREATE TYPE visa_request_status AS ENUM ('draft', 'submitted', 'under_review', 'letter_ready', 'completed', 'rejected');

-- ============================================================
-- TABLE: profiles (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'patient',
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  country         TEXT DEFAULT 'India',
  city            TEXT,
  state           TEXT,
  language        TEXT DEFAULT 'en',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Patient-specific profile details
CREATE TABLE public.patient_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  gender            TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group       TEXT,
  height_cm         NUMERIC(5,2),
  weight_kg         NUMERIC(5,2),
  allergies         TEXT[],
  chronic_conditions TEXT[],
  current_medications TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  medical_history_summary TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: clinics
-- ============================================================

CREATE TABLE public.clinics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  clinic_type       clinic_type NOT NULL,
  description       TEXT,
  registration_number TEXT,
  gstin             TEXT,
  specialties       TEXT[],
  languages_spoken  TEXT[] DEFAULT ARRAY['en', 'hi'],
  address_line1     TEXT NOT NULL,
  address_line2     TEXT,
  city              TEXT NOT NULL,
  state             TEXT NOT NULL,
  pincode           TEXT,
  country           TEXT DEFAULT 'India',
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  logo_url          TEXT,
  cover_image_url   TEXT,
  gallery_urls      TEXT[],
  consultation_fee  NUMERIC(10,2),
  currency          TEXT DEFAULT 'INR',
  cancellation_policy TEXT,
  working_hours     JSONB, -- { "mon": {"open": "09:00", "close": "18:00"}, ... }
  rating            NUMERIC(3,2) DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  is_verified       BOOLEAN DEFAULT FALSE,
  verification_status verification_status DEFAULT 'pending',
  verification_notes TEXT,
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES public.profiles(id),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clinics_city ON public.clinics(city);
CREATE INDEX idx_clinics_state ON public.clinics(state);
CREATE INDEX idx_clinics_type ON public.clinics(clinic_type);
CREATE INDEX idx_clinics_verification ON public.clinics(verification_status);
CREATE INDEX idx_clinics_name_trgm ON public.clinics USING GIN(name gin_trgm_ops);

-- ============================================================
-- TABLE: practitioners
-- ============================================================

CREATE TABLE public.practitioners (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT, -- Dr., Vaidya, etc.
  specialization    TEXT[],
  degrees           TEXT[],
  council_registration TEXT, -- MCI/CCIM registration number
  years_of_experience INTEGER DEFAULT 0,
  bio               TEXT,
  languages_spoken  TEXT[] DEFAULT ARRAY['en', 'hi'],
  consultation_fee  NUMERIC(10,2),
  is_available      BOOLEAN DEFAULT TRUE,
  verification_status verification_status DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table: clinics ↔ practitioners
CREATE TABLE public.clinic_practitioners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  is_primary      BOOLEAN DEFAULT FALSE,
  role_at_clinic  TEXT, -- "Chief Vaidya", "Consultant"
  joined_at       DATE,
  UNIQUE(clinic_id, practitioner_id)
);

-- ============================================================
-- TABLE: treatments
-- ============================================================

CREATE TABLE public.treatments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  category        TEXT NOT NULL, -- 'ayurveda', 'panchakarma', 'modern', 'wellness', 'diagnostics'
  description     TEXT,
  benefits        TEXT[],
  contraindications TEXT[],
  duration_minutes INTEGER,
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: treatment_packages (multi-day programs)
-- ============================================================

CREATE TABLE public.treatment_packages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id         UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL,
  duration_days     INTEGER NOT NULL DEFAULT 1,
  price             NUMERIC(10,2) NOT NULL,
  currency          TEXT DEFAULT 'INR',
  inclusions        TEXT[],
  exclusions        TEXT[],
  cancellation_policy TEXT,
  capacity          INTEGER DEFAULT 10,
  min_advance_days  INTEGER DEFAULT 3, -- must book at least N days in advance
  image_url         TEXT,
  gallery_urls      TEXT[],
  is_active         BOOLEAN DEFAULT TRUE,
  is_featured       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, slug)
);

-- Daily schedule for a package
CREATE TABLE public.package_schedule_days (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id      UUID NOT NULL REFERENCES public.treatment_packages(id) ON DELETE CASCADE,
  day_number      INTEGER NOT NULL,
  title           TEXT NOT NULL,
  activities      TEXT[],
  meals_included  TEXT[], -- 'breakfast','lunch','dinner','herbal_tea'
  notes           TEXT,
  UNIQUE(package_id, day_number)
);

-- ============================================================
-- TABLE: availability_slots
-- ============================================================

CREATE TABLE public.availability_slots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  package_id      UUID REFERENCES public.treatment_packages(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  total_capacity  INTEGER NOT NULL DEFAULT 10,
  booked_count    INTEGER NOT NULL DEFAULT 0,
  is_blocked      BOOLEAN DEFAULT FALSE,
  block_reason    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_capacity CHECK (booked_count <= total_capacity)
);

CREATE INDEX idx_slots_clinic_date ON public.availability_slots(clinic_id, start_date, end_date);
CREATE INDEX idx_slots_package ON public.availability_slots(package_id, start_date);

-- ============================================================
-- TABLE: bookings
-- ============================================================

CREATE TABLE public.bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref       TEXT UNIQUE NOT NULL, -- HI-XXXXXX
  patient_id        UUID NOT NULL REFERENCES public.profiles(id),
  clinic_id         UUID NOT NULL REFERENCES public.clinics(id),
  package_id        UUID REFERENCES public.treatment_packages(id),
  slot_id           UUID REFERENCES public.availability_slots(id),
  check_in_date     DATE NOT NULL,
  check_out_date    DATE NOT NULL,
  num_guests        INTEGER DEFAULT 1,
  status            booking_status DEFAULT 'pending',
  health_notes      TEXT,
  special_requests  TEXT,
  total_price       NUMERIC(10,2),
  currency          TEXT DEFAULT 'INR',
  cancellation_reason TEXT,
  cancelled_at      TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  clinic_notes      TEXT, -- notes added by clinic staff
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_patient ON public.bookings(patient_id);
CREATE INDEX idx_bookings_clinic ON public.bookings(clinic_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in_date, check_out_date);

-- Additional guests on a booking
CREATE TABLE public.booking_guests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  age         INTEGER,
  gender      TEXT,
  relation    TEXT -- 'spouse', 'child', 'parent', etc.
);

-- ============================================================
-- TABLE: payments
-- ============================================================

CREATE TABLE public.payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id),
  patient_id        UUID NOT NULL REFERENCES public.profiles(id),
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT DEFAULT 'INR',
  payment_method    payment_method DEFAULT 'razorpay',
  payment_status    payment_status DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  refund_amount     NUMERIC(10,2),
  refund_id         TEXT,
  refunded_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: reviews
-- ============================================================

CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.profiles(id),
  booking_id      UUID REFERENCES public.bookings(id),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  is_verified     BOOLEAN DEFAULT FALSE, -- verified booking
  is_published    BOOLEAN DEFAULT FALSE, -- admin approved
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, patient_id, booking_id)
);

-- ============================================================
-- TABLE: health_records
-- ============================================================

CREATE TABLE public.health_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_type     record_type NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT, -- Supabase Storage URL
  file_name       TEXT,
  file_size       INTEGER, -- bytes
  mime_type       TEXT,
  recorded_date   DATE,
  clinic_id       UUID REFERENCES public.clinics(id),
  practitioner_id UUID REFERENCES public.practitioners(id),
  tags            TEXT[],
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_records_patient ON public.health_records(patient_id);
CREATE INDEX idx_records_type ON public.health_records(record_type);

-- Shared record access
CREATE TABLE public.record_shares (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id       UUID NOT NULL REFERENCES public.health_records(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.profiles(id),
  shared_with_clinic_id UUID REFERENCES public.clinics(id),
  shared_with_practitioner_id UUID REFERENCES public.practitioners(id),
  purpose         TEXT NOT NULL, -- reason for sharing
  access_until    TIMESTAMPTZ,
  is_revoked      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: medical_tourism_requests & visa_assistance
-- ============================================================

CREATE TABLE public.medical_tourism_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL REFERENCES public.profiles(id),
  preferred_clinic_id   UUID REFERENCES public.clinics(id),
  preferred_city        TEXT,
  treatment_interest    TEXT,
  nationality           TEXT NOT NULL,
  passport_number       TEXT,
  passport_file_url     TEXT, -- Supabase Storage
  travel_from_country   TEXT,
  estimated_arrival     DATE,
  estimated_departure   DATE,
  num_travelers         INTEGER DEFAULT 1,
  special_requirements  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.visa_assistance_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourism_request_id    UUID NOT NULL REFERENCES public.medical_tourism_requests(id) ON DELETE CASCADE,
  patient_id            UUID NOT NULL REFERENCES public.profiles(id),
  clinic_id             UUID REFERENCES public.clinics(id),
  status                visa_request_status DEFAULT 'draft',
  checklist_items       JSONB, -- { "medical_docs": false, "insurance": false, ... }
  support_letter_url    TEXT, -- clinic uploads this
  support_letter_issued_at TIMESTAMPTZ,
  admin_notes           TEXT,
  reviewed_by           UUID REFERENCES public.profiles(id),
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: verification_documents
-- ============================================================

CREATE TABLE public.verification_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('clinic', 'practitioner')),
  entity_id       UUID NOT NULL,
  document_type   TEXT NOT NULL, -- 'registration_cert', 'degree', 'council_reg', etc.
  document_name   TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       INTEGER,
  is_verified     BOOLEAN DEFAULT FALSE,
  verified_by     UUID REFERENCES public.profiles(id),
  verified_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT, -- 'booking', 'verification', 'record_share', 'system'
  reference_id UUID, -- booking_id or clinic_id etc.
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================

CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES public.profiles(id),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.health_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.treatment_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
BEGIN
  ref := 'HI-' || UPPER(substr(md5(random()::TEXT), 1, 6));
  RETURN ref;
END;
$$ LANGUAGE plpgsql;
