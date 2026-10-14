-- ============================================================
-- HEAL IN INDIA — Seed Data
-- Run AFTER schema.sql and rls-policies.sql
-- Uses demo/fake data only. No real patient information.
-- ============================================================

-- NOTE: Auth users must be created via Supabase Auth API or Dashboard.
-- The profile rows below use fixed UUIDs that MUST match the auth.users IDs.
-- See README.md for instructions on creating these demo users.

-- Demo User UUIDs (create these in Supabase Auth dashboard first)
-- admin@healinindia.com     → id: '00000000-0000-0000-0000-000000000001'
-- clinic1@healinindia.com   → id: '00000000-0000-0000-0000-000000000002'
-- clinic2@healinindia.com   → id: '00000000-0000-0000-0000-000000000003'
-- patient1@healinindia.com  → id: '00000000-0000-0000-0000-000000000004'
-- patient2@healinindia.com  → id: '00000000-0000-0000-0000-000000000005'
-- practitioner1@healinindia.com → id: '00000000-0000-0000-0000-000000000006'

-- ============================================================
-- PROFILES (seed manually after creating auth users)
-- ============================================================

INSERT INTO public.profiles (id, role, full_name, email, phone, country, city, state, language) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin Kumar', 'admin@healinindia.com', '+91-9000000001', 'India', 'Delhi', 'Delhi', 'en'),
  ('00000000-0000-0000-0000-000000000002', 'clinic', 'Kerala Ayurveda Hub', 'clinic1@healinindia.com', '+91-9000000002', 'India', 'Kochi', 'Kerala', 'en'),
  ('00000000-0000-0000-0000-000000000003', 'clinic', 'Rishikesh Wellness', 'clinic2@healinindia.com', '+91-9000000003', 'India', 'Rishikesh', 'Uttarakhand', 'en'),
  ('00000000-0000-0000-0000-000000000004', 'patient', 'Priya Sharma', 'patient1@healinindia.com', '+91-9000000004', 'India', 'Mumbai', 'Maharashtra', 'en'),
  ('00000000-0000-0000-0000-000000000005', 'patient', 'James Anderson', 'patient2@healinindia.com', '+1-555-000-0005', 'USA', 'New York', 'NY', 'en'),
  ('00000000-0000-0000-0000-000000000006', 'practitioner', 'Dr. Vaidya Krishnan', 'practitioner1@healinindia.com', '+91-9000000006', 'India', 'Kochi', 'Kerala', 'en')
ON CONFLICT (id) DO NOTHING;

-- Patient profiles
INSERT INTO public.patient_profiles (profile_id, date_of_birth, gender, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone) VALUES
  ('00000000-0000-0000-0000-000000000004', '1988-03-15', 'female', 'B+', ARRAY['penicillin'], ARRAY['mild hypertension'], 'Raj Sharma', '+91-9000000099'),
  ('00000000-0000-0000-0000-000000000005', '1975-07-22', 'male', 'O+', ARRAY[]::TEXT[], ARRAY['type 2 diabetes'], 'Mary Anderson', '+1-555-000-0099')
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================
-- CLINICS (12 demo clinics)
-- ============================================================

INSERT INTO public.clinics (id, owner_id, name, slug, clinic_type, description, registration_number, specialties, languages_spoken, address_line1, city, state, pincode, latitude, longitude, phone, email, website, consultation_fee, currency, is_verified, verification_status, verified_at, verified_by, rating, review_count) VALUES

  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'Kerala Ayurveda Heritage Centre', 'kerala-ayurveda-heritage',
   'ayurveda', 'A premier 5-star Ayurveda centre with 40 years of legacy in authentic Kerala Panchakarma. Government-certified and internationally accredited.',
   'AYUSH-KL-2024-001', ARRAY['Panchakarma','Ayurveda','Rejuvenation','Detox'], ARRAY['en','hi','ml','de'],
   '12, Kadavanthra Road', 'Kochi', 'Kerala', '682020', 9.9312, 76.2673,
   '+91-484-2000001', 'info@keralaayurvedaheritage.com', 'https://demo.healinindia.com',
   1500.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '60 days', '00000000-0000-0000-0000-000000000001',
   4.8, 234),

  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'Rishikesh Divine Wellness', 'rishikesh-divine-wellness',
   'panchakarma', 'Nestled in the foothills of the Himalayas, our centre offers authentic Panchakarma therapies blended with yoga and meditation.',
   'AYUSH-UK-2024-002', ARRAY['Panchakarma','Yoga','Meditation','Detox'], ARRAY['en','hi'],
   'Swarg Ashram Road', 'Rishikesh', 'Uttarakhand', '249304', 30.1087, 78.3153,
   '+91-135-2000002', 'info@rishikeshdivine.com', 'https://demo.healinindia.com',
   1200.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '45 days', '00000000-0000-0000-0000-000000000001',
   4.7, 189),

  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Mumbai Integrative Health Clinic', 'mumbai-integrative-health',
   'integrated', 'Award-winning integrative care combining modern medicine, Ayurveda, and evidence-based wellness under one roof.',
   'MCI-MH-2024-003', ARRAY['Integrative Medicine','Cardiology','Ayurveda','Oncology Support'], ARRAY['en','hi','mr'],
   '45, Bandra West, Linking Road', 'Mumbai', 'Maharashtra', '400050', 19.0596, 72.8295,
   '+91-22-2000003', 'info@mumbaiintegrative.com', 'https://demo.healinindia.com',
   2500.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '30 days', '00000000-0000-0000-0000-000000000001',
   4.6, 312),

  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Goa Ayurveda Beach Retreat', 'goa-ayurveda-beach',
   'wellness_retreat', 'Luxury Ayurveda and wellness retreat on the shores of South Goa. Specializes in stress management and rejuvenation packages.',
   'AYUSH-GA-2024-004', ARRAY['Rejuvenation','Stress Management','Beauty Therapies','Panchakarma'], ARRAY['en','hi','pt'],
   'Colva Beach Road', 'Goa', 'Goa', '403708', 15.2793, 73.9236,
   '+91-832-2000004', 'info@goaayurvedabeach.com', 'https://demo.healinindia.com',
   1800.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '20 days', '00000000-0000-0000-0000-000000000001',
   4.9, 421),

  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Delhi Modern Wellness Institute', 'delhi-modern-wellness',
   'modern_medicine', 'NABH-accredited multi-specialty hospital with dedicated wellness and preventive health departments.',
   'NABH-DL-2024-005', ARRAY['Preventive Health','Cardiology','Orthopedics','Neurology'], ARRAY['en','hi','ur'],
   'Connaught Place, Block C', 'Delhi', 'Delhi', '110001', 28.6315, 77.2167,
   '+91-11-2000005', 'info@delhimodernwellness.com', 'https://demo.healinindia.com',
   3000.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '15 days', '00000000-0000-0000-0000-000000000001',
   4.5, 567),

  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Bengaluru Holistic Health Hub', 'bengaluru-holistic-health',
   'integrated', 'Tech-forward integrative health centre in Koramangala offering digital health records, teleconsultation, and holistic treatments.',
   'AYUSH-KA-2024-006', ARRAY['Holistic Health','Digital Health','Ayurveda','Sports Medicine'], ARRAY['en','hi','kn'],
   '7th Block, Koramangala', 'Bengaluru', 'Karnataka', '560095', 12.9352, 77.6245,
   '+91-80-2000006', 'info@bengaluruholic.com', 'https://demo.healinindia.com',
   2000.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '10 days', '00000000-0000-0000-0000-000000000001',
   4.7, 298),

  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Thrissur Vaidyasala', 'thrissur-vaidyasala',
   'ayurveda', 'Traditional Vaidyasala with 6 generations of Ashtavaidya lineage. UNESCO-recognised traditional medicine practices.',
   'AYUSH-KL-2024-007', ARRAY['Classical Ayurveda','Kizhi','Dhara','Nasyam'], ARRAY['en','ml','hi'],
   'East Nada, Guruvayur Road', 'Thrissur', 'Kerala', '680001', 10.5276, 76.2144,
   '+91-487-2000007', 'info@thrissur-vaidyasala.com', 'https://demo.healinindia.com',
   1000.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '25 days', '00000000-0000-0000-0000-000000000001',
   4.9, 176),

  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Mysuru Yoga & Ayurveda Center', 'mysuru-yoga-ayurveda',
   'wellness_retreat', 'Combining the royal tradition of Mysuru yoga school with classical Ayurveda for comprehensive mind-body wellness.',
   'AYUSH-KA-2024-008', ARRAY['Yoga','Ayurveda','Meditation','Pranayama'], ARRAY['en','kn','hi'],
   'Gokulam, 3rd Stage', 'Mysuru', 'Karnataka', '570002', 12.3375, 76.6453,
   '+91-821-2000008', 'info@mysuruayurveda.com', 'https://demo.healinindia.com',
   1400.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '35 days', '00000000-0000-0000-0000-000000000001',
   4.6, 143),

  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Pune Naturopathy & Wellness', 'pune-naturopathy-wellness',
   'wellness_retreat', 'Specialized naturopathy and lifestyle medicine clinic offering evidence-based natural therapies for chronic conditions.',
   'AYUSH-MH-2024-009', ARRAY['Naturopathy','Lifestyle Medicine','Hydrotherapy','Diet Therapy'], ARRAY['en','mr','hi'],
   'FC Road, Deccan', 'Pune', 'Maharashtra', '411004', 18.5204, 73.8567,
   '+91-20-2000009', 'info@purenaturopathy.com', 'https://demo.healinindia.com',
   1100.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '50 days', '00000000-0000-0000-0000-000000000001',
   4.4, 98),

  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Varanasi Integrative Healing', 'varanasi-integrative',
   'integrated', 'Ancient city, modern care. Combining BHU''s medical tradition with classical Ayurveda and modern diagnostics.',
   'AYUSH-UP-2024-010', ARRAY['Integrative Care','Digestive Health','Geriatrics','Panchkarma'], ARRAY['en','hi','bho'],
   'BHU Campus Road', 'Varanasi', 'Uttar Pradesh', '221005', 25.2677, 82.9913,
   '+91-542-2000010', 'info@varanasihealing.com', 'https://demo.healinindia.com',
   1300.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '40 days', '00000000-0000-0000-0000-000000000001',
   4.5, 211),

  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'Chennai Diagnostics & Wellness', 'chennai-diagnostics',
   'diagnostics', 'NABL-accredited diagnostics centre with integrated wellness and preventive health programs for comprehensive health management.',
   'NABL-TN-2024-011', ARRAY['Diagnostics','Preventive Health','Genomics','Cardio Wellness'], ARRAY['en','ta','hi'],
   'Anna Nagar West', 'Chennai', 'Tamil Nadu', '600040', 13.0827, 80.2707,
   '+91-44-2000011', 'info@chennaidignostics.com', 'https://demo.healinindia.com',
   800.00, 'INR', FALSE, 'pending', NULL, NULL,
   0, 0),

  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'Jaipur Royal Ayurveda Palace', 'jaipur-royal-ayurveda',
   'ayurveda', 'Luxury Ayurveda resort in a heritage haveli. Authentic Rajasthani healing traditions combined with royal hospitality.',
   'AYUSH-RJ-2024-012', ARRAY['Royal Therapies','Panchakarma','Marma Therapy','Basti'], ARRAY['en','hi','raj'],
   'Civil Lines Heritage Zone', 'Jaipur', 'Rajasthan', '302006', 26.9124, 75.7873,
   '+91-141-2000012', 'info@jaipurroyalayurveda.com', 'https://demo.healinindia.com',
   2200.00, 'INR', TRUE, 'approved', NOW() - INTERVAL '55 days', '00000000-0000-0000-0000-000000000001',
   4.8, 387)

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TREATMENTS (15 treatments)
-- ============================================================

INSERT INTO public.treatments (id, name, slug, category, description, benefits, duration_minutes, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Abhyanga (Ayurvedic Full Body Massage)', 'abhyanga', 'ayurveda',
   'Traditional full-body warm oil massage using medicated herbal oils, performed by trained therapists in synchronized strokes.',
   ARRAY['Improves circulation','Reduces stress','Nourishes skin','Balances doshas'], 60, TRUE),

  ('20000000-0000-0000-0000-000000000002', 'Shirodhara', 'shirodhara', 'ayurveda',
   'Continuous stream of warm medicated oil poured over the forehead (third eye). Deeply calming and balancing.',
   ARRAY['Relieves stress and anxiety','Improves sleep','Headache relief','Mental clarity'], 45, TRUE),

  ('20000000-0000-0000-0000-000000000003', 'Panchakarma (Complete Detox Program)', 'panchakarma-complete', 'panchakarma',
   'The classical 5-action Ayurvedic cleansing protocol: Vamana, Virechana, Basti, Nasya, and Raktamokshana.',
   ARRAY['Deep tissue detox','Restores doshic balance','Rejuvenates cells','Boosts immunity'], 120, TRUE),

  ('20000000-0000-0000-0000-000000000004', 'Nasyam (Nasal Therapy)', 'nasyam', 'panchakarma',
   'Administration of medicated substances through nasal passage. Effective for ENT conditions and mental clarity.',
   ARRAY['Sinusitis relief','Migraine management','Improves memory','Detoxifies head region'], 30, TRUE),

  ('20000000-0000-0000-0000-000000000005', 'Kizhi (Herbal Bolus Massage)', 'kizhi', 'ayurveda',
   'Massage using warm boluses filled with herbal leaves, powders, or rice. Effective for musculoskeletal conditions.',
   ARRAY['Joint pain relief','Muscle relaxation','Reduces inflammation','Improves flexibility'], 75, TRUE),

  ('20000000-0000-0000-0000-000000000006', 'Yoga & Pranayama Session', 'yoga-pranayama', 'wellness',
   'Personalized yoga asana and breathing practice designed for therapeutic outcomes based on Ayurvedic constitution.',
   ARRAY['Flexibility','Respiratory health','Stress reduction','Mind-body balance'], 90, TRUE),

  ('20000000-0000-0000-0000-000000000007', 'Full Body Health Checkup', 'health-checkup', 'diagnostics',
   'Comprehensive health screening including blood panel, cardiac assessment, metabolic profile, and wellness consultation.',
   ARRAY['Early disease detection','Baseline health data','Personalized wellness plan','Peace of mind'], 180, TRUE),

  ('20000000-0000-0000-0000-000000000008', 'Basti (Ayurvedic Enema Therapy)', 'basti', 'panchakarma',
   'Therapeutic enema using medicated decoctions and oils. Most important of the Panchakarma procedures for Vata disorders.',
   ARRAY['Colon cleansing','Vata balancing','Joint health','Neurological support'], 60, TRUE),

  ('20000000-0000-0000-0000-000000000009', 'Marma Therapy', 'marma-therapy', 'ayurveda',
   'Stimulation of 107 vital energy points (Marmas) in the body to unblock energy and restore physiological functions.',
   ARRAY['Energy balancing','Chronic pain relief','Post-injury recovery','Emotional healing'], 60, TRUE),

  ('20000000-0000-0000-0000-000000000010', 'Naturopathy Consultation & Diet Plan', 'naturopathy-consult', 'wellness',
   'Comprehensive lifestyle assessment followed by a personalized diet, nutrition, and natural therapy plan.',
   ARRAY['Chronic disease management','Weight management','Gut health','Sustainable lifestyle'], 90, TRUE),

  ('20000000-0000-0000-0000-000000000011', 'Ayurvedic Consultation (Nadi Pariksha)', 'ayurvedic-consultation', 'ayurveda',
   'Initial consultation with Vaidya including Prakriti analysis, Nadi (pulse) diagnosis, and treatment planning.',
   ARRAY['Prakriti understanding','Personalized treatment','Root cause analysis','Preventive guidance'], 60, TRUE),

  ('20000000-0000-0000-0000-000000000012', 'Netra Tarpana (Eye Rejuvenation)', 'netra-tarpana', 'ayurveda',
   'Bathing of eyes with medicated ghee in a dough dam. Treats eye disorders and improves visual acuity.',
   ARRAY['Eye strain relief','Dry eye treatment','Improves eyesight','Reduces eye fatigue'], 30, TRUE),

  ('20000000-0000-0000-0000-000000000013', 'Modern Cardiology Consultation', 'cardiology-consult', 'modern_medicine',
   'Comprehensive cardiac assessment by specialist cardiologist including ECG, echocardiogram review, and treatment planning.',
   ARRAY['Heart health monitoring','Risk assessment','Medication review','Lifestyle counseling'], 60, TRUE),

  ('20000000-0000-0000-0000-000000000014', 'Hydrotherapy Session', 'hydrotherapy', 'wellness',
   'Therapeutic use of water in various forms (hot, cold, steam) for treating chronic conditions and improving wellness.',
   ARRAY['Detoxification','Circulation improvement','Pain relief','Immune boosting'], 90, TRUE),

  ('20000000-0000-0000-0000-000000000015', 'Meditation & Mindfulness Program', 'meditation-mindfulness', 'wellness',
   'Guided meditation sessions using Vedic techniques, mindfulness, and Yoga Nidra for deep mental relaxation.',
   ARRAY['Stress relief','Better sleep','Mental clarity','Emotional balance'], 60, TRUE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TREATMENT PACKAGES
-- ============================================================

INSERT INTO public.treatment_packages (id, clinic_id, name, slug, description, category, duration_days, price, currency, inclusions, exclusions, cancellation_policy, capacity, is_active, is_featured) VALUES

  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '7-Day Panchakarma Detox Program', '7-day-panchakarma-detox',
   'Our signature 7-day full Panchakarma detox. Includes pre-treatment preparation (Purvakarma), main cleansing (Pradhanakarma), and post-treatment rejuvenation (Paschatkarma). Guided by senior Vaidya.',
   'panchakarma', 7, 45000.00, 'INR',
   ARRAY['All Panchakarma procedures','Daily Abhyanga','Herbal medicines','3 Ayurvedic meals/day','Doctor consultations','Yoga sessions'],
   ARRAY['Flights & accommodation','Personal expenses','Alcohol & non-Ayurvedic food'],
   'Full refund if cancelled 7+ days before. 50% refund for 3-7 days. No refund within 3 days.',
   8, TRUE, TRUE),

  ('30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '14-Day Ayurveda Rejuvenation', '14-day-rejuvenation',
   'A comprehensive 14-day Rasayana (rejuvenation) program for longevity and vitality. Includes full Panchakarma, specialized Rasayana therapies, herbal treatments, and personalized diet.',
   'ayurveda', 14, 85000.00, 'INR',
   ARRAY['Panchakarma','Rasayana therapies','Customized herbal formulas','3 Ayurvedic meals/day','Private consultations','Yoga & Meditation','Health report'],
   ARRAY['Flights','Accommodation (can be arranged at extra cost)','Personal travel insurance'],
   'Full refund if cancelled 14+ days before. 50% refund for 7-14 days.',
   6, TRUE, TRUE),

  ('30000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002',
   '5-Day Himalayan Wellness Retreat', '5-day-himalayan-wellness',
   'Reconnect with nature in the Himalayas. Combines Panchakarma, yoga, meditation, and sound healing for complete wellness transformation.',
   'panchakarma', 5, 28000.00, 'INR',
   ARRAY['Daily Panchakarma treatments','Yoga & meditation sessions','Sound healing','Sattvic vegetarian meals','Nature walks','Ganga aarti attendance'],
   ARRAY['Flights','Personal expenses','City transport'],
   'Full refund 5+ days before. No refund within 5 days. Rescheduling allowed once.',
   10, TRUE, TRUE),

  ('30000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000004',
   '10-Day Luxury Goa Wellness Package', '10-day-goa-luxury',
   'Indulge in a premium wellness experience by the beach. Combines Ayurvedic treatments with modern spa therapies, sunrise yoga, and personalized nutrition.',
   'wellness_retreat', 10, 120000.00, 'INR',
   ARRAY['Luxury beachside accommodation','Daily Ayurvedic treatments','Personalized nutrition plan','Yoga & Meditation','Cooking workshop','Sunrise beach sessions'],
   ARRAY['Flights','Alcohol','Non-programme activities'],
   'Full refund 10+ days. 50% refund 5-10 days. No refund within 5 days.',
   6, TRUE, TRUE),

  ('30000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000003',
   'Weekend Yoga & Detox Package', 'weekend-yoga-detox',
   'Perfect for beginners. A 3-day immersive yoga and light detox package for professionals seeking a quick reset.',
   'wellness_retreat', 3, 12000.00, 'INR',
   ARRAY['2 nights accommodation','3 yoga sessions/day','Light Panchakarma treatments','Sattvic meals','Meditation sessions'],
   ARRAY['Transport','Personal expenses'],
   'Full refund 3+ days before. No refund within 3 days.',
   15, TRUE, FALSE),

  ('30000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000003',
   '21-Day Deep Yoga Teacher Training', '21-day-yoga-ttp',
   'Intensive 21-day residential yoga teacher training with Ayurveda lifestyle integration. For serious practitioners seeking transformation.',
   'wellness_retreat', 21, 95000.00, 'INR',
   ARRAY['Accommodation','All Sattvic meals','Yoga theory & practice','Ayurveda fundamentals','Anatomy','Teaching practicum','Certificate'],
   ARRAY['Flights','Personal expenses','Books (recommended reading list provided)'],
   'Non-refundable after admission. Transfer to next batch allowed 30+ days prior.',
   12, TRUE, FALSE),

  ('30000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000005',
   'Comprehensive Health Checkup + Consultation', 'comprehensive-health-checkup',
   'Full-day health assessment including 60+ parameter blood panel, cardiac evaluation, cancer markers, metabolic profile, and wellness consultation with senior specialist.',
   'diagnostics', 1, 15000.00, 'INR',
   ARRAY['60+ blood parameters','ECG','USG Abdomen','Chest X-ray','Ophthalmology','Doctor consultation','Personalized health report','Diet counseling'],
   ARRAY['Specialized tests if additional required','Medicines if prescribed'],
   'Full refund if cancelled 24h before.',
   20, TRUE, FALSE),

  ('30000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000012',
   'Royal 7-Day Rajasthani Healing Experience', 'royal-7-day-rajasthan',
   'Live like royalty while healing. This signature package combines traditional Marwar Ayurveda with luxury heritage hospitality in a grand haveli.',
   'ayurveda', 7, 75000.00, 'INR',
   ARRAY['Heritage suite accommodation','Daily royal treatment rituals','Marma therapy','Shirodhara','Herbal formulations','Rajasthani Sattvic meals','Cultural experiences'],
   ARRAY['Flights','Personal expenses','Outside excursions'],
   'Full refund 10+ days. 50% refund 5-10 days. No refund within 5 days.',
   4, TRUE, TRUE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PACKAGE SCHEDULE DAYS
-- ============================================================

INSERT INTO public.package_schedule_days (package_id, day_number, title, activities, meals_included, notes) VALUES
  -- 7-Day Panchakarma
  ('30000000-0000-0000-0000-000000000001', 1, 'Arrival & Assessment', ARRAY['Vaidya consultation','Prakriti analysis','Nadi Pariksha'], ARRAY['lunch','dinner'], 'Light diet prescribed'),
  ('30000000-0000-0000-0000-000000000001', 2, 'Oleation & Preparation', ARRAY['Snehapana (internal oleation)','Abhyanga'], ARRAY['breakfast','lunch','dinner'], 'Ghee intake begins'),
  ('30000000-0000-0000-0000-000000000001', 3, 'Swedana (Fomentation)', ARRAY['Abhyanga','Steam therapy','Yoga'], ARRAY['breakfast','lunch','dinner'], ''),
  ('30000000-0000-0000-0000-000000000001', 4, 'Main Cleansing Day 1', ARRAY['Virechana (therapeutic purgation)','Rest','Meditation'], ARRAY['breakfast','herbal_tea','light_dinner'], 'Rest day - avoid activity'),
  ('30000000-0000-0000-0000-000000000001', 5, 'Main Cleansing Day 2', ARRAY['Basti (therapeutic enema)','Nasyam','Abhyanga'], ARRAY['breakfast','lunch','dinner'], ''),
  ('30000000-0000-0000-0000-000000000001', 6, 'Rejuvenation Begins', ARRAY['Abhyanga','Shirodhara','Yoga','Pranayama'], ARRAY['breakfast','lunch','dinner'], 'Diet gradually normalizes'),
  ('30000000-0000-0000-0000-000000000001', 7, 'Completion & Consultation', ARRAY['Final Abhyanga','Follow-up consultation','Health report'], ARRAY['breakfast','lunch'], 'Take-home herbal kit provided');

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================

INSERT INTO public.availability_slots (clinic_id, package_id, start_date, end_date, total_capacity, booked_count) VALUES
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', CURRENT_DATE + 7, CURRENT_DATE + 14, 8, 2),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', CURRENT_DATE + 21, CURRENT_DATE + 28, 8, 0),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', CURRENT_DATE + 14, CURRENT_DATE + 28, 6, 1),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', CURRENT_DATE + 5, CURRENT_DATE + 10, 10, 3),
  ('10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', CURRENT_DATE + 10, CURRENT_DATE + 20, 6, 0),
  ('10000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000008', CURRENT_DATE + 7, CURRENT_DATE + 14, 4, 1);

-- ============================================================
-- PRACTITIONERS
-- ============================================================

INSERT INTO public.practitioners (id, profile_id, title, specialization, degrees, council_registration, years_of_experience, bio, languages_spoken, consultation_fee, verification_status) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006',
   'Vaidya', ARRAY['Panchakarma','Ayurvedic Internal Medicine'],
   ARRAY['BAMS','MD (Ayu) - Panchakarma'], 'CCIM-KL-12345', 22,
   'Dr. Krishnan is a 22-year veteran of classical Panchakarma with training from AVP Coimbatore and KVN Thrissur. Specializes in chronic disease management through Ayurveda.',
   ARRAY['en','ml','hi'], 1500.00, 'approved'),

  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Dr.', ARRAY['Integrative Medicine','Cardiology'],
   ARRAY['MBBS','MD (General Medicine)','DM (Cardiology)'], 'MCI-12345', 18,
   'Dr. Arjun Mehta combines modern cardiology expertise with lifestyle medicine and integrative wellness approaches.',
   ARRAY['en','hi'], 3000.00, 'approved');

-- Junction: practitioners ↔ clinics
INSERT INTO public.clinic_practitioners (clinic_id, practitioner_id, is_primary, role_at_clinic, joined_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', TRUE, 'Chief Vaidya', '2012-01-01'),
  ('10000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', TRUE, 'Senior Cardiologist', '2015-06-01')
ON CONFLICT DO NOTHING;

-- ============================================================
-- BOOKINGS (sample bookings)
-- ============================================================

INSERT INTO public.bookings (id, booking_ref, patient_id, clinic_id, package_id, check_in_date, check_out_date, num_guests, status, health_notes, total_price, currency, confirmed_at) VALUES
  ('50000000-0000-0000-0000-000000000001', 'HI-DEMO01',
   '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 30, CURRENT_DATE - 23, 1, 'completed', 'Mild hypertension, no contraindications to Panchakarma', 45000.00, 'INR', NOW() - INTERVAL '35 days'),

  ('50000000-0000-0000-0000-000000000002', 'HI-DEMO02',
   '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004',
   CURRENT_DATE + 10, CURRENT_DATE + 20, 2, 'confirmed', 'Type 2 diabetes, managed. Vegetarian diet preferred.', 120000.00, 'INR', NOW() - INTERVAL '2 days'),

  ('50000000-0000-0000-0000-000000000003', 'HI-DEMO03',
   '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
   CURRENT_DATE + 5, CURRENT_DATE + 10, 1, 'pending', 'Looking for stress management and relaxation', 28000.00, 'INR', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- REVIEWS
-- ============================================================

INSERT INTO public.reviews (clinic_id, patient_id, booking_id, rating, title, body, is_verified, is_published) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000001', 5,
   'Life-changing Panchakarma experience!',
   'I came with chronic fatigue and leave feeling 20 years younger. The Vaidya''s knowledge is profound and the treatments were done with such care. The food was delicious and healing. I''ll be back for the 14-day program next year.',
   TRUE, TRUE),

  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004',
   NULL, 5,
   'Paradise for healing — Goa exceeded all expectations',
   'The beach location, the therapy, the staff — everything was 10/10. I went for stress management and came back completely transformed. Booking the Royal package next time!',
   FALSE, TRUE),

  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005',
   NULL, 5,
   'Best wellness experience from the US',
   'As an international patient from New York, I was nervous about medical tourism. The team at Rishikesh Divine Wellness guided me through everything. The Ayush Visa process was smooth. Absolutely recommend!',
   FALSE, TRUE);

-- ============================================================
-- HEALTH RECORDS (sample)
-- ============================================================

INSERT INTO public.health_records (patient_id, record_type, title, description, recorded_date, tags) VALUES
  ('00000000-0000-0000-0000-000000000004', 'lab_report', 'Complete Blood Count - Pre Panchakarma', 'CBC done before starting Panchakarma program at Kerala Ayurveda Heritage', CURRENT_DATE - 35, ARRAY['CBC','pre-treatment','baseline']),
  ('00000000-0000-0000-0000-000000000004', 'prescription', 'Ayurvedic Medicines Post-Panchakarma', 'Herbal formulations prescribed by Vaidya Krishnan post completion', CURRENT_DATE - 23, ARRAY['post-treatment','herbal','prescription']),
  ('00000000-0000-0000-0000-000000000005', 'lab_report', 'HbA1c & Diabetic Panel', 'Diabetic monitoring panel before starting wellness retreat', CURRENT_DATE - 5, ARRAY['diabetes','HbA1c','monitoring']);

-- ============================================================
-- NOTIFICATIONS (sample)
-- ============================================================

INSERT INTO public.notifications (user_id, title, body, type, is_read) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Booking Confirmed!', 'Your booking HI-DEMO01 at Kerala Ayurveda Heritage Centre has been confirmed. Check-in on ' || (CURRENT_DATE - 30)::TEXT, 'booking', TRUE),
  ('00000000-0000-0000-0000-000000000005', 'Upcoming Booking Reminder', 'Your 10-Day Luxury Goa Wellness Package starts in 10 days. Please complete your health form.', 'booking', FALSE),
  ('00000000-0000-0000-0000-000000000001', 'New Clinic Pending Verification', 'Chennai Diagnostics & Wellness has registered and submitted verification documents.', 'verification', FALSE);
