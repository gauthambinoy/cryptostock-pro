import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Pricing.module.css';

const Pricing = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    getCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subscriptions/plans');
      const data = await response.json();
      setPlans(data.plans || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setLoading(false);
    }
  };

  const getCurrentPlan = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subscriptions/current', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.subscription.plan);
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  const handleSubscribe = (plan) => {
    if (plan === 'free') {
      navigate('/billing');
    } else {
      // Navigate to checkout with plan info
      navigate('/billing', { state: { selectedPlan: plan, isAnnual } });
    }
  };

  const formatPrice = (cents) => {
    return (cents / 100).toFixed(2);
  };

  if (loading) {
    return <div className={styles.loading}>Loading pricing plans...</div>;
  }

  return (
    <div className={styles.pricingContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Simple, Transparent Pricing</h1>
        <p>Choose the perfect plan for your investment needs</p>
      </div>

      {/* Billing Toggle */}
      <div className={styles.billingToggle}>
        <span className={!isAnnual ? styles.active : ''}>Monthly</span>
        <button
          className={styles.toggleButton}
          onClick={() => setIsAnnual(!isAnnual)}
        >
          <div className={styles.toggleSwitch}></div>
        </button>
        <span className={isAnnual ? styles.active : ''}>
          Annual
          <span className={styles.savings}>Save 20%</span>
        </span>
      </div>

      {/* Pricing Cards */}
      <div className={styles.cardsContainer}>
        {plans.map((plan, index) => {
          const price = isAnnual
            ? formatPrice(plan.annual_price_cents)
            : formatPrice(plan.monthly_price_cents);
          const isCurrentPlan = currentPlan === plan.plan;

          return (
            <div
              key={index}
              className={`${styles.card} ${
                plan.plan === 'enterprise' ? styles.featured : ''
              } ${isCurrentPlan ? styles.current : ''}`}
            >
              {plan.plan === 'enterprise' && (
                <div className={styles.badge}>Most Popular</div>
              )}
              {isCurrentPlan && (
                <div className={styles.currentBadge}>Current Plan</div>
              )}

              <div className={styles.planHeader}>
                <h2>{plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)}</h2>
                {plan.monthly_price_cents === 0 ? (
                  <p className={styles.price}>Free</p>
                ) : (
                  <div className={styles.priceSection}>
                    <span className={styles.price}>${price}</span>
                    <span className={styles.period}>
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                )}
              </div>

              {/* Features List */}
              <ul className={styles.featuresList}>
                <li>
                  <span className={styles.icon}>✓</span>
                  <span>
                    {plan.features.watchlists
                      ? plan.features.watchlists === null
                        ? 'Unlimited'
                        : plan.features.watchlists
                      : 5}{' '}
                    Watchlists
                  </span>
                </li>
                <li>
                  <span className={styles.icon}>✓</span>
                  <span>
                    {plan.features.alerts_per_day === null
                      ? 'Unlimited'
                      : plan.features.alerts_per_day}{' '}
                    Alerts/Day
                  </span>
                </li>
                <li>
                  <span className={styles.icon}>✓</span>
                  <span>{plan.features.prediction_days}-Day Predictions</span>
                </li>
                <li className={plan.features.sms_alerts ? '' : styles.disabled}>
                  <span className={styles.icon}>
                    {plan.features.sms_alerts ? '✓' : '✗'}
                  </span>
                  <span>SMS Alerts</span>
                </li>
                <li className={plan.features.backtesting ? '' : styles.disabled}>
                  <span className={styles.icon}>
                    {plan.features.backtesting ? '✓' : '✗'}
                  </span>
                  <span>Backtesting</span>
                </li>
                <li className={plan.features.api_access ? '' : styles.disabled}>
                  <span className={styles.icon}>
                    {plan.features.api_access ? '✓' : '✗'}
                  </span>
                  <span>API Access</span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                className={`${styles.button} ${
                  isCurrentPlan ? styles.current : ''
                }`}
                onClick={() => handleSubscribe(plan.plan)}
              >
                {isCurrentPlan ? 'Current Plan' : 'Get Started'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className={styles.comparisonSection}>
        <h2>Feature Comparison</h2>
        <div className={styles.comparisonTable}>
          <div className={styles.tableHeader}>
            <div className={styles.featureName}>Feature</div>
            <div className={styles.planCell}>Free</div>
            <div className={styles.planCell}>Pro</div>
            <div className={styles.planCell}>Enterprise</div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>Watchlists</div>
            <div className={styles.planCell}>5</div>
            <div className={styles.planCell}>Unlimited</div>
            <div className={styles.planCell}>Unlimited</div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>Daily Alerts</div>
            <div className={styles.planCell}>10</div>
            <div className={styles.planCell}>100</div>
            <div className={styles.planCell}>Unlimited</div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>Prediction Horizon</div>
            <div className={styles.planCell}>7 days</div>
            <div className={styles.planCell}>30 days</div>
            <div className={styles.planCell}>30 days</div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>SMS Notifications</div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>Backtesting</div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>REST API</div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>Email Support</div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
          </div>

          <div className={styles.tableRow}>
            <div className={styles.featureName}>Priority Support</div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.no}>No</span>
            </div>
            <div className={styles.planCell}>
              <span className={styles.yes}>Yes</span>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3>Can I change plans anytime?</h3>
            <p>
              Yes! You can upgrade or downgrade your plan at any time. Changes
              take effect immediately.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Is there a free trial?</h3>
            <p>
              Yes, our Free plan gives you access to core features indefinitely.
              Upgrade to Pro or Enterprise anytime to unlock advanced features.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What payment methods do you accept?</h3>
            <p>
              We accept all major credit and debit cards through our secure Stripe
              payment processor.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Can I get a refund?</h3>
            <p>
              Subscriptions are non-refundable, but you can cancel anytime and your
              plan will remain active until the end of your billing period.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>Do you offer annual discounts?</h3>
            <p>
              Yes! Annual plans save you 20% compared to monthly billing. That's
              equivalent to 2.4 months free per year.
            </p>
          </div>

          <div className={styles.faqItem}>
            <h3>What about team or organization plans?</h3>
            <p>
              Enterprise customers can contact our sales team for custom pricing
              and features tailored to your organization.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className={styles.ctaSection}>
        <h2>Ready to get started?</h2>
        <p>Start with Free and upgrade anytime, or go straight to Pro/Enterprise</p>
        <div className={styles.ctaButtons}>
          <button
            className={styles.primaryButton}
            onClick={() => handleSubscribe('pro')}
          >
            Start with Pro
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
