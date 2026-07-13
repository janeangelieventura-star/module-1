from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status

from .models import LoginAttempt, User


class AccountLockMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self._check_account_locked(request)
        if response:
            return response
        return self.get_response(request)

    def _check_account_locked(self, request):
        path = request.path
        if path.startswith('/api/login/') or path.startswith('/api/logout/'):
            return None

        user_id = request.session.get('user_id')
        if not user_id:
            return None

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

        try:
            attempt = LoginAttempt.objects.get(email__iexact=user.email)
        except LoginAttempt.DoesNotExist:
            return None

        now = timezone.now()
        if attempt.locked_until and attempt.locked_until > now:
            remaining = int((attempt.locked_until - now).total_seconds())
            return JsonResponse({
                'error': 'Account locked due to too many failed login attempts.',
                'account_locked': True,
                'remaining_seconds': remaining,
                'locked_until': attempt.locked_until.isoformat(),
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        return None
