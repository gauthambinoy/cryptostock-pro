import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../styles/Billing.module.css';

const Billing = () => {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBillingData();
    if (location.state?.selectedPlan) {
      setSelectedPlan(location.state.selectedPlan);
      setShowUpgradeModal(true);
    }
  }, [location.state]);

  const fetchBillingData = async () => {
    try {
      const [subRes, usageRes, paymentsRes] = await Promise.all([
        fetch('http://localhost:8000/api/subscriptions/current', {
          credentials: 'include'
        }),
        fetch('http://localhost:8000/api/subscriptions/usage', {
          credentials: 'include'
        }),
        fetch('http://localhost:8000/api/subscriptions/payments', {
          credentials: 'include'
        })
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData.usage);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subscriptions/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (response.ok) {
        setShowCancelModal(false);
        fetchBillingData();
      } else {
        alert('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Error canceling subscription');
    }
  };

  const handleUpgrade = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subscriptions/upgrade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_plan: selectedPlan,
          is_annual: isAnnual
        })
      });

      if (response.ok) {
        setShowUpgradeModal(false);
        fetchBillingData();
      } else {
        alert('Failed to upgrade plan');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Error upgrading plan');
    }
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? `$${price.toFixed(2)}` : 'Free';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className={styles.loading}>Loading billing information...</div>;
  }

  return (
    <div className={styles.billingContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>Billing & Subscription</h1>
        <p>Manage your subscription and billing information</p>
      </div>

      {/* Current Plan Section */}
      {subscription && (
        <div className={styles.currentPlanSection}>
          <div className={styles.planCard}>
            <div className={styles.planInfo}>
              <h2>Current Plan</h2>
              <div className={styles.planDetails}>
                <div className={styles.planName}>
                  {subscription.plan.charAt(0).toUpperCase() +
                    subscription.plan.slice(1)}{' '}
                  Plan
                </div>
                <div className={styles.planStatus}>
                  Status: <span className={styles.active}>{subscription.status}</span>
                </div>
                {subscription.current_period_end && (
                  <div className={styles.renewalDate}>
                    Renews on: {formatDate(subscription.current_period_end)}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              {subscription.plan !== 'enterprise' && (
                <button
                  className={styles.upgradeButton}
                  onClick={() => {
                    setSelectedPlan(
                      subscription.plan === 'free' ? 'pro' : 'enterprise'
                    );
                    setShowUpgradeModal(true);
                  }}
                >
                  {subscription.plan === 'free' ? 'Upgrade Now' : 'Upgrade to Enterprise'}
                </button>
              )}
              {subscription.plan !== 'free' && (
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage Metrics Section */}
      {usage && (
        <div className={styles.usageSection}>
          <h2>Usage This Month</h2>
          <div className={styles.metricsGrid}>
            {/* Alerts */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <h3>Daily Alerts</h3>
              </div>
              <div className={styles.metricContent}>
                <div className={styles.metricValue}>
                  {usage.alerts.sent}/{usage.alerts.limit}
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progress}
                    style={{ width: `${usage.alerts.percent_used}%` }}
                  ></div>
                </div>
                <div className={styles.metricPercent}>
                  {usage.alerts.percent_used}% used
                </div>
              </div>
            </div>

            {/* Predictions */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <h3>Predictions</h3>
              </div>
              <div className={styles.metricContent}>
                <div className={styles.metricValue}>
                  {usage.predictions.made}
                  {usage.predictions.limit && `/${usage.predictions.limit}`}
                </div>
                {usage.predictions.limit && (
                  <>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progress}
                        style={{ width: `${usage.predictions.percent_used}%` }}
                      ></div>
                    </div>
                    <div className={styles.metricPercent}>
                      {usage.predictions.percent_used}% used
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Watchlists */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <h3>Watchlists</h3>
              </div>
              <div className={styles.metricContent}>
                <div className={styles.metricValue}>
                  {usage.watchlists.created}/{usage.watchlists.limit}
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progress}
                    style={{ width: `${usage.watchlists.percent_used}%` }}
                  ></div>
                </div>
                <div className={styles.metricPercent}>
                  {usage.watchlists.percent_used}% used
                </div>
              </div>
            </div>

            {/* Backtests */}
            {usage.features.backtesting && (
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Backtests</h3>
                </div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValue}>
                    {usage.backtests.run}
                    {usage.backtests.limit && `/${usage.backtests.limit}`}
                  </div>
                  {usage.backtests.limit && (
                    <>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progress}
                          style={{ width: `${usage.backtests.percent_used}%` }}
                        ></div>
                      </div>
                      <div className={styles.metricPercent}>
                        {usage.backtests.percent_used}% used
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* API Calls */}
            {usage.features.api_access && (
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>API Calls</h3>
                </div>
                <div className={styles.metricContent}>
                  <div className={styles.metricValue}>
                    {usage.api_calls.made}
                    {usage.api_calls.limit && `/${usage.api_calls.limit}`}
                  </div>
                  {usage.api_calls.limit && (
                    <>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progress}
                          style={{ width: `${usage.api_calls.percent_used}%` }}
                        ></div>
                      </div>
                      <div className={styles.metricPercent}>
                        {usage.api_calls.percent_used}% used
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment History Section */}
      <div className={styles.paymentHistorySection}>
        <h2>Payment History</h2>
        {payments.length > 0 ? (
          <div className={styles.paymentTable}>
            <div className={styles.tableHeader}>
              <div className={styles.dateCol}>Date</div>
              <div className={styles.descCol}>Description</div>
              <div className={styles.amountCol}>Amount</div>
              <div className={styles.statusCol}>Status</div>
              <div className={styles.actionCol}>Action</div>
            </div>
            {payments.map((payment) => (
              <div key={payment.id} className={styles.tableRow}>
                <div className={styles.dateCol}>
                  {formatDate(payment.created_at)}
                </div>
                <div className={styles.descCol}>
                  {payment.description || 'Subscription'}
                </div>
                <div className={styles.amountCol}>
                  {formatPrice(payment.amount / 100)}
                </div>
                <div className={styles.statusCol}>
                  <span className={`${styles.badge} ${styles[payment.status]}`}>
                    {payment.status}
                  </span>
                </div>
                <div className={styles.actionCol}>
                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View Invoice
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No payments yet. Start your subscription to see payment history.</p>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Cancel Subscription?</h2>
            <p>Are you sure you want to cancel your subscription?</p>
            <p className={styles.warning}>
              You'll lose access to premium features at the end of your billing period.
            </p>

            <div className={styles.reasonInput}>
              <label>Why are you canceling? (Optional)</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                <option value="too_expensive">Too expensive</option>
                <option value="not_using">Not using features</option>
                <option value="switching">Switching to competitor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowCancelModal(false)}
              >
                Keep Subscription
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleCancel}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Subscription Modal */}
      {showUpgradeModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>
              Upgrade to{' '}
              {selectedPlan
                ? selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)
                : 'Premium'}
            </h2>
            <p>Choose your billing cycle:</p>

            <div className={styles.billingOptions}>
              <label className={styles.option}>
                <input
                  type="radio"
                  checked={!isAnnual}
                  onChange={() => setIsAnnual(false)}
                />
                <span>
                  Monthly
                  {selectedPlan === 'pro' && ' ($9.99/month)'}
                  {selectedPlan === 'enterprise' && ' ($99.99/month)'}
                </span>
              </label>
              <label className={styles.option}>
                <input
                  type="radio"
                  checked={isAnnual}
                  onChange={() => setIsAnnual(true)}
                />
                <span>
                  Annual (20% discount)
                  {selectedPlan === 'pro' && ' ($95.99/year)'}
                  {selectedPlan === 'enterprise' && ' ($959.99/year)'}
                </span>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlan(null);
                }}
              >
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleUpgrade}
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
