import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CaptureSessionService } from './capture-session.service';

export const captureSessionGuard: CanActivateFn = () => {
  const session = inject(CaptureSessionService);
  const router = inject(Router);

  if (session.hasActiveSession()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
