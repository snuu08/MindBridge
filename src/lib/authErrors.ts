export function authErrorMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.'

  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return '이메일 인증이 필요합니다. 받은 편지함의 링크를 확인해 주세요.'
  }
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return '이미 가입된 이메일입니다. 로그인해 주세요.'
  }
  if (code === 'same_password' || message.includes('different from the old password')) {
    return '지금 쓰는 비밀번호와 다른 비밀번호를 입력하세요.'
  }
  if (
    message.includes('password should be at least') ||
    message.includes('password is known to be weak') ||
    code === 'weak_password'
  ) {
    return '비밀번호는 6자 이상이어야 합니다.'
  }
  if (code === 'session_not_found' || message.includes('auth session missing')) {
    return '재설정 링크가 만료되었습니다. 비밀번호 찾기를 다시 해 주세요.'
  }
  if (message.includes('unable to validate email') || message.includes('invalid email')) {
    return '올바른 이메일 주소를 입력하세요.'
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'
  }
  if (message.includes('signup is disabled')) {
    return '지금은 회원가입을 받을 수 없습니다.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.'
}
