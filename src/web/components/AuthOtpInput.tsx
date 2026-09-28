import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';

const OTP_LENGTH = 6;
const CELL_WIDTH = 36;
const CELL_GAP = 7;
const CELL_HEIGHT = 44;

export type OtpVerificationState = 'typing' | 'checking' | 'accepted' | 'rejected';

interface AuthOtpInputProps {
  id: string;
  value: string;
  onChange(value: string): void;
  ariaLabel: string;
  describedBy?: string | undefined;
  invalid?: boolean;
  verificationState?: OtpVerificationState;
  locale?: 'vi' | 'en';
  onRejectedAnimationComplete?(): void;
}

/** Six visual slots backed by one native input for paste and browser OTP autofill. */
export function AuthOtpInput({
  id,
  value,
  onChange,
  ariaLabel,
  describedBy,
  invalid = false,
  verificationState = 'typing',
  locale = 'vi',
  onRejectedAnimationComplete,
}: AuthOtpInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(380);
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rejectedCompleteRef = useRef(onRejectedAnimationComplete);
  const filterId = `auth-otp-goo-${useId().replace(/:/g, '')}`;
  rejectedCompleteRef.current = onRejectedAnimationComplete;

  const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
  const rowWidth = OTP_LENGTH * CELL_WIDTH + (OTP_LENGTH - 1) * CELL_GAP;
  const scale = Math.min(1, availableWidth / rowWidth);
  const centerX = (rowWidth - CELL_WIDTH) / 2;
  const isAccepted = verificationState === 'accepted';
  const isBusy = verificationState === 'checking' || isAccepted || verificationState === 'rejected';

  useEffect(() => {
    if (verificationState !== 'rejected') return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const timer = window.setTimeout(() => rejectedCompleteRef.current?.(), prefersReducedMotion ? 0 : 760);
    return () => window.clearTimeout(timer);
  }, [verificationState]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateWidth = () => setAvailableWidth(stage.clientWidth);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="auth-otp" data-phase={verificationState} data-focused={isFocused} data-invalid={invalid}>
      <div className="auth-otp-row" style={{ width: rowWidth, height: CELL_HEIGHT, transform: `scale(${scale})` }}>
        <div className="auth-otp-goo" aria-hidden="true" style={{ filter: `url(#${filterId})` }}>
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const homeX = index * (CELL_WIDTH + CELL_GAP);
            const targetX = isAccepted ? centerX : homeX;
            return (
              <span
                className="auth-otp-cell"
                key={index}
                style={{
                  width: CELL_WIDTH,
                  height: CELL_HEIGHT,
                  borderRadius: isAccepted ? CELL_HEIGHT / 2 : 11,
                  transform: `translateX(${targetX}px)`,
                }}
              />
            );
          })}
          <span className="auth-otp-capsule" />
        </div>

        {Array.from({ length: OTP_LENGTH }, (_, index) => {
          const homeX = index * (CELL_WIDTH + CELL_GAP);
          const targetX = isAccepted ? centerX : homeX;
          return (
            <span
              className="auth-otp-slot"
              data-active={isFocused && digits.length === index && verificationState === 'typing'}
              key={index}
              aria-hidden="true"
              style={{
                width: CELL_WIDTH,
                height: CELL_HEIGHT,
                transform: `translateX(${targetX}px)`,
                opacity: isAccepted ? 0 : 1,
                ['--otp-index' as string]: index,
              }}
            >
              {digits[index] && <span className="auth-otp-digit" key={`${index}-${digits[index]}`}>{digits[index]}</span>}
            </span>
          );
        })}

        <span className="auth-otp-result" aria-hidden="true">
          <Check size={16} strokeWidth={2.6} />
          <span>{locale === 'vi' ? 'Đã xác minh' : 'Verified'}</span>
        </span>

        <input
          ref={inputRef}
          id={id}
          className="auth-otp-field"
          type="text"
          value={value}
          onChange={event => onChange(event.currentTarget.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={ariaLabel}
          aria-invalid={invalid || verificationState === 'rejected' || undefined}
          aria-describedby={describedBy}
          aria-busy={verificationState === 'checking' || undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoCapitalize="off"
          spellCheck={false}
          pattern="[0-9]{6}"
          maxLength={OTP_LENGTH}
          required
          disabled={isBusy}
        />

        <span className="auth-otp-live-status" role="status" aria-live="polite">
          {verificationState === 'checking' && (locale === 'vi' ? 'Đang xác minh mã.' : 'Verifying code.')}
          {verificationState === 'accepted' && (locale === 'vi' ? 'Mã xác minh hợp lệ.' : 'Verification code accepted.')}
          {verificationState === 'rejected' && (locale === 'vi' ? 'Mã không hợp lệ, hãy thử lại.' : 'Code was not accepted. Please try again.')}
        </span>
      </div>

      <svg className="auth-otp-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="smear" />
            <feColorMatrix in="smear" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
