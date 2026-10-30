import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../../../hooks/useAuth';
import { getDefaultRouteForRole } from '../../../utils/permissions';

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="login-card">
      <section className="login-form-panel">
        <div className="login-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div className="login-brand-mark" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-rose, #B75D69)', color: '#FFFFFF', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <ShieldCheck size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink, #1A1423)', lineHeight: 1.2 }}>Enterprise IT Helpdesk</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-on-light-muted, #71717A)', marginTop: '2px' }}>Support service portal</span>
          </div>
        </div>
        {isAuthenticated && user && (
          <div className="signed-in-banner"><span>Signed in as <strong>{user.name}</strong></span><button onClick={() => navigate(getDefaultRouteForRole(user.role))}>Continue <ArrowRight size={14} /></button></div>
        )}
        <div className="login-intro"><p className="eyebrow">Welcome back</p><h1>Sign in to continue</h1><p>Report an issue, follow its progress, or manage IT support work.</p></div>
        <LoginForm />
        <p className="login-footer">Need help signing in? Contact your IT service desk.</p>
      </section>
      <aside className="login-visual-panel">
        <div className="visual-orb orb-one" /><div className="visual-orb orb-two" />
        <div className="visual-content"><p className="eyebrow">Enterprise support, connected</p><h2>Every request gets the attention it needs.</h2><p>Clear updates for requesters. Confident prioritisation for the teams who keep operations running.</p></div>
        <div className="visual-steps">{['Tell us what happened', 'We route it to the right team', 'Track the work through resolution'].map((item, index) => <div key={item}><span>0{index + 1}</span><p>{item}</p><CheckCircle2 size={17} /></div>)}</div>
      </aside>
    </div>
  );
};
