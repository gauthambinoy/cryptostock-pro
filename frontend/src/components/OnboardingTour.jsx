import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, X, Rocket, LayoutDashboard, Plus, TrendingUp, Bell, PartyPopper } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CryptoStock Pro!',
    description: 'Your all-in-one platform for tracking crypto and stock investments. Let us show you around.',
    target: null,
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Get a quick overview of your portfolio performance, market trends, and recent activity all in one place.',
    target: '[href="/dashboard"]',
    icon: LayoutDashboard,
    position: 'right',
  },
  {
    id: 'portfolio',
    title: 'Add Your First Investment',
    description: 'Head to the Portfolio section to add your crypto and stock holdings. Track everything in real time.',
    target: '[href="/portfolio"]',
    icon: Plus,
    position: 'right',
  },
  {
    id: 'markets',
    title: 'Track Market Trends',
    description: 'Explore live market data, discover top gainers, and stay ahead of the market with real-time quotes.',
    target: '[href="/markets"]',
    icon: TrendingUp,
    position: 'right',
  },
  {
    id: 'alerts',
    title: 'Set Price Alerts',
    description: 'Never miss a price movement. Create custom alerts to get notified when assets hit your target prices.',
    target: '[href="/alerts"]',
    icon: Bell,
    position: 'right',
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'Start building your portfolio and tracking your investments like a pro. Happy investing!',
    target: null,
    icon: PartyPopper,
    position: 'center',
  },
];

const OnboardingTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});
  const [confettiPieces, setConfettiPieces] = useState([]);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const step = STEPS[currentStep];

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!step) return;

    if (step.position === 'center' || !step.target) {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      setArrowStyle({ display: 'none' });
      setHighlightStyle({ display: 'none' });
      return;
    }

    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      setArrowStyle({ display: 'none' });
      setHighlightStyle({ display: 'none' });
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 8;

    setHighlightStyle({
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '12px',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
      border: '2px solid rgba(99, 102, 241, 0.6)',
      zIndex: 9998,
      pointerEvents: 'none',
      transition: 'all 0.3s ease',
    });

    // Position to the right of the target
    const tooltipLeft = rect.right + 20;
    const tooltipTop = rect.top + rect.height / 2;

    setTooltipStyle({
      position: 'fixed',
      top: tooltipTop,
      left: tooltipLeft,
      transform: 'translateY(-50%)',
    });

    setArrowStyle({
      position: 'absolute',
      top: '50%',
      left: '-8px',
      transform: 'translateY(-50%) rotate(45deg)',
      width: '16px',
      height: '16px',
      background: 'rgba(30, 30, 46, 0.95)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    });
  }, [step]);

  useEffect(() => {
    if (isActive) {
      positionTooltip();
      window.addEventListener('resize', positionTooltip);
      return () => window.removeEventListener('resize', positionTooltip);
    }
  }, [isActive, currentStep, positionTooltip]);

  // Generate confetti on last step
  useEffect(() => {
    if (currentStep === STEPS.length - 1) {
      const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        size: 6 + Math.random() * 8,
      }));
      setConfettiPieces(pieces);
    } else {
      setConfettiPieces([]);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsActive(false);
  };

  if (!isActive) return null;

  const StepIcon = step.icon;
  const isCenter = step.position === 'center';
  const isLastStep = currentStep === STEPS.length - 1;

  const overlay = (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay - only show when not highlighting a target */}
      {isCenter && (
        <div className="absolute inset-0 bg-black/75 transition-opacity duration-300" />
      )}

      {/* Highlight cutout for targeted steps */}
      {!isCenter && <div style={highlightStyle} />}

      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute pointer-events-none"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: piece.size > 10 ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
          }}
        />
      ))}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className={`z-[9999] ${isCenter ? 'w-full max-w-md mx-4' : 'w-80'}`}
      >
        {/* Arrow for non-center tooltips */}
        {!isCenter && <div style={arrowStyle} />}

        <div className={`glass-card p-6 animate-fade-in relative ${isCenter ? 'text-center' : ''}`}>
          {/* Step icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            isLastStep
              ? 'bg-gradient-to-br from-success-500/30 to-primary-500/30'
              : 'bg-primary-500/20'
          } ${isCenter ? 'mx-auto' : ''}`}>
            <StepIcon className={`w-7 h-7 ${isLastStep ? 'text-success-400' : 'text-primary-400'}`} />
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">{step.description}</p>

          {/* Step counter and buttons */}
          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-6 bg-primary-400'
                      : idx < currentStep
                        ? 'w-1.5 bg-primary-400/50'
                        : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-2">
                {currentStep + 1}/{STEPS.length}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleNext}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <Rocket className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti keyframes */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default OnboardingTour;
