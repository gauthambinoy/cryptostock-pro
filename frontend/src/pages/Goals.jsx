import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Target, Plus, Edit3, Trash2, CheckCircle } from 'lucide-react';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const openAddModal = () => {
    setEditingGoal(null);
    setFormData({ name: '', target_amount: '', current_amount: '', deadline: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    const payload = {
      name: formData.name,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      deadline: formData.deadline || null,
    };
    try {
      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, payload);
      } else {
        await api.post('/goals', payload);
      }
      setShowModal(false);
      fetchGoals();
    } catch (error) {
      setFormError(error.response?.data?.detail || 'Failed to save goal');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const getProgress = (goal) => {
    if (!goal.target_amount || goal.target_amount === 0) return 0;
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  const isCompleted = (goal) => getProgress(goal) >= 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-400" />
            Financial Goals
          </h1>
          <p className="text-gray-400">Track your investment milestones</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && goals.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">
            No goals set yet
          </h2>
          <p className="text-gray-500 mb-6">
            Define financial targets to stay on track.
          </p>
          <button
            onClick={openAddModal}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Goals Grid */}
      {!isLoading && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            const completed = isCompleted(goal);

            return (
              <div
                key={goal.id}
                className={`glass-card p-5 animate-slide-in transition-shadow ${
                  completed ? 'shadow-lg shadow-success-500/20' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {completed ? (
                      <CheckCircle className="w-5 h-5 text-success-400" />
                    ) : (
                      <Target className="w-5 h-5 text-primary-400" />
                    )}
                    <h3 className="text-lg font-bold text-white">{goal.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 rounded-lg hover:bg-primary-500/20 text-gray-500 hover:text-primary-400 transition-colors"
                      title="Edit goal"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-500/20 text-gray-500 hover:text-danger-400 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    {formatCurrency(goal.current_amount)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatCurrency(goal.target_amount)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 rounded-full bg-dark-300 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, var(--color-primary-500, #0ea5e9), var(--color-success-500, #22c55e))',
                    }}
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm">
                  <span className={completed ? 'text-success-400 font-medium' : 'text-gray-400'}>
                    {progress.toFixed(1)}% complete
                  </span>
                  {goal.deadline && (
                    <span className="text-gray-500">
                      Due {formatDate(goal.deadline)}
                    </span>
                  )}
                </div>

                {/* Completed badge */}
                {completed && (
                  <div className="mt-3 flex items-center gap-1.5 text-success-400 text-sm font-medium animate-fade-in">
                    <CheckCircle className="w-4 h-4" />
                    Goal achieved!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">
              {editingGoal ? 'Edit Goal' : 'Add New Goal'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Goal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Retirement Fund"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="100000"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="25000"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              {formError && (
                <p className="text-danger-400 text-sm">{formError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : editingGoal ? (
                    <Edit3 className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingGoal ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
