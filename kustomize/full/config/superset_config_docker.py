
import os

WEBDRIVER_TYPE = "chrome"
ALERT_REPORTS_NOTIFICATION_METHODS = ["Mattermost"]
FEATURE_FLAGS = {"ALERT_REPORTS": True, "PLAYWRIGHT_REPORTS_AND_THUMBNAILS": True}
MATTERMOST_WEBHOOK_URL = os.getenv("MATTERMOST_WEBHOOK_URL", "https://mattermost.teamraft.com/hooks/q7co9uqot7g398cnzg63kfxaay")
