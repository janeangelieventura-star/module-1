import Swal from 'sweetalert2';

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
