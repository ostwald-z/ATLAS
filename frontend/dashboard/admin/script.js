/*(async function checkAuth() {
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}api/user/apicheck`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) {
      // Token inválido ou não existe -> redireciona
      window.location.href = '../../painelDeLogin/login/index.html';
      return;
    }

    const data = await res.json();
    console.log('Usuário autenticado:', data.user);

  } catch (err) {
    console.error('Erro na verificação de token:', err);
    window.location.href = '../../painelDeLogin/login/index.html';
  }
})();


*/