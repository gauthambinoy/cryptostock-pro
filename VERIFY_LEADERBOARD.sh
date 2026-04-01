#!/bin/bash
# Verification script for Community Leaderboard implementation

echo "======================================"
echo "Community Leaderboard Verification"
echo "======================================"
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        return 1
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Found in $1: $2"
        return 0
    else
        echo -e "${RED}✗${NC} Not found in $1: $2"
        return 1
    fi
}

echo "1. Backend Models"
echo "================"
check_content "backend/app/models.py" "class UserStats"
check_content "backend/app/models.py" "class Badge"
check_content "backend/app/models.py" "class UserBadge"
check_content "backend/app/models.py" "class UserFollow"
echo

echo "2. Leaderboard Service"
echo "====================="
check_file "backend/app/services/leaderboard_service.py"
check_content "backend/app/services/leaderboard_service.py" "def calculate_user_accuracy"
check_content "backend/app/services/leaderboard_service.py" "def get_leaderboard"
check_content "backend/app/services/leaderboard_service.py" "def award_badges"
check_content "backend/app/services/leaderboard_service.py" "def get_user_rank"
echo

echo "3. Scheduled Tasks"
echo "=================="
check_file "backend/app/tasks/leaderboard_update.py"
check_content "backend/app/tasks/leaderboard_update.py" "def update_user_accuracy"
check_content "backend/app/tasks/leaderboard_update.py" "def update_monthly_ranks"
check_content "backend/app/tasks/leaderboard_update.py" "def award_badges_to_all_users"
check_content "backend/app/tasks/leaderboard_update.py" "def initialize_scheduler"
echo

echo "4. API Endpoints"
echo "================"
check_content "backend/app/routers/leaderboard.py" "GET /api/leaderboard"
check_content "backend/app/routers/leaderboard.py" "GET /api/leaderboard/my-rank"
check_content "backend/app/routers/leaderboard.py" "GET /{user_id}"
check_content "backend/app/routers/leaderboard.py" "POST /{user_id}/follow"
check_content "backend/app/routers/leaderboard.py" "POST /{user_id}/copy-alerts"
echo

echo "5. Frontend Components"
echo "======================"
check_file "frontend/src/pages/Leaderboard.jsx"
check_file "frontend/src/pages/UserProfile.jsx"
check_file "frontend/src/components/BadgeDisplay.jsx"
check_content "frontend/src/pages/Leaderboard.jsx" "const Leaderboard"
check_content "frontend/src/pages/UserProfile.jsx" "const UserProfile"
check_content "frontend/src/components/BadgeDisplay.jsx" "const BadgeDisplay"
echo

echo "6. Application Integration"
echo "=========================="
check_content "frontend/src/App.jsx" "import UserProfile"
check_content "frontend/src/App.jsx" "leaderboard/:userId"
check_content "backend/app/main.py" "initialize_scheduler"
check_content "backend/app/main.py" "shutdown_scheduler"
echo

echo "7. Schemas"
echo "=========="
check_content "backend/app/schemas.py" "class BadgeResponse"
check_content "backend/app/schemas.py" "class UserStatsResponse"
check_content "backend/app/schemas.py" "class LeaderboardEntryResponse"
check_content "backend/app/schemas.py" "class UserProfileResponse"
echo

echo "8. Documentation"
echo "================="
check_file "LEADERBOARD_FEATURE.md"
check_file "COMMUNITY_LEADERBOARD_COMPLETE.md"
echo

echo "======================================"
echo "Verification Complete!"
echo "======================================"
