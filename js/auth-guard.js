// ========================================================
// حارس الأمان وتوزيع الصلاحيات (Auth Guard)
// ========================================================
(function () {
    const currentPath = window.location.pathname.toLowerCase();

    // استثناء صفحة تسجيل الدخول
    if (currentPath.endsWith('index.html') || currentPath.endsWith('/habashieyesystem2/') || currentPath === '/' || currentPath === '') {
        return;
    }

    const userId = sessionStorage.getItem('userId');
    const roleName = (sessionStorage.getItem('roleName') || '').toLowerCase();
    const allowedScreens = (sessionStorage.getItem('allowedScreens') || 'all').toLowerCase();

    // 1. لو مش مسجل دخول، اطرده لصفحة الدخول
    if (!userId) {
        alert("⚠️ يرجى تسجيل الدخول أولاً للوصول للنظام!");
        window.location.href = 'index.html';
        return;
    }

    // 2. فحص الصلاحية لكل شاشة
    if (allowedScreens !== 'all') {
        let isAuthorized = false;

        if (currentPath.includes('reception') && allowedScreens.includes('reception')) isAuthorized = true;
        else if (currentPath.includes('doctor') && allowedScreens.includes('doctor')) isAuthorized = true;
        else if (currentPath.includes('admin') && (allowedScreens.includes('admin') || roleName === 'admin')) isAuthorized = true;
        else if (currentPath.includes('callcenter') && allowedScreens.includes('callcenter')) isAuthorized = true;
        else if (currentPath.includes('dilation') && allowedScreens.includes('dilation')) isAuthorized = true;

        if (!isAuthorized) {
            alert("⛔ غير مصرح لك بدخول هذه الشاشة وفقاً لصلاحيات حسابك!");

            if (allowedScreens.includes('reception')) window.location.href = 'reception.html';
            else if (allowedScreens.includes('doctor')) window.location.href = 'doctor.html';
            else if (allowedScreens.includes('admin')) window.location.href = 'admin.html';
            else if (allowedScreens.includes('callcenter')) window.location.href = 'callcenter.html';
            else if (allowedScreens.includes('dilation')) window.location.href = 'dilation.html';
            else window.location.href = 'index.html';
        }
    }
})();