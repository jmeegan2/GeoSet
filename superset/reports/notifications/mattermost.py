import base64
import logging

import requests
from flask import current_app

from superset.reports.models import ReportRecipientType
from superset.reports.notifications.base import BaseNotification
from superset.reports.notifications.exceptions import (
    NotificationParamException,
    NotificationUnprocessableException,
)
from superset.reports.notifications.slack_mixin import SlackMixin
from superset.utils import json

logger = logging.getLogger(__name__)


class MattermostNotification(SlackMixin, BaseNotification):
    """
    Sends a notification to Mattermost via incoming webhook.
    Embeds screenshots as inline base64 images.
    """

    type = ReportRecipientType.MATTERMOST

    def _get_inline_image(self) -> str | None:
        """Get the first available image as a base64 data URI."""
        if self._content.screenshots:
            b64 = base64.b64encode(self._content.screenshots[0]).decode()
            return f"data:image/png;base64,{b64}"
        if self._content.pdf:
            # PDF is built from screenshots — encode it as-is
            # Mattermost won't render PDF inline, but we can try
            # converting via the first page if possible
            try:
                from superset.utils.pdf import build_pdf_from_screenshots  # noqa

                # The PDF bytes are already built, no way to reverse easily.
                # Just skip image for PDF format — text + link is sent.
                return None
            except ImportError:
                return None
        return None

    def send(self) -> None:
        webhook_url = current_app.config.get("MATTERMOST_WEBHOOK_URL")
        if not webhook_url:
            raise NotificationParamException(
                "MATTERMOST_WEBHOOK_URL is not configured in superset_config"
            )

        body = self._get_body(content=self._content)
        image_uri = self._get_inline_image()

        if image_uri:
            body += f"\n\n![report screenshot]({image_uri})"

        payload: dict = {"text": body}

        try:
            resp = requests.post(webhook_url, json=payload, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as ex:
            raise NotificationUnprocessableException(
                f"Failed to send Mattermost notification: {ex}"
            ) from ex

        logger.info("Report sent to Mattermost")
