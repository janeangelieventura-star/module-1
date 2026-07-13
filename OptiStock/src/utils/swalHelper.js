import Swal from 'sweetalert2';

export function showLockoutAlert(remainingSeconds) {
  const endTime = Date.now() + remainingSeconds * 1000;
  Swal.fire({
    title: 'Account Locked',
    html: `<div class="flex flex-col items-center gap-3">
      <div class="w-16 h-16 rounded-full bg-[#FAD2CB]/40 flex items-center justify-center text-[#D96B5E]">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <p class="text-sm font-medium text-[#57534E]">Too many failed login attempts.</p>
      <div class="text-3xl font-black text-[#1A1A1A] font-mono tracking-wider" id="lockout-timer">${formatTime(remainingSeconds)}</div>
      <p class="text-xs text-[#A8A29E] font-bold uppercase tracking-wider">Wait before trying again</p>
    </div>`,
    icon: null,
    showConfirmButton: false,
    showCancelButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    customClass: {
      popup: 'rounded-3xl shadow-2xl !max-w-sm !px-8 !py-10',
      title: 'font-black text-2xl text-[#1A1A1A] !mb-4',
      htmlContainer: '!mt-0',
    },
    didOpen: () => {
      const timerEl = document.getElementById('lockout-timer');
      if (!timerEl) return;
      const interval = setInterval(() => {
        const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
        timerEl.textContent = formatTime(left);
        if (left <= 0) {
          clearInterval(interval);
          Swal.close();
        }
      }, 200);
    },
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function showSignoutConfirm(api, navigate) {
  Swal.fire({
    title: 'Sign Out?',
    text: 'You will need to log in again to access the dashboard.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sign Out',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#1A1A1A',
    cancelButtonColor: '#FAF7F2',
    reverseButtons: true,
    customClass: {
      popup: 'rounded-3xl shadow-2xl',
      confirmButton: 'font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl',
      cancelButton: 'font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl border border-[#E7E5E4] text-[#1A1A1A]',
      title: 'font-black text-2xl',
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      try { await api.logout(); } catch {}
      localStorage.removeItem('user');
      navigate('/');
    }
  });
}
