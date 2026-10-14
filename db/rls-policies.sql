-- ============================================================
-- HEAL IN INDIA — Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_tourism_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_assistance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get clinic_id owned by current user
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.clinics WHERE owner_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get practitioner_id for current user
CREATE OR REPLACE FUNCTION public.get_my_practitioner_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.practitioners WHERE profile_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROFILES policies
-- ============================================================

-- Anyone can view basic profiles (needed for clinic/practitioner listings)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Supabase trigger handles INSERT via handle_new_user
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

-- ============================================================
-- PATIENT_PROFILES policies
-- ============================================================

CREATE POLICY "patient_profiles_select_own" ON public.patient_profiles
  FOR SELECT USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "patient_profiles_insert_own" ON public.patient_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "patient_profiles_update_own" ON public.patient_profiles
  FOR UPDATE USING (profile_id = auth.uid());

-- ============================================================
-- CLINICS policies
-- ============================================================

-- Public: anyone can view approved clinics
CREATE POLICY "clinics_select_approved" ON public.clinics
  FOR SELECT USING (verification_status = 'approved' OR owner_id = auth.uid() OR public.is_admin());

-- Clinic owner can update their own clinic
CREATE POLICY "clinics_update_own" ON public.clinics
  FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin());

-- Clinic owner can insert (register)
CREATE POLICY "clinics_insert_own" ON public.clinics
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- Admin only can delete
CREATE POLICY "clinics_delete_admin" ON public.clinics
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- PRACTITIONERS policies
-- ============================================================

CREATE POLICY "practitioners_select_all" ON public.practitioners
  FOR SELECT USING (verification_status = 'approved' OR profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "practitioners_insert_own" ON public.practitioners
  FOR INSERT WITH CHECK (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "practitioners_update_own" ON public.practitioners
  FOR UPDATE USING (profile_id = auth.uid() OR public.is_admin());

-- ============================================================
-- CLINIC_PRACTITIONERS policies
-- ============================================================

CREATE POLICY "clinic_practitioners_select" ON public.clinic_practitioners
  FOR SELECT USING (true);

CREATE POLICY "clinic_practitioners_manage" ON public.clinic_practitioners
  FOR ALL USING (
    clinic_id = public.get_my_clinic_id() OR public.is_admin()
  );

-- ============================================================
-- TREATMENTS policies
-- ============================================================

CREATE POLICY "treatments_select_all" ON public.treatments
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "treatments_manage_admin" ON public.treatments
  FOR ALL USING (public.is_admin());

-- ============================================================
-- TREATMENT_PACKAGES policies
-- ============================================================

CREATE POLICY "packages_select_active" ON public.treatment_packages
  FOR SELECT USING (is_active = true OR clinic_id = public.get_my_clinic_id() OR public.is_admin());

CREATE POLICY "packages_manage_clinic" ON public.treatment_packages
  FOR ALL USING (clinic_id = public.get_my_clinic_id() OR public.is_admin());

-- ============================================================
-- PACKAGE_SCHEDULE_DAYS policies
-- ============================================================

CREATE POLICY "schedule_days_select" ON public.package_schedule_days
  FOR SELECT USING (true);

CREATE POLICY "schedule_days_manage_clinic" ON public.package_schedule_days
  FOR ALL USING (
    package_id IN (SELECT id FROM public.treatment_packages WHERE clinic_id = public.get_my_clinic_id())
    OR public.is_admin()
  );

-- ============================================================
-- AVAILABILITY_SLOTS policies
-- ============================================================

CREATE POLICY "slots_select_all" ON public.availability_slots
  FOR SELECT USING (true);

CREATE POLICY "slots_manage_clinic" ON public.availability_slots
  FOR ALL USING (clinic_id = public.get_my_clinic_id() OR public.is_admin());

-- ============================================================
-- BOOKINGS policies
-- ============================================================

-- Patients see only their own bookings
CREATE POLICY "bookings_select_patient" ON public.bookings
  FOR SELECT USING (
    patient_id = auth.uid()
    OR clinic_id = public.get_my_clinic_id()
    OR public.is_admin()
  );

CREATE POLICY "bookings_insert_patient" ON public.bookings
  FOR INSERT WITH CHECK (patient_id = auth.uid() OR public.is_admin());

-- Patients can cancel their own; clinics can update status
CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (
    patient_id = auth.uid()
    OR clinic_id = public.get_my_clinic_id()
    OR public.is_admin()
  );

-- ============================================================
-- BOOKING_GUESTS policies
-- ============================================================

CREATE POLICY "booking_guests_access" ON public.booking_guests
  FOR ALL USING (
    booking_id IN (SELECT id FROM public.bookings WHERE patient_id = auth.uid())
    OR booking_id IN (SELECT id FROM public.bookings WHERE clinic_id = public.get_my_clinic_id())
    OR public.is_admin()
  );

-- ============================================================
-- PAYMENTS policies
-- ============================================================

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    patient_id = auth.uid()
    OR booking_id IN (SELECT id FROM public.bookings WHERE clinic_id = public.get_my_clinic_id())
    OR public.is_admin()
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (patient_id = auth.uid() OR public.is_admin());

-- ============================================================
-- REVIEWS policies
-- ============================================================

CREATE POLICY "reviews_select_published" ON public.reviews
  FOR SELECT USING (is_published = true OR patient_id = auth.uid() OR public.is_admin());

CREATE POLICY "reviews_insert_patient" ON public.reviews
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "reviews_update_patient" ON public.reviews
  FOR UPDATE USING (patient_id = auth.uid() OR public.is_admin());

-- ============================================================
-- HEALTH_RECORDS policies
-- ============================================================

-- Patients see only their own records
CREATE POLICY "records_select_own" ON public.health_records
  FOR SELECT USING (
    patient_id = auth.uid()
    OR public.is_admin()
    OR id IN (
      SELECT record_id FROM public.record_shares
      WHERE (shared_with_clinic_id = public.get_my_clinic_id()
             OR shared_with_practitioner_id = public.get_my_practitioner_id())
      AND is_revoked = false
      AND (access_until IS NULL OR access_until > NOW())
    )
  );

CREATE POLICY "records_insert_own" ON public.health_records
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "records_update_own" ON public.health_records
  FOR UPDATE USING (patient_id = auth.uid());

CREATE POLICY "records_delete_own" ON public.health_records
  FOR DELETE USING (patient_id = auth.uid() OR public.is_admin());

-- ============================================================
-- RECORD_SHARES policies
-- ============================================================

CREATE POLICY "record_shares_select" ON public.record_shares
  FOR SELECT USING (
    patient_id = auth.uid()
    OR shared_with_clinic_id = public.get_my_clinic_id()
    OR public.is_admin()
  );

CREATE POLICY "record_shares_manage_patient" ON public.record_shares
  FOR ALL USING (patient_id = auth.uid() OR public.is_admin());

-- ============================================================
-- MEDICAL_TOURISM_REQUESTS policies
-- ============================================================

CREATE POLICY "tourism_select" ON public.medical_tourism_requests
  FOR SELECT USING (
    patient_id = auth.uid()
    OR preferred_clinic_id = public.get_my_clinic_id()
    OR public.is_admin()
  );

CREATE POLICY "tourism_insert" ON public.medical_tourism_requests
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "tourism_update" ON public.medical_tourism_requests
  FOR UPDATE USING (patient_id = auth.uid() OR public.is_admin());

-- ============================================================
-- VISA_ASSISTANCE_REQUESTS policies
-- ============================================================

CREATE POLICY "visa_select" ON public.visa_assistance_requests
  FOR SELECT USING (
    patient_id = auth.uid()
    OR clinic_id = public.get_my_clinic_id()
    OR public.is_admin()
  );

CREATE POLICY "visa_insert" ON public.visa_assistance_requests
  FOR INSERT WITH CHECK (patient_id = auth.uid() OR public.is_admin());

CREATE POLICY "visa_update" ON public.visa_assistance_requests
  FOR UPDATE USING (
    patient_id = auth.uid()
    OR clinic_id = public.get_my_clinic_id()
    OR public.is_admin()
  );

-- ============================================================
-- VERIFICATION_DOCUMENTS policies
-- ============================================================

CREATE POLICY "verdocs_select" ON public.verification_documents
  FOR SELECT USING (public.is_admin()
    OR (entity_type = 'clinic' AND entity_id = public.get_my_clinic_id())
    OR (entity_type = 'practitioner' AND entity_id = public.get_my_practitioner_id())
  );

CREATE POLICY "verdocs_insert" ON public.verification_documents
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (entity_type = 'clinic' AND entity_id = public.get_my_clinic_id())
    OR (entity_type = 'practitioner' AND entity_id = public.get_my_practitioner_id())
  );

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- AUDIT_LOGS policies
-- ============================================================

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Service role (server) can insert
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
