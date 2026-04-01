"""
Leaderboard service for calculating user rankings and statistics
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
import json
from .. import models


class LeaderboardService:
    """Service for managing leaderboard calculations and rankings"""

    def __init__(self, db: Session):
        self.db = db

    def calculate_user_accuracy(self, user_id: int, days: int = 30) -> float:
        """
        Calculate user's prediction accuracy over specified days.
        Returns accuracy as a percentage (0-100).
        """
        # Query predictions from the past N days
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # For now, we'll return 0 as predictions aren't yet stored
        # When prediction tracking is implemented, calculate from database
        user_stats = self.db.query(models.UserStats).filter(
            models.UserStats.user_id == user_id
        ).first()

        if not user_stats:
            return 0.0

        if user_stats.total_predictions == 0:
            return 0.0

        return round(
            (user_stats.correct_predictions / user_stats.total_predictions) * 100, 2
        )

    def get_leaderboard(
        self, period: str = "monthly", limit: int = 100, offset: int = 0
    ) -> List[Dict]:
        """
        Get leaderboard rankings for specified period.

        Args:
            period: 'monthly', 'yearly', or 'all_time'
            limit: Maximum number of results to return
            offset: Pagination offset

        Returns:
            List of user rankings with stats
        """
        # Map period to rank column
        rank_column = None
        if period == "monthly":
            rank_column = models.UserStats.rank_monthly
        elif period == "yearly":
            rank_column = models.UserStats.rank_yearly
        else:  # all_time
            rank_column = models.UserStats.rank_all_time

        # Query users sorted by accuracy descending
        query = (
            self.db.query(
                models.User.id,
                models.User.username,
                models.User.created_at,
                models.UserStats.accuracy_percentage,
                models.UserStats.total_predictions,
                models.UserStats.correct_predictions,
                models.UserStats.best_trade_return,
                models.UserStats.total_trades,
                models.UserStats.win_rate,
                rank_column.label("rank"),
            )
            .join(
                models.UserStats,
                models.User.id == models.UserStats.user_id,
                isouter=True,
            )
            .filter(models.User.is_active == True)
            .order_by(desc(models.UserStats.accuracy_percentage))
            .limit(limit)
            .offset(offset)
        )

        results = []
        for idx, row in enumerate(query.all(), start=1):
            results.append({
                "rank": row.rank or idx,
                "user_id": row.id,
                "username": row.username,
                "accuracy_percentage": row.accuracy_percentage or 0.0,
                "total_predictions": row.total_predictions or 0,
                "correct_predictions": row.correct_predictions or 0,
                "best_trade_return": row.best_trade_return or 0.0,
                "total_trades": row.total_trades or 0,
                "win_rate": row.win_rate or 0.0,
            })

        return results

    def get_user_rank(self, user_id: int, period: str = "monthly") -> Optional[Dict]:
        """
        Get a specific user's rank and stats for a period.

        Args:
            user_id: ID of the user
            period: 'monthly', 'yearly', or 'all_time'

        Returns:
            User ranking info or None if user not found
        """
        user = self.db.query(models.User).filter(
            models.User.id == user_id
        ).first()

        if not user:
            return None

        stats = self.db.query(models.UserStats).filter(
            models.UserStats.user_id == user_id
        ).first()

        if not stats:
            return None

        # Determine rank based on period
        if period == "monthly":
            rank = stats.rank_monthly
        elif period == "yearly":
            rank = stats.rank_yearly
        else:  # all_time
            rank = stats.rank_all_time

        return {
            "user_id": user.id,
            "username": user.username,
            "rank": rank,
            "accuracy_percentage": stats.accuracy_percentage,
            "total_predictions": stats.total_predictions,
            "correct_predictions": stats.correct_predictions,
            "best_trade_return": stats.best_trade_return,
            "total_trades": stats.total_trades,
            "win_rate": stats.win_rate,
        }

    def award_badges(self, user_id: int) -> List[str]:
        """
        Check and award badges to a user based on their stats.

        Returns:
            List of newly earned badge names
        """
        user_stats = self.db.query(models.UserStats).filter(
            models.UserStats.user_id == user_id
        ).first()

        if not user_stats:
            return []

        new_badges = []

        # Top 1% accuracy badge
        try:
            top_1_percent = (
                self.db.query(models.UserStats)
                .filter(models.UserStats.accuracy_percentage >= 90)
                .count()
            )
            if top_1_percent > 0 and user_stats.accuracy_percentage >= 90:
                badge = self._award_badge_if_not_earned(user_id, "Top 1% Accuracy")
                if badge:
                    new_badges.append("Top 1% Accuracy")
        except:
            pass

        # Top 10% accuracy badge
        try:
            top_10_percent_threshold = (
                self.db.query(models.UserStats.accuracy_percentage)
                .order_by(desc(models.UserStats.accuracy_percentage))
                .limit(int(self.db.query(models.UserStats).count() * 0.1) or 1)
                .subquery()
            )
            if user_stats.accuracy_percentage >= (
                self.db.query(func.min(top_10_percent_threshold.c.accuracy_percentage))
                .scalar() or 70
            ):
                badge = self._award_badge_if_not_earned(user_id, "Top 10% Accuracy")
                if badge:
                    new_badges.append("Top 10% Accuracy")
        except:
            pass

        # High accuracy badge (90%+)
        if user_stats.accuracy_percentage >= 90:
            badge = self._award_badge_if_not_earned(
                user_id, "90% Accuracy Achieved"
            )
            if badge:
                new_badges.append("90% Accuracy Achieved")

        # Win rate badge (75%+)
        if user_stats.win_rate >= 75:
            badge = self._award_badge_if_not_earned(user_id, "Winning Streak")
            if badge:
                new_badges.append("Winning Streak")

        # Prolific trader badge (100+ trades)
        if user_stats.total_trades >= 100:
            badge = self._award_badge_if_not_earned(user_id, "Prolific Trader")
            if badge:
                new_badges.append("Prolific Trader")

        return new_badges

    def _award_badge_if_not_earned(self, user_id: int, badge_name: str) -> bool:
        """
        Award a badge to a user if they don't already have it.

        Returns:
            True if badge was newly awarded, False if already owned
        """
        badge = self.db.query(models.Badge).filter(
            models.Badge.name == badge_name
        ).first()

        if not badge:
            return False

        existing = self.db.query(models.UserBadge).filter(
            and_(
                models.UserBadge.user_id == user_id,
                models.UserBadge.badge_id == badge.id,
            )
        ).first()

        if existing:
            return False

        # Award the badge
        user_badge = models.UserBadge(user_id=user_id, badge_id=badge.id)
        self.db.add(user_badge)
        self.db.commit()

        return True

    def update_monthly_ranks(self) -> None:
        """Update monthly rankings based on current accuracy"""
        stats = (
            self.db.query(models.UserStats)
            .filter(models.UserStats.accuracy_percentage > 0)
            .order_by(desc(models.UserStats.accuracy_percentage))
            .all()
        )

        for rank, stat in enumerate(stats, start=1):
            stat.rank_monthly = rank

        self.db.commit()

    def update_yearly_ranks(self) -> None:
        """Update yearly rankings based on current accuracy"""
        stats = (
            self.db.query(models.UserStats)
            .filter(models.UserStats.accuracy_percentage > 0)
            .order_by(desc(models.UserStats.accuracy_percentage))
            .all()
        )

        for rank, stat in enumerate(stats, start=1):
            stat.rank_yearly = rank

        self.db.commit()

    def update_all_time_ranks(self) -> None:
        """Update all-time rankings based on current accuracy"""
        stats = (
            self.db.query(models.UserStats)
            .filter(models.UserStats.accuracy_percentage > 0)
            .order_by(desc(models.UserStats.accuracy_percentage))
            .all()
        )

        for rank, stat in enumerate(stats, start=1):
            stat.rank_all_time = rank

        self.db.commit()

    def get_user_badges(self, user_id: int) -> List[Dict]:
        """Get all badges earned by a user"""
        badges = (
            self.db.query(models.Badge, models.UserBadge.earned_at)
            .join(models.UserBadge)
            .filter(models.UserBadge.user_id == user_id)
            .all()
        )

        return [
            {
                "id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "icon_url": badge.icon_url,
                "rarity": badge.rarity,
                "earned_at": earned_at.isoformat() if earned_at else None,
            }
            for badge, earned_at in badges
        ]

    def get_user_followers_count(self, user_id: int) -> int:
        """Get number of followers for a user"""
        return (
            self.db.query(func.count(models.UserFollow.id))
            .filter(models.UserFollow.following_id == user_id)
            .scalar() or 0
        )

    def is_user_following(self, follower_id: int, following_id: int) -> bool:
        """Check if a user is following another user"""
        return (
            self.db.query(models.UserFollow)
            .filter(
                and_(
                    models.UserFollow.follower_id == follower_id,
                    models.UserFollow.following_id == following_id,
                )
            )
            .first() is not None
        )

    def follow_user(self, follower_id: int, following_id: int) -> bool:
        """
        Make follower_id follow following_id.

        Returns:
            True if follow was created, False if already following
        """
        if self.is_user_following(follower_id, following_id):
            return False

        follow = models.UserFollow(
            follower_id=follower_id, following_id=following_id
        )
        self.db.add(follow)
        self.db.commit()

        return True

    def unfollow_user(self, follower_id: int, following_id: int) -> bool:
        """
        Make follower_id unfollow following_id.

        Returns:
            True if unfollow was successful, False if wasn't following
        """
        follow = (
            self.db.query(models.UserFollow)
            .filter(
                and_(
                    models.UserFollow.follower_id == follower_id,
                    models.UserFollow.following_id == following_id,
                )
            )
            .first()
        )

        if not follow:
            return False

        self.db.delete(follow)
        self.db.commit()

        return True

    def create_user_stats(self, user_id: int) -> models.UserStats:
        """Create initial stats record for a new user"""
        stats = models.UserStats(user_id=user_id)
        self.db.add(stats)
        self.db.commit()

        return stats

    def initialize_default_badges(self) -> None:
        """Initialize default badge definitions"""
        default_badges = [
            {
                "name": "Top 1% Accuracy",
                "description": "Achieved 90%+ prediction accuracy",
                "criteria": '{"accuracy_percentage": 90}',
                "icon_url": "https://img.icons8.com/color/96/000000/star--v1.png",
                "rarity": "legendary",
            },
            {
                "name": "Top 10% Accuracy",
                "description": "Ranked in top 10% of traders",
                "criteria": '{"top_percent": 10}',
                "icon_url": "https://img.icons8.com/color/96/000000/achievement--v1.png",
                "rarity": "epic",
            },
            {
                "name": "90% Accuracy Achieved",
                "description": "Maintained 90%+ prediction accuracy",
                "criteria": '{"accuracy_percentage": 90}',
                "icon_url": "https://img.icons8.com/color/96/000000/medal--v1.png",
                "rarity": "epic",
            },
            {
                "name": "Winning Streak",
                "description": "Achieved 75%+ win rate",
                "criteria": '{"win_rate": 75}',
                "icon_url": "https://img.icons8.com/color/96/000000/fire--v1.png",
                "rarity": "rare",
            },
            {
                "name": "Prolific Trader",
                "description": "Completed 100+ trades",
                "criteria": '{"total_trades": 100}',
                "icon_url": "https://img.icons8.com/color/96/000000/bar-chart--v1.png",
                "rarity": "rare",
            },
        ]

        for badge_data in default_badges:
            existing = self.db.query(models.Badge).filter(
                models.Badge.name == badge_data["name"]
            ).first()

            if not existing:
                badge = models.Badge(**badge_data)
                self.db.add(badge)

        self.db.commit()


def get_leaderboard_service(db: Session) -> LeaderboardService:
    """Factory function to get leaderboard service"""
    return LeaderboardService(db)
