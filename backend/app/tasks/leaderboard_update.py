"""
Scheduled tasks for leaderboard updates using APScheduler
"""
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..services.leaderboard_service import LeaderboardService
from .. import models

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def update_user_accuracy():
    """Calculate accuracy for all users"""
    db = SessionLocal()
    try:
        service = LeaderboardService(db)

        # Get all users with stats
        all_stats = db.query(models.UserStats).all()

        for stats in all_stats:
            # Calculate accuracy
            accuracy = service.calculate_user_accuracy(stats.user_id, days=30)
            stats.accuracy_percentage = accuracy

        db.commit()
        logger.info(f"Updated accuracy for {len(all_stats)} users")
    except Exception as e:
        logger.error(f"Error updating user accuracy: {e}")
    finally:
        db.close()


def update_monthly_ranks():
    """Update monthly rankings (run daily at midnight UTC)"""
    db = SessionLocal()
    try:
        service = LeaderboardService(db)
        service.update_monthly_ranks()
        logger.info("Updated monthly rankings")
    except Exception as e:
        logger.error(f"Error updating monthly rankings: {e}")
    finally:
        db.close()


def update_yearly_ranks():
    """Update yearly rankings (run daily at midnight UTC)"""
    db = SessionLocal()
    try:
        service = LeaderboardService(db)
        service.update_yearly_ranks()
        logger.info("Updated yearly rankings")
    except Exception as e:
        logger.error(f"Error updating yearly rankings: {e}")
    finally:
        db.close()


def award_badges_to_all_users():
    """Check and award badges to all users"""
    db = SessionLocal()
    try:
        service = LeaderboardService(db)

        # Get all users
        users = db.query(models.User).filter(models.User.is_active == True).all()

        total_badges = 0
        for user in users:
            new_badges = service.award_badges(user.id)
            total_badges += len(new_badges)

        logger.info(f"Awarded {total_badges} badges to {len(users)} users")
    except Exception as e:
        logger.error(f"Error awarding badges: {e}")
    finally:
        db.close()


def reset_monthly_stats():
    """Reset monthly statistics and start fresh (run on 1st of each month)"""
    db = SessionLocal()
    try:
        # Reset monthly ranks but keep yearly and all-time
        all_stats = db.query(models.UserStats).all()

        for stats in all_stats:
            # Keep yearly and all-time ranks, reset monthly
            stats.rank_monthly = None

        db.commit()
        logger.info("Reset monthly statistics")
    except Exception as e:
        logger.error(f"Error resetting monthly stats: {e}")
    finally:
        db.close()


def initialize_scheduler():
    """Initialize and start the background scheduler"""
    try:
        # Initialize default badges on startup
        db = SessionLocal()
        try:
            service = LeaderboardService(db)
            service.initialize_default_badges()
        finally:
            db.close()

        # Update accuracy daily at 1 AM UTC
        scheduler.add_job(
            update_user_accuracy,
            CronTrigger(hour=1, minute=0),
            id="update_accuracy",
            name="Update user accuracy",
            replace_existing=True,
        )

        # Update monthly rankings daily at midnight UTC
        scheduler.add_job(
            update_monthly_ranks,
            CronTrigger(hour=0, minute=0),
            id="update_monthly_ranks",
            name="Update monthly rankings",
            replace_existing=True,
        )

        # Update yearly rankings daily at midnight UTC
        scheduler.add_job(
            update_yearly_ranks,
            CronTrigger(hour=0, minute=5),
            id="update_yearly_ranks",
            name="Update yearly rankings",
            replace_existing=True,
        )

        # Award badges daily at 2 AM UTC
        scheduler.add_job(
            award_badges_to_all_users,
            CronTrigger(hour=2, minute=0),
            id="award_badges",
            name="Award badges to users",
            replace_existing=True,
        )

        # Reset monthly stats on 1st of each month at 3 AM UTC
        scheduler.add_job(
            reset_monthly_stats,
            CronTrigger(day=1, hour=3, minute=0),
            id="reset_monthly_stats",
            name="Reset monthly statistics",
            replace_existing=True,
        )

        if not scheduler.running:
            scheduler.start()
            logger.info("Leaderboard scheduler started")
    except Exception as e:
        logger.error(f"Error initializing scheduler: {e}")


def shutdown_scheduler():
    """Shutdown the background scheduler"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("Leaderboard scheduler shutdown")
    except Exception as e:
        logger.error(f"Error shutting down scheduler: {e}")
