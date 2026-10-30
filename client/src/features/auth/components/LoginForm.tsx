import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../types/auth';
import { getDefaultRouteForRole } from '../../../utils/permissions';
import { Button } from '../../../components/ui/Button';

const roles: { value: UserRole; label: string; email: string }[] = [
  { value: 'complainant', label: 'Complainant', email: 'arivera@helpdesk.corp' },
  { value: 'technician', label: 'Technician', email: 'mchen@helpdesk.corp' },
  { value: 'admin', label: 'Administrator', email: 'admin@helpdesk.corp' },
];

export const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth(); const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('complainant'); const [email, setEmail] = useState(roles[0].email);
  const [password, setPassword] = useState('password123'); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState<string | null>(null);
  const changeRole = (nextRole: UserRole) => { setRole(nextRole); setEmail(roles.find((item) => item.value === nextRole)?.email ?? ''); setError(null); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(null); if (!email.trim() || !password) { setError('Enter your registered email and password.'); return; } try { const user = await login({ email, password, role }); navigate(getDefaultRouteForRole(user.role), { replace: true }); } catch { setError('We could not sign you in. Check your details and try again.'); } };
  return (
    <form className="login-form" onSubmit={submit}>
      <fieldset className="role-selector" style={{ border: 'none', padding: 0, margin: '0 0 20px 0' }}>
        <legend style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-on-light, #1A1423)', marginBottom: '8px', display: 'block' }}>
          Sign in as
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', padding: '4px', background: 'var(--surface-muted, #F4F1F4)', borderRadius: '10px', border: '1px solid var(--border-subtle, #E5DFE7)' }}>
          {roles.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeRole(item.value)}
              className={role === item.value ? 'selected' : ''}
              style={{
                padding: '8px 6px',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                background: role === item.value ? '#FFFFFF' : 'transparent',
                color: role === item.value ? 'var(--color-plum, #372549)' : 'var(--text-on-light-muted, #71717A)',
                boxShadow: role === item.value ? '0 1px 4px rgba(55,37,73,0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-group" style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-on-light, #1A1423)' }}>
          Work email
        </span>
        <input
          className="form-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@helpdesk.corp"
          autoComplete="email"
          required
          style={{ width: '100%', height: '42px' }}
        />
      </div>

      <div className="form-group password-field" style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-on-light, #1A1423)' }}>
          Password
        </span>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          <input
            className="form-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            style={{ width: '100%', paddingRight: '42px', height: '42px' }}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-on-light-muted, #71717A)',
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && <div className="login-error"><ShieldAlert size={16} />{error}</div>}
      <Button type="submit" variant="primary" isLoading={isLoading} className="login-submit" style={{ width: '100%', height: '44px', marginTop: '6px' }}>
        Sign in <ArrowRight size={17} />
      </Button>
    </form>
  );
};
