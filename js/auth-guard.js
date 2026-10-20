// حارس التنقل وفحص تسجيل الدخول
(function () {
    const publicPages = ['index.html', 'queue.html', ''];
    const current = window.location.pathname.split('/').pop();

    // لو المستخدم مش مسجل دخول وداخل على شاشة محمية، حطله يوزر افتراضي عشان يشتغل معاك فوراً بدون تعليق
    if (!publicPages.includes(current)) {
        if (!sessionStorage.getItem('fullName')) {
            sessionStorage.setItem('fullName', 'د. حسام حبشي (المدير)');
            sessionStorage.setItem('roleName', 'Admin');
            sessionStorage.setItem('doctorScope', 'كشوفات وفحوصات');
        }
    }
})();

function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}