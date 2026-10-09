import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingFeatures from '../components/landing/LandingFeatures';
import LandingWorkflow from '../components/landing/LandingWorkflow';
import LandingPricing from '../components/landing/LandingPricing';
import LandingFaq from '../components/landing/LandingFaq';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAuthClick = useCallback((mode = 'login') => {
    navigate(`/login?mode=${mode}`);
  }, [navigate]);

  const handlePricingClick = useCallback(() => {
    const el = document.getElementById('pricing');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main, #07090e)',
      color: 'var(--text-main, #f8fafc)',
      overflowX: 'hidden'
    }}>
      <LandingNavbar user={user} onAuthClick={handleAuthClick} />
      <LandingHero onAuthClick={handleAuthClick} onPricingClick={handlePricingClick} />
      <LandingFeatures />
      <LandingWorkflow onAuthClick={handleAuthClick} />
      <LandingPricing onAuthClick={handleAuthClick} />
      <LandingFaq />
      <LandingFooter />
    </div>
  );
}
