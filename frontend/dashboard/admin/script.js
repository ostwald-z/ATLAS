// (function protectPage() {
//   const token = localStorage.getItem('token');

//   if (!token) {
//     window.location.href = '../../painelDeLogin/login/index.html';
//     return;
//   }

//   const payload = JSON.parse(atob(token.split('.')[1]));
//   const now = Math.floor(Date.now() / 1000);

//   if (payload.exp < now) {
//     localStorage.removeItem('token');
//     window.location.href = '../../painelDeLogin/login/index.html';
//     return;
//   }

//   if (payload.role !== 'ADMIN') {
//     window.location.href = '/403.html';
//     return;
//   }
// })();


