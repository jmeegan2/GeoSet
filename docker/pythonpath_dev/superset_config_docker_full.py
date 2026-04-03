"""GeoSet overrides for the full Docker Compose stack (Redis + Celery).

Loaded automatically by superset_config.py via ``from superset_config_docker import *``.
docker-compose.full.yml mounts this file as superset_config_docker.py inside
the container so it is picked up without touching the upstream base config.
"""

import logging
import os

from celery.signals import task_failure, task_postrun, task_prerun
from superset.tasks.types import ExecutorType, FixedExecutor

# Alerts & Reports
ALERT_REPORTS_NOTIFICATION_DRY_RUN = False
ALERT_REPORTS_NOTIFICATION_METHODS = ["Mattermost"]
WEBDRIVER_TYPE = "chrome"
FEATURE_FLAGS = {"ALERT_REPORTS": True, "PLAYWRIGHT_REPORTS_AND_THUMBNAILS": True}
MATTERMOST_WEBHOOK_URL = os.getenv(
    "MATTERMOST_WEBHOOK_URL",
    "https://mattermost.teamraft.com/hooks/q7co9uqot7g398cnzg63kfxaay",
)
WEBDRIVER_BASEURL = "http://superset:8088/"
WEBDRIVER_BASEURL_USER_FRIENDLY = WEBDRIVER_BASEURL

# Fallback executor for charts without owners (e.g. GeoSet example charts)
CACHE_WARMUP_EXECUTORS = [ExecutorType.OWNER, FixedExecutor("admin")]

# ---------------------------------------------------------------------------
# Cache warmup logging via Celery signals
# ---------------------------------------------------------------------------
_warmup_logger = logging.getLogger("geoset.cache_warmup")


@task_prerun.connect(sender=None)
def _log_cache_warmup_start(sender=None, task_id=None, args=None, kwargs=None, **kw):
    if sender and sender.name == "cache-warmup":
        strategy = kwargs.get("strategy_name", "unknown") if kwargs else "unknown"
        top_n = kwargs.get("top_n", "N/A") if kwargs else "N/A"
        _warmup_logger.info(
            "[CACHE-WARMUP] Starting | strategy=%s top_n=%s task_id=%s",
            strategy, top_n, task_id,
        )


@task_postrun.connect(sender=None)
def _log_cache_warmup_done(
    sender=None, task_id=None, retval=None, state=None, **kw
):
    if sender and sender.name == "cache-warmup":
        if isinstance(retval, dict):
            scheduled = len(retval.get("scheduled", []))
            errors = len(retval.get("errors", []))
            _warmup_logger.info(
                "[CACHE-WARMUP] Finished | scheduled=%d errors=%d state=%s task_id=%s",
                scheduled, errors, state, task_id,
            )
        else:
            _warmup_logger.warning(
                "[CACHE-WARMUP] Finished with non-dict result | result=%s state=%s task_id=%s",
                retval, state, task_id,
            )


@task_failure.connect(sender=None)
def _log_cache_warmup_failure(
    sender=None, task_id=None, exception=None, traceback=None, **kw
):
    if sender and sender.name == "cache-warmup":
        _warmup_logger.error(
            "[CACHE-WARMUP] FAILED | exception=%s task_id=%s",
            exception, task_id,
            exc_info=True,
        )
