import logging

from superset.reports.models import ReportRecipientType
from superset.reports.notifications.base import BaseNotification
from superset.reports.notifications.slack_mixin import SlackMixin
from superset.utils import json
from superset.utils.core import recipients_string_to_list

logger = logging.getLogger(__name__)


class MattermostNotification(SlackMixin, BaseNotification):
    """
    Sends a notification to Mattermost via incoming webhook.
    Currently stubbed — logs the payload and returns success.
    TODO: Wire up to real Mattermost webhook.
    """

    type = ReportRecipientType.MATTERMOST

    def _get_channels(self) -> list[str]:
        recipient_str = json.loads(self._recipient.recipient_config_json)["target"]
        return recipients_string_to_list(recipient_str)

    def send(self) -> None:
        body = self._get_body(content=self._content)
        channels = self._get_channels()

        has_screenshot = bool(self._content.screenshots)
        has_csv = bool(self._content.csv)
        has_pdf = bool(self._content.pdf)

        logger.info(
            "[MATTERMOST STUB] Would send to channels=%s | "
            "screenshot=%s | csv=%s | pdf=%s | body=%s",
            channels,
            has_screenshot,
            has_csv,
            has_pdf,
            body[:200],
        )
