// ========================================================
// 3. المحرك المركزي لجميع العمليات والاتصال بسوبابيز (Begol Master API Layer)
// ========================================================
const api = {
    // ----------------------------------------------------
    // المصادقة وتوثيق الدخول
    // ----------------------------------------------------
    auth: {
        async login(username, password) {
            try {
                const { data, error } = await db.from('Users')
                    .select('*, Roles(RoleName)')
                    .eq('Username', username.trim())
                    .eq('IsActive', true)
                    .single();

                if (error || !data) return { success: false, message: 'اسم المستخدم غير مسجل أو غير مفعل' };
                if (data.PasswordHash !== password.trim()) return { success: false, message: 'كلمة المرور غير صحيحة' };

                const role = data.Roles?.RoleName || 'Consultant';
                sessionStorage.setItem('userId', data.UserID);
                sessionStorage.setItem('fullName', data.FullName);
                sessionStorage.setItem('roleName', role);
                sessionStorage.setItem('allowedScreens', data.AllowedScreens || 'all');
                sessionStorage.setItem('doctorScope', data.DoctorScope || 'كشوفات وفحوصات');

                let redirectUrl = '/reception.html';
                const rLow = role.toLowerCase();
                if (['doctor', 'consultant', 'resident', 'specialist'].includes(rLow)) redirectUrl = '/doctor.html';
                else if (rLow === 'admin') redirectUrl = '/admin.html';
                else if (rLow === 'callcenter') redirectUrl = '/callcenter.html';

                return { success: true, fullName: data.FullName, roleName: role, redirectUrl };
            } catch (e) {
                return { success: false, message: 'خطأ في الاتصال بسوبابيز: ' + e.message };
            }
        },
        logout() {
            sessionStorage.clear();
            window.location.href = '/index.html';
        }
    },

    // ----------------------------------------------------
    // إدارة المرضى والملفات والبحث الذكي
    // ----------------------------------------------------
    patients: {
        async getNextCode() {
            const { data } = await db.from('Patients').select('PatientID').order('PatientID', { ascending: false }).limit(1);
            return (data && data.length > 0) ? (data[0].PatientID + 1) : 1;
        },
        async search(query) {
            if (!query) return [];
            const q = query.trim();
            const { data } = await db.from('Patients')
                .select('*')
                .or(`FullName.ilike.%${q}%,Mobile1.ilike.%${q}%,NationalID.ilike.%${q}%`)
                .not('FullName', 'ilike', '%[مدمج]%')
                .order('PatientID', { ascending: false })
                .limit(20);
            return (data || []).map(p => ({
                patientId: p.PatientID,
                fullName: p.FullName,
                mobile: p.Mobile1,
                nationalId: p.NationalID,
                createdAt: p.CreatedDate
            }));
        },
        async searchAdvanced(filters) {
            let req = db.from('Patients').select('*').not('FullName', 'ilike', '%[مدمج]%');
            if (filters.ar1) req = req.or(`FullName.ilike.%${filters.ar1}%,FirstNameAr.ilike.%${filters.ar1}%`);
            if (filters.mobile) req = req.ilike('Mobile1', `%${filters.mobile}%`);
            if (filters.nationalId) req = req.ilike('NationalID', `%${filters.nationalId}%`);
            if (filters.from) req = req.gte('CreatedDate', filters.from);
            if (filters.to) req = req.lte('CreatedDate', filters.to);

            const { data } = await req.order('PatientID', { ascending: false }).limit(40);
            return (data || []).map(p => ({
                patientId: p.PatientID,
                fullName: p.FullName,
                mobile: p.Mobile1,
                nationalId: p.NationalID,
                createdAt: p.CreatedDate
            }));
        },
        async getById(patientId) {
            const { data: p, error } = await db.from('Patients').select('*').eq('PatientID', patientId).single();
            if (error || !p) return null;

            const { data: hist } = await db.from('Appointments')
                .select('*, Users(FullName)')
                .eq('PatientID', patientId)
                .order('AppointmentDate', { ascending: false });

            return {
                patient: {
                    patientId: p.PatientID,
                    ar1: p.FirstNameAr || '',
                    ar2: p.SecondNameAr || '',
                    ar3: p.ThirdNameAr || '',
                    ar4: p.FourthNameAr || '',
                    fullName: p.FullName,
                    nationalId: p.NationalID || '',
                    birthDate: p.BirthDate || '',
                    age: p.Age || 0,
                    gender: p.Gender || 'ذكر',
                    mobile: p.Mobile1 || '',
                    gov: p.City || 'القاهرة',
                    district: p.District || 'عين شمس',
                    address: p.DetailedAddress || '',
                    photoData: p.PhotoData || '',
                    insuranceType: p.InsuranceType || 'نقدي',
                    insuranceCompany: p.InsuranceCompany || '',
                    insuranceCardNo: p.InsuranceCardNo || '',
                    insuranceMemberType: p.InsuranceMemberType || 'عضو أصيل',
                    insurancePrimaryHolder: p.InsurancePrimaryHolder || '',
                    insuranceCopay: p.InsuranceCopay || '',
                    notes: p.Notes || ''
                },
                history: (hist || []).map(h => ({
                    appointmentId: h.AppointmentID,
                    serviceType: h.ServiceType,
                    visitDate: h.AppointmentDate ? h.AppointmentDate.split('T')[0] : '',
                    visitTime: h.AppointmentDate ? h.AppointmentDate.split('T')[1].substring(0, 5) : '',
                    doctorName: h.Users?.FullName || 'عيادة عامة',
                    status: h.Status,
                    notes: h.Notes || ''
                }))
            };
        },
        async checkDuplicate(nationalId, mobile, currentId = 0) {
            if (nationalId && nationalId.trim().length === 14) {
                const { data } = await db.from('Patients')
                    .select('PatientID, FullName')
                    .eq('NationalID', nationalId.trim())
                    .neq('PatientID', currentId)
                    .limit(1);
                if (data && data.length > 0) {
                    return { isDuplicate: true, existingId: data[0].PatientID, message: `⚠️ هذا الرقم القومي مسجل بالفعل للمريض: (${data[0].FullName}) كود ملف (#${data[0].PatientID}).` };
                }
            }
            return { isDuplicate: false };
        },
        async save(dto) {
            const fullName = `${dto.ar1 || ''} ${dto.ar2 || ''} ${dto.ar3 || ''} ${dto.ar4 || ''}`.trim();
            const payload = {
                FirstNameAr: dto.ar1 ? dto.ar1.trim() : '',
                SecondNameAr: dto.ar2 ? dto.ar2.trim() : '',
                ThirdNameAr: dto.ar3 ? dto.ar3.trim() : '',
                FourthNameAr: dto.ar4 ? dto.ar4.trim() : '',
                FullName: fullName,
                NationalID: dto.nationalId ? dto.nationalId.trim() : null,
                BirthDate: dto.birthDate || null,
                Age: dto.age ? parseInt(dto.age) : null,
                Gender: dto.gender || 'ذكر',
                City: dto.gov || 'القاهرة',
                District: dto.district || 'عين شمس',
                DetailedAddress: dto.address || '',
                Mobile1: dto.mobile || '',
                PhotoData: dto.photoData || null,
                InsuranceType: dto.insuranceType || 'نقدي',
                InsuranceCompany: dto.insuranceCompany || null,
                InsuranceCardNo: dto.insuranceCardNo || null,
                InsuranceMemberType: dto.insuranceMemberType || 'عضو أصيل',
                InsurancePrimaryHolder: dto.insurancePrimaryHolder || null,
                InsuranceCopay: dto.insuranceCopay || null,
                Notes: dto.notes || null
            };

            if (dto.patientId > 0) {
                await db.from('Patients').update(payload).eq('PatientID', dto.patientId);
                return { success: true, patientId: dto.patientId, message: 'تم تعديل ملف المريض بنجاح!' };
            } else {
                const { data, error } = await db.from('Patients').insert([payload]).select('PatientID').single();
                if (error) throw error;
                return { success: true, patientId: data.PatientID, message: 'تم حفظ ملف المريض الجديد بنجاح!' };
            }
        },
        async merge(masterId, duplicateId, adminUser) {
            await db.from('Appointments').update({ PatientID: masterId }).eq('PatientID', duplicateId);
            await db.from('PatientQueue').update({ PatientID: masterId }).eq('PatientID', duplicateId);
            await db.from('PatientAttachments').update({ PatientID: masterId }).eq('PatientID', duplicateId);
            
            const { data: pDup } = await db.from('Patients').select('FullName').eq('PatientID', duplicateId).single();
            if (pDup) {
                await db.from('Patients').update({
                    FullName: pDup.FullName + ' [مدمج]',
                    NationalID: null,
                    Mobile1: null,
                    Notes: `[تم دمجه بالملف الأصلي: #${masterId}] بواسطة: ${adminUser}`
                }).eq('PatientID', duplicateId);
            }
            return { success: true, message: `✅ تم دمج ونقل سجلات الملف (#${duplicateId}) إلى الملف الأصلي (#${masterId}) بنجاح!` };
        }
    },

    // ----------------------------------------------------
    // الحجوزات والعيادات والطابور
    // ----------------------------------------------------
    queue: {
        async bookTicket(patientId, clinic, serviceType, eyeSide, price, doctorName) {
            await db.from('Appointments').insert([{
                PatientID: patientId,
                ServiceType: serviceType,
                EyeSide: eyeSide || 'عام',
                Status: 'Confirmed',
                Source: 'استقبال ويب'
            }]);

            const today = new Date().toISOString().split('T')[0];
            const { data: qList } = await db.from('PatientQueue')
                .select('QueueNumber')
                .gte('ArrivedTime', today)
                .eq('Department', clinic)
                .order('QueueNumber', { ascending: false })
                .limit(1);

            const nextQueue = (qList && qList.length > 0) ? (qList[0].QueueNumber + 1) : 1;

            await db.from('PatientQueue').insert([{
                QueueNumber: nextQueue,
                PatientID: patientId,
                Department: clinic,
                DoctorName: doctorName || null,
                Status: 'Waiting'
            }]);

            return { success: true, queueNumber: nextQueue, serviceDesc: serviceType, price };
        },
        async getDoctorQueue(dept, doctorName, role) {
            const today = new Date().toISOString().split('T')[0];
            let q = db.from('PatientQueue')
                .select('*, Patients(*)')
                .gte('ArrivedTime', today)
                .neq('Status', 'Done');

            if (dept) q = q.eq('Department', dept);
            if (doctorName && role !== 'Admin' && role !== 'Resident') {
                q = q.or(`DoctorName.eq.${doctorName},DoctorName.is.null,DoctorName.eq.''`);
            }

            const { data } = await q.order('QueueNumber', { ascending: true });
            return (data || []).map(item => ({
                queueId: item.QueueID,
                queueNumber: item.QueueNumber,
                patientId: item.PatientID,
                fullName: item.Patients?.FullName || 'مريض',
                department: item.Department,
                doctorName: item.DoctorName || '',
                status: item.Status,
                dilationType: item.DilationType || '',
                dilationEye: item.DilationEye || '',
                needPostRefraction: item.NeedPostRefraction || false
            }));
        },
        async finishVisit(dto) {
            await db.from('PatientQueue').update({ Status: 'Done' }).eq('QueueID', dto.queueId);
            
            const today = new Date().toISOString().split('T')[0];
            const fullDetails = ` | تشخيص: ${dto.diagnosis || ''} | فحص: ${dto.findings || ''} | نظارة: ${dto.glassesOd || ''} / ${dto.glassesOs || ''} | روشتة: ${dto.prescription || ''}`;
            
            const { data: appts } = await db.from('Appointments')
                .select('AppointmentID, Notes')
                .eq('PatientID', dto.patientId)
                .gte('AppointmentDate', today)
                .order('AppointmentDate', { ascending: false })
                .limit(1);

            if (appts && appts.length > 0) {
                await db.from('Appointments').update({
                    Status: 'Completed',
                    Notes: (appts[0].Notes || '') + fullDetails
                }).eq('AppointmentID', appts[0].AppointmentID);
            }
            return { success: true };
        },
        async requestDilation(queueId, dilationType, targetEye, needPostRefraction) {
            await db.from('PatientQueue').update({
                Status: 'Dilating',
                DilationType: dilationType,
                DilationEye: targetEye,
                NeedPostRefraction: needPostRefraction
            }).eq('QueueID', queueId);
            return { success: true };
        }
    },

    // ----------------------------------------------------
    // التسعير والخدمات (Services & Pricing)
    // ----------------------------------------------------
    services: {
        async getAll() {
            const { data } = await db.from('ClinicServices').select('*').eq('IsActive', true).order('ServiceName');
            return (data || []).map(s => ({
                id: s.ServiceID,
                category: s.Category,
                name: s.ServiceName,
                price: s.Price,
                priceSingle: s.PriceSingle || s.Price,
                priceBoth: s.PriceBoth || (s.Price * 2),
                followupPrice: s.FollowupPrice || 0,
                followupDays: s.FollowupDays || 14,
                eyeSide: s.EyeSide || 'عام'
            }));
        },
        async save(dto, editId = 0) {
            const payload = {
                Category: dto.category,
                ServiceName: dto.name,
                Price: dto.price,
                PriceSingle: dto.priceSingle || dto.price,
                PriceBoth: dto.priceBoth || (dto.price * 2),
                FollowupPrice: dto.followupPrice || 0,
                FollowupDays: dto.followupDays || 14,
                EyeSide: dto.eyeSide || 'عام'
            };
            if (editId > 0) {
                await db.from('ClinicServices').update(payload).eq('ServiceID', editId);
            } else {
                await db.from('ClinicServices').insert([payload]);
            }
            return { success: true };
        },
        async delete(id) {
            await db.from('ClinicServices').delete().eq('ServiceID', id);
            return { success: true };
        }
    },

    // ----------------------------------------------------
    // الأدوية والقطرات (Medications)
    // ----------------------------------------------------
    medications: {
        async getAll() {
            const { data } = await db.from('Medications').select('*').eq('IsActive', true).order('TradeName');
            return (data || []).map(m => ({
                id: m.MedicationID,
                name: m.TradeName,
                category: m.Category || '',
                defaultDose: m.DefaultDose || '',
                instructions: m.Instructions || ''
            }));
        },
        async save(dto, editId = 0) {
            const payload = {
                TradeName: dto.name,
                Category: dto.category,
                DefaultDose: dto.defaultDose,
                Instructions: dto.instructions
            };
            if (editId > 0) {
                await db.from('Medications').update(payload).eq('MedicationID', editId);
            } else {
                await db.from('Medications').insert([payload]);
            }
            return { success: true };
        },
        async delete(id) {
            await db.from('Medications').delete().eq('MedicationID', id);
            return { success: true };
        }
    },

    // ----------------------------------------------------
    // شركات التأمين (MasterInsurance)
    // ----------------------------------------------------
    insurance: {
        async getAll() {
            const { data } = await db.from('MasterInsurance').select('*').eq('IsActive', true).order('Id', { ascending: false });
            return (data || []).map(i => ({
                id: i.Id,
                nameAr: i.NameAr,
                nameEn: i.NameEn,
                defaultCopay: i.DefaultCopay,
                notes: i.Notes
            }));
        },
        async save(dto, editId = 0) {
            const payload = {
                NameAr: dto.nameAr,
                NameEn: dto.nameEn || dto.nameAr,
                DefaultCopay: dto.defaultCopay || '10%',
                Notes: dto.notes || ''
            };
            if (editId > 0) {
                await db.from('MasterInsurance').update(payload).eq('Id', editId);
            } else {
                await db.from('MasterInsurance').insert([payload]);
            }
            return { success: true };
        },
        async delete(id) {
            await db.from('MasterInsurance').delete().eq('Id', id);
            return { success: true };
        }
    },

    // ----------------------------------------------------
    // المستخدمين والأطباء (Users & Roles)
    // ----------------------------------------------------
    users: {
        async getAll() {
            const { data } = await db.from('Users').select('*, Roles(RoleName)').eq('IsActive', true).order('UserID', { ascending: false });
            return (data || []).map(u => ({
                id: u.UserID,
                username: u.Username,
                fullName: u.FullName,
                roleName: u.Roles?.RoleName || 'Consultant',
                doctorScope: u.DoctorScope || 'كشوفات وفحوصات',
                title: u.Notes || '',
                allowedScreens: u.AllowedScreens || 'all'
            }));
        },
        async getDoctors() {
            const { data } = await db.from('Users').select('*, Roles(RoleName)').eq('IsActive', true);
            return (data || [])
                .filter(u => ['doctor', 'consultant', 'resident', 'specialist'].includes((u.Roles?.RoleName || '').toLowerCase()))
                .map(d => ({ id: d.UserID, name: d.FullName, title: d.Notes || 'طبيب عيون' }));
        },
        async save(dto, editId = 0) {
            const { data: r } = await db.from('Roles').select('RoleID').eq('RoleName', dto.roleName).single();
            const payload = {
                Username: dto.username.trim(),
                FullName: dto.fullName.trim(),
                RoleID: r ? r.RoleID : 1,
                DoctorScope: dto.doctorScope || 'كشوفات وفحوصات',
                Notes: dto.title || '',
                AllowedScreens: dto.allowedScreens || 'all'
            };
            if (dto.password) payload.PasswordHash = dto.password.trim();

            if (editId > 0) {
                await db.from('Users').update(payload).eq('UserID', editId);
            } else {
                await db.from('Users').insert([payload]);
            }
            return { success: true };
        },
        async delete(id) {
            await db.from('Users').delete().eq('UserID', id);
            return { success: true };
        }
    }
};

// ========================================================
// محول تلقائي (Fetch Hook) لدعم كل استدعاءات الصفحات فوراً بسوبابيز
// ========================================================
const _nativeFetch = window.fetch;
window.fetch = async function(url, opts = {}) {
    if (typeof url !== 'string' || !url.startsWith('/api/')) {
        return _nativeFetch(url, opts);
    }
    const method = (opts.method || 'GET').toUpperCase();
    let body = {};
    if (opts.body) {
        try { body = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body; } catch {}
    }

    try {
        if (url === '/api/auth/login') return toRes(await api.auth.login(body.username, body.password));
        if (url === '/api/reception/next-code') return toRes({ nextCode: await api.patients.getNextCode() });
        if (url.startsWith('/api/reception/search?')) {
            const q = new URLSearchParams(url.split('?')[1]).get('q');
            return toRes(await api.patients.search(q));
        }
        if (url.startsWith('/api/reception/search-advanced')) {
            const p = new URLSearchParams(url.split('?')[1]);
            return toRes(await api.patients.searchAdvanced({ ar1: p.get('ar1'), mobile: p.get('mobile'), nationalId: p.get('nationalId'), from: p.get('from'), to: p.get('to') }));
        }
        if (url.startsWith('/api/reception/patient/')) {
            const id = parseInt(url.split('/').pop());
            const data = await api.patients.getById(id);
            return data ? toRes(data) : toRes({ message: 'غير موجود' }, 404);
        }
        if (url === '/api/reception/check-duplicate') return toRes(await api.patients.checkDuplicate(body.nationalId, body.mobile, body.currentPatientId));
        if (url === '/api/reception/patients') return toRes(await api.patients.save(body));
        if (url === '/api/reception/book-service') return toRes(await api.queue.bookTicket(body.patientId, body.clinic, body.serviceType, body.eyeSide, body.price, body.doctorName));
        if (url.startsWith('/api/doctor/queue')) {
            const p = new URLSearchParams(url.split('?')[1]);
            return toRes(await api.queue.getDoctorQueue(p.get('dept'), p.get('doctorName'), p.get('userRole')));
        }
        if (url === '/api/doctor/finish-visit') return toRes(await api.queue.finishVisit(body));
        if (url === '/api/doctor/request-dilation') return toRes(await api.queue.requestDilation(body.queueId, body.dilationType, body.targetEye, body.needPostRefraction));
        if (url === '/api/admin/services') {
            if (method === 'GET') return toRes(await api.services.getAll());
            if (method === 'POST') return toRes(await api.services.save(body));
        }
        if (url.startsWith('/api/admin/services/')) {
            const id = parseInt(url.split('/').pop());
            if (method === 'PUT') return toRes(await api.services.save(body, id));
            if (method === 'DELETE') return toRes(await api.services.delete(id));
        }
        if (url === '/api/admin/medications' || url === '/api/medications') {
            if (method === 'GET') return toRes(await api.medications.getAll());
            if (method === 'POST') return toRes(await api.medications.save(body));
        }
        if (url.startsWith('/api/admin/medications/')) {
            const id = parseInt(url.split('/').pop());
            if (method === 'DELETE') return toRes(await api.medications.delete(id));
        }
        if (url === '/api/admin/insurance') {
            if (method === 'GET') return toRes(await api.insurance.getAll());
            if (method === 'POST') return toRes(await api.insurance.save(body));
        }
        if (url.startsWith('/api/admin/insurance/')) {
            const id = parseInt(url.split('/').pop());
            if (method === 'PUT') return toRes(await api.insurance.save(body, id));
            if (method === 'DELETE') return toRes(await api.insurance.delete(id));
        }
        if (url === '/api/admin/users') {
            if (method === 'GET') return toRes(await api.users.getAll());
            if (method === 'POST') return toRes(await api.users.save(body));
        }
        if (url.startsWith('/api/admin/users/')) {
            const id = parseInt(url.split('/').pop());
            if (method === 'PUT') return toRes(await api.users.save(body, id));
            if (method === 'DELETE') return toRes(await api.users.delete(id));
        }
        if (url.startsWith('/api/admin/doctors')) return toRes(await api.users.getDoctors());
        if (url === '/api/admin/merge-patients') return toRes(await api.patients.merge(body.masterPatientId, body.duplicatePatientId, body.adminUser));
    } catch (e) {
        return toRes({ success: false, error: e.message }, 500);
    }
    return _nativeFetch(url, opts);
};

function toRes(data, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
}